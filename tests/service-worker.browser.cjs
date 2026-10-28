// Real service-worker upgrade: previous committed cache -> current cache -> offline assets.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {execFileSync}=require('node:child_process'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),previous=process.env.NUKE_SW_BASELINE||'36a9c15',prefix='/nuke3000/';let old=true;
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}
 const name=url.pathname.slice(prefix.length)||'index.html';if(name.includes('..')){res.writeHead(403).end();return;}
 let bytes;try{bytes=name==='js/firebase-config.js'?Buffer.from(''):old&&/\.(html|js|css)$/.test(name)?execFileSync('git',['show',previous+':'+name],{cwd:root}):fs.readFileSync(path.join(root,name));}catch{res.writeHead(404).end();return;}
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf'})[path.extname(name)]||'application/octet-stream');res.end(bytes);
});
const currentSW=fs.readFileSync(path.join(root,'sw.js'),'utf8'),previousSW=execFileSync('git',['show',previous+':sw.js'],{cwd:root,encoding:'utf8'}),previousHTML=execFileSync('git',['show',previous+':index.html'],{cwd:root,encoding:'utf8'});
const oldCache=previousSW.match(/const CACHE = '([^']+)'/)[1],newCache=currentSW.match(/const CACHE = '([^']+)'/)[1],oldRelease=previousHTML.match(/name="nuke-release" content="([^"]+)"/)?.[1],newRelease=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/name="nuke-release" content="([^"]+)"/)[1];
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage(),origin='http://127.0.0.1:'+server.address().port;
 await context.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('data:')?r.continue():r.abort());
 page.setDefaultTimeout(20000);page.on('console',m=>console.log('SW browser:',m.text()));page.on('pageerror',e=>console.log('SW error:',e.message));
 await page.goto(origin+prefix);console.log('loaded old page');await page.waitForFunction(async key=>navigator.serviceWorker.controller&&(await caches.keys()).includes(key),oldCache);
 if(oldRelease)assert.equal(await page.locator('meta[name="nuke-release"]').getAttribute('content'),oldRelease);else assert.equal(await page.locator('meta[name="nuke-release"]').count(),0);
 console.log('old cache ready');old=false;await page.evaluate(()=>navigator.serviceWorker.getRegistration().then(r=>r.update()));
 console.log('update requested');await page.waitForFunction(value=>document.querySelector('meta[name="nuke-release"]')?.content===value,newRelease);
 await page.waitForFunction(async({oldCache,newCache})=>{const keys=await caches.keys();return keys.includes(newCache)&&!keys.includes(oldCache);},{oldCache,newCache});
 const assets=[...currentSW.matchAll(/'\/nuke3000\/([^']+)'/g)].map(match=>match[1]).filter(name=>name!=='js/firebase-config.js'); // Firebase config is deliberately stubbed in this isolated server.
 for(const name of assets){const digest=await page.evaluate(async name=>{const bytes=await(await caches.match('/nuke3000/'+name)).arrayBuffer();const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('');},name);assert.equal(digest,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex'),name);}
 await context.setOffline(true);await page.reload();assert.equal(await page.locator('meta[name="nuke-release"]').getAttribute('content'),newRelease);
 await page.locator('#faction-grid [data-f="imp"]').click();await page.locator('#pname').fill('QA offline');await page.locator('#btnstart').click();assert.equal(await page.locator('[id^="tg-"]').count(),60);
 console.log('PASS SW real: actualización automática desde '+previous+', recarga sin intervención, caché anterior eliminada, SHA256 de '+assets.length+' recursos coincide y arranque offline con 60 territorios');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
