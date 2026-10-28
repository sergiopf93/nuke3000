// Presentation only: no random rolls, domain mutations or turn callbacks.
const BattleScene=(()=>{
 const names={sol:'Soldado',mech:'Meca',air:'Aeronave',scorp:'Escorpión'};
 const keys={sol:'soldiers',mech:'mechs',air:'aircraft',scorp:'scorpions'};
 const shapes={
 sol:'<circle cx="40" cy="19" r="9"/><path d="M29 30h22l7 25-10 2-2-13v18l12 17H45l-6-14-5 14H22l11-22-3-13-6 12-8-6z"/><path d="M45 35h27v8H45z"/>',
 mech:'<path d="M25 15h30l9 13-3 29H21l-3-29zM23 57h14v19H16v-9zm20 0h14l7 19H43zM9 29h13v23H5V38zm52 0h13v23H59z"/><path d="M30 23h20v10H30z" fill="#101820"/>',
 air:'<path d="M35 18h10l7 22 24 13-3 12-26-8-7 17-7-17-26 8-3-12 24-13z"/><circle cx="17" cy="39" r="13"/><circle cx="63" cy="39" r="13"/><circle cx="17" cy="39" r="7" fill="#101820"/><circle cx="63" cy="39" r="7" fill="#101820"/>',
 scorp:'<path d="M23 29h34l8 23-12 12H27L15 52zM26 29V17h10v12zm5-17h39v9H31zM22 49 9 56 3 76h9l8-15 13-6zm36 0 13 7 6 20h-9l-8-15-13-6zM34 60l-6 17h9l4-15 4 15h9l-8-17z"/>'};
 let root=null,ctx=null,before=null,animations=[],camera=null,skipped=false;
 let mode='normal';try{mode=localStorage.getItem('nuke-animation-mode')||'normal';}catch{}
 const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const minimal=()=>mode==='minimal'||reduce()||document.hidden||skipped;
 function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
 function animate(el,frames,options){if(minimal()||!el?.animate)return;try{const a=el.animate(frames,{...options,delay:(options.delay||0)/(mode==='fast'?3:1),duration:(options.duration||500)/(mode==='fast'?3:1)});animations.push(a);a.finished.then(()=>{animations=animations.filter(x=>x!==a);},()=>{});return a;}catch{}}
 function stop(){animations.forEach(a=>a.cancel());animations=[];}
 function miniature(type){const n=node('span','bs-mini');n.dataset.type=type;n.title=names[type]||type;n.setAttribute('aria-hidden','true');n.innerHTML='<svg viewBox="0 0 80 85" focusable="false"><ellipse cx="40" cy="79" rx="32" ry="5" fill="#13191c"/>'+(shapes[type]||shapes.sol)+'</svg>';return n;}
 function troops(side,army){const band=node('div','bs-band bs-'+side);band.dataset.side=side;const label=node('b','bs-side-title',side==='att'?'ATAQUE':'DEFENSA');band.append(label);const units=node('div','bs-units');for(const [type,key]of Object.entries(keys)){const n=army?.[key]||0;if(!n)continue;const squad=node('div','bs-squad');squad.dataset.type=type;squad.append(miniature(type),node('span','bs-count',n+' '+names[type]));units.append(squad);}band.append(units);return band;}
 function restore(smooth=false){
  const world=document.getElementById('world-g');
  const current=camera&&world?getComputedStyle(world).transform:null;
  camera?.cancel();camera=null;document.body.classList.remove('battle-scene-active');
  if(smooth&&current&&world&&!minimal()){
   const end=typeof G!=='undefined'?'translate('+G.vx+'px,'+G.vy+'px) scale('+G.vscale+')':'none';
   camera=animate(world,[{transform:current},{transform:end}],{duration:450,easing:'ease-out'});
   const returning=camera;
   returning?.finished.then(()=>{returning.cancel();if(camera===returning)camera=null;},()=>{});
  }
 }
 const ns='http://www.w3.org/2000/svg';
 function svg(tag,attrs={}){const el=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,String(v));return el;}
 function territory(id){return typeof TERRITORIES_DEF!=='undefined'?TERRITORIES_DEF.find(t=>t.id===id):null;}
 function backdrop(stage){
  const t=territory(ctx.targetId);if(!t)return;
  const map=svg('svg',{viewBox:[t.cx-170,t.cy-85,340,170].join(' '),preserveAspectRatio:'xMidYMid slice','aria-hidden':'true',class:'bs-map-ground'});
  map.append(svg('image',{href:'assets/tablero.jpg',width:1400,height:787}));
  for(const td of TERRITORIES_DEF)map.append(svg('use',{href:'#tg-'+td.id}));
  const ring=svg('circle',{cx:t.cx,cy:t.cy,r:47,fill:'none',stroke:'#d5b14b','stroke-width':3});map.append(ring);stage.prepend(map);
 }
 function skip(){if(!root)return;skipped=true;stop();restore();root.classList.add('bs-skipped');document.dispatchEvent(new CustomEvent('battle-scene-skip',{detail:{targetId:ctx?.targetId,round:ctx?.round}}));}

 function focusMap(){restore();if(minimal())return;const world=document.getElementById('world-g'),wrap=document.getElementById('map-wrap');const target=typeof TERRITORIES_DEF!=='undefined'?TERRITORIES_DEF.find(t=>t.id===ctx.targetId):null;if(!world||!wrap||!target)return;const scale=Math.min(2.1,Math.max(.65,wrap.clientHeight/210));const from=typeof G!=='undefined'?'translate('+G.vx+'px,'+G.vy+'px) scale('+G.vscale+')':'translate(0px,0px) scale(1)';camera=animate(world,[{transform:from},{transform:'translate('+(wrap.clientWidth/2-target.cx*scale)+'px,'+(wrap.clientHeight/2-target.cy*scale)+'px) scale('+scale+')'}],{duration:750,fill:'forwards',easing:'ease-in-out'});animations=animations.filter(a=>a!==camera);document.body.classList.add('battle-scene-active');}
 function controls(){const bar=node('div','bs-controls');const label=node('label',null,'Animación '),select=node('select');select.setAttribute('aria-label','Velocidad de animación');for(const [value,title]of [['normal','Normal'],['fast','Rápida'],['minimal','Mínima']]){const option=node('option',null,title);option.value=value;option.selected=value===mode;select.append(option);}select.onchange=()=>{mode=select.value;try{localStorage.setItem('nuke-animation-mode',mode);}catch{}if(minimal()){stop();restore();}else focusMap();};label.append(select);const skip=node('button',null,'OMITIR ESCENA');skip.type='button';skip.onclick=()=>{skipped=true;stop();restore();root?.classList.add('bs-skipped');document.dispatchEvent(new CustomEvent('battle-scene-skip',{detail:{targetId:ctx?.targetId,round:ctx?.round}}));};bar.append(label,skip);return bar;}
 function open(next,snapshot){if(!next)return;close();ctx=next;before=snapshot||{attacker:typeof G!=='undefined'?G.territories[next.srcId]:{},defender:typeof G!=='undefined'?G.territories[next.targetId]:{}};before=JSON.parse(JSON.stringify(before));skipped=false;const host=document.getElementById('combat-content');if(!host)return;root=node('section','battle-scene');root.setAttribute('aria-label','Escena de combate');for(const [side,fk]of [['att',next.attFk],['def',next.defFk]]){const color=typeof FDATA!=='undefined'?FDATA[fk]?.color:null;if(color)root.style.setProperty('--bs-'+side,color);}root.append(controls());const stage=node('div','bs-stage');backdrop(stage);stage.append(troops('att',before.attacker),node('span','bs-versus','VS'),troops('def',before.defender));root.append(stage);const summary=node('p','bs-caption','Ejércitos preparados · dados más fuertes primero');summary.setAttribute('aria-live','polite');root.append(summary);host.prepend(root);focusMap();effect('combatStart',{targetId:ctx.targetId,srcId:ctx.srcId});}
 function result(next,res){if(!res)return;if(!root||ctx?.targetId!==next.targetId)open(next);if(!root)return;stop();root.querySelectorAll('.bs-change,.bs-degraded,.bs-survivors,.bs-shot').forEach(n=>n.remove());root.querySelector('.bs-dice')?.remove();const dice=node('div','bs-dice');for(const [side,rolls]of [['att',res.attRolls||[]],['def',res.defRolls||[]]]){const row=node('div','bs-rolls bs-'+side);for(const roll of rolls){const die=node('div','bs-poly bs-d'+roll.sides);const effective=roll.effective??Math.max(roll.raw,roll.sides===20?5:roll.sides===12?3:1);die.append(node('small',null,(names[roll.type]||roll.type)+' · D'+roll.sides),node('strong',null,String(roll.value)),node('small',null,roll.raw+' → '+effective+' + '+(roll.bonus||0)));die.setAttribute('aria-label',(names[roll.type]||roll.type)+': dado '+roll.sides+', bruto '+roll.raw+', efectivo '+effective+', bonificación '+(roll.bonus||0)+', total '+roll.value);row.append(die);animate(die,[{transform:'rotateX(180deg) rotateZ(-30deg) scale(.4)',opacity:.25},{transform:'rotateX(0) rotateZ(0) scale(1)',opacity:1}],{duration:900,easing:'cubic-bezier(.2,.8,.3,1)'});}dice.append(row);}root.querySelector('.bs-stage').after(dice);
 for(const [side,army,losses]of [['att',res.attacker,res.losses?.attacker||[]],['def',res.defender,res.losses?.defender||[]]]){const band=root.querySelector('[data-side="'+side+'"]');for(const change of losses){const miniatureEl=band?.querySelector('[data-type="'+change.from+'"] .bs-mini');animate(miniatureEl,[{filter:'brightness(3)',transform:'translateX(0)'},{opacity:0,transform:'translateY(20px) rotate(35deg)'}],{duration:600,delay:850,easing:'ease-out',fill:'forwards'});const tag=node('span','bs-change',(names[change.from]||change.from)+' → '+(change.to?(names[change.to]||change.to):'BAJA'));band?.append(tag);if(change.to){const survivor=miniature(change.to);survivor.classList.add('bs-degraded');band?.append(survivor);animate(survivor,[{opacity:0,transform:'scale(.3)'},{opacity:1,transform:'scale(1)'}],{duration:1300});}}for(const squad of band?.querySelectorAll('.bs-squad')||[]){const type=squad.dataset.type;squad.querySelector('.bs-count').textContent=(army?.[keys[type]]||0)+' '+names[type];if(!(army?.[keys[type]]||0))squad.classList.add('bs-empty');}const count=Object.values(keys).reduce((n,key)=>n+(army?.[key]||0),0);band?.append(node('small','bs-survivors','Supervivientes: '+count));}
 if(!minimal()){const shot=node('span','bs-shot'+(res.attRolls?.some(d=>d.type==='scorp'||d.type==='mech')?' bs-shot-heavy':res.attRolls?.some(d=>d.type==='air')?' bs-shot-air':''));shot.setAttribute('aria-hidden','true');root.querySelector('.bs-stage').append(shot);animate(shot,[{left:'20%',opacity:0},{left:'35%',opacity:1,offset:.2},{left:'80%',opacity:0}],{duration:500,delay:700,fill:'forwards'});}root.querySelector('.bs-caption').textContent=(res.status==='conquered'?'TERRITORIO CONQUISTADO':res.status==='repelled'?'DEFENSA RESISTE':'RONDA RESUELTA')+' · '+(res.losses?.attacker?.length||0)+' cambios ataque / '+(res.losses?.defender?.length||0)+' defensa';animate(root.querySelector('.bs-stage'),[{boxShadow:'inset 0 0 30px #dba43a88'},{boxShadow:'inset 0 0 0 transparent'}],{duration:750});}
 function close(){stop();restore(true);root?.remove();root=null;ctx=null;before=null;skipped=false;}
 function transient(el,frames,options){
  const world=document.getElementById('world-g');if(!world)return;
  el.setAttribute('pointer-events','none');el.setAttribute('data-battle-effect','true');world.append(el);
  const a=animate(el,frames,options);if(a)a.finished.then(()=>el.remove(),()=>el.remove());else el.remove();
 }
 function effect(kind,data={}){
  if(minimal())return;
  const id=data.targetId||data.id||data.dstId,t=territory(id),source=territory(data.srcId||data.sourceId||data.from);
  const target=document.getElementById('tg-'+id);
  if(target)animate(target,[{filter:'brightness(1.8)'},{filter:'brightness(1)'}],{duration:650});
  if(['movement','move','missile'].includes(kind)&&t&&source){
   const route=data.path||[source.id,t.id];const points=route.map(territory).filter(Boolean);
   const path=svg('polyline',{points:points.map(p=>p.cx+','+p.cy).join(' '),fill:'none',stroke:kind==='missile'?'#ef9e45':'#83c2e4','stroke-width':4,'stroke-dasharray':'12 7'});
   transient(path,[{opacity:0,strokeDashoffset:100},{opacity:1,offset:.25},{opacity:0,strokeDashoffset:0}],{duration:1250});
  }
  if(['nuclear','explosion','nuclearChain'].includes(kind)){
   const ids=data.centers||data.ids||[id];
   ids.slice(0,60).forEach((center,index)=>{const p=territory(typeof center==='string'?center:center.id);if(!p)return;
    const wave=svg('circle',{cx:p.cx,cy:p.cy,r:1,fill:'#f0b44533',stroke:'#f1cd70','stroke-width':3});
    transient(wave,[{r:'1px',opacity:0},{r:'25px',opacity:.85,offset:.2},{r:'115px',opacity:0}],{duration:1200,delay:index*350});
    const flash=svg('circle',{cx:p.cx,cy:p.cy,r:35,fill:'#ffe9ae'});
    transient(flash,[{opacity:0},{opacity:.8,offset:.3},{opacity:0}],{duration:450,delay:index*350});
   });
  }else if(t){
   const ring=svg('circle',{cx:t.cx,cy:t.cy,r:44,fill:'none',stroke:kind==='combatStart'?'#d4b84b':'#8bd6b3','stroke-width':3});
   transient(ring,[{opacity:.85,r:'36px'},{opacity:0,r:'65px'}],{duration:1000});
   if(source&&kind==='combatStart'){const origin=svg('circle',{cx:source.cx,cy:source.cy,r:44,fill:'none',stroke:'#d57c63','stroke-width':3});transient(origin,[{opacity:1},{opacity:0}],{duration:1200});}
   if(['reinforcement','reinforcements','upgrade','nuclearBuild','build'].includes(kind)){
    const icon=svg('g',{transform:'translate('+(t.cx-20)+','+(t.cy-35)+')',fill:'#b8dfcc'});
    if(kind==='nuclearBuild'||kind==='build')icon.append(svg('path',{d:'M10 70h40V55H40L35 5H25l-5 50H10z'}));
    else{const body=svg('g');body.innerHTML=shapes[data.type]||shapes.sol;icon.append(body);}
    transient(icon,[{opacity:0,transform:'translate('+(t.cx-20)+'px,'+(t.cy-10)+'px) scale(.3)'},{opacity:1,offset:.35},{opacity:0,transform:'translate('+(t.cx-20)+'px,'+(t.cy-50)+'px) scale(.7)'}],{duration:1000});
   }
  }
  if(kind==='victory'){
   const fk=data.fk||data.winner;const portrait={imp:'imp',lib:'lib',clt:'clt',erb:'erb',prm:'prm',shn:'shn'}[fk];
   const end=document.getElementById('game-result');if(end&&portrait&&!end.querySelector('.bs-victory-art')){const art=node('img','bs-victory-art');art.src='assets/units/'+portrait+'_portrait.jpg';art.alt='Facción vencedora';end.prepend(art);animate(art,[{opacity:0,transform:'scale(.9)'},{opacity:1,transform:'scale(1)'}],{duration:1200});}
  }
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();restore();}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root)skip();});
 window.addEventListener('resize',()=>restore());
 return {open,result,close,effect,duration:ms=>minimal()?0:mode==='fast'?ms/3:ms};
})();
