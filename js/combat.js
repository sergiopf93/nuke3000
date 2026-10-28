function showRemoteDecision(packet,reply){
  const data=packet.data;
  if(packet.turn!==currentStepKey()||G.gameOver)return;
  document.getElementById('online-decision-modal')?.remove();
  const modal=document.createElement('div');modal.id='online-decision-modal';modal.dataset.decisionId=packet.id;
  modal.style.cssText='position:fixed;inset:0;background:#000d;z-index:2200;display:flex;align-items:center;justify-content:center';
  const box=document.createElement('div');box.style.cssText='background:#08080c;border:1px solid #4488bb;padding:24px;max-height:85vh;overflow:auto';modal.appendChild(box);
  if(packet.kind==='intercept'){
    const target=G.territories[data.targetId];if(target?.owner!==G.pf)return;
    box.innerHTML='<h3>MISIL ENTRANTE</h3><p>'+terName(data.targetId)+' · objetivo '+data.unitType+'</p><button id="remote-intercept">INTERCEPTAR (1 MISIL)</button> <button id="remote-pass">NO INTERCEPTAR</button>';
    box.querySelector('#remote-intercept').disabled=!(G.factions[G.pf].missiles>0);
    for(const [id,value]of [['remote-intercept',true],['remote-pass',false]])box.querySelector('#'+id).onclick=async()=>{
      const ok=await reply({intercept:value});if(!ok)addLog('No se envió la decisión. Vuelve a intentarlo.','sys');
    };
  }else{
    if(!validAttack(data.srcId,data.targetId,data.attFk)||G.territories[data.targetId].owner!==G.pf)return;
    const pool=buildPool(G.territories[data.targetId]),max=Math.min(pool.length,RULES.combat.maxDefenseDice),defaults={};
    pool.slice(0,max).forEach(u=>defaults[u.type]=(defaults[u.type]||0)+1);
    box.innerHTML='<h3>ELIGE TU DEFENSA</h3><p>'+terName(data.srcId)+' → '+terName(data.targetId)+'</p><p>Tirada atacante: '+data.attRolls.map(d=>d.type+' D'+d.sides+'='+d.value).join(' · ')+'</p>'+Object.keys(Battle.keys).filter(type=>pool.some(u=>u.type===type)).map(type=>'<label style="display:block">'+type+' <input data-defense-type="'+type+'" type="number" min="0" max="'+pool.filter(u=>u.type===type).length+'" value="'+(defaults[type]||0)+'"></label>').join('')+'<p>Hasta '+max+' dados</p><button id="remote-defense-confirm">CONFIRMAR DEFENSA</button>';
    box.querySelector('#remote-defense-confirm').onclick=async()=>{
      const units=[];let valid=true;
      box.querySelectorAll('[data-defense-type]').forEach(input=>{const n=Number(input.value);if(!Number.isInteger(n)||n<0||n>Number(input.max))valid=false;else for(let i=0;i<n;i++)units.push({type:input.dataset.defenseType});});
      if(!valid||!units.length||units.length>max){addLog('Selecciona entre 1 y '+max+' unidades disponibles.','sys');return;}
      if(!await reply({units}))addLog('No se envió la defensa. Vuelve a intentarlo.','sys');
    };
  }
  document.body.appendChild(modal);
}
function requestRemoteDefense(ctx){
  if(G.gameOver||G_combat!==ctx||ctx.done||ctx.awaitingDefense)return;
  const key=currentStepKey(),src=G.territories[ctx.srcId];
  if(!ctx.isPlayerAtt)ctx.attSelected=buildPool(src).slice(0,Math.min(Battle.count(src)-1,RULES.combat.maxAttackDice));
  ctx._attRolls ||= Battle.roll(ctx.attSelected,ctx.attFk,'attacker');
  ctx.awaitingDefense=true;ctx.resolving=true;
  const failed=error=>{if(G_combat!==ctx||ctx.done)return;ctx.awaitingDefense=false;ctx.resolving=false;addLog('Defensa remota pendiente: '+error.message,'sys');
    if(ctx.isPlayerAtt){const btn=document.getElementById('btn-roll');btn.disabled=false;btn.textContent='REINTENTAR DEFENSA REMOTA';}
    else {const area=document.getElementById('step-actions');if(area){const retry=document.createElement('button');retry.textContent='REINTENTAR SOLICITUD DE DEFENSA';retry.onclick=()=>requestRemoteDefense(ctx);area.appendChild(retry);}}
  };
  ONLINE.requestDecision('defense',ctx.defFk,{srcId:ctx.srcId,targetId:ctx.targetId,attFk:ctx.attFk,round:ctx.round,attRolls:ctx._attRolls},(choice,error)=>{
    if(key!==currentStepKey()||G_combat!==ctx||G.gameOver||ctx.done)return;
    if(error){failed(error);return;}
    try{if(!Array.isArray(choice?.units)||!choice.units.length)throw Error('Defensa sin unidades');ctx.defSelected=Battle.select(G.territories[ctx.targetId],choice?.units,RULES.combat.maxDefenseDice,RULES.combat);}
    catch(error){failed(error);return;}
    ctx.awaitingDefense=false;ctx.resolving=false;ctx.remoteDefenseReady=true;resolveCombatRound();
  }).catch(failed);
}

