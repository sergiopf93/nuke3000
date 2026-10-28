// Presentation adapter. Domain actions remain validated by engine.js and Battle.
const GameUX=(()=>{
 const query=matchMedia('(max-width:1024px) and (max-height:600px), (max-width:600px)');
 let focusBeforeDrawer=null;
 const labels={soldiers:'Soldados',mechs:'Mechs',aircraft:'Aircraft',scorpions:'Scorpions'};
 function units(t){return Object.entries(labels).map(([key,label])=>(t[key]||0)+' '+label).join(' · ');}
 function closePanel(){delete document.body.dataset.mobilePanel;document.querySelectorAll('#mobile-players,#mobile-log').forEach(b=>b.setAttribute('aria-expanded','false'));focusBeforeDrawer?.focus();}
 function panel(name){if(document.body.dataset.mobilePanel===name){closePanel();return;}focusBeforeDrawer=document.activeElement;document.body.dataset.mobilePanel=name;document.querySelectorAll('#mobile-players,#mobile-log').forEach(b=>b.setAttribute('aria-expanded',String(b.id==='mobile-'+name)));document.querySelector(name==='players'?'#lp .mobile-drawer-close':'#rp-log .mobile-drawer-close')?.focus();}
 function cancelSelection(){G.sel=G.attackSrc=G.moveSrc=G.moveTargets=null;G.moveMode=false;document.getElementById('map-wrap').classList.remove('moving');document.getElementById('move-popup')?.remove();updateMap();}
 function refresh(){
  const f=G.factions[G.pf],resources=document.getElementById('mobile-resources');if(!f||!resources)return;
  const owned=Object.values(G.territories).filter(t=>t.owner===G.pf);
  const container=query.matches?document.getElementById('phase-header'):document.getElementById('hdr');
  if(resources.parentElement!==container)container.prepend(resources);
  resources.replaceChildren();const own=document.createElement('div');own.textContent='Tú: '+FDATA[G.pf].name;
  const amounts=document.createElement('div');amounts.textContent=f.plutonium+' Pu · '+f.missiles+'/'+RULES.prep.maxMissiles+' misiles · '+owned.filter(t=>t.hasNuclear).length+' ☢';resources.append(own,amounts);
  const id=G.moveSrc||G.sel||G.attackSrc,t=G.territories[id],title=document.getElementById('territory-name'),detail=document.getElementById('territory-units'),hint=document.getElementById('territory-hint');
  title.textContent=t?terName(id)+' · '+(FDATA[t.owner]?.name||'Sin control'):'Toca un territorio';
  detail.textContent=t?units(t)+(t.hasNuclear?' · Nuclear':''):'';
  const step=STEPS[G_step.phase]?.[G_step.idx]?.id;
  hint.textContent=G.setup?._inSetup?'Completa el despliegue en el mapa':!G_step.isMyTurn?'Observando · Las decisiones de defensa se solicitan cuando te corresponda':G.moveSrc?'Toca un destino azul · ✕ cancela el origen':G.attackSrc?'Toca un enemigo adyacente rojo para preparar el ataque':['move','regroup'].includes(step)?'Toca origen propio y destino · Una vez por unidad en esta fase':step==='attack'?'Toca origen propio y después enemigo adyacente':step==='upgrade'?'Selecciona territorio propio y elige mejora':step==='missile'?'Construye antes de disparar · Usa Lanzar para elegir objetivo':'Acciones disponibles en el panel';
  document.getElementById('territory-clear').hidden=!t;
 }
 function territoryTap(id){
  if(!query.matches||G.setup?._inSetup||G.reinforcementMode||!G_step.isMyTurn||G.gameOver)return false;
  const t=G.territories[id],step=STEPS[G_step.phase]?.[G_step.idx]?.id;
  if(step==='attack'&&G.attackSrc&&validAttack(G.attackSrc,id,G.pf)) {G.sel=G.attackSrc;openDice(id);return true;}
  if(['move','regroup'].includes(step)&&!G.moveSrc&&t?.owner===G.pf){G.moveMode=true;selectTerritory(id);}
  return false;
 }
 function combat(ctx,result){
  const a=G.territories[ctx.srcId],d=G.territories[ctx.targetId];
  document.getElementById('combat-army-att').textContent='Origen · '+FDATA[ctx.attFk].name+' · '+units(a);
  document.getElementById('combat-army-def').textContent=(result?.status==='conquered'?'Ocupación · '+FDATA[ctx.attFk].name:FDATA[ctx.defFk].name)+' · '+units(d);
  const summary=document.getElementById('combat-summary');
  const changes=list=>list.map(c=>labels[Battle.keys[c.from]]+' → '+(c.to?labels[Battle.keys[c.to]]:'baja')).join(', ')||'sin bajas';
  summary.textContent=result?(result.status==='conquered'?'CONQUISTA':result.status==='repelled'?'DEFENSA EXITOSA':'RONDA RESUELTA')+' · Ataque: '+changes(result.losses.attacker)+' · Defensa: '+changes(result.losses.defender)+' · Iniciales: '+ctx.initialAtt+' / '+ctx.initialDef:(ctx._attRolls?'Ataque: '+ctx._attRolls.map(d=>d.type+' D'+d.sides+' = '+d.value).join(' · ')+'. Elige tu defensa.':'Elige unidades. Siempre queda una guarnición en origen.');
  if(result&&query.matches){for(const [side,rolls]of [['att',result.attRolls],['def',result.defRolls]])document.querySelectorAll('.die.'+side).forEach((el,i)=>{
    const die=rolls[i];if(!die)return;el.textContent=die.value;el.title=die.type+' D'+die.sides+': '+die.raw+' + '+die.bonus+' = '+die.value;
  });}
  if(result&&query.matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches){document.querySelectorAll('.die').forEach(el=>{el.classList.remove('spin');void el.offsetWidth;el.classList.add('spin');});}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('mobile-players').onclick=()=>panel('players');document.getElementById('mobile-log').onclick=()=>panel('log');document.getElementById('mobile-panel-backdrop').onclick=closePanel;
  document.getElementById('mobile-exit').onclick=()=>{if(ONLINE.isOnline())onlineDisconnect();else if(confirm('¿Volver al lobby? Se perderá la partida local actual.'))location.reload();};
  document.querySelectorAll('.mobile-drawer-close').forEach(b=>b.onclick=closePanel);document.getElementById('territory-clear').onclick=cancelSelection;
  document.getElementById('combat-detail-toggle').onclick=e=>{const open=document.getElementById('dres').classList.toggle('details-open');e.currentTarget.setAttribute('aria-expanded',String(open));e.currentTarget.textContent=open?'OCULTAR DETALLE':'VER TIRADAS Y CÁLCULO';};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.dataset.mobilePanel)closePanel();
   if(e.key==='Tab'&&document.body.dataset.mobilePanel){const pane=document.querySelector(document.body.dataset.mobilePanel==='players'?'#lp':'#rp-log');const controls=[...pane.querySelectorAll('button,[tabindex="0"]')].filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  });
  query.addEventListener('change',()=>{closePanel();refresh();});
 });
 return {refresh,territoryTap,combat,isMobile:()=>query.matches};
})();
