// Real DOM regressions for compact V4 presentation; engine events remain authoritative.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=process.env.NUKE_COMPACT_EVIDENCE||'/tmp/nuke-compact-evidence';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname;const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});const report=[];try{
 const origin='http://127.0.0.1:'+server.address().port;
 for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:667,height:375},{width:390,height:844}]){
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,serviceWorkers:'block',recordVideo:{dir:out,size:viewport}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',r=>{const u=r.request().url();if(!u.startsWith(origin)&&!u.startsWith('data:'))return r.abort();if(u.endsWith('/js/firebase-config.js'))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
  await page.goto(origin);await page.locator('#faction-grid [data-f="imp"]').tap();await page.locator('#pname').fill('QA compacta');await page.locator('#btnstart').tap();
  await page.evaluate(()=>{hideSetupPanel();clearInteractionModes();G.setup={order:['imp','lib','clt'],_inSetup:false};G.awaitingStart=false;G.gameOver=false;G.phase='combat';G_step={currentFk:'imp',phase:'combat',idx:1,isMyTurn:true};updatePhaseBanner('imp');});
  await page.locator('#game-settings').tap();assert.equal(await page.locator('[data-dice-mode]').count(),1);await page.locator('[data-dice-mode]').selectOption('fast');await page.locator('#animation-settings button').tap();
  assert.equal(await page.evaluate(()=>DiceSequence.mode()),'fast');
  await page.evaluate(()=>{
   window.armies={attacker:{soldiers:4,mechs:2,aircraft:1,scorpions:1},defender:{soldiers:4,mechs:2,aircraft:1,scorpions:1}};
   window.ctx={visualId:'compact-persistent',stepKey:currentStepKey(),targetId:'01_02',attFk:'imp',defFk:'lib',round:1};
   window.mapBefore=document.querySelector('#world-g').innerHTML;window.shotDurations=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.matches('.cin-shot'))shotDurations.push(options.duration);return animate.call(this,frames,options);};
   BattleScene.open(ctx,armies);window.unitRefs=new Map([...document.querySelectorAll('.cin-unit')].map(el=>[el.dataset.unitId,el]));window.unitSlots=new Map([...unitRefs].map(([id,el])=>[id,[el.style.left,el.style.top]]));
   window.result=RulesV4.round(armies.attacker,armies.defender,{attFk:'imp',defFk:'lib',rules:RULES.combat,random:()=>.4});window.presentation=BattleScene.result(ctx,result);
  });
  await page.locator('.dice-sequence[data-state="rolling"]').waitFor();
  const animationFrames=await page.evaluate(()=>document.querySelector('.ds-die').getAnimations().flatMap(a=>a.effect.getKeyframes()).map(f=>f.transform));assert.ok(animationFrames.length);assert.ok(animationFrames.every(t=>!/(rotate[XY]|matrix3d|perspective)/.test(t)));
  const rolling=await page.evaluate(()=>({units:[...document.querySelectorAll('.cin-unit[data-alive="true"]')].filter(el=>!el.hidden).length,modes:document.querySelectorAll('.nuke-cinematic select').length}));assert.ok(rolling.units>=8);assert.equal(rolling.modes,0);
  await page.locator('.dice-sequence[data-state="result"]').waitFor();
  const layout=await page.evaluate(()=>{
   const rect=el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
   const dice=[...document.querySelectorAll('.cin-dice .ds-die')].map(rect),units=[...document.querySelectorAll('.cin-unit[data-alive="true"]')].filter(el=>!el.hidden).map(rect),scene=rect(document.querySelector('.nuke-cinematic'));
   const overlaps=dice.flatMap((d,i)=>units.map((u,j)=>({i,j,area:Math.max(0,Math.min(d.right,u.right)-Math.max(d.x,u.x))*Math.max(0,Math.min(d.bottom,u.bottom)-Math.max(d.y,u.y))}))).filter(v=>v.area>1);
   return {scene,overlaps,dice,units,header:rect(document.getElementById('hdr')),actions:rect(document.getElementById('rp')),faces:[...document.querySelectorAll('.ds-face')].map(el=>({tag:el.tagName,value:el.textContent,parent:el.parentNode.tagName})),detailOpen:!!document.querySelector('.ds-details[open]'),summary:document.querySelector('.ds-summary').textContent};
  });
  assert.deepEqual(layout.overlaps,[],'Dados y figuras tienen carriles separados');assert.ok(layout.faces.every(f=>f.tag==='text'&&f.parent==='svg'));assert.equal(layout.detailOpen,false);assert.equal(layout.summary,'Tirada resuelta');
  for(const d of layout.dice){assert.ok(d.x>=layout.scene.x&&d.right<=layout.scene.right+1);assert.ok(d.y>=layout.scene.y&&d.bottom<=layout.scene.bottom+1);}
  if(viewport.width>viewport.height&&viewport.height<500){assert.ok(layout.scene.height<=viewport.height*.5);assert.ok(layout.actions.height>=120);}
  await page.screenshot({path:out+'/battle-'+viewport.width+'.png'});
  await page.evaluate(()=>presentation);
  const persistence=await page.evaluate(()=>{const refs=[...unitRefs].filter(([,el])=>el.dataset.alive==='true');return {same:refs.every(([id,el])=>document.querySelector('[data-unit-id="'+id+'"]')===el&&el.isConnected&&!el.hidden),alive:[...document.querySelectorAll('.cin-unit[data-alive="true"]')].filter(el=>!el.hidden).length,slots:refs.every(([id,el])=>JSON.stringify([el.style.left,el.style.top])===JSON.stringify(unitSlots.get(id))),mapSame:mapBefore===document.querySelector('#world-g').innerHTML};});assert.equal(persistence.same,true);assert.equal(persistence.slots,true,'Cada superviviente mantiene su posición al cambiar de ronda');assert.equal(await page.evaluate(()=>shotDurations.length>0&&shotDurations.every(ms=>Math.abs(ms-520/3)<1)),true,'Disparos 13% más rápidos');assert.ok(persistence.alive>0);assert.equal(persistence.mapSame,true);
  await page.evaluate(()=>{ctx.round++;armies={attacker:result.attacker,defender:result.defender};result=RulesV4.round(armies.attacker,armies.defender,{attFk:'imp',defFk:'lib',rules:RULES.combat,random:()=>.7});window.presentation=BattleScene.result(ctx,result);});
  await page.locator('.dice-sequence[data-state="rolling"]').waitFor();await page.locator('.cin-header [data-dice-skip]').tap();await page.evaluate(()=>presentation);
  assert.equal(await page.evaluate(()=>[...unitRefs].filter(([,el])=>el.dataset.alive==='true').every(([id,el])=>document.querySelector('[data-unit-id="'+id+'"]')===el&&!el.hidden)),true);
  await page.evaluate(()=>BattleScene.close(false));assert.equal(await page.locator('.nuke-cinematic').count(),0);assert.equal(await page.evaluate(()=>DiceSequence.mode()),'fast');
  await page.evaluate(()=>DiceSequence.beginGame());assert.equal(await page.evaluate(()=>DiceSequence.mode()),'fast');
  // Large armies keep bounded, stable representatives and exact counters.
  const large=await page.evaluate(async()=>{DiceSequence.setMode('minimal');const army={soldiers:100,mechs:100,aircraft:100,scorpions:100};const context={visualId:'large',targetId:'01_02',attFk:'imp',defFk:'lib',round:1};BattleScene.open(context,{attacker:army,defender:army});const refs=[...document.querySelectorAll('.cin-unit')];const event=RulesV4.round(army,army,{attFk:'imp',defFk:'lib',rules:RULES.combat,random:()=>.4});await BattleScene.result(context,event);const data={bounded:document.querySelectorAll('.cin-unit').length<=18,stable:refs.every(el=>el.isConnected&&!el.hidden),counts:[...document.querySelectorAll('[data-cin-count]')].map(el=>el.textContent)};BattleScene.close(false);return data;});assert.equal(large.bounded,true);assert.equal(large.stable,true);assert.ok(large.counts.every(text=>text.startsWith('400 ·')));
  // Reduced motion settles authoritative results immediately and retains detail.
  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced=await page.evaluate(async()=>{const host=document.createElement('div');document.body.append(host);const r=await DiceSequence.play({container:host,dice:[{kind:'d20',value:6,raw:2,effective:5,bonus:1,label:'Escorpión'}]});const data={status:r.status,value:host.querySelector('.ds-face').textContent,detail:host.querySelector('.ds-math').textContent,controls:host.querySelectorAll('.ds-controls').length};host.remove();return data;});assert.equal(reduced.status,'completed');assert.equal(reduced.value,'6');assert.match(reduced.detail,/natural 2, mínimo aplicado 5, bono 1, total 6/);assert.equal(reduced.controls,0);
  assert.deepEqual(errors,[]);report.push({viewport,layout,persistence,reduced,errors,video:'compact-'+viewport.width+'.webm'});const video=page.video();await context.close();await video.saveAs(out+'/compact-'+viewport.width+'.webm');console.log('PASS compact '+viewport.width+'×'+viewport.height);
 }
 fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
