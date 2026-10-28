// Real setup with two browsers and a controlled transport; no fake dice are rendered.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const origin='http://127.0.0.1:'+server.address().port,pages={},queue=[],errors=[];
 for(const [uid,faction]of [['a','imp'],['b','lib']]){
  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,serviceWorkers:'block'});
  await context.route('**/*',route=>{const u=route.request().url();if(!u.startsWith(origin)&&!u.startsWith('data:'))return route.abort();if(u.endsWith('/js/firebase-config.js'))return route.fulfill({contentType:'text/javascript',body:''});if(u.endsWith('/js/online.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'js/online.js'),'utf8').replace('    signalGameEnd,','    __configure:(uid,db)=>{_roomId="setup-test";_userId=uid;_db=db;_isHost=uid==="a";}, _handleRemoteAction,\n    signalGameEnd,')});return route.continue();});
  const page=pages[uid]=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.exposeFunction('publishSetupAction',action=>queue.push(action));await page.goto(origin);await page.locator('#faction-grid [data-f="'+faction+'"]').tap();await page.locator('#pcount').selectOption('3');await page.locator('#pname').fill(uid);await page.locator('#btnstart').tap();
  await page.evaluate(({uid})=>{_onlinePlayerFactions=new Set(['imp','lib']);const meta={host:'a',players:{a:{faction:'imp'},b:{faction:'lib'}}},doc={get:async()=>({exists:true,data:()=>({meta})}),update:async()=>{},collection:()=>({add:async action=>publishSetupAction(JSON.parse(JSON.stringify(action)))})};window.firebase={firestore:{FieldValue:{serverTimestamp:()=>0}}};ONLINE.__configure(uid,{collection:()=>({doc:()=>doc})});const values=uid==='a'?[.99,.1,.2]:[.99,.8];window.randomCalls=0;Math.random=()=>{randomCalls++;if(!values.length)throw Error('Tirada de setup adicional');return values.shift();};DiceSequence.setMode(uid==='a'?'minimal':'normal');startSetupPhase();},{uid});
 }
 const pump=async()=>{while(queue.length){const action=queue.shift();await pages[action.playerId==='a'?'b':'a'].evaluate(action=>ONLINE._handleRemoteAction(action),action);}};
 const settle=async predicate=>{for(let i=0;i<300;i++){await pages.a.waitForTimeout(40);await pump();if(await predicate())return;}throw Error('El sorteo online no converge');};
 await pages.a.locator('#roll-card-imp').tap();await pages.b.locator('#roll-card-lib').tap();
 await settle(()=>pages.a.evaluate(()=>G.setup.rollGeneration===3&&G.setup.rollResults.imp===undefined));
 assert.equal(await pages.b.evaluate(()=>G.setup.rollGeneration),2,'El observador conserva la generación que está animando');
 await pages.a.locator('#roll-card-imp').tap();await pump();await settle(()=>pages.b.evaluate(()=>queuedSetupRolls.size>0));
 assert.equal(await pages.b.evaluate(()=>G.setup.rollResults.imp),6,'El desempate futuro no sobrescribe el dado inicial visible');
 await settle(()=>pages.b.evaluate(()=>G.setup.rollGeneration===3&&G.setup.rollResults.imp===2));
 await pages.b.locator('#roll-card-lib').tap();
 await settle(()=>pages.a.locator('#setup-info').filter({hasText:'ORDEN FINAL'}).isVisible());
 await pages.a.locator('#setup-actions button').filter({hasText:'CONTINUAR'}).tap();await pump();
 assert.equal(await pages.b.evaluate(()=>G.setup._stepIdx),0,'El salto de pantalla espera la animación local o su omisión');
 await settle(()=>pages.b.evaluate(()=>G.setup._stepIdx===1));
 for(const page of Object.values(pages))assert.deepEqual(await page.evaluate(()=>({order:G.setup.order,rolls:G.setup.rollResults,claimed:Object.values(G.territories).filter(t=>t.owner).length})),{order:['lib','clt','imp'],rolls:{imp:2,lib:5,clt:1},claimed:0});
 assert.equal(await pages.a.evaluate(()=>randomCalls),3);assert.equal(await pages.b.evaluate(()=>randomCalls),2);assert.deepEqual(errors,[]);console.log('PASS sorteo online: D6 inicial, desempate entre generaciones, velocidades distintas y avance de pantalla posterior a todos los dados');
 }finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
