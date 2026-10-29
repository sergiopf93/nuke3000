// Cinematic adapter: authoritative events in, finite presentation out. No game-state writes.
const BattleScene = (() => {
  const types = {sol:'soldier',mech:'mech',air:'aircraft',scorp:'scorpion'};
  const keys = {sol:'soldiers',mech:'mechs',air:'aircraft',scorp:'scorpions'};
  const names = {sol:'Soldado',mech:'Meca',air:'Aeronave',scorp:'Escorpión'};
  const copy = value => JSON.parse(JSON.stringify(value));
  let current = null, camera = null;
  const duration = ms => typeof DiceSequence !== 'undefined' ? DiceSequence.attackDuration(ms) : 0;
  function node(tag,className,text) { const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el; }
  function territory(id) { return typeof TERRITORIES_DEF !== 'undefined' ? TERRITORIES_DEF.find(t=>t.id===id) : null; }
  function faction(fk) { return typeof FDATA !== 'undefined' ? FDATA[fk] : null; }
  function armyCount(army) { return Object.values(keys).reduce((n,key)=>n+(army?.[key]||0),0); }
  function planRound(result) {
    const remaining={attacker:(result.losses?.attacker||[]).map(copy),defender:(result.losses?.defender||[]).map(copy)};
    return (result.pairs||[]).map((pair,index)=>{
      const loser=pair.loser==='attacker'?'attacker':'defender',roll=loser==='attacker'?pair.att:pair.def;
      const at=remaining[loser].findIndex(change=>change.from===roll.type);
      const casualty=at>=0?remaining[loser].splice(at,1)[0]:null;
      return {index,attacker:copy(pair.att),defender:copy(pair.def),winner:loser==='attacker'?'defender':'attacker',loser,casualty};
    });
  }
  function wait(session,ms) {
    if(session.controller.signal.aborted||session.skipped||!duration(ms))return Promise.resolve();
    return new Promise(resolve=>{
      const done=()=>{clearTimeout(timer);session.controller.signal.removeEventListener('abort',done);session.waits.delete(done);resolve();};
      const timer=setTimeout(done,duration(ms));session.waits.add(done);session.controller.signal.addEventListener('abort',done,{once:true});
    });
  }
  function animate(session,el,frames,ms,options={}) {
    if(!el?.animate||session.skipped||session.controller.signal.aborted||!duration(ms))return null;
    try { const animation=el.animate(frames,{duration:duration(ms),easing:'ease-out',...options});session.animations.add(animation);animation.finished.then(()=>session.animations.delete(animation),()=>session.animations.delete(animation));return animation; } catch { return null; }
  }
  function cancelVisual(session) {
    session.controller.abort();session.waits.forEach(done=>done());session.animations.forEach(a=>a.cancel());session.animations.clear();
  }
  function restoreCamera(smooth=false) {
    const world=document.getElementById('world-g');const from=camera&&world?getComputedStyle(world).transform:null;
    camera?.cancel();camera=null;
    if(!smooth||!from||!world||!duration(1))return;
    const base=typeof G!=='undefined'?'translate('+G.vx+'px,'+G.vy+'px) scale('+G.vscale+')':'none';
    try { const returning=world.animate([{transform:from},{transform:base}],{duration:duration(390),easing:'ease-out'});camera=returning;returning.finished.then(()=>{returning.cancel();if(camera===returning)camera=null;},()=>{}); } catch {}
  }
  function focusCamera(session) {
    restoreCamera();const t=territory(session.ctx.targetId),world=document.getElementById('world-g'),wrap=document.getElementById('map-wrap');
    if(!t||!world||!wrap||!duration(1)||!world.animate)return;
    const points=[t,...(session.ctx.sourceIds||[]).map(territory).filter(Boolean)];
    const minX=Math.min(...points.map(t=>t.cx))-65,maxX=Math.max(...points.map(t=>t.cx))+65,minY=Math.min(...points.map(t=>t.cy))-65,maxY=Math.max(...points.map(t=>t.cy))+65;
    const scale=Math.min(2.4,wrap.clientWidth/(maxX-minX+60),wrap.clientHeight/(maxY-minY+60));
    const from=typeof G!=='undefined'?'translate('+G.vx+'px,'+G.vy+'px) scale('+G.vscale+')':'none';
    try { camera=world.animate([{transform:from},{transform:'translate('+(wrap.clientWidth/2-(minX+maxX)/2*scale)+'px,'+(wrap.clientHeight/2-(minY+maxY)/2*scale)+'px) scale('+scale+')'}],{duration:duration(870),fill:'forwards',easing:'ease-in-out'}); } catch {}
  }

  function position(session) {
    const wrap=document.getElementById('map-wrap'),rect=wrap?.getBoundingClientRect();if(!rect)return;
    Object.assign(session.root.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
  }
  function drawUnit(session,unit) {
    if(unit.el)return unit.el;
    const el=node('div','cin-unit cin-'+unit.side);el.dataset.unitId=unit.id;el.dataset.type=unit.type;el.dataset.side=unit.side;el.dataset.alive=String(unit.alive);
    const image=node('img');image.src='assets/cinematic/'+types[unit.type]+'.png';image.alt='';image.draggable=false;
    el.append(image,node('span','cin-unit-label',names[unit.type]));session.units.append(el);unit.el=el;return el;
  }
  function arrange(session) {
    for(const side of ['att','def']) {
      const alive=session.roster[side].filter(u=>u.alive);
      // Keep surviving representatives in their slots across rolls and rounds.
      const visible=alive.filter(u=>u.el&&!u.el.hidden).sort((a,b)=>a.slot-b.slot).slice(0,9);
      const include=unit=>{if(unit&&visible.length<9&&!visible.includes(unit))visible.push(unit);};
      alive.filter(u=>u.participant).forEach(include);
      for(const type of ['scorp','mech','air','sol'])alive.filter(u=>u.type===type).slice(0,2).forEach(include);
      if(alive.length<=9)alive.forEach(include);
      alive.forEach(u=>{if(u.el)u.el.hidden=!visible.includes(u);});
      const occupied=new Set(visible.filter(u=>u.slot!==undefined).map(u=>u.slot));
      visible.forEach(unit=>{if(unit.slot===undefined){unit.slot=Array.from({length:9},(_,i)=>i).find(i=>!occupied.has(i));occupied.add(unit.slot);}});
      visible.forEach(unit=>{
        const index=unit.slot,el=drawUnit(session,unit),col=index%3,row=Math.floor(index/3);
        el.hidden=false;el.style.setProperty('--unit-col',col);el.style.setProperty('--unit-row',row);el.style.setProperty('--compact-col',index%5);el.style.setProperty('--compact-row',Math.floor(index/5));el.style.left=(side==='att'?17+col*9:83-col*9)+'%';el.style.top=(62+row*9)+'%';el.style.zIndex=String(5+row);
      });

    }
  }
  function syncArmy(session,side,army) {
    for(const [type,key]of Object.entries(keys)) {
      const live=session.roster[side].filter(u=>u.alive&&u.type===type),wanted=army?.[key]||0;
      live.slice(wanted).forEach(u=>{u.alive=false;if(u.el){u.el.dataset.alive='false';u.el.classList.add('cin-fallen');}});
      for(let i=live.length;i<wanted;i++)session.roster[side].push({id:session.id+':'+side+':'+session.serial++,side,type,alive:true,participant:false,el:null});
    }
  }
  function counts(session,attacker,defender) {
    for(const [side,army]of [['att',attacker],['def',defender]]){
      const text=Object.entries(keys).filter(([,key])=>army?.[key]>0).map(([type,key])=>army[key]+' '+names[type]).join(' · ')||'Sin unidades';
      session.root.querySelector('[data-cin-count="'+side+'"]').textContent=armyCount(army)+' · '+text;
    }
  }
  function skip(session=current) {
    if(!session)return;session.root.querySelector('.ds-controls').hidden=true;session.skipped=true;cancelVisual(session);session.effects.replaceChildren();DiceSequence.skip();restoreCamera();session.root.classList.add('cin-skipped');
    document.dispatchEvent(new CustomEvent('battle-scene-skip',{detail:{targetId:session.ctx.targetId,round:session.ctx.round}}));
  }
  function makeSession(ctx,before,kind='battle') {
    const root=node('section','nuke-cinematic');root.dataset.kind=kind;root.setAttribute('role','region');root.setAttribute('aria-label',kind==='battle'?'Batalla cinematográfica':kind==='nuclear'?'Accidente nuclear':'Ataque con misiles');
    const route=(ctx.sourceIds||[]).map(id=>typeof terName==='function'?terName(id):id).join(' + ');
    const header=node('div','cin-header'),title=node('div','cin-title',(route?route+' → ':'')+((typeof terName==='function'?terName(ctx.targetId):ctx.targetId)||'COMBATE'));
    header.append(title,DiceSequence.controls({onSkip:()=>skip(session)}));root.append(header);
    const namesBar=node('div','cin-armies');
    for(const [side,fk,label]of [['att',ctx.attFk,'ATACANTE'],['def',ctx.defFk,'DEFENSOR']]){
      const name=node('div','cin-army-name cin-'+side);name.style.setProperty('--faction-color',faction(fk)?.color||'#bdc9d3');name.append(node('small',null,label),node('strong',null,faction(fk)?.name||label));namesBar.append(name);
    }
    root.append(namesBar);
    const units=node('div','cin-units'),effects=node('div','cin-effects'),dice=node('div','cin-dice'),footer=node('div','cin-footer'),status=node('p','cin-status','Ejércitos desplegados sobre el territorio');status.setAttribute('aria-live','polite');
    const counters=node('div','cin-counters');for(const side of ['att','def']){const el=node('span');el.dataset.cinCount=side;counters.append(el);}footer.append(status,counters);root.append(units,effects,dice,footer);
    const session={id:ctx.visualId||[ctx.stepKey||'',ctx.attFk,ctx.targetId].join(':'),ctx:copy(ctx),root,units,effects,dice,status,roster:{att:[],def:[]},serial:0,controller:new AbortController(),waits:new Set(),animations:new Set(),queue:Promise.resolve(),seen:new Set(),skipped:false,round:0};
    syncArmy(session,'att',before?.attacker||{});syncArmy(session,'def',before?.defender||{});counts(session,before?.attacker||{},before?.defender||{});arrange(session);
    document.body.append(root);document.body.classList.add('nuke-cinema');position(session);focusCamera(session);return session;
  }
  function open(ctx,before) {
    if(!ctx||typeof DiceSequence==='undefined')return;
    const id=ctx.visualId||[ctx.stepKey||'',ctx.attFk,ctx.targetId].join(':');
    if(current?.id===id&&current.root.isConnected){current.ctx={...current.ctx,...copy(ctx)};return;}
    if(typeof V4Game!=='undefined'&&ctx.sourceIds?.length)V4Game.markAttack(ctx.sourceIds,ctx.targetId,ctx.attFk,before?.attacker);
    close(false);const armies=before||{attacker:{},defender:{}};current=makeSession(ctx,copy(armies));
  }
  function unitForRoll(session,side,roll) {
    const units=session.roster[side].filter(u=>u.alive&&u.type===roll.type);return units[roll.index||0]||null;
  }
  async function projectile(session,source,target,winner) {
    if(!source?.el||!target?.el||session.skipped||session.controller.signal.aborted||!duration(1))return;
    const box=session.root.getBoundingClientRect(),a=source.el.getBoundingClientRect(),b=target.el.getBoundingClientRect();
    const from={x:a.left-box.left+a.width*.5,y:a.top-box.top+a.height*.45},to={x:b.left-box.left+b.width*.5,y:b.top-box.top+b.height*.45};
    const shot=node('span','cin-shot cin-shot-'+source.type);Object.assign(shot.dataset,{sourceUnit:source.id,targetUnit:target.id,winnerSide:winner,sourceX:String(from.x),targetX:String(to.x)});
    const angle=Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI;
    Object.assign(shot.style,{left:from.x+'px',top:from.y+'px',transform:'rotate('+angle+'deg)'});session.effects.append(shot);
    animate(session,shot,[{left:from.x+'px',top:from.y+'px',opacity:1},{left:to.x+'px',top:to.y+'px',opacity:1}],520,{easing:'ease-in',fill:'forwards'});
    await wait(session,520);shot.remove();await blast(session,to,565);
  }
  async function blast(session,point,ms=900,nuclear=false,interception=false) {
    if(session.skipped||session.controller.signal.aborted||!duration(1))return;
    const el=node('span',nuclear?'cin-blast cin-nuclear':interception?'cin-blast cin-intercept-spark':'cin-blast');el.dataset.effect=interception?'interception':nuclear?'nuclear':'impact';el.style.left=point.x+'px';el.style.top=point.y+'px';session.effects.append(el);
    animate(session,el,[{opacity:0,transform:'translate(-50%,-50%) scale(.15)'},{opacity:.9,transform:'translate(-50%,-50%) scale(1)',offset:.25},{opacity:0,transform:'translate(-50%,-50%) scale(2.1)'}],ms);
    await wait(session,ms);el.remove();
  }
  async function casualty(session,unit,change) {
    if(!unit||!change)return;
    if(!unit.el){if(change.to)unit.type=change.to;else unit.alive=false;return;}
    const el=unit.el;el.classList.add('cin-hit');await wait(session,305);el.classList.remove('cin-hit');
    if(change.to){
      animate(session,el,[{filter:'brightness(1)',opacity:1},{filter:'brightness(2)',opacity:.3,offset:.5},{filter:'brightness(1)',opacity:1}],850);
      await wait(session,390);unit.type=change.to;el.dataset.type=unit.type;el.querySelector('img').src='assets/cinematic/'+types[unit.type]+'.png';el.querySelector('.cin-unit-label').textContent=names[unit.type];
      await wait(session,350);
    }else{
      unit.alive=false;el.dataset.alive='false';el.style.zIndex='1';el.classList.add('cin-fallen');
      animate(session,el,[{transform:'translate(-50%,-65%) rotate(0deg)',opacity:1},{transform:'translate(-50%,-10%) rotate(85deg) scaleY(.65)',opacity:.25}],900,{fill:'forwards'});await wait(session,900);el.remove();unit.el=null;
    }
  }
  async function runRound(session,ctx,result) {
    if(current!==session)return {status:'cancelled'};
    session.round++;session.root.querySelector('.ds-controls').hidden=session.skipped||!duration(1);
    const planned=planRound(result),assigned=planned.map(event=>({...event,a:unitForRoll(session,'att',event.attacker),d:unitForRoll(session,'def',event.defender)}));
    for(const u of session.roster.att.concat(session.roster.def))u.participant=false;
    assigned.forEach(event=>{if(event.a)event.a.participant=true;if(event.d)event.d.participant=true;});arrange(session);
    session.status.textContent='RONDA '+(ctx.round||session.round)+' · Preparar D6 / D12 / D20';
    const dice=[];
    for(const [side,rolls]of [['att',result.attRolls||[]],['def',result.defRolls||[]]])for(const roll of rolls)dice.push({kind:'d'+roll.sides,value:roll.value,raw:roll.raw,effective:roll.effective??roll.value-(roll.bonus||0),bonus:roll.bonus||0,label:names[roll.type]+' · '+(side==='att'?'ATQ':'DEF'),side});
    await wait(session,session.round===1?1200:500);
    await DiceSequence.play({dice,cause:'RONDA '+(ctx.round||session.round),container:session.dice,signal:session.controller.signal,pace:DiceSequence.attackPace,controls:false});
    for(const event of assigned){
      const winner=event.winner==='attacker'?'att':'def',source=winner==='att'?event.a:event.d,target=winner==='att'?event.d:event.a;
      session.status.textContent=(winner==='att'?'ATAQUE':'DEFENSA')+' GANA'+(event.casualty?' · '+names[event.casualty.from]+' → '+(names[event.casualty.to]||'BAJA'):'');
      const rollIndexes={att:(result.attRolls||[]).findIndex(d=>d.type===event.attacker.type&&d.index===event.attacker.index),def:(result.defRolls||[]).findIndex(d=>d.type===event.defender.type&&d.index===event.defender.index)};
      for(const side of ['att','def'])session.dice.querySelectorAll('.ds-die[data-side="'+side+'"]').forEach((el,index)=>{el.dataset.comparison=index===rollIndexes[side]?(side===winner?'winner':'loser'):'';});
      await wait(session,1200);await projectile(session,source,target,winner);await casualty(session,target,event.casualty);
    }
    syncArmy(session,'att',result.attacker);syncArmy(session,'def',result.defender);arrange(session);counts(session,result.attacker,result.defender);
    session.status.textContent=result.status==='conquered'?'TERRITORIO CONQUISTADO':result.status==='repelled'?'LA DEFENSA RESISTE':'RONDA RESUELTA · Supervivientes en posición';
    session.root.querySelector('.ds-controls').hidden=true;
    await wait(session,1800);return {status:session.skipped?'skipped':session.controller.signal.aborted?'cancelled':'completed'};
  }
  function result(ctx,result) {
    if(!ctx||!result)return Promise.resolve({status:'cancelled'});
    if(!current)open(ctx,ctx.before);const session=current;if(!session)return Promise.resolve({status:'cancelled'});
    const round=ctx.history?.length||ctx.round||1,key=String(round)+':'+JSON.stringify(result);
    if(session.seen.has(key))return session.queue;session.seen.add(key);
    const snapshot=copy(result),context={...copy(ctx),round};
    session.queue=session.queue.then(()=>runRound(session,context,snapshot)).catch(error=>{console.warn('[NUKE scene]',error);return {status:'cancelled'};});return session.queue;
  }
  function close(smooth=true) {
    const session=current;current=null;if(session){cancelVisual(session);session.root.remove();}
    restoreCamera(smooth);document.body.classList.remove('nuke-cinema');
  }
  async function missileFlight(session,from,to,interceptor=false,park=false) {
    if(session.skipped||session.controller.signal.aborted||!duration(1))return;
    const el=node('div',interceptor?'cin-missile cin-interceptor':'cin-missile'),image=node('img');image.src='assets/cinematic/missile.png';image.alt=interceptor?'Misil interceptor':'Misil atacante';el.append(image);
    const angle=Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI+90;el.style.transform='translate(-50%,-50%) rotate('+angle+'deg)';Object.assign(el.style,{left:from.x+'px',top:from.y+'px'});session.effects.append(el);
    animate(session,el,[{left:from.x+'px',top:from.y+'px'},{left:to.x+'px',top:to.y+'px'}],1000,{easing:'linear'});await wait(session,1000);
    Object.assign(el.style,{left:to.x+'px',top:to.y+'px'});
    if(park&&!session.skipped&&!session.controller.signal.aborted){session.parkedMissile=el;}else el.remove();
  }
  function missilePoint(session,id,fallback) {
    const t=territory(id),el=t&&document.getElementById('tg-'+id),shape=el?.querySelector('polygon');
    if(shape?.getScreenCTM){const svg=document.getElementById('map-svg'),p=svg?.createSVGPoint();if(p){p.x=t.cx;p.y=t.cy;const screen=p.matrixTransform(shape.getScreenCTM()),rect=session.root.getBoundingClientRect();return {x:screen.x-rect.left,y:screen.y-rect.top};}}
    return fallback;
  }
  async function nuclear(session,explosion) {
    const centers=explosion?.centers||[];for(const id of centers){
      if(current!==session)return;
      session.status.textContent='ACCIDENTE NUCLEAR · '+(typeof terName==='function'?terName(id):id);
      const p=missilePoint(session,id,{x:session.root.clientWidth/2,y:session.root.clientHeight*.6});await blast(session,p,1200,true);await wait(session,305);
    }
  }
  function presentMissile({type,event={},dice,explosion}={}) {
    const targetId=event.targetId||event.targetTerritory,visualId='missile:'+(event.id||targetId);
    if(!current||current.id!==visualId){
      close(false);const before=event.beforeImpact||event.before||{};if(typeof V4Game!=='undefined')V4Game.markAttack([event.sourceTerritory||event.sourceId].filter(Boolean),targetId,event.attFk);current=makeSession({visualId,targetId,sourceIds:[event.sourceTerritory||event.sourceId].filter(Boolean),srcId:event.sourceTerritory||event.sourceId,attFk:event.attFk,defFk:event.defFk},{attacker:{},defender:before},'missile');
      current.status.textContent='MISIL V4 · '+(event.target==='mech'?'1 meca':'hasta 3 soldados');
      const base=node('img','cin-base');base.src=ASSETS.nuclear;base.alt='Base nuclear';base.hidden=!before.hasNuclear;current.units.append(base);
    }
    const session=current,snapshot=copy(event),ex=explosion?copy(explosion):null,provided=dice?copy(dice):null;
    const key=type+':'+(snapshot.revision??'')+':'+JSON.stringify(provided||[]);if(session.seen.has(key))return session.queue;session.seen.add(key);
    session.queue=session.queue.then(async()=>{
      if(current!==session)return {status:'cancelled'};
      session.root.querySelector('.ds-controls').hidden=session.skipped||!duration(1);
      if(type==='launch'&&camera)await Promise.race([camera.finished.catch(()=>{}),wait(session,1200)]);
      const w=session.root.clientWidth,h=session.root.clientHeight;
      if(!session.missilePath){const origin=missilePoint(session,snapshot.sourceTerritory||snapshot.sourceId,{x:w*.12,y:h*.7}),destination=missilePoint(session,targetId,{x:w*.78,y:h*.65}),mid={x:origin.x+(destination.x-origin.x)*.4,y:origin.y+(destination.y-origin.y)*.4},collision={x:origin.x+(destination.x-origin.x)*.5,y:origin.y+(destination.y-origin.y)*.5};session.missilePath={origin,destination,mid,collision};}
      const {origin,destination,mid,collision}=session.missilePath;
      if(type==='launch'){
        session.status.textContent='MISIL LANZADO · Objetivo elegido: '+(snapshot.target==='mech'?'1 meca':'hasta 3 soldados');await missileFlight(session,origin,mid,false,true);
      }else if(type==='interception'){
        const raw=snapshot.interceptions?.at(-1);session.status.textContent='INTENTO DE INTERCEPCIÓN '+(snapshot.interceptions?.length||1)+' · D6 ≥ 4';
        await DiceSequence.play({dice:provided||[{kind:'d6',value:raw,raw,label:'Intercepción',side:'def'}],cause:'INTERCEPCIÓN D6',container:session.dice,signal:session.controller.signal,pace:DiceSequence.attackPace,controls:false});
        session.status.textContent=snapshot.blocked?'MISIL INTERCEPTADO · Sin bajas':'INTERCEPCIÓN FALLIDA · El defensor puede intentarlo de nuevo';
        if(snapshot.blocked){session.root.dataset.missileOutcome='intercepted';session.parkedMissile?.remove();session.parkedMissile=null;await Promise.all([missileFlight(session,mid,collision),missileFlight(session,destination,collision,true)]);const hit=node('span');hit.dataset.missileEvent='intercept';session.effects.append(hit);await blast(session,collision,700,false,true);hit.remove();}await wait(session,1000);
      }else if(type==='impact'){
        session.status.textContent='IMPACTO AUTOMÁTICO · Sin tirada adicional';session.parkedMissile?.remove();session.parkedMissile=null;session.root.dataset.missileOutcome='impact';await missileFlight(session,mid,destination);await blast(session,destination,1200);
        const victims=session.roster.def.filter(u=>u.alive&&u.type===snapshot.target).slice(0,snapshot.destroyed||0);
        for(const victim of victims)await casualty(session,victim,{from:victim.type,to:null});
        const directAfter=copy(snapshot.beforeImpact||snapshot.before||{});const targetKey=keys[snapshot.target];if(targetKey)directAfter[targetKey]=Math.max(0,(directAfter[targetKey]||0)-(snapshot.destroyed||0));
        syncArmy(session,'def',directAfter);arrange(session);counts(session,{},directAfter);
        session.status.textContent='IMPACTO · '+(snapshot.destroyed||0)+' '+(snapshot.target==='mech'?'meca':'soldados')+' destruidos';await wait(session,1000);
      }else if(type==='accident'){
        const raw=snapshot.accidentRoll;await DiceSequence.play({dice:provided||[{kind:'d12',value:raw,raw,label:'Accidente nuclear',side:'def'}],cause:'ACCIDENTE NUCLEAR D12',container:session.dice,signal:session.controller.signal,pace:DiceSequence.attackPace,controls:false});
        session.status.textContent=raw===1?'ACCIDENTE NUCLEAR':'Sin accidente';if(ex){await nuclear(session,ex);if(snapshot.after){syncArmy(session,'def',snapshot.after);arrange(session);counts(session,{},snapshot.after);}const base=session.units.querySelector('.cin-base');if(base)base.hidden=true;}await wait(session,1000);
      }else if(type==='end'){
        session.status.textContent=snapshot.blocked?'MISIL INTERCEPTADO · 0 bajas':'MISIL RESUELTO · '+(snapshot.destroyed||0)+' bajas';await wait(session,1200);if(current===session)close();
      }
      session.root.querySelector('.ds-controls').hidden=true;
      return {status:session.skipped?'skipped':session.controller.signal.aborted?'cancelled':'completed'};
    }).catch(error=>{console.warn('[NUKE scene]',error);return {status:'cancelled'};});return session.queue;
  }
  function effect(kind,data={}) {
    if(!['nuclear','nuclearChain','explosion'].includes(kind)||!data.centers?.length)return Promise.resolve({status:'completed'});
    const targetId=data.targetId||data.centers[0];
    if(!current){current=makeSession({visualId:'nuclear:'+targetId,targetId},{attacker:{},defender:{}},'nuclear');const session=current;session.queue=nuclear(session,copy(data)).then(()=>wait(session,700)).then(()=>{if(current===session)close();return {status:'completed'};});return session.queue;}
    const session=current;session.queue=session.queue.then(()=>nuclear(session,copy(data)));return session.queue;
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&current){skip(current);}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&current)skip(current);});
  document.addEventListener('dice-sequence-mode',()=>{if(!duration(1)&&current)skip(current);});
  if(typeof window!=='undefined')window.addEventListener('resize',()=>{restoreCamera();if(current){position(current);skip(current);}});
  return {open,result,close,duration,effect,presentMissile,planRound};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BattleScene;
