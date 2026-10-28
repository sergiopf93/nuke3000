// Dos páginas reales y motor activo; solo el transporte Firestore se sustituye por una cola local.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),touch=!!process.env.NUKE_TOUCH_ONLINE;
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url.split('?')[0]));
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
   const page=pages[uid]=await context.newPage();page.on('pageerror',err=>errors.push(err.message));
   await page.exposeFunction('publishTestAction',action=>{queue.push(action);});
   await page.goto(origin);await page.locator(`#faction-grid [data-f="${faction}"]`)[touch?'tap':'click']();await page.locator('#pname').fill(uid);await page.locator('#btnstart')[touch?'tap':'click']();
   await page.evaluate(({uid,faction})=>{
    hideSetupPanel();clearInteractionModes();G.setup={order:['clt','lib','imp'],_inSetup:false};G.awaitingStart=false;G.gameOver=false;G.result=null;G.round=1;G.phase='combat';G.currentFaction='clt';
    G_step={currentFk:'clt',phase:'combat',idx:0,isMyTurn:faction==='clt'};
    G.factions.clt.alive=G.factions.lib.alive=G.factions.imp.alive=true;
    for(const t of Object.values(G.territories))Object.assign(t,{owner:'imp',soldiers:1,mechs:0,aircraft:0,scorpions:0,hasNuclear:false});
    Object.assign(G.territories['01_01'],{owner:'clt',soldiers:3});Object.assign(G.territories['01_02'],{owner:'lib',soldiers:1});G.territories['01_03'].owner='lib';
    _onlinePlayerFactions=new Set(['clt','lib']);Math.random=()=>0.99;
    const meta={host:'a',players:{a:{faction:'clt'},b:{faction:'lib'}}};
    const doc={get:async()=>({data:()=>({meta}),exists:true}),update:async()=>{},collection:()=>({add:async action=>publishTestAction(JSON.parse(JSON.stringify(action)))})};
    window.firebase={firestore:{FieldValue:{serverTimestamp:()=>0}}};ONLINE.__configure(uid,{collection:()=>({doc:()=>doc})});updateStepUI(STEPS.combat[0]);updateMap();
   },{uid,faction});
  }
  const pump=async()=>{while(queue.length){const action=queue.shift();await pages[action.playerId==='a'?'b':'a'].evaluate(action=>ONLINE._handleRemoteAction(action),action);}};
  await pages.a.locator('#tc-01_01')[touch?'tap':'click']();await pages.a.locator('#tc-01_02')[touch?'tap':'click']();if(!touch){await pages.a.locator('#ba-attack').click();await pages.a.locator('#unit-sel-att > button').click();}await pages.a.locator('#btn-roll')[touch?'tap':'click']();
  await pages.a.waitForFunction(()=>G.waitingDecision?.id!=='loading'&&G.waitingDecision);
  assert.equal(await pages.a.evaluate(()=>G.territories['01_02'].owner),'lib');await pump();
  await pages.b.locator('#remote-defense-confirm').waitFor();
  assert.equal(await pages.a.evaluate(()=>G.territories['01_02'].owner),'lib','No se resuelve antes de la decisión humana');
  await pages.b.locator('#remote-defense-confirm')[touch?'tap':'click']();await pump();
  for(const page of Object.values(pages))assert.deepEqual(await page.evaluate(()=>({owner:G.territories['01_02'].owner,units:Battle.count(G.territories['01_02']),guard:Battle.count(G.territories['01_01'])})),{owner:'clt',units:2,guard:1});
  assert.equal(await pages.a.evaluate(()=>G.waitingDecision),null);
  assert.equal(await pages.b.locator('#online-decision-modal').count(),0);
  await pages.a.locator('#btn-cancel')[touch?'tap':'click']();
  await pages.a.evaluate(()=>{
    G_step={currentFk:'imp',phase:'combat',idx:0,isMyTurn:false};G.currentFaction='imp';
    Object.assign(G.territories['01_01'],{owner:'imp',soldiers:1,scorpions:2});
    Object.assign(G.territories['01_02'],{owner:'lib',soldiers:1,mechs:1});
    window.cpuCallbacks=0;openDiceCpu('01_01','01_02','imp',()=>cpuCallbacks++);
  });
  for(let round=0;round<2;round++){
    await pages.a.waitForFunction(()=>G.waitingDecision&&G.waitingDecision.id!=='loading');await pump();
    await pages.b.locator('#remote-defense-confirm')[touch?'tap':'click']();await pump();
  }
  await pages.a.waitForFunction(()=>cpuCallbacks===1);
  assert.equal(await pages.a.evaluate(()=>G_combat.history.length),2);
  for(const page of Object.values(pages))assert.deepEqual(await page.evaluate(()=>({owner:G.territories['01_02'].owner,units:Battle.count(G.territories['01_02']),guard:Battle.count(G.territories['01_01'])})),{owner:'imp',units:2,guard:1});
  await pages.a.evaluate(()=>{
    G.round=2;G.phase='prep';G.currentFaction='clt';G_step={currentFk:'clt',phase:'prep',idx:4,isMyTurn:true};
    Object.assign(G.territories['01_02'],{owner:'lib',soldiers:2,mechs:0,aircraft:1,scorpions:0});
    G.factions.clt.missiles=2;G.factions.lib.missiles=1;G.sel='01_02';doMissileFire();
  });
  await pages.a.locator('[data-missile-target="aircraft"]')[touch?'tap':'click']();
  await pages.a.waitForFunction(()=>G.waitingDecision&&G.waitingDecision.id!=='loading');await pump();
  assert.equal(await pages.a.evaluate(()=>G.factions.clt.missiles),2);
  await pages.b.locator('#remote-intercept')[touch?'tap':'click']();await pump();
  for(const page of Object.values(pages))assert.deepEqual(await page.evaluate(()=>({att:G.factions.clt.missiles,def:G.factions.lib.missiles,air:G.territories['01_02'].aircraft})),{att:1,def:0,air:1});
  assert.match(await pages.a.locator('#miss-result').innerText(),/INTERCEPTADO/);
  assert.deepEqual(errors,[]);console.log('PASS Chrome 2 clientes: combate humano/CPU por rondas e intercepción humana; callback único y estado coincidente; transporte local, sin Firebase');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;});
