// Browser integrations use explicit fixtures; the separate V4 E2E never mutates game state.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),evidence=process.env.NUKE_V4_EVIDENCE||'/tmp/nuke-v4-integration';fs.mkdirSync(evidence,{recursive:true});
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true});const origin='http://127.0.0.1:'+server.address().port;
for(const viewport of [{width:1440,height:900},{width:844,height:390}]){
 const touch=viewport.width===844,context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,serviceWorkers:'block'}),page=await context.newPage(),errors=[];await context.addInitScript(()=>localStorage.setItem('nuke-animation-mode','minimal'));page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>{const url=r.request().url();if(!url.startsWith(origin)&&!url.startsWith('data:'))return r.abort();if(url.endsWith('/js/v4-game.js')||url.endsWith('/js/combat.js'))return r.fulfill({contentType:'text/javascript',body:require('node:child_process').execFileSync('git',['show','b1087e9:js/'+new URL(url).pathname.split('/').at(-1)],{cwd:root,encoding:'utf8'})});if(url.endsWith('/js/firebase-config.js'))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
 await page.goto(origin+'?rules=v4');await page.locator('#faction-grid [data-f="imp"]').click();await page.locator('#pname').fill('QA V4');await page.locator('#btnstart').click();
 assert.equal(await page.evaluate(()=>RULES.version),'v4');
 await page.evaluate(()=>{hideSetupPanel();G.setup={order:['imp','lib','clt'],_inSetup:false};G.awaitingStart=false;G.gameOver=false;G.result=null;G.round=1;G.initialPlayerCount=3;G.movedUnits={};G.baseCaptures=[];G.eliminations=[];for(const t of Object.values(G.territories))Object.assign(t,{owner:'lib',soldiers:1,mechs:0,aircraft:0,scorpions:0,hasNuclear:false,attackers:{}});G.territories['03_01'].owner='clt';for(const f of Object.values(G.factions)){f.alive=true;f.missiles=0;}G.phase='prep';G_step={currentFk:'imp',phase:'prep',idx:4,isMyTurn:true};Object.assign(G.territories['01_01'],{owner:'imp',soldiers:1,scorpions:1});Math.random=()=>.99;});

 await page.evaluate(()=>{G.movedUnits={'01_01':{scorpions:1}};G.round=2;G.factions.imp._incomeAppliedRound=1;applyIncome('imp');updateStepUI(STEPS.prep[4]);resetV();});
 await page.locator('#tc-01_01')[touch?'tap':'click']();await page.locator('#tc-01_02')[touch?'tap':'click']();await page.locator('#move-popup button').filter({hasText:'MOVER'}).click();
 assert.equal(await page.evaluate(()=>!!G.territories['01_02'].attackers.imp),false);assert.equal(await page.locator('#move-popup').isVisible(),true);console.log('REPRODUCIDO b1087e9 '+viewport.width+': ataque legal bloqueado tras ingreso del turno siguiente por movedUnits persistente');

 assert.deepEqual(errors,[]);console.log('PASS reproducción histórica '+viewport.width+'x'+viewport.height+': bloqueo confirmado en b1087e9');await context.close();
}
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