function applyLibertosScorchedEarth(terId) {
  const lib=G.factions.lib,t=G.territories[terId];
  if(!lib||lib.alive===false||!G.setup.order.includes('lib')||!t||t.owner!=='lib')return;
  lib.missiles=Math.min(RULES.prep.maxMissiles,(lib.missiles||0)+1);
  lib.plutonium=(lib.plutonium||0)+2;t.mechs++;
  addLog('SCORCHED EARTH: +1 misil, +1 mech en '+terName(terId)+' y +2 Pu','res');
}
let G_combat=null;

function validAttack(srcId,targetId,fk) {
  const src=G.territories[srcId],tgt=G.territories[targetId];
  return !!(src && tgt && src.owner===fk && tgt.owner && tgt.owner!==fk &&
    src.adj.includes(targetId) && Battle.canAttack(src) && Battle.count(tgt)>0);
}
function openDice(targetId) {
  if(G.gameOver || G.setup?._inSetup || G_step.phase!=='combat' || !G_step.isMyTurn || G_combat&&!G_combat.done) return;
  if(!validAttack(G.sel,targetId,G.pf)){addLog('Necesitas un origen propio adyacente y al menos dos unidades.','sys');return;}
  beginCombat(G.sel,targetId,G.pf);
}
function beginCombat(srcId,targetId,attFk,callback) {
  const src=G.territories[srcId],tgt=G.territories[targetId];
  G_combat={srcId,targetId,attFk,defFk:tgt.owner,round:1,done:false,
    initialAtt:Battle.count(src),initialDef:Battle.count(tgt),history:[],
    isPlayerAtt:attFk===G.pf,isPlayerDef:tgt.owner===G.pf,callback};
  if(_isOnlineHumanTurn(tgt.owner)&&tgt.owner!==G.pf&&!G_combat.isPlayerAtt)requestRemoteDefense(G_combat);
  else openCombatModal();
}
function openDiceCpu(srcId,targetId,cpuFk,callback) {
  if(G.gameOver) return;
  if(!validAttack(srcId,targetId,cpuFk)){if(callback)callback();return;}
  if(G.territories[targetId].owner===G.pf||_isOnlineHumanTurn(G.territories[targetId].owner)) beginCombat(srcId,targetId,cpuFk,callback);
  else resolveCpuCpuSilent(srcId,targetId,cpuFk,callback);
}
function completeCombat(ctx,status) {
  if(ctx.done) return;
  ctx.done=true;ctx.status=status;
  if(typeof ONLINE!=='undefined'&&ONLINE.isOnline())ONLINE.cancelPendingDecision();
  clearAttackFlash(ctx.targetId);
  _syncNow('Combate: '+terName(ctx.srcId)+' → '+terName(ctx.targetId)+' — '+status,'combat');
  const callback=ctx.callback;ctx.callback=null;
  if(callback&&!G.gameOver) callback();
}
function openCombatModal() {
  const ctx=G_combat;if(!ctx||G.gameOver||ctx.done)return;
  const src=G.territories[ctx.srcId],tgt=G.territories[ctx.targetId];
  const af=FDATA[ctx.attFk],df=FDATA[ctx.defFk];
  ctx.attPool=buildPool(src);ctx.defPool=buildPool(tgt);
  if(ctx.isPlayerAtt){
    ctx.guardType ||= ctx.attPool.at(-1).type;
    ctx.attPool.splice(ctx.attPool.findIndex(u=>u.type===ctx.guardType),1);
  }
  const maxAtt=Math.min(Battle.count(src)-1,RULES.combat.maxAttackDice);
  if(maxAtt<1||Battle.count(tgt)===0){completeCombat(ctx,'repelled');return;}
  ctx.attSelected=ctx.attPool.slice(0,maxAtt);
  ctx.defSelected=ctx.defPool.slice(0,RULES.combat.maxDefenseDice);
  document.querySelector('#dmodal h2').textContent='⚔ COMBATE — Ronda '+ctx.round;
  document.getElementById('cdesc').textContent=af.name+' → '+df.name+' | '+terName(ctx.srcId)+' → '+terName(ctx.targetId);
  if(ctx.isPlayerAtt){
    const guard=document.createElement('select');guard.id='combat-guard';guard.setAttribute('aria-label','Unidad que permanece en origen');
    for(const type of Object.keys(Battle.keys).filter(type=>src[Battle.keys[type]]>0)){const option=document.createElement('option');option.value=type;option.textContent='Guarnición: '+type;option.selected=type===ctx.guardType;guard.appendChild(option);}
    guard.onchange=()=>{ctx.guardType=guard.value;openCombatModal();};document.getElementById('cdesc').appendChild(guard);
  }
  document.getElementById('dlba').textContent=af.name;
  document.getElementById('dlbd').textContent=df.name;
  document.getElementById('combat-unit-choice')?.remove();
  for(const id of ['unit-sel-att','unit-sel-def'])document.getElementById(id)?.remove();
  document.getElementById('dtot-a').textContent='';document.getElementById('dtot-d').textContent='';
  const info='Iniciales '+ctx.initialAtt+' / '+ctx.initialDef+' · Restantes '+Battle.count(src)+' / '+Battle.count(tgt);
  document.getElementById('dres').textContent=info;
  renderDicePools();
  const roll=document.getElementById('btn-roll'),cancel=document.getElementById('btn-cancel'),retreat=document.getElementById('btn-retreat');
  roll.disabled=false;roll.style.display='none';
  cancel.textContent='CANCELAR';cancel.style.display=ctx.isPlayerAtt?'inline-block':'none';cancel.onclick=retreatCombat;
  retreat.style.display='none';
  if(ctx.isPlayerAtt) {
    const chosen=units=>{if(G_combat!==ctx||ctx.done)return;ctx.attSelected=units;renderDicePools();roll.disabled=false;roll.textContent='⚄ LANZAR DADOS';roll.style.display='inline-block';roll.onclick=()=>resolveCombatRound();};
    if(RULES.combat.allowUnitSelection)showUnitSelectorInModal('att',ctx.attPool,maxAtt,chosen);else chosen(ctx.attSelected);
  } else rollAttackerThenDefend();
  document.getElementById('dmodal').classList.add('open');
  if(typeof GameUX!=='undefined')GameUX.combat(ctx);
}
function buildPool(territory) { return Battle.pool(territory,RULES.combat); }
function defDiceCount(attCount,maxDef,defUnits) { return Math.min(maxDef,defUnits); }

