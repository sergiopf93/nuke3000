// Full real-browser game: UI actions only; seed and timer acceleration are the only injections.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const viewport={width:Number(process.env.NUKE_E2E_WIDTH||1440),height:Number(process.env.NUKE_E2E_HEIGHT||900)},touch=!!process.env.NUKE_E2E_TOUCH,artifact=process.env.NUKE_E2E_ARTIFACT||'/tmp/nuke-full-game';
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,context;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,serviceWorkers:'block'});
  await context.tracing.start({screenshots:false,snapshots:false});
  const origin=`http://127.0.0.1:${server.address().port}`;
  await context.route('**/*',route=>{
   const url=route.request().url();
   if(!url.startsWith(origin)&&!url.startsWith('data:'))return route.abort();
   if(url.endsWith('/js/firebase-config.js'))return route.fulfill({contentType:'text/javascript',body:''});
   return route.continue();
  });
  await context.addInitScript(seed=>{
   let state=seed>>>0;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
   const timeout=window.setTimeout.bind(window);window.setTimeout=(fn,delay,...args)=>timeout(fn,Math.min((delay||0)*0.02,30),...args);
  },Number(process.env.NUKE_E2E_SEED||123));
  const page=await context.newPage();page.setDefaultTimeout(3000);const errors=[],actions=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(origin);await page.locator('#faction-grid [data-f="prm"]')[touch?'tap':'click']();
  await page.locator('#pcount').selectOption('3');await page.locator('#pname').fill('QA V3');await page.locator('#btnstart')[touch?'tap':'click']();
  let start=null,finished=false;
  const click=async(selector)=>{const locator=page.locator(selector).first();if(await locator.isVisible()){await locator[touch?'tap':'click']({timeout:2000});actions.push(selector);return true;}return false;};
  for(let action=0;action<600;action++){
   if(errors.length)throw Error(errors.join('\n'));
   const state=await page.evaluate(()=>({setup:G.setup._inSetup,step:G.setup._stepIdx,roll:G.setup.rollResults[G.pf],auto:G.setup._autoClaimEnabled,
     result:G.result,round:G.round,fk:G_step.currentFk,phase:G_step.phase,idx:G_step.idx}));
   if(action%25===0)console.log('E2E',action,JSON.stringify(state));
   fs.writeFileSync('/tmp/nuke-e2e-progress.json',JSON.stringify(state));
   if(state.result){finished=true;break;}
   if(state.setup){
    if(state.step===0){if(!await click('#setup-actions button'))if(state.roll===undefined)await click('#roll-card-prm');}
    else if(state.step===1){if(!state.auto)await click('#step-actions button');}
    else if(state.step===2){await click('#step-actions button');}
   }else if(await page.locator('#game-start-overlay').isVisible()){
    start=await page.evaluate(()=>Object.fromEntries(G.setup.order.map(fk=>[fk,{territories:Object.values(G.territories).filter(t=>t.owner===fk).length,soldiers:Object.values(G.territories).filter(t=>t.owner===fk).reduce((n,t)=>n+t.soldiers,0),nukes:Object.values(G.territories).filter(t=>t.owner===fk&&t.hasNuclear).length}])));
    await click('#game-start-overlay button');
   }else if(await page.locator('#maint-modal').isVisible()){
    await click('#maint-confirm');
   }else if(await page.locator('#dmodal.open').isVisible()){
    if(!await click('#unit-sel-def > button'))if(!await click('#btn-roll'))await click('#btn-cancel');
   }else if(state.fk==='prm'){
    // All choices are made through the same visible buttons a player uses.
    const buttons=page.locator('#step-actions button:enabled');
    const next=buttons.filter({hasText:/COLOCAR REFUERZOS|AUTO-DISTRIBUIR|SIGUIENTE|PASAR A FASE FINAL|LANZAR DADOS DE MANTENIMIENTO/}).first();
    if(await next.isVisible()&&await next.isEnabled()){actions.push(await next.innerText());await next[touch?'tap':'click']();}
   }
   await page.waitForTimeout(25);
  }
  assert.ok(start,'El setup debe completarse por interfaz');
  for(const [fk,assets]of Object.entries(start)){assert.equal(assets.territories,20);assert.equal(assets.soldiers,60);assert.equal(assets.nukes,fk==='lib'?0:4);}
  assert.ok(finished,'Partida no finalizada dentro de la cota de acciones');
  await page.locator('#game-result').waitFor();
  const final=await page.evaluate(()=>({result:G.result,phase:G.phase,gameOver:G.gameOver,step:G_step.idx,round:G.round,turn:G.currentFaction}));
  assert.equal(final.gameOver,true);assert.equal(final.phase,'finished');assert.ok(['prm','imp','lib'].includes(final.result.winner));
  const legitimate=await page.evaluate(()=>{const winner=G.result.winner;const owned=Object.values(G.territories).filter(t=>t.owner===winner);const bases=Object.values(G.territories).filter(t=>t.hasNuclear).length;const alive=G.setup.order.filter(fk=>G.factions[fk].alive!==false);return alive.length===1||winner==='prm'&&bases>0&&owned.filter(t=>t.hasNuclear).length>=Math.ceil(bases/2)||winner==='lib'&&bases<=G.playerCount||winner==='imp'&&REGIONS.filter(r=>TERRITORIES_DEF.filter(t=>t.region===r.id).every(t=>G.territories[t.id].owner===winner)).length>=5});
  assert.ok(legitimate,'La condición de victoria debe cumplirse en el estado real');
  assert.equal(await page.locator('#btn-next').isDisabled(),true);
  assert.deepEqual(await page.evaluate(()=>({result:G.result,phase:G.phase,gameOver:G.gameOver,step:G_step.idx,round:G.round,turn:G.currentFaction})),final);
  await page.screenshot({path:artifact+'-victory.png'});
  fs.writeFileSync(artifact+'-report.json',JSON.stringify({seed:Number(process.env.NUKE_E2E_SEED||123),viewport,touch,start,final,actions,errors},null,2));
  console.log(`PASS E2E real ${viewport.width}x${viewport.height} ${touch?'touch':'mouse'}: lobby → dados/setup 60 territorios → turnos → victoria ${final.result.winner}, ronda ${final.round}; ${actions.length} acciones UI; 0 mutaciones del estado desde el test`);
 }finally{
  if(context)await context.tracing.stop({path:artifact+'-trace.zip'});
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
 }
})().catch(err=>{console.error(err);process.exitCode=1;});
