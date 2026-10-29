// Presentation adapter. Domain actions remain validated by engine.js and Battle.
const GameUX=(()=>{
 const query=matchMedia('(max-width:1024px) and (max-height:600px), (max-width:600px)');
 let focusBeforeDrawer=null;
 const labels={soldiers:'Soldados',mechs:'Mechs',aircraft:'Aircraft',scorpions:'Scorpions'};
 function units(t){return Object.entries(labels).filter(([key])=>t[key]>0).map(([key,label])=>t[key]+' '+label).join(' · ')||'Sin unidades';}
 function closePanel(){delete document.body.dataset.mobilePanel;document.querySelectorAll('#mobile-players,#mobile-log').forEach(b=>b.setAttribute('aria-expanded','false'));focusBeforeDrawer?.focus();}
 function panel(name){if(document.body.dataset.mobilePanel===name){closePanel();return;}focusBeforeDrawer=document.activeElement;document.body.dataset.mobilePanel=name;document.querySelectorAll('#mobile-players,#mobile-log').forEach(b=>b.setAttribute('aria-expanded',String(b.id==='mobile-'+name)));document.querySelector(name==='players'?'#lp .mobile-drawer-close':'#rp-log .mobile-drawer-close')?.focus();}
 function cancelSelection(){G.sel=G.attackSrc=G.moveSrc=G.moveTargets=null;G.moveMode=false;document.getElementById('map-wrap').classList.remove('moving');document.getElementById('move-popup')?.remove();updateMap();}
 function refresh(){
  const f=G.factions[G.pf],resources=document.getElementById('mobile-resources');if(!f||!resources)return;
  const owned=Object.values(G.territories).filter(t=>t.owner===G.pf);
  const container=query.matches?document.getElementById('phase-header'):document.getElementById('hdr');
  if(resources.parentElement!==container)container.prepend(resources);
  resources.replaceChildren();const own=document.createElement('div');own.textContent='Tú: '+FDATA[G.pf].name;
  const amounts=document.createElement('div');amounts.className='resource-chips';for(const [value,label]of [[f.plutonium,'Pu'],[f.missiles+'/'+RULES.prep.maxMissiles,'misiles'],[owned.filter(t=>t.hasNuclear).length,'☢']]){const chip=document.createElement('span'),number=document.createElement('b');number.textContent=value;chip.append(number,document.createTextNode(' '+label));amounts.appendChild(chip);}resources.append(own,amounts);
  const id=G.moveSrc||G.sel||G.attackSrc,t=G.territories[id],title=document.getElementById('territory-name'),detail=document.getElementById('territory-units'),hint=document.getElementById('territory-hint');
  title.textContent=t?terName(id)+' · '+(FDATA[t.owner]?.name||'Sin control'):'Toca un territorio';
  detail.textContent=t?units(t)+(t.hasNuclear?' · Nuclear':''):'';
  const step=STEPS[G_step.phase]?.[G_step.idx]?.id;
  const v4=RULES.version==='v4';
  if(v4&&t?.attackers?.[G.pf])detail.textContent+=' · ATACANTES: '+units(t.attackers[G.pf]);
  hint.textContent=v4&&step==='attack'?'Toca un OBJETIVO con tropas comprometidas para combatir':v4&&step==='move'?'ATACA DESDE origen propio → OBJETIVO enemigo · Confirma las tropas':G.setup?._inSetup?'Completa el despliegue en el mapa':!G_step.isMyTurn?'Observando · Defensa automática; intercepción de misiles cuando corresponda':G.moveSrc?'Toca un destino azul · ✕ cancela el origen':G.attackSrc?'Toca un enemigo adyacente rojo para preparar el ataque':['move','regroup'].includes(step)?'Toca origen propio y destino · Una vez por unidad en esta fase':step==='attack'?'Toca origen propio y después enemigo adyacente':step==='upgrade'?'Selecciona territorio propio y elige mejora':step==='missile'?'Construye antes de disparar · Usa Lanzar para elegir objetivo':'Acciones disponibles en el panel';
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
  const labels={sol:'SOL',mech:'MCH',air:'AIR',scorp:'SCP'};
  const modal=document.getElementById('dmodal');modal.dataset.battleState=result?.status||'ready';
  const guard=document.querySelector('#cdesc #combat-guard');
  const slot=document.getElementById('combat-guard-slot');if(guard){const label=document.createElement('label');label.htmlFor='combat-guard';label.textContent='GUARNICIÓN';for(const option of guard.options)option.textContent={sol:'Soldado',mech:'Mech',air:'Aircraft',scorp:'Scorpion'}[option.value];slot.replaceChildren(label,guard);}else if(!ctx.isPlayerAtt)slot.replaceChildren();const selector=slot.querySelector('select');if(selector)selector.disabled=!!result;
  document.getElementById('cdesc').textContent=result?'Tirada resuelta · detalle disponible':ctx.isPlayerAtt?'Selecciona tus unidades antes de tirar':'Resolución automática · siguiente tirada en breve';
  document.getElementById('combat-ter-att').textContent=terName(ctx.srcId);
  document.getElementById('combat-ter-def').textContent=terName(ctx.targetId);
  for(const [side,army,selected,rolls,losses]of [
   ['att',result?.attacker||G.territories[ctx.srcId],ctx.attSelected,result?.attRolls, result?.losses.attacker||[]],
   ['def',result?.defender||G.territories[ctx.targetId],ctx.defSelected,result?.defRolls,result?.losses.defender||[]]
  ]){
   const info=document.getElementById('combat-army-'+side);info.replaceChildren();
   const squads=document.createElement('span');squads.className='battle-squads';
   for(const [type,key]of Object.entries(Battle.keys))if(army[key]>0){const unit=document.createElement('span');unit.className='battle-unit';const n=document.createElement('b');n.textContent=army[key]+' ';const name=document.createElement('abbr');name.title={sol:'Soldados',mech:'Mechs',air:'Aircraft',scorp:'Scorpions'}[type];name.textContent=labels[type];unit.append(n,name);squads.appendChild(unit);}
   if(!squads.childNodes.length)squads.textContent='Sin unidades';
   info.append(squads,document.createTextNode(' · Dados: '+(rolls?.length||selected?.length||0)));
   const loss=document.getElementById('combat-loss-'+side);
   loss.textContent=result?(losses.length?losses.map(c=>labels[c.from]+' → '+(c.to?labels[c.to]:'BAJA')).join(' · '):'Sin bajas'):(side==='att'?'Una unidad permanece en origen':'Defensa automática · gana los empates');
   const pool=selected||[],pairs=result?.pairs||[],paired=pairs.map(p=>side==='att'?p.att:p.def),dice=rolls?[...paired,...rolls.filter(d=>!paired.includes(d))]:pool;
   const row=document.getElementById(side==='att'?'datt':'ddef');row.replaceChildren();
   const remainingLosses=[...losses];
   dice.forEach(die=>{
    const pair=pairs.find(p=>(side==='att'?p.att:p.def)===die),lost=pair?.loser===(side==='att'?'attacker':'defender');
    const tile=document.createElement('div');tile.className='die '+side+(lost?' lost':pair?' won':'');
    const kind=document.createElement('span');kind.className='die-kind';kind.textContent=labels[die.type]+' · D'+die.sides;
    const value=document.createElement('span');value.className='die-value';value.textContent=rolls?die.value:'—';
    const status=document.createElement('span');status.className='die-outcome';
    const index=remainingLosses.findIndex(c=>c.from===die.type),change=lost&&index>=0?remainingLosses.splice(index,1)[0]:null;
    status.textContent=lost?(change?.to?'→ '+labels[change.to]:'BAJA'):pair?'GANA':rolls?(result?'SIN PAR':'TIRADO'):'LISTO';
    tile.title=rolls?labels[die.type]+' D'+die.sides+': '+die.raw+' + '+die.bonus+' = '+die.value:labels[die.type]+' D'+die.sides;
    tile.setAttribute('aria-label',tile.title+' · '+status.textContent);tile.dataset.pair=pair?String(pairs.indexOf(pair)+1):'';
    tile.append(kind,value,status);row.appendChild(tile);
   });
  }
  const summary=document.getElementById('combat-summary');summary.replaceChildren();
  const main=document.createElement('div'),title=document.createElement('strong'),caption=document.createElement('span'),counts=document.createElement('div');
  title.className='battle-result-title';caption.className='battle-result-caption';counts.className='battle-result-counts';
  const a=result?.losses.attacker.length||0,d=result?.losses.defender.length||0;
  title.textContent=result?(result.status==='conquered'?'TERRITORIO CONQUISTADO':result.status==='repelled'?'DEFENSA GANADA':d>a?'ATAQUE GANA LA TIRADA':a>d?'DEFENSA GANA LA TIRADA':'RONDA RESUELTA'):'PREPARAR COMBATE';
  caption.textContent=result?.status==='conquered'?FDATA[ctx.attFk].name+' ocupa con '+Battle.count(G.territories[ctx.targetId])+' · Guarnición '+Battle.count(G.territories[ctx.srcId]):result?'Bajas y degradaciones señaladas en cada bando':ctx.isPlayerAtt?'Unidades sugeridas listas. Puedes cambiar la selección.':'Combate automático · defensa con los dados más fuertes.';
  counts.textContent=result?'Iniciales '+ctx.initialAtt+' / '+ctx.initialDef+' · Restan '+Battle.count(result.attacker)+' / '+Battle.count(result.defender):'Hasta '+RULES.combat.maxAttackDice+' ataque · '+RULES.combat.maxDefenseDice+' defensa';
  main.append(title,caption);summary.append(main,counts);
  if(result&&!matchMedia('(prefers-reduced-motion:reduce)').matches)document.querySelectorAll('#dmodal .die').forEach(el=>el.classList.add('spin'));
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