function renderDicePools() {
  const ctx=G_combat;
  if(!ctx) return;
  const att=ctx.attSelected||ctx.attPool||[];
  const def=ctx.defSelected||ctx.defPool||[];
  document.getElementById('datt').innerHTML=att.map((_,i)=>`<div class="die att" id="da${i}">${_.label}<br><span style="font-size:10px;color:#888;">D${_.sides}</span></div>`).join('');
  document.getElementById('ddef').innerHTML=def.map((_,i)=>`<div class="die def" id="dd${i}">${_.label}<br><span style="font-size:10px;color:#888;">D${_.sides}</span></div>`).join('');
}

function showUnitSelectorInModal(side, pool, maxN, callback) {
  // Simple inline selector above dice
  const counts={};
  pool.forEach(u=>counts[u.type]=(counts[u.type]||0)+1);
  const labels={scorp:'🦂 Scorp',mech:'🤖 Mech',air:'✈ Air',sol:'🪖 Sol'};
  const chosen={};
  const color=side==='att'?'#C8A800':'#4488ff';
  const selDiv=document.createElement('div');
  selDiv.id='unit-sel-'+side;
  selDiv.style.cssText=`border:1px solid ${color};padding:8px;margin-bottom:8px;`;
  selDiv.innerHTML=`<div style="font-size:10px;color:${color};margin-bottom:6px;">
    Elige ${maxN} unidades (${side==='att'?'ATAQUE':'DEFENSA'})</div>
    ${Object.entries(counts).map(([type,cnt])=>`
      <div style="display:flex;align-items:center;gap:6px;margin:3px 0;">
        <span style="width:70px;font-size:11px;color:#888;">${labels[type]||type} ×${cnt}</span>
        <button onclick="uselInline('${side}','${type}',-1,${cnt})" style="background:#111;border:1px solid #333;color:#fff;width:20px;height:20px;cursor:pointer;">−</button>
        <span id="usel-${side}-${type}" style="color:#fff;min-width:16px;text-align:center;">0</span>
        <button onclick="uselInline('${side}','${type}',1,${cnt})" style="background:#111;border:1px solid #333;color:#fff;width:20px;height:20px;cursor:pointer;">+</button>
      </div>`).join('')}
    <button onclick="uselInlineConfirm('${side}')" style="background:#0a0a0d;border:1px solid ${color};
      color:${color};padding:4px 12px;font-family:Orbitron,sans-serif;font-size:10px;cursor:pointer;margin-top:4px;">
      CONFIRMAR
    </button>`;
  selDiv._maxN=maxN; selDiv._pool=pool; selDiv._chosen={}; selDiv._callback=callback;
  const dbox=document.getElementById('dbox');
  dbox.insertBefore(selDiv, document.querySelector('.die-legend')||dbox.firstChild);
  window['_usel_'+side]=selDiv;
  if(typeof GameUX!=='undefined'&&GameUX.isMobile()){
    const details=document.createElement('details');details.id='combat-unit-choice';
    const summary=document.createElement('summary');summary.textContent='Unidades sugeridas · CAMBIAR SELECCIÓN';
    selDiv.replaceWith(details);details.append(summary,selDiv);
    callback(pool.slice(0,maxN));
    details.addEventListener('toggle',()=>{if(details.isConnected)document.getElementById('btn-roll').disabled=details.open;});
  }
}

