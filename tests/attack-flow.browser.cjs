// Browser integrations use explicit fixtures; the separate V4 E2E never mutates game state.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),evidence=process.env.NUKE_V4_EVIDENCE||'/tmp/nuke-v4-integration';fs.mkdirSync(evidence,{recursive:true});
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true});const origin='http://127.0.0.1:'+server.address().port;
for(const viewport of [{width:1440,height:900},{width:844,height:390}]){
 const touch=viewport.width===844,context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,serviceWorkers:'block'}),page=await context.newPage(),errors=[];await context.addInitScript(()=>localStorage.setItem('nuke-animation-mode','minimal'));page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>{const url=r.request().url();if(!url.startsWith(origin)&&!url.startsWith('data:'))return r.abort();if(url.endsWith('/js/firebase-config.js'))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
 await page.goto(origin+'?rules=v4');await page.locator('#faction-grid [data-f="imp"]').click();await page.locator('#pname').fill('QA V4');await page.locator('#btnstart').click();
 assert.equal(await page.evaluate(()=>RULES.version),'v4');
 await page.evaluate(()=>{hideSetupPanel();G.setup={order:['imp','lib','clt'],_inSetup:false};G.awaitingStart=false;G.gameOver=false;G.result=null;G.round=1;G.initialPlayerCount=3;G.movedUnits={};G.baseCaptures=[];G.eliminations=[];for(const t of Object.values(G.territories))Object.assign(t,{owner:'lib',soldiers:1,mechs:0,aircraft:0,scorpions:0,hasNuclear:false,attackers:{}});G.territories['03_01'].owner='clt';for(const f of Object.values(G.factions)){f.alive=true;f.missiles=0;}G.phase='prep';G_step={currentFk:'imp',phase:'prep',idx:4,isMyTurn:true};Object.assign(G.territories['01_01'],{owner:'imp',soldiers:1,scorpions:1});Math.random=()=>.99;});

 // Previously arrived units must be eligible in their next turn, never twice in the same one.
 await page.evaluate(()=>{G.round=2;G.factions.imp._incomeAppliedRound=1;G.movedUnits={'01_01':{scorpions:1}};applyIncome('imp');updateStepUI(STEPS.prep[4]);resetV();});
 const gesture=async id=>page.locator('#tc-'+id)[touch?'tap':'click']();
 await gesture('01_01');assert.equal(await page.evaluate(()=>G.moveSrc),'01_01');
 await gesture('01_02');await page.locator('#move-popup').waitFor();
 assert.equal(await page.locator('[data-attack-role="source"][data-territory="01_01"]').count(),1);assert.equal(await page.locator('[data-attack-role="target"][data-territory="01_02"]').count(),1);
 await page.locator('#move-popup button').filter({hasText:'MOVER'}).click();await page.waitForFunction(()=>!!G.territories['01_02'].attackers?.imp);
 assert.equal(await page.evaluate(()=>G.territories['01_02'].attackOrigins.imp['01_01'].scorpions),1);
 await page.screenshot({path:path.join(evidence,'attack-'+viewport.width+'-committed.png')});
 await page.locator('#btn-next').click();await page.locator('#btn-next').click();await page.locator('#btn-next').click();
 assert.equal(await page.evaluate(()=>STEPS[G_step.phase][G_step.idx].id),'attack');
 assert.equal(await page.locator('#tr-01_02').getAttribute('stroke'),'#cc2222');
 await page.evaluate(()=>{DiceSequence.setMode('fast');window.beforeG=JSON.stringify(G.territories);Math.random=()=>.99;});
 await gesture('01_02');await page.locator('.nuke-cinematic').waitFor();
 assert.deepEqual(await page.evaluate(()=>G_combat.sourceIds),['01_01']);
 await page.locator('.dice-sequence[data-state="result"]').waitFor();assert.equal(await page.locator('.ds-die[data-side="def"]').count(),1);
 assert.equal(await page.locator('[data-attack-role="source"]').count(),1);assert.equal(await page.locator('[data-attack-role="target"]').count(),1);
 await page.screenshot({path:path.join(evidence,'attack-'+viewport.width+'-combat.png')});
 await page.waitForFunction(()=>G_combat===null);assert.equal(await page.evaluate(()=>G.territories['01_02'].owner),'imp');
 assert.equal(await page.locator('[data-attack-role="source"]').count(),1);assert.equal(await page.locator('[data-attack-role="target"]').count(),1);
 await page.screenshot({path:path.join(evidence,'attack-'+viewport.width+'-return.png')});
 // Re-entry during this turn does not replenish movement; the next income does.
 await page.evaluate(()=>{G.territories['01_02'].soldiers=1;G.movedUnits={'01_02':{scorpions:1}};G_step.phase='prep';G.phase='prep';G_step.idx=4;applyIncome('imp');});
 assert.equal(await page.evaluate(()=>transferUnits('01_02','01_01',{scorpions:1})),false);
 await page.evaluate(()=>{G.round++;applyIncome('imp');G.territories['01_02'].soldiers=1;});
 assert.equal(await page.evaluate(()=>transferUnits('01_02','01_01',{scorpions:1})),true);
 await page.evaluate(()=>{G.territories['01_01'].soldiers=2;G.territories['01_01'].scorpions=1;G.movedUnits={'01_01':{soldiers:2}};showMoveUnitsPopup('01_01','01_02');});
 assert.equal(await page.locator('#mv-soldiers').count(),0,'No ofrece soldados que ya llegaron');assert.equal(await page.locator('#mv-scorpions').textContent(),'1','Un escorpión legal se preselecciona, la guarnición ya queda con los llegados');await page.evaluate(()=>mvCancel());
 await page.evaluate(()=>{G.territories['01_01'].soldiers=2;G.territories['01_01'].scorpions=1;G.territories['01_01'].aircraft=1;G.territories['03_01'].owner='imp';G.movedUnits={};showMoveUnitsPopup('01_01','03_01');});
 assert.equal(await page.locator('#mv-scorpions').count(),0,'Escorpión sin ruta terrestre no figura como carga');assert.equal(await page.locator('#mv-soldiers').textContent(),'0');assert.equal(await page.locator('#mv-aircraft').textContent(),'1');await page.evaluate(()=>{mvCancel();G.movedUnits={'01_01':{aircraft:1}};});assert.equal(await page.evaluate(()=>getMovableTargets('01_01').has('03_01')),false,'Una aeronave gastada no crea objetivos lejanos');
 // Map and maintenance share precisely the same resource, including after repeated redraws.
 await page.evaluate(()=>{G.territories['01_01'].hasNuclear=true;updateMap();updateMap();});
 assert.equal(await page.locator('#nucimg-01_01').getAttribute('href'),'assets/cinematic/nuclear_base.png');await page.screenshot({path:path.join(evidence,'nuclear-map-'+viewport.width+'.png')});
 assert.equal(await page.evaluate(()=>DiceSequence.attackDuration(900)/DiceSequence.duration(900)),2/3);

 assert.deepEqual(errors,[]);console.log('PASS ataque legal real '+viewport.width+'x'+viewport.height+': turno nuevo, gestos origen/destino, compromiso, combate, marcadores y nuclear unificado');await context.close();
}
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
