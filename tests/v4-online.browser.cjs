// Dos páginas reales y motor activo; solo el transporte Firestore se sustituye por una cola local.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),touch=!!process.env.NUKE_TOUCH_ONLINE;
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  const queue=[],pages={},errors=[],origin=`http://127.0.0.1:${server.address().port}`;
  for(const [uid,faction]of [['a','clt'],['b','lib']]){
   const context=await browser.newContext({viewport:touch?{width:844,height:390}:{width:1440,height:900},hasTouch:touch,isMobile:touch,serviceWorkers:'block'});
   await context.route('**/*',route=>{
    const url=route.request().url();if(!url.startsWith(origin)&&!url.startsWith('data:'))return route.abort();
    if(url.endsWith('/js/firebase-config.js'))return route.fulfill({contentType:'text/javascript',body:''});
    if(url.endsWith('/js/online.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'js/online.js'),'utf8').replace('    signalGameEnd,','    __configure:(uid,db)=>{_roomId="test";_userId=uid;_db=db;_isHost=uid==="a";}, _handleRemoteAction,\n    signalGameEnd,')});
    return route.continue();
   });
   await context.addInitScript(()=>localStorage.setItem('nuke-animation-mode','fast'));
   const page=pages[uid]=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',err=>errors.push(err.message));
   await page.exposeFunction('publishTestAction',action=>{queue.push(action);});
   await page.goto(origin+'?rules=v4');await page.locator(`#faction-grid [data-f="${faction}"]`)[touch?'tap':'click']();await page.locator('#pname').fill(uid);await page.locator('#btnstart')[touch?'tap':'click']();
   await page.evaluate(({uid,faction})=>{
    hideSetupPanel();clearInteractionModes();G.setup={order:['clt','lib','imp'],_inSetup:false};G.awaitingStart=false;G.gameOver=false;G.result=null;G.round=1;G.phase='combat';G.currentFaction='clt';
    G_step={currentFk:'clt',phase:'combat',idx:1,isMyTurn:faction==='clt'};
    G.factions.clt.alive=G.factions.lib.alive=G.factions.imp.alive=true;
    for(const t of Object.values(G.territories))Object.assign(t,{owner:'imp',soldiers:1,mechs:0,aircraft:0,scorpions:0,hasNuclear:false});
    Object.assign(G.territories['01_01'],{owner:'clt',soldiers:3});Object.assign(G.territories['01_02'],{owner:'lib',soldiers:1});G.territories['01_03'].owner='lib';
    _onlinePlayerFactions=new Set(['clt','lib']);Math.random=()=>0.99;window.domainRounds=0;const domainRound=RulesV4.round;RulesV4.round=(...args)=>{domainRounds++;return domainRound(...args);};
    const meta={host:'a',players:{a:{faction:'clt'},b:{faction:'lib'}}};
    const doc={get:async()=>{if(window.failMeta){window.failMeta=false;throw Error('QA simulated transport failure');}return {data:()=>({meta}),exists:true};},update:async()=>{},collection:()=>({add:async action=>publishTestAction(JSON.parse(JSON.stringify(action)))})};
    window.firebase={firestore:{FieldValue:{serverTimestamp:()=>0}}};ONLINE.__configure(uid,{collection:()=>({doc:()=>doc})});updateStepUI(STEPS.combat[0]);updateMap();
   },{uid,faction});
  }
  const pump=async()=>{while(queue.length){const action=queue.shift();await pages[action.playerId==='a'?'b':'a'].evaluate(action=>ONLINE._handleRemoteAction(action),action);}};
  const settle=async(predicate,limit=800)=>{for(let i=0;i<limit;i++){await pages.a.waitForTimeout(40);await pump();if(await predicate())return;}throw Error('No converge el protocolo V4 '+JSON.stringify(await Promise.all(Object.entries(pages).map(async([uid,p])=>({uid,...await p.evaluate(()=>({key:currentStepKey(),revision:G.snapshotRevision,waiting:G.waitingDecision,pending:G.pendingMissile,last:G.lastMissile,modal:document.getElementById('online-decision-modal')?.outerHTML,logs:G.log?.slice(-4)}))})))));};
  // The move publishes committed troops while ownership stays with the defender.
  await pages.a.evaluate(()=>{G.phase='prep';G_step={currentFk:'clt',phase:'prep',idx:4,isMyTurn:true};Object.assign(G.territories['01_01'],{soldiers:1,scorpions:2});transferUnits('01_01','01_02',{scorpions:2});});await pages.a.waitForTimeout(100);await pump();
  for(const page of Object.values(pages))assert.deepEqual(await page.evaluate(()=>({owner:G.territories['01_02'].owner,committed:G.territories['01_02'].attackers.clt.scorpions,guard:G.territories['01_01'].soldiers})),{owner:'lib',committed:2,guard:1});
  await pages.a.evaluate(()=>{G.phase='combat';G_step={currentFk:'clt',phase:'combat',idx:1,isMyTurn:true};window.completed=0;V4Game.battle('01_02','clt',()=>completed++);});
  await settle(()=>pages.a.evaluate(()=>completed===1));
  for(const page of Object.values(pages))assert.deepEqual(await page.evaluate(()=>({owner:G.territories['01_02'].owner,scorpions:G.territories['01_02'].scorpions})),{owner:'clt',scorpions:2});
  assert.equal(await pages.a.evaluate(()=>window.domainRounds),1);assert.equal(await pages.b.evaluate(()=>window.domainRounds),0,'El invitado no vuelve a tirar');
  await settle(()=>pages.b.evaluate(()=>G_combat===null));assert.equal(await pages.b.locator('.nuke-cinematic').count(),0,'El observador regresa al tablero automáticamente');
  // The host also owns authoritative resolution for a CPU attacker against a human.
  await pages.a.evaluate(()=>{G_step={currentFk:'imp',phase:'combat',idx:1,isMyTurn:false};G.currentFaction='imp';Object.assign(G.territories['01_02'],{owner:'lib',soldiers:1,mechs:1,scorpions:0,attackers:{imp:{soldiers:0,mechs:0,aircraft:0,scorpions:2}}});window.completed=0;V4Game.battle('01_02','imp',()=>completed++);});
  await settle(()=>pages.a.evaluate(()=>completed===1));
  for(const page of Object.values(pages))assert.deepEqual(await page.evaluate(()=>({owner:G.territories['01_02'].owner,units:RulesV4.count(G.territories['01_02'])})),{owner:'imp',units:2});
  assert.equal(await pages.a.evaluate(()=>window.domainRounds),3);assert.equal(await pages.b.evaluate(()=>window.domainRounds),0);await settle(()=>pages.b.evaluate(()=>G_combat===null));
  // Multiple human defensive responses, each tied to the actual attacking faction.
  for(const attacker of ['clt','imp']){
   await pages.a.evaluate(attacker=>{G.round++;G.phase='combat';G.currentFaction=attacker;G_step={currentFk:attacker,phase:'combat',idx:0,isMyTurn:attacker===G.pf};Object.assign(G.territories['01_02'],{owner:'lib',soldiers:5,mechs:1,aircraft:0,scorpions:0,attackers:{},hasNuclear:false});G.factions[attacker].missiles=2;G.factions.lib.missiles=2;Math.random=()=>.1;window.missileComplete=0;V4Game.missile('01_02',attacker,'sol',()=>missileComplete++);},attacker);
   for(let response=0;response<2;response++){
    await settle(()=>pages.b.locator('#remote-intercept').isVisible());
    assert.equal(await pages.a.evaluate(()=>G.waitingDecision.toFaction),'lib');
    await pages.b.locator('#remote-intercept')[touch?'tap':'click']();await pump();
   }
   await settle(async()=>await pages.a.evaluate(()=>missileComplete===1)&&await pages.b.evaluate(()=>G.territories['01_02'].soldiers===2));
   for(const page of Object.values(pages))assert.deepEqual(await page.evaluate(attacker=>({att:G.factions[attacker].missiles,def:G.factions.lib.missiles,soldiers:G.territories['01_02'].soldiers}),attacker),{att:1,def:0,soldiers:2});
   assert.deepEqual(await pages.a.evaluate(()=>G.lastMissile.interceptions),[1,1]);assert.equal(await pages.b.locator('#online-decision-modal').count(),0);
   if(await pages.a.locator('#missile-modal').isVisible())await pages.a.locator('#missile-modal button').click();
  }
  // Failure before a defensive reply preserves launch and blocks step advancement; retry is free.
  await pages.a.evaluate(()=>{G.round++;G.phase='combat';G.currentFaction='clt';G_step={currentFk:'clt',phase:'combat',idx:0,isMyTurn:true};Object.assign(G.territories['01_02'],{owner:'lib',soldiers:5,mechs:0,hasNuclear:false});G.factions.clt.missiles=2;G.factions.lib.missiles=1;window.failMeta=true;window.retryComplete=0;V4Game.missile('01_02','clt','sol',()=>retryComplete++);});
  await pages.a.locator('#missile-retry').waitFor();
  assert.deepEqual(await pages.a.evaluate(()=>({pending:!!G.pendingMissile,att:G.factions.clt.missiles,def:G.factions.lib.missiles,soldiers:G.territories['01_02'].soldiers,callback:retryComplete})),{pending:true,att:1,def:1,soldiers:5,callback:0});
  const pendingKey=await pages.a.evaluate(()=>currentStepKey());await pages.a.evaluate(()=>advanceStep());assert.equal(await pages.a.evaluate(()=>currentStepKey()),pendingKey);
  await pump();await pages.a.locator('#missile-retry button')[touch?'tap':'click']();await settle(()=>pages.b.locator('#remote-pass').isVisible());await pages.b.locator('#remote-pass')[touch?'tap':'click']();await pump();await settle(()=>pages.a.evaluate(()=>retryComplete===1));
  assert.deepEqual(await pages.a.evaluate(()=>({pending:!!G.pendingMissile,att:G.factions.clt.missiles,def:G.factions.lib.missiles,soldiers:G.territories['01_02'].soldiers})),{pending:false,att:1,def:1,soldiers:2});
  // Final-step snapshots must describe the new phase; guests never replay a prior transition.
  await pages.a.evaluate(()=>{G.pendingMissile=null;G.waitingMissile=false;G.phase='prep';G.currentFaction='clt';G_step={currentFk:'clt',phase:'prep',idx:STEPS.prep.length-1,isMyTurn:true};advanceStep();});
  await settle(async()=>await pages.b.evaluate(()=>G_step.phase==='combat'&&G_step.idx===0));
  for(const page of Object.values(pages))assert.deepEqual(await page.evaluate(()=>({phase:G_step.phase,idx:G_step.idx,fk:G_step.currentFk})),{phase:'combat',idx:0,fk:'clt'});
  await pages.a.evaluate(()=>{RULES.victory.imp.enabled=false;G.round=20;G.setup.order=['clt','lib','imp'];for(const f of Object.values(G.factions))f.alive=true;for(const t of Object.values(G.territories))t.hasNuclear=false;Object.assign(G.territories['01_01'],{owner:'clt',hasNuclear:true});G.factions.clt.plutonium=10;delete G.factions.clt._incomeAppliedRound;G.phase='end';G.currentFaction='imp';G_step={currentFk:'imp',phase:'end',idx:STEPS.end.length-1,isMyTurn:false};advanceStep();});
  await settle(async()=>await pages.b.evaluate(()=>G.round===21&&G_step.currentFk==='clt'&&G_step.phase==='prep'&&G_step.idx===0&&G.factions.clt.plutonium===13));
  await pages.a.locator('#step-actions button').filter({hasText:'COLOCAR REFUERZOS'})[touch?'tap':'click']();await settle(()=>pages.b.evaluate(()=>G_step.idx===1));
  for(const page of Object.values(pages))assert.deepEqual(await page.evaluate(()=>({round:G.round,phase:G_step.phase,idx:G_step.idx,fk:G_step.currentFk,pu:G.factions.clt.plutonium})),{round:21,phase:'prep',idx:1,fk:'clt',pu:13});
  await pages.a.waitForTimeout(500);await pump();for(const page of Object.values(pages))assert.equal(await page.evaluate(()=>G.factions.clt.plutonium),13,'Sin duplicar ingreso tras recibir la fase');
  assert.deepEqual(errors,[]);console.log('PASS V4 dos clientes '+(touch?'touch':'desktop')+': compromiso compartido, humano/CPU autoritativo, cierre y múltiples intercepciones humanas para ambos atacantes');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;});