function uselInline(side,type,delta,max){
  const div=window['_usel_'+side]; if(!div) return;
  const c=div._chosen; c[type]=Math.max(0,Math.min(max,(c[type]||0)+delta));
  const total=Object.values(c).reduce((s,v)=>s+v,0);
  if(total>div._maxN){c[type]=Math.max(0,c[type]-1);return;}
  document.getElementById(`usel-${side}-${type}`).textContent=c[type]||0;
}

function uselInlineConfirm(side){
  const div=window['_usel_'+side]; if(!div) return;
  const chosen=div._chosen;
  const total=Object.values(chosen).reduce((s,v)=>s+v,0);
  let selected=[];
  if(total===0){selected=div._pool.slice(0,div._maxN);}
  else{
    const counts={...chosen};
    div._pool.forEach(u=>{if((counts[u.type]||0)>0){selected.push(u);counts[u.type]--;}});
  }
  if(div._callback) div._callback(selected);
  const details=div.closest('details');if(details)details.remove();else div.remove();
  delete window['_usel_'+side];
}

function doPlayerAttackRoll(){resolveCombatRound();}
function doPlayerDefendRoll(){resolveCombatRound();}
function rollCombat(){resolveCombatRound();}
function rollAttackerThenDefend() {
  const ctx=G_combat;if(!ctx||ctx.done||G.gameOver)return;
  ctx._attRolls=Battle.roll(ctx.attSelected,ctx.attFk,'attacker');
  document.getElementById('dtot-a').textContent=ctx._attRolls.map(d=>d.value).join(' · ');
  const ready=chosen=>{
    if(G_combat!==ctx||ctx.done)return;ctx.defSelected=chosen;renderDicePools();
    const btn=document.getElementById('btn-roll');btn.textContent='🛡 LANZAR DEFENSA';btn.disabled=false;
    btn.style.display='inline-block';btn.onclick=()=>resolveCombatRound();
  };
  if(RULES.combat.allowUnitSelection)showUnitSelectorInModal('def',ctx.defPool,Math.min(RULES.combat.maxDefenseDice,ctx.defPool.length),ready);
  else ready(ctx.defSelected);
}
function resolveDefenseRoll(){resolveCombatRound();}
function resolveCombatRound() {
  const ctx=G_combat;if(G.gameOver||!ctx||ctx.done||ctx.resolving)return;
  if(_isOnlineHumanTurn(ctx.defFk)&&ctx.defFk!==G.pf&&!ctx.remoteDefenseReady){requestRemoteDefense(ctx);return;}
  ctx.resolving=true;
  const btn=document.getElementById('btn-roll');btn.disabled=true;
  const src=G.territories[ctx.srcId],tgt=G.territories[ctx.targetId];
  const result=Battle.round(src,tgt,{rules:RULES.combat,attFk:ctx.attFk,defFk:ctx.defFk,
    attUnits:ctx.attSelected,defUnits:ctx.defSelected,attRolls:ctx._attRolls,guardType:ctx.guardType});
  ctx._attRolls=null;ctx.remoteDefenseReady=false;
  Object.assign(src,result.attacker);Object.assign(tgt,result.defender);
  ctx.history.push(result);G.lastBattle=result;
  if(result.status==='conquered') {
    const occupied=Battle.occupy(src,tgt,result.guard);
    Object.assign(src,occupied.attacker);Object.assign(tgt,occupied.defender);
    tgt.owner=ctx.attFk;
    G.factions[ctx.attFk].conqueredThisTurn=(G.factions[ctx.attFk].conqueredThisTurn||0)+1;
    checkElimination(ctx.defFk,ctx.attFk);checkWinCondition();
  }
  displayBattleResult(ctx,result);
  ctx.resolving=false;
  _syncNow('Ronda de combate resuelta','combat');
  if(result.status!=='ongoing') completeCombat(ctx,result.status);
  else if(!ctx.isPlayerAtt&&!ctx.isPlayerDef)setTimeout(()=>{if(G_combat===ctx&&!ctx.done&&!G.gameOver)requestRemoteDefense(ctx);},300);
  updateMap();refreshCards();
}
function displayBattleResult(ctx,result) {
  if(typeof GameUX!=='undefined')GameUX.combat(ctx,result);
  document.getElementById('dtot-a').textContent=result.attRolls.map(d=>d.value).join(' · ');
  document.getElementById('dtot-d').textContent=result.defRolls.map(d=>d.value).join(' · ');
  const changes=list=>list.map(c=>c.from+' → '+(c.to||'eliminado')).join(', ')||'ninguna';
  const dieText=d=>d.type+' D'+d.sides+' ['+d.raw+(d.bonus?' + '+d.bonus:'')+' = '+d.value+']';
  const src=G.territories[ctx.srcId],tgt=G.territories[ctx.targetId];
  document.getElementById('dres').textContent=
    'Ronda '+ctx.round+' · '+(result.status==='conquered'?'CONQUISTA':result.status==='repelled'?'DEFENSA EXITOSA':'CONTINÚA')+
    '\nBajas ataque: '+changes(result.losses.attacker)+'\nBajas defensa: '+changes(result.losses.defender)+
    '\nComparaciones: '+result.pairs.map(p=>dieText(p.att)+' vs '+dieText(p.def)+' ('+p.loser+' pierde)').join('; ')+
    '\nIniciales '+ctx.initialAtt+' / '+ctx.initialDef+' · Restantes '+Battle.count(src)+' / '+Battle.count(tgt);
  document.getElementById('dres').style.whiteSpace='pre-line';
  addLog('⚔ '+terName(ctx.srcId)+' → '+terName(ctx.targetId)+': '+result.status+'; bajas '+changes(result.losses.attacker)+' / '+changes(result.losses.defender),'combat');
  const roll=document.getElementById('btn-roll'),cancel=document.getElementById('btn-cancel');
  document.getElementById('btn-retreat').style.display='none';
  if(result.status==='ongoing') {
    ctx.round++;
    roll.textContent=ctx.isPlayerAtt?'CONTINUAR ATAQUE':'ELEGIR DEFENSA';
    roll.disabled=false;roll.style.display='inline-block';roll.onclick=()=>openCombatModal();
    cancel.style.display=ctx.isPlayerAtt?'inline-block':'none';cancel.textContent='RETIRAR';cancel.onclick=retreatCombat;
  } else {
    roll.style.display='none';cancel.style.display='inline-block';cancel.textContent='CERRAR';cancel.onclick=closeDice;
  }
}


