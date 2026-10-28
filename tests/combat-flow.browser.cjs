// Browser integration: prepared armies, real controls and unaccelerated combat presentation.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),evidence=process.env.NUKE_COMBAT_EVIDENCE||'/tmp/nuke-combat-flow';fs.mkdirSync(evidence,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true});const origin=process.env.NUKE_PUBLIC_URL||('http://127.0.0.1:'+server.address().port);console.log('Origen probado: '+origin);
for(const viewport of [{width:1440,height:900},{width:844,height:390}]){
 const touch=viewport.width===844,context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));const press=s=>page.locator(s)[touch?'tap':'click']();
 await context.route('**/*',r=>{const url=r.request().url();if(!url.startsWith(origin)&&!url.startsWith('data:'))return r.abort();if(url.endsWith('/js/firebase-config.js'))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
 await page.goto(origin);await press('#faction-grid [data-f="imp"]');await page.locator('#pname').fill('QA combate');await press('#btnstart');
 await page.evaluate(()=>{hideSetupPanel();G.setup={order:['imp','lib','clt'],_inSetup:false};G.awaitingStart=false;G.gameOver=false;G.result=null;G.round=1;for(const t of Object.values(G.territories))Object.assign(t,{owner:'imp',soldiers:1,mechs:0,aircraft:0,scorpions:0,hasNuclear:false});G.territories['03_01'].owner='lib';G.territories['03_02'].owner='clt';Math.random=()=>0.99;window.callbacks=0;});
 for(const [att,def]of [['imp','lib'],['lib','imp'],['lib','clt']]){
  await page.evaluate(({att,def})=>{clearInteractionModes();G.phase='combat';G_step={currentFk:att,phase:'combat',idx:0,isMyTurn:att==='imp'};Object.assign(G.territories['01_01'],{owner:att,soldiers:1,mechs:0,aircraft:0,scorpions:2});Object.assign(G.territories['01_02'],{owner:def,soldiers:1,mechs:1,aircraft:0,scorpions:0});window.callbacks=0;beginCombat('01_01','01_02',att,()=>callbacks++);},{att,def});
  assert.equal(await page.locator('#dmodal.open').isVisible(),true);assert.equal(await page.locator('#unit-sel-def').count(),0);assert.equal(await page.evaluate(()=>G_combat.history.length),0);
  if(att==='imp'){if(!touch)await press('#unit-sel-att > button');await press('#btn-roll');}
  await page.waitForFunction(()=>G_combat?.history.length===1);assert.equal(await page.evaluate(()=>G_combat.done),false);
  if(att!=='imp'){assert.equal(await page.locator('#btn-roll').isVisible(),false);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>G_combat.history.length),1,'Pausa visible entre rondas');}
  await page.evaluate(()=>resolveCombatRound());assert.equal(await page.evaluate(()=>G_combat.history.length),1,'No repite una ronda resuelta');
  await page.screenshot({path:path.join(evidence,viewport.width+'-'+att+'-'+def+'-round.png')});
  if(att==='imp'){await press('#btn-roll');if(!touch)await press('#unit-sel-att > button');await press('#btn-roll');}
  await page.waitForFunction(()=>G_combat?.done);assert.equal(await page.evaluate(()=>G_combat.history.length),2);
  assert.equal(await page.locator('#btn-cancel').innerText(),'CERRAR');
  assert.equal(await page.evaluate(()=>G.territories['01_02'].owner),att);assert.equal(await page.evaluate(()=>Battle.count(G.territories['01_01'])),1);
  await page.screenshot({path:path.join(evidence,viewport.width+'-'+att+'-'+def+'-final.png')});
  await press('#btn-cancel');await page.waitForFunction(()=>callbacks===1);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>callbacks),1);assert.equal(await page.evaluate(()=>G_combat),null);
 }
 await page.evaluate(()=>{G.phase='prep';G_step={currentFk:'imp',phase:'prep',idx:4,isMyTurn:true};G.sel='01_02';Object.assign(G.territories[G.sel],{owner:'lib',soldiers:2,mechs:1,aircraft:1,scorpions:1});G.factions.imp.missiles=3;G.factions.lib.missiles=1;doMissileFire();});
 await press('#missile-launch');assert.match(await page.locator('#miss-result').innerText(),/INTERCEPTADO/);assert.equal(await page.locator('[data-missile-target]').count(),0);assert.equal(await page.evaluate(()=>G.factions.imp.missiles),2);assert.equal(await page.evaluate(()=>G.factions.lib.missiles),0);
 await page.screenshot({path:path.join(evidence,viewport.width+'-missile-intercepted.png')});await press('#missile-close');
 await page.evaluate(()=>doMissileFire());await press('#missile-launch');assert.equal(await page.evaluate(()=>G.factions.imp.missiles),1);
 await page.waitForFunction(()=>document.querySelectorAll('[data-missile-target]').length===4);assert.match(await page.locator('#miss-result').innerText(),/Impacto D6=6/);
 await page.screenshot({path:path.join(evidence,viewport.width+'-missile-choose.png')});await press('[data-missile-target="scorpions"]');assert.equal(await page.evaluate(()=>G.territories[G.sel].scorpions),0);
 await page.screenshot({path:path.join(evidence,viewport.width+'-missile-result.png')});await press('#missile-close');
 await page.evaluate(()=>{Object.assign(G.territories[G.sel],{soldiers:0,mechs:0,aircraft:0,scorpions:2});Math.random=()=>0;doMissileFire();});await press('#missile-launch');await page.waitForFunction(()=>document.getElementById('miss-result').textContent.includes('Sin unidad elegible'));
 assert.equal(await page.evaluate(()=>G.territories[G.sel].scorpions),2);assert.equal(await page.evaluate(()=>G.waitingMissile),null);await press('#missile-close');
 // The winning final roll remains visible before the victory overlay; the domain is already frozen.
 await page.evaluate(()=>{G.setup.order=['clt','lib'];for(const t of Object.values(G.territories))Object.assign(t,{owner:'clt',soldiers:1,mechs:0,aircraft:0,scorpions:0});G.factions.imp.alive=false;G.factions.clt.alive=G.factions.lib.alive=true;G.phase='combat';G_step={currentFk:'clt',phase:'combat',idx:0,isMyTurn:false};Object.assign(G.territories['01_01'],{scorpions:2});G.territories['01_02'].owner='lib';Math.random=()=>0.99;beginCombat('01_01','01_02','clt');});
 await page.waitForFunction(()=>G.gameOver);assert.equal(await page.evaluate(()=>G.result.winner),'clt');assert.equal(await page.locator('#dmodal.open').isVisible(),true);assert.equal(await page.locator('#game-result').count(),0);assert.match(await page.locator('#combat-summary').innerText(),/CONQUISTADO/);
 await page.screenshot({path:path.join(evidence,viewport.width+'-winning-combat.png')});await page.locator('#game-result').waitFor();assert.equal(await page.locator('#dmodal.open').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS combate/misiles '+viewport.width+'x'+viewport.height+': humano/CPU, CPU/humano, CPU/CPU visibles, 2 rondas pausadas, callback único, intercepción, elección posterior y sin elegibles');await context.close();
}
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1});
