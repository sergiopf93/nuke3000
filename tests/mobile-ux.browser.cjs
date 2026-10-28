// Touch UI integration with prepared scenarios; full-game.e2e.cjs covers a complete UI-only game.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),evidence=process.env.NUKE_UX_EVIDENCE||path.join(root,'docs/evidence/mobile-ux');fs.mkdirSync(evidence,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true});const origin=`http://127.0.0.1:${server.address().port}`;
for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:667,height:375},{width:932,height:430},{width:390,height:844}]){
 const touch=viewport.width!==1440,context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,reducedMotion:viewport.width===390?'reduce':'no-preference',serviceWorkers:'block'});
 await context.route('**/*',route=>{const u=route.request().url();if(!u.startsWith(origin)&&!u.startsWith('data:'))return route.abort();if(u.endsWith('/js/firebase-config.js'))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));const press=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
 await page.goto(origin);await press('#faction-grid [data-f="imp"]');await page.locator('#pname').fill('QA UX');await press('#btnstart');
 await page.evaluate(()=>{hideSetupPanel();G.setup.claimCallback=null;G.setup._inSetup=false;G.awaitingStart=false;G.setup.order=['imp','lib','clt'];G.phase='combat';G.currentFaction='imp';G_step={currentFk:'imp',phase:'combat',idx:0,isMyTurn:true};for(const t of Object.values(G.territories))Object.assign(t,{owner:'lib',soldiers:1,mechs:0,aircraft:0,scorpions:0,hasNuclear:false});Object.assign(G.territories['01_01'],{owner:'imp',soldiers:5,mechs:1});G.territories['01_03'].owner='imp';Math.random=()=>0.99;updateStepUI(STEPS.combat[0]);updateMap();resetV();});
 const tag=process.env.NUKE_UX_BASELINE?'before':'after',size=`${viewport.width}x${viewport.height}`;
 await page.screenshot({path:path.join(evidence,`${tag}-${size}-map.png`)});
 await page.evaluate(()=>beginCombat('01_01','01_02','imp'));
 await page.screenshot({path:path.join(evidence,`${tag}-${size}-combat.png`)});
 if(process.env.NUKE_UX_BASELINE){assert.deepEqual(errors,[]);await context.close();continue;}
 // Prepared fixtures exercise real controls with tap(), never mouse clicks on mobile.
 await press('#btn-cancel');
 if(touch){
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Sin desbordamiento horizontal');
  await press('#mobile-players');page.once('dialog',d=>d.dismiss());await press('#mobile-exit');assert.equal(await page.evaluate(()=>G.phase),'combat');await press('#lp .mobile-drawer-close');await press('#mobile-log');await press('#rp-log .mobile-drawer-close');
  assert.equal(await page.evaluate(()=>document.body.dataset.mobilePanel),undefined);
  await press('#turn-ui button[title="Editor de Reglas"]');await press('#rules-modal button:has-text("CERRAR")');assert.equal(await page.locator('#rules-modal').count(),0);
  if(viewport.width<viewport.height)assert.equal(await page.locator('#orientation-hint').isVisible(),true);
 }
 await press('#tc-01_01');
 if(touch){assert.match(await page.locator('#territory-name').innerText(),/IMPERATORS/);assert.match(await page.locator('#territory-units').innerText(),/5 Soldados/);}
 await page.screenshot({path:path.join(evidence,`${tag}-${size}-selection.png`)});
 await press('#tc-01_02');
 if(!touch)await press('#ba-attack');
 await page.locator('#dmodal.open').waitFor();
 if(touch)assert.equal(await page.locator('#combat-unit-choice').evaluate(el=>el.open),false,'El toque que abre combate no activa controles del diálogo');
 if(!touch)await press('#unit-sel-att > button');
 await press('#btn-roll');
 assert.equal(await page.evaluate(()=>G.territories['01_02'].owner),'imp');
 if(touch){if(viewport.width===390)assert.equal(await page.locator('.die.spin').count(),0);assert.match(await page.locator('#combat-summary').innerText(),/CONQUISTA/);await press('#combat-detail-toggle');assert.equal(await page.locator('#dres').isVisible(),true);assert.match(await page.locator('#dres').innerText(),/Comparaciones/);await press('#combat-detail-toggle');}
 await page.waitForTimeout(550);await page.screenshot({path:path.join(evidence,`${tag}-${size}-result.png`)});await press('#btn-cancel');
 await page.evaluate(()=>{clearInteractionModes();G.phase='prep';G_step={currentFk:'imp',phase:'prep',idx:3,isMyTurn:true};Object.assign(G.territories['01_01'],{owner:'imp',soldiers:4,mechs:0});G.territories['01_02'].owner='imp';updateStepUI(STEPS.prep[3]);updateMap();});
 if(!touch)await press('#ba-move-btn');
 await press('#tc-01_01');await press('#tc-01_02');
 if([844,1440].includes(viewport.width))await page.screenshot({path:path.join(evidence,`${tag}-${size}-move.png`)});
 await press('#move-popup button:has-text("MOVER")');
 assert.equal(await page.evaluate(()=>G.territories['01_01'].soldiers),3);
 assert.equal(await page.locator('#move-popup').count(),0);
 await page.evaluate(()=>{clearInteractionModes();G_step.idx=2;G.factions.imp.plutonium=10;G.territories['01_01'].soldiers=6;updateStepUI(STEPS.prep[2]);updateMap();});
 await press('#tc-01_01');await press('#step-actions button:first-child');if([844,1440].includes(viewport.width))await page.screenshot({path:path.join(evidence,`${tag}-${size}-upgrade.png`)});await press('#upgrade-cancel');
 assert.equal(await page.evaluate(()=>G.territories['01_01'].soldiers),6);
 await press('#step-actions button:first-child');await press('#upgrade-ok');assert.equal(await page.evaluate(()=>G.territories['01_01'].soldiers),3);
 await page.evaluate(()=>{clearInteractionModes();G_step.idx=4;Object.assign(G.territories['01_02'],{owner:'lib',soldiers:2,mechs:0,aircraft:1});G.factions.lib.missiles=0;G.factions.imp.missiles=2;updateStepUI(STEPS.prep[4]);updateMap();});
 await press('#step-actions button:has-text("Construir")');if(touch)assert.match(await page.locator('#mobile-resources').innerText(),/3\/5 misiles/);
 await press('#step-actions button:has-text("Lanzar")');await press('#tc-01_02');await press('[data-missile-target="aircraft"]');
 assert.equal(await page.evaluate(()=>G.territories['01_02'].aircraft),0);if([844,1440].includes(viewport.width))await page.screenshot({path:path.join(evidence,`${tag}-${size}-missile.png`)});await press('#missile-close');
 // Human defense: the choice remains explicit, even when the CPU drives its turn.
 await page.evaluate(()=>{clearInteractionModes();G.phase='combat';G_step={currentFk:'clt',phase:'combat',idx:0,isMyTurn:false};Object.assign(G.territories['01_02'],{owner:'clt',soldiers:3,mechs:0,aircraft:0});Object.assign(G.territories['01_01'],{owner:'imp',soldiers:2,mechs:0});openDiceCpu('01_02','01_01','clt',()=>{});});
 assert.equal(await page.evaluate(()=>G_combat.history.length),0);
 if(!touch)await press('#unit-sel-def > button');
 await press('#btn-roll');assert.equal(await page.evaluate(()=>G_combat.history.length),1);
 await press('#btn-cancel');
 if(touch){await press('#tc-01_02');assert.match(await page.locator('#territory-name').innerText(),/TAL-MAUT/);assert.equal(await page.locator('#dmodal.open').count(),0);}
 await page.evaluate(()=>{G_step={currentFk:'imp',phase:'combat',idx:0,isMyTurn:true};Object.assign(G.territories['01_01'],{owner:'imp',soldiers:2,mechs:0,aircraft:0,scorpions:1});Object.assign(G.territories['01_02'],{owner:'lib',soldiers:0,mechs:0,aircraft:0,scorpions:2});beginCombat('01_01','01_02','imp');});
 if(!touch)await press('#unit-sel-att > button');await press('#btn-roll');
 assert.equal(await page.evaluate(()=>G_combat.done),false);await press('#btn-roll');
 if(touch){await press('#combat-unit-choice > summary');await page.waitForFunction(()=>document.getElementById('btn-roll').disabled);await press('#unit-sel-att > button');assert.equal(await page.locator('#btn-roll').isEnabled(),true);}
 await press('#btn-cancel');assert.equal(await page.evaluate(()=>G_combat),null);
 if(touch&&viewport.width>viewport.height){
  await page.evaluate(()=>{clearInteractionModes();G_step={currentFk:'imp',phase:'prep',idx:3,isMyTurn:true};updateMap();});
  const session=await context.newCDPSession(page),box=await page.locator('#map-wrap').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  const before=await page.evaluate(()=>({x:G.vx,scale:G.vscale}));
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+40,y:y+20}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.notEqual(await page.evaluate(()=>G.vx),before.x);assert.equal(await page.evaluate(()=>G.sel),null);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-30,y,id:1},{x:x+30,y,id:2}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-60,y,id:1},{x:x+60,y,id:2}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await page.evaluate(()=>G.vscale)>before.scale);assert.equal(await page.evaluate(()=>G.sel),null);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  assert.equal(await page.evaluate(()=>G.sel),null);await press('#bcontrols button');
 }
 if(viewport.width===844){
  const state=await page.evaluate(()=>JSON.stringify({territories:G.territories,factions:G.factions,round:G.round}));
  await press('#mobile-players');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.body.dataset.mobilePanel),undefined);
  await page.setViewportSize({width:390,height:844});await page.locator('#orientation-hint').waitFor({state:'visible'});
  await page.setViewportSize(viewport);await page.locator('#orientation-hint').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>JSON.stringify({territories:G.territories,factions:G.factions,round:G.round})),state,'Girar no altera la partida');
 }
 await page.evaluate(()=>{
   clearInteractionModes();G.setup={order:['imp','lib','clt'],_inSetup:true,_stepIdx:2,deployIdx:0,soldiersLeft:{imp:1,lib:0,clt:0},nukesLeft:{imp:1,lib:0,clt:0}};
   G.factions.imp.mechs=1;G.factions.lib.mechs=G.factions.clt.mechs=0;Object.assign(G.territories['01_01'],{owner:'imp',soldiers:1,mechs:0,aircraft:0,scorpions:0,hasNuclear:false});setupStep_Deploy_ForFaction('imp');updateMap();resetV();
 });
 await press('#tc-01_01');if([844,1440].includes(viewport.width))await page.screenshot({path:path.join(evidence,`${tag}-${size}-setup.png`)});await press('#soldier-counter-popup button:has-text("✓ OK")');
 await page.waitForFunction(()=>typeof G.setup.claimCallback==='function');
 await press('#tc-01_01');const plus=page.locator('#soldier-counter-popup button').filter({hasText:/^\+$/}).last();await plus[touch?'tap':'click']();await press('#soldier-counter-popup button:has-text("✓ OK")');await press('#tc-01_01');
 assert.deepEqual(await page.evaluate(()=>({sol:G.territories['01_01'].soldiers,mech:G.territories['01_01'].mechs,nuke:G.territories['01_01'].hasNuclear})),{sol:2,mech:1,nuke:true});
 await page.locator('#game-start-overlay').waitFor();
 assert.deepEqual(errors,[]);await context.close();console.log('PASS UX',size,touch?'touch':'desktop');
}
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1});