function showMoveUnitsPopup(srcId,dstId,evt){
  const src=G.territories[srcId],dst=G.territories[dstId];
  const ex=document.getElementById('move-popup');if(ex)ex.remove();
  let popX=400,popY=100;
  if(evt&&evt.clientX){popX=Math.min(evt.clientX-70,window.innerWidth-200);popY=Math.max(evt.clientY-160,10);}
  const ap=armyPoints(src);
  const leaveKey=src.soldiers>0?'soldiers':src.mechs>0?'mechs':src.aircraft>0?'aircraft':'scorpions';
  const unitDefs=[
    {key:'soldiers',label:'Soldados',max:src.soldiers>0?(leaveKey==='soldiers'?Math.max(0,src.soldiers-1):src.soldiers):0},
    {key:'mechs',label:'Mechs',max:src.mechs>0?(leaveKey==='mechs'?Math.max(0,src.mechs-1):src.mechs):0},
    {key:'aircraft',label:'Aircraft',max:src.aircraft>0?(leaveKey==='aircraft'?Math.max(0,src.aircraft-1):src.aircraft):0},
    {key:'scorpions',label:'Scorpions',max:src.scorpions>0?(leaveKey==='scorpions'?Math.max(0,src.scorpions-1):src.scorpions):0},
  ].filter(u=>u.max>0);
  if(!unitDefs.length){addLog('Solo 1 unidad en origen — no hay movimiento posible.','sys');G.moveSrc=null;return;}
  const chosen={};unitDefs.forEach(u=>chosen[u.key]=Math.min(1,u.max));
  const popup=document.createElement('div');
  popup.id='move-popup';
  popup.style.cssText='position:fixed;left:'+popX+'px;top:'+popY+'px;background:#08080b;border:1px solid #3388bb;padding:14px;z-index:700;font-family:Orbitron,sans-serif;min-width:190px;';
  // Build popup using DOM (avoids quote escaping issues)
  const titleEl=document.createElement('div');
  titleEl.style.cssText='font-size:10px;letter-spacing:2px;color:#4488bb;margin-bottom:10px;';
  titleEl.textContent=srcId+' → '+dstId;
  popup.appendChild(titleEl);
  unitDefs.forEach(u=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:6px;margin:4px 0;';
    const lbl=document.createElement('span');
    lbl.style.cssText='color:#888;font-size:11px;width:80px;';lbl.textContent=u.label;
    const btnM=document.createElement('button');
    btnM.textContent='−';btnM.style.cssText='background:#111;border:1px solid #333;color:#fff;width:22px;height:22px;cursor:pointer;';
    btnM.onclick=()=>mvChg(u.key,-1,u.max);
    const qty=document.createElement('span');
    qty.id='mv-'+u.key;qty.style.cssText='color:#fff;min-width:18px;text-align:center;';qty.textContent=chosen[u.key];
    const btnP=document.createElement('button');
    btnP.textContent='+';btnP.style.cssText='background:#111;border:1px solid #333;color:#fff;width:22px;height:22px;cursor:pointer;';
    btnP.onclick=()=>mvChg(u.key,1,u.max);
    const mx=document.createElement('span');
    mx.style.cssText='font-size:10px;color:#777;';mx.textContent='/ '+u.max;
    const _k=u.key,_m=u.max;
    const btnMax=document.createElement('button');
    btnMax.textContent='MAX';
    btnMax.style.cssText='background:#0a0a10;border:1px solid #4488bb;color:#4488bb;padding:0 5px;height:24px;cursor:pointer;font-size:8px;font-family:Orbitron,sans-serif;margin-left:2px;';
    btnMax.addEventListener('click',function(){const p=window._mvPopup;if(p){p._chosen[_k]=_m;const el=document.getElementById('mv-'+_k);if(el)el.textContent=_m;}});
    row.appendChild(lbl);row.appendChild(btnM);row.appendChild(qty);row.appendChild(btnP);row.appendChild(btnMax);row.appendChild(mx);
    popup.appendChild(row);
  });
  const btnRow=document.createElement('div');
  btnRow.style.cssText='display:flex;gap:6px;margin-top:10px;';
  const btnOk=document.createElement('button');
  btnOk.textContent='MOVER ▶';btnOk.style.cssText='background:#0a0a0d;border:1px solid #4488bb;color:#4488bb;padding:6px 14px;font-family:Orbitron,sans-serif;font-size:10px;cursor:pointer;flex:1;';
  btnOk.onclick=()=>mvConfirm(srcId,dstId);
  const btnX=document.createElement('button');
  btnX.textContent='✕';btnX.style.cssText='background:#0a0a0d;border:1px solid #333;color:#888;padding:6px 8px;cursor:pointer;';
  btnX.onclick=mvCancel;
  btnRow.appendChild(btnOk);btnRow.appendChild(btnX);
  popup.appendChild(btnRow);
  document.body.appendChild(popup);
  popup._chosen=chosen;window._mvPopup=popup;
}

function mvChg(key,delta,max){
  const p=window._mvPopup;if(!p)return;
  p._chosen[key]=Math.max(0,Math.min(max,(p._chosen[key]||0)+delta));
  const el=document.getElementById('mv-'+key);if(el)el.textContent=p._chosen[key];
}

function mvCancel(){
  const p=document.getElementById('move-popup');if(p)p.remove();
  window._mvPopup=null;G.moveSrc=null;G.moveMode=false;
  const mw=document.getElementById('map-wrap');if(mw)mw.classList.remove('moving');
  updateMap();
}

function mvConfirm(srcId,dstId){
  const p=window._mvPopup;if(!p)return;
  const src=G.territories[srcId],dst=G.territories[dstId];
  const c=p._chosen;
  const total=Object.values(c).reduce((n,v)=>n+v,0);
  if(!transferUnits(srcId,dstId,c)){addLog('Movimiento inválido: comprueba guarnición, alcance y capacidad de transporte.','sys');return;}
  addLog('Movidos '+total+' uds: '+terName(srcId)+' → '+terName(dstId),'move');
  p.remove();window._mvPopup=null;
  G.moveSrc=null;G.moveMode=false;G.moveTargets=null;
  const mw=document.getElementById('map-wrap');if(mw)mw.classList.remove('moving');
  // Stay in move mode - re-enable for next origin selection
  G.moveMode=true;
  addLog('Movimiento completado. Selecciona otro origen o pulsa SIGUIENTE.','move');
  updateMap();refreshCards();
}

function retreatCombat(){
  const ctx=G_combat;
  if(!ctx||ctx.done){closeDice();return;}
  if(!ctx.isPlayerAtt||!RULES.combat.allowRetreat)return;
  completeCombat(ctx,'retreated');closeDice();
}
function closeDice(){
  const ctx=G_combat;
  if(ctx&&!ctx.done){if(ctx.isPlayerAtt)retreatCombat();return;}
  document.getElementById('dmodal').classList.remove('open');
  document.getElementById('combat-unit-choice')?.remove();
  for(const side of ['att','def']){document.getElementById('unit-sel-'+side)?.remove();window['_usel_'+side]=null;}
  G_combat=null;G.attackSrc=null;
  if(typeof GameUX!=='undefined'&&GameUX.isMobile())updateMap();
}

// ── PHASES ────────────────────────────────────────────────────
const PHASES = ['prep','combat','end'];
const PHASE_LABELS = {'prep':'PREPARACIÓN','combat':'COMBATE','end':'FIN DE TURNO'};

function nextPhase() {
  // Legacy: called from SIGUIENTE button — now handled by step engine
  // But keep for compatibility
  nextStep();
}


// ════════════════════════════════════════════════════════════════
// GAME LOGIC — rewritten using RULES config
// ════════════════════════════════════════════════════════════════

// ── PREP PHASE ────────────────────────────────────────────────
function runPrepPhase(){
  if(G.gameOver)return;
  const wasWaiting=G.awaitingStart;
  G.awaitingStart=false;
  if(wasWaiting||!G_step.currentFk)startPhase('prep',G.setup.order[0]);
}

function showReinforcementUI(count) {
  if(count <= 0) { addLog('Sin refuerzos este turno.','res'); return; }
  const validTers=reinforcementTargets(G.pf);
  // Highlight valid territories
  validTers.forEach(t=>{
    const ring = document.getElementById('tr-'+t.id);
    if(ring){ ring.setAttribute('stroke','#44ff88'); ring.setAttribute('stroke-width','2.5'); }
  });

  G.reinforcementMode = {
    left: count,
    validIds: new Set(validTers.map(t=>t.id)),
    callback: (id, evt) => {
      if(!G.reinforcementMode || !G.reinforcementMode.validIds.has(id)) return false;
      if(G.reinforcementMode.left <= 0) return false;
      // Close any existing popup
      const ex = document.getElementById('reinf-counter-popup');
      if(ex) ex.remove();
      showReinforcementCounter(id, evt);
      return true;
    }
  };

  addLog(`📍 Coloca ${count} refuerzos en los territorios resaltados (verde).`, 'res');
}

function showReinforcementCounter(id, evt) {
  const t = G.territories[id];
  const left = G.reinforcementMode.left;
  if(left <= 0) return;

  const existing = document.getElementById('reinf-counter-popup');
  if(existing) existing.remove();

  let popX = 400, popY = 100;
  if(evt && evt.clientX){
    popX = Math.min(evt.clientX-70, window.innerWidth-160);
    popY = Math.max(evt.clientY-130, 10);
  }

  let qty = 1;
  const fk = G.pf;
  const popup = document.createElement('div');
  popup.id = 'reinf-counter-popup';
  popup.style.cssText = `position:fixed;left:${popX}px;top:${popY}px;
    background:#08080b;border:1px solid #44ff88;padding:12px 16px;z-index:700;
    font-family:Orbitron,sans-serif;text-align:center;min-width:130px;`;

  popup.innerHTML = `
    <div style="font-size:10px;letter-spacing:2px;color:#44ff88;margin-bottom:8px;">REFUERZOS</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px;">
      <button id="rc-minus" style="background:#111;border:1px solid #333;color:#fff;width:28px;height:28px;cursor:pointer;font-size:16px;">−</button>
      <span id="rc-qty" style="font-size:22px;color:#fff;min-width:32px;display:inline-block;text-align:center;">1</span>
      <button id="rc-plus" style="background:#111;border:1px solid #333;color:#fff;width:28px;height:28px;cursor:pointer;font-size:16px;">+</button>
    </div>
    <div style="font-size:10px;color:#777;margin-bottom:10px;">disponibles: ${left}</div>
    <div style="display:flex;gap:6px;">
      <button id="rc-ok" style="background:#0a0a0d;border:1px solid #44ff88;color:#44ff88;
        padding:5px 12px;font-family:Orbitron,sans-serif;font-size:10px;cursor:pointer;flex:1;">✓ OK</button>
      <button id="rc-x" style="background:#0a0a0d;border:1px solid #333;color:#888;padding:5px 8px;cursor:pointer;">✕</button>
    </div>`;

  document.body.appendChild(popup);

  popup.querySelector('#rc-minus').onclick = e=>{e.stopPropagation();if(qty>1){qty--;popup.querySelector('#rc-qty').textContent=qty;}};
  popup.querySelector('#rc-plus').onclick = e=>{e.stopPropagation();if(qty<left){qty++;popup.querySelector('#rc-qty').textContent=qty;}};
  popup.querySelector('#rc-x').onclick = e=>{e.stopPropagation();popup.remove();};
  popup.querySelector('#rc-ok').onclick = e=>{
    e.stopPropagation();
    popup.remove();
    placeReinforcements(id, qty);
  };
}

function placeReinforcements(id, qty) {
  if(G.gameOver) return;
  if(!G.reinforcementMode||!Number.isInteger(qty)||qty<1||qty>G.reinforcementMode.left||!reinforcementTargets(G.pf).some(t=>t.id===id))return;
  const t = G.territories[id];
  const f=G.factions[G.pf];
  if(!Object.values(G.territories).some(t=>t.owner===G.pf&&t.hasNuclear)&&G.pf!=='erb'&&RULES.prep.placement.fallbackOnePerRegion){(f.reinforcementRegions||={})[t.region]=id;}
  t.soldiers += qty;
  G.reinforcementMode.left -= qty;
  G.factions[G.pf].pendingSoldiers = Math.max(0,(G.factions[G.pf].pendingSoldiers||0)-qty);
  addLog(`+${qty} soldados → ${terName(id)}. Restantes: ${G.reinforcementMode.left}`, 'res');
  updateMap();

  if(G.reinforcementMode.left <= 0) {
    // Clear highlights
    Object.values(G.territories).forEach(t2=>{
      const ring=document.getElementById('tr-'+t2.id);
      if(ring){ring.setAttribute('stroke',FDATA[t2.owner]?FDATA[t2.owner].color:'#1a1a20');ring.setAttribute('stroke-width','1.5');}
    });
    G.reinforcementMode = null;
    addLog('✓ Refuerzos distribuidos.','res');
    refreshCards(); markStepDone('reinf'); nextStep();
  } else {
    // Re-render step UI to show updated count
    const area = document.getElementById('step-actions');
    if(area) {
      const leftEl = area.querySelector('[data-reinf-left]');
      if(leftEl) leftEl.textContent = G.reinforcementMode.left + ' soldados por colocar';
    }
    refreshCards();
  }
}

// ── END PHASE ─────────────────────────────────────────────────
function runEndPhase(){runMaintenanceRolls();}

// ── MISSILES ──────────────────────────────────────────────────
function refreshMissileState(){
  refreshCards();updateMissilePips();
  const step=STEPS[G_step.phase]?.[G_step.idx];if(step?.id==='missile')renderStepActions(step);
  _syncNow('Estado de misiles actualizado','combat');
}
function doMissileBuild(){
  if(G.gameOver||!G_step.isMyTurn||STEPS[G_step.phase]?.[G_step.idx]?.id!=='missile')return;
  const f=G.factions[G.pf],R=RULES.prep;
  if(R.buildBeforeFire&&f.missilesFiredThisTurn>0||f.missiles>=R.maxMissiles||f.plutonium<R.missileBuildCost)return;
  f.plutonium-=R.missileBuildCost;f.missiles++;f.missilesBuiltThisTurn=(f.missilesBuiltThisTurn||0)+1;
  refreshMissileState();
}
function launchMissile(fk,id,type,intercept=true,random=Math.random){
  const t=G.territories[id],f=G.factions[fk],R=RULES.combat;
  if(G.gameOver||!t||!f||!t.owner||t.owner===fk||f.missiles<1||Battle.count(t)<=1||!['soldiers','mechs','aircraft','scorpions'].includes(type)||!(t[type]>0))return null;
  f.missiles--;f.missilesFiredThisTurn=(f.missilesFiredThisTurn||0)+1;
  const defender=G.factions[t.owner];
  let interceptRoll=null;
  if(intercept&&defender?.missiles>0){defender.missiles--;interceptRoll=Math.floor(random()*R.missileInterceptDie)+1;}
  if(interceptRoll!==null&&interceptRoll>=R.missileInterceptThreshold)return {intercepted:true,interceptRoll,killed:false};
  const thresholds={soldiers:0,mechs:R.missileTargets.mech,aircraft:R.missileTargets.aircraft,scorpions:R.missileTargets.scorpion};
  const roll=type==='soldiers'?null:Math.floor(random()*6)+1;
  const killed=type==='soldiers'||roll>=thresholds[type];
  if(killed)t[type]--;
  return {intercepted:false,interceptRoll,roll,killed,type};
}
function doMissileFire(){
  if(G.gameOver||!G_step.isMyTurn||STEPS[G_step.phase]?.[G_step.idx]?.id!=='missile')return;
  const id=G.sel,t=G.territories[id],fk=G.pf,key=currentStepKey();
  if(!t||!t.owner||t.owner===fk||Battle.count(t)<=1||G.factions[fk].missiles<1)return;
  document.getElementById('missile-modal')?.remove();
  const modal=document.createElement('div');modal.id='missile-modal';
  modal.style.cssText='position:fixed;inset:0;z-index:1000;background:#000d;display:flex;align-items:center;justify-content:center';
  modal.innerHTML='<div style="padding:24px;background:#08080c;border:1px solid #cc4433"><h3>LANZAR MISIL — '+terName(id)+'</h3><p>Elige el objetivo antes de tirar. El defensor CPU intentará interceptar si tiene misiles.</p><div id="miss-result"></div>'+Object.values(Battle.keys).filter(type=>t[type]>0).map(type=>'<button data-missile-target="'+type+'">'+type+'</button>').join(' ')+'<button id="missile-close">CANCELAR</button></div>';
  document.body.appendChild(modal);
  modal.querySelector('#missile-close').onclick=()=>{if(typeof ONLINE!=='undefined'&&ONLINE.isOnline())ONLINE.cancelPendingDecision();modal.remove();};
  let fired=false;
  const applyImpact=(unitType,intercept)=>{
    if(key!==currentStepKey()||G.gameOver)return;
    const result=launchMissile(fk,id,unitType,intercept);
    if(!result){modal.remove();return;}fired=true;
    modal.querySelectorAll('[data-missile-target]').forEach(button=>button.disabled=true);
    modal.querySelector('#miss-result').textContent=result.intercepted?'INTERCEPTADO — D'+RULES.combat.missileInterceptDie+'='+result.interceptRoll:result.killed?'IMPACTO: '+result.type+' eliminado'+(result.roll?' — D6='+result.roll:''):'SIN EFECTO — D6='+result.roll;
    modal.querySelector('#missile-close').textContent='CERRAR';refreshMissileState();updateMap();
  };
  modal.querySelectorAll('[data-missile-target]').forEach(btn=>btn.onclick=()=>{
    if(fired||key!==currentStepKey()){return;}
    if(_isOnlineHumanTurn(t.owner)&&G.factions[t.owner].missiles>0){
      fired=true;modal.querySelector('#miss-result').textContent='Esperando decisión de intercepción del defensor…';
      const failed=error=>{fired=false;modal.querySelector('#miss-result').textContent='No se pudo solicitar la decisión. Reintenta o cancela.';addLog(error.message,'sys');};
      ONLINE.requestDecision('intercept',t.owner,{attFk:fk,targetId:id,unitType:btn.dataset.missileTarget},(choice,error)=>{if(error){failed(error);return;}if(typeof choice?.intercept!=='boolean'){failed(new Error('Intercepción inválida'));return;}applyImpact(btn.dataset.missileTarget,choice.intercept);}).catch(failed);
    }else applyImpact(btn.dataset.missileTarget,true);
  });
}
