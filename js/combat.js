let G_combat = null;

// Called when PLAYER attacks
function openDice(targetId) {
  const srcId=G.sel;
  if(!srcId){addLog('Selecciona tu territorio origen primero','sys');return;}
  const src=G.territories[srcId], tgt=G.territories[targetId];
  if(!src||!tgt||src.owner!==G.pf){addLog('Selecciona tu territorio','sys');return;}
  if(armyPoints(src)===0){addLog('Sin unidades en origen','sys');return;}
  if(armyPoints(src)<=1){addLog('Necesitas al menos 2 unidades para atacar (1 se queda en origen).','sys');return;}
  if(!tgt.owner||tgt.owner===G.pf){addLog('Selecciona territorio enemigo','sys');return;}

  G_combat={srcId,targetId,attFk:G.pf,defFk:tgt.owner,round:1,done:false,isPlayerAtt:true,isPlayerDef:false};
  openCombatModal('player-att');
}

// Called when CPU attacks player
function openDiceCpu(srcId, targetId, cpuFk, callback) {
  const src=G.territories[srcId], tgt=G.territories[targetId];
  const isPlayerDef=(tgt.owner===G.pf);
  G_combat={srcId,targetId,attFk:cpuFk,defFk:tgt.owner,round:1,done:false,
            isPlayerAtt:false,isPlayerDef,callback};
  if(isPlayerDef) {
    // Player defends — wait for click on hex
    // G_combat stored, flashAttackedTerritory already called
  } else {
    // CPU vs CPU — flash hex, player can click to watch, auto-resolves after delay
    if(!G.pendingCpuAttack) G.pendingCpuAttack = {};
    G.pendingCpuAttack[targetId] = { srcId, attFk: cpuFk, spectator: true, callback };
    const attFd = FDATA[cpuFk]||{name:cpuFk,color:'#888'};
    const defFd = FDATA[tgt.owner]||{name:tgt.owner,color:'#888'};
    const ex = document.getElementById('attack-banner');
    if(ex) ex.remove();
    const banner = document.createElement('div');
    banner.id = 'attack-banner';
    banner.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:800;'+
      'background:#0a0010;border:2px solid #6644aa;padding:8px 20px;font-family:Orbitron,sans-serif;'+
      'text-align:center;box-shadow:0 0 16px #6644aa88;cursor:pointer;';
    banner.innerHTML = '<div style="font-size:10px;color:#9966cc;letter-spacing:2px;">COMBATE RIVAL</div>'+
      '<div style="font-size:9px;color:#aaa;margin-top:3px;">'+
      '<span style="color:'+attFd.color+'">'+attFd.name+'</span> ataca <span style="color:'+defFd.color+'">'+defFd.name+'</span> en '+terName(targetId)+
      '</div><div style="font-size:8px;color:#666;margin-top:2px;">Pulsa el hexágono para ver — auto-resuelve en 5s</div>';
    banner.onclick = () => { banner.remove(); };
    document.body.appendChild(banner);
    // Auto-resolve after 5s if player didn't open spectator view
    const autoTimer = setTimeout(()=>{
      const b=document.getElementById('attack-banner');if(b)b.remove();
      if(G.pendingCpuAttack && G.pendingCpuAttack[targetId]) {
        // Player didn't watch — resolve silently
        delete G.pendingCpuAttack[targetId];
        clearAttackFlash(targetId);
        resolveCpuCpuSilent(srcId, targetId, cpuFk, callback);
      }
    }, 5000);
    G.pendingCpuAttack[targetId]._timer = autoTimer;
  }
}

function openCombatModal(mode) {
  const Rc=RULES.combat, ctx=G_combat;
  const src=G.territories[ctx.srcId], tgt=G.territories[ctx.targetId];
  const af=FDATA[ctx.attFk]||{name:ctx.attFk,color:'#C8A800'};
  const df=FDATA[ctx.defFk]||{name:ctx.defFk,color:'#4488ff'};

  // Build attack pool: must leave 1 unit in origin (cheapest stays behind)
  const attFull=buildPool(src);
  // Remove 1 cheapest unit from the attack pool (it stays in origin)
  const attAvail = attFull.slice(); // copy
  // Cheapest = last in pool (buildPool adds: scorp, mech, air, sol — sol is last)
  const leaveIdx = attAvail.length - 1; // remove last (cheapest = soldier)
  if(leaveIdx >= 0) attAvail.splice(leaveIdx, 1);
  const defFull=buildPool(tgt);
  const attN=Math.min(attAvail.length,Rc.maxAttackDice);
  const defN=Math.min(attN,Rc.maxDefenseDice,defFull.length); // Risk-style
  ctx.attPool=attAvail; ctx.defPool=defFull;
  ctx.attSelected=attAvail.slice(0,attN);
  ctx.defSelected=defFull.slice(0,defN);

  document.querySelector('#dmodal h2').innerHTML='⚔ COMBATE — Ronda '+ctx.round;
  document.getElementById('cdesc').innerHTML=
    '<span style="color:'+af.color+'">'+af.name+'</span> ⚔ <span style="color:'+df.color+'">'+df.name+'</span><br>'+
    '<span style="font-size:10px;color:#777;">'+ctx.srcId+' → '+ctx.targetId+'  |  '+attN+' dados ataque vs '+defN+' dados defensa</span>';
  document.getElementById('dlba').innerHTML='<span style="color:'+af.color+'">'+af.name+'</span>';
  document.getElementById('dlbd').innerHTML='<span style="color:'+df.color+'">'+df.name+'</span>';
  document.getElementById('dtot-a').textContent='';
  document.getElementById('dtot-d').textContent='';
  document.getElementById('dres').textContent='';
  document.getElementById('btn-retreat').style.display='none';

  renderDicePools();

  const rollBtn=document.getElementById('btn-roll');
  const cancelBtn=document.getElementById('btn-cancel');
  const retreatBtn=document.getElementById('btn-retreat');

  if(mode==='player-att') {
    document.getElementById('dres').innerHTML=
      '<div style="color:#C8A800;font-size:12px;">TU ATAQUE — pulsa para lanzar</div>';
    rollBtn.textContent='⚄ LANZAR DADOS'; rollBtn.style.display='inline-block';
    rollBtn.onclick=()=>resolveCombatRound(false);
    cancelBtn.textContent='CANCELAR'; cancelBtn.style.display='inline-block';
    cancelBtn.onclick=()=>{closeDice();G.attackSrc=null;};
    if(ctx.round>1){
      retreatBtn.style.display='inline-block';
      retreatBtn.textContent='↩ RETIRAR';
      retreatBtn.onclick=()=>retreatCombat();
    }
  } else if(mode==='cpu-att-player-def') {
    // Flash the attacked territory red
    const _ring=document.getElementById('tr-'+ctx.targetId);
    if(_ring){_ring.setAttribute('stroke','#ff2222');_ring.setAttribute('stroke-width','4');_ring.setAttribute('filter','url(#fx-glow)');}
    G.sel=ctx.targetId; updateMap();
    // Highlight the territory being attacked on the map
    const ring=document.getElementById('tr-'+ctx.targetId);
    if(ring){ring.setAttribute('stroke','#ff4444');ring.setAttribute('stroke-width','3.5');ring.setAttribute('filter','url(#fx-glow)');}
    document.getElementById('dres').innerHTML=
      '<div style="color:#ff4444;font-size:13px;margin-bottom:4px;">⚠ ¡'+af.name+' ATACA '+ctx.targetId+'!</div>'+
      '<div style="font-size:10px;color:#888;">Tu territorio bajo ataque desde '+ctx.srcId+'</div>'+
      '<div style="font-size:10px;color:#C8A800;margin-top:6px;">Primero verás la tirada del atacante</div>';
    rollBtn.textContent='⚄ VER TIRADA ATACANTE'; rollBtn.style.display='inline-block';
    rollBtn.onclick=()=>rollAttackerThenDefend();
    cancelBtn.style.display='none';
    retreatBtn.style.display='none';
  } else {
    document.getElementById('dres').innerHTML='<div style="color:#888;">CPU vs CPU...</div>';
    rollBtn.style.display='none';
    cancelBtn.textContent='CERRAR'; cancelBtn.style.display='inline-block';
    cancelBtn.onclick=()=>{closeDice();if(ctx.callback)ctx.callback();};
    setTimeout(()=>resolveCombatRound(true),800);
  }
  document.getElementById('dmodal').classList.add('open');
}


function buildPool(terr, maxN) {
  const Rc=RULES.combat;
  const pool=[];
  for(let i=0;i<(terr.scorpions||0);i++) pool.push({type:'scorp',sides:Rc.unitDice.scorpion,label:'🦂'});
  for(let i=0;i<(terr.mechs||0);i++)     pool.push({type:'mech', sides:Rc.unitDice.mech,   label:'🤖'});
  for(let i=0;i<(terr.aircraft||0);i++)  pool.push({type:'air',  sides:Rc.unitDice.aircraft,label:'✈'});
  for(let i=0;i<(terr.soldiers||0);i++)  pool.push({type:'sol',  sides:Rc.unitDice.soldier, label:'🪖'});
  return pool; // caller slices to maxN
}

function defDiceCount(attCount, maxDef, defUnits) {
  // Risk-style: defender uses min(attCount, maxDef, available units)
  return Math.min(attCount, maxDef, defUnits);
}

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
  div.remove();
  delete window['_usel_'+side];
}

function doPlayerAttackRoll() {
  const ctx=G_combat;
  if(!ctx.attSelected||ctx.attSelected.length===0){ctx.attSelected=ctx.attPool.slice(0,RULES.combat.maxAttackDice);}
  if(!ctx.defSelected||ctx.defSelected.length===0){ctx.defSelected=ctx.defPool.slice(0,RULES.combat.maxDefenseDice);}
  resolveCombatRound(false);
}

function doPlayerDefendRoll() {
  const ctx=G_combat;
  if(!ctx.defSelected||ctx.defSelected.length===0){ctx.defSelected=ctx.defPool.slice(0,RULES.combat.maxDefenseDice);}
  if(!ctx.attSelected||ctx.attSelected.length===0){ctx.attSelected=ctx.attPool.slice(0,RULES.combat.maxAttackDice);}
  resolveCombatRound(false);
}


function applyLoss(terr) {
  // Remove one unit from territory (worst unit first: sol → mech → air → scorp going up)
  // Actually remove BEST unit to be fair: scorp → mech/air → sol
  if(terr.soldiers > 0) { terr.soldiers--; return 'sol'; }
  if(terr.mechs > 0)    { terr.mechs--;    return 'mech'; }
  if(terr.aircraft > 0) { terr.aircraft--; return 'air'; }
  if(terr.scorpions > 0){ terr.scorpions--; return 'scorp'; }
  return null;
}

function resolveCombatRound(auto) {
  const Rc=RULES.combat, ctx=G_combat;
  if(!ctx) return;
  const src=G.territories[ctx.srcId], tgt=G.territories[ctx.targetId];
  const att=ctx.attSelected||ctx.attPool.slice(0,Rc.maxAttackDice);
  const def=ctx.defSelected||ctx.defPool.slice(0,Rc.maxDefenseDice);
  const aR=att.map(d=>Math.floor(Math.random()*d.sides)+1);
  const dR=def.map(d=>Math.floor(Math.random()*d.sides)+1);
  if(ctx.attFk==='clt'){const mi=aR.indexOf(Math.min(...aR));if(mi>=0)aR[mi]++;}
  if(ctx.defFk==='imp'){const mi=dR.indexOf(Math.min(...dR));if(mi>=0)dR[mi]++;}
  att.forEach((_,i)=>{const el=document.getElementById('da'+i);if(el){el.textContent=aR[i];el.className='die att spin';setTimeout(()=>el.classList.remove('spin'),500);}});
  def.forEach((_,i)=>{const el=document.getElementById('dd'+i);if(el){el.textContent=dR[i];el.className='die def spin';setTimeout(()=>el.classList.remove('spin'),500);}});
  document.getElementById('dtot-a').textContent=aR.join(' · ');
  document.getElementById('dtot-d').textContent=dR.join(' · ');
  setTimeout(()=>applyBattleResult(aR,dR),800);
}

function rollCombat(){ doPlayerAttackRoll(); }

function rollAttackerThenDefend() {
  const Rc=RULES.combat, ctx=G_combat; if(!ctx) return;
  const att=ctx.attSelected;
  const aR=att.map(d=>Math.floor(Math.random()*d.sides)+1);
  if(ctx.attFk==='clt'){const mi=aR.indexOf(Math.min(...aR));if(mi>=0)aR[mi]++;}
  att.forEach((_,i)=>{const el=document.getElementById('da'+i);if(el){el.textContent=aR[i];el.className='die att spin';setTimeout(()=>el.classList.remove('spin'),500);}});
  document.getElementById('dtot-a').textContent=aR.join(' · ');
  ctx._attRolls=aR;
  const rollBtn=document.getElementById('btn-roll');
  setTimeout(()=>{
    document.getElementById('dres').innerHTML='<div style="color:#ff4444;">Atacante: '+aR.join(', ')+'</div><div style="font-size:10px;color:#C8A800;">Ahora TUS dados de defensa</div>';
    if(rollBtn){rollBtn.textContent='🛡 LANZAR DEFENSA';rollBtn.onclick=()=>resolveDefenseRoll(aR);}
  },800);
}

function resolveDefenseRoll(aR) {
  const ctx=G_combat; if(!ctx) return;
  const def=ctx.defSelected;
  const dR=def.map(d=>Math.floor(Math.random()*d.sides)+1);
  if(ctx.defFk==='imp'){const mi=dR.indexOf(Math.min(...dR));if(mi>=0)dR[mi]++;}
  def.forEach((_,i)=>{const el=document.getElementById('dd'+i);if(el){el.textContent=dR[i];el.className='die def spin';setTimeout(()=>el.classList.remove('spin'),500);}});
  document.getElementById('dtot-d').textContent=dR.join(' · ');
  setTimeout(()=>applyBattleResult(aR,dR),800);
}

function applyBattleResult(aR,dR) {
  const Rc=RULES.combat, ctx=G_combat; if(!ctx) return;
  const src=G.territories[ctx.srcId], tgt=G.territories[ctx.targetId];
  const aS=[...aR].sort((a,b)=>b-a), dS=[...dR].sort((a,b)=>b-a);
  const pairs=Math.min(aS.length,dS.length);
  let aL=0,dL=0;
  for(let i=0;i<pairs;i++){if(Rc.tieBreakerDefender?aS[i]>dS[i]:aS[i]>=dS[i])dL++;else aL++;}
  for(let i=0;i<dL;i++) applyLoss(tgt);
  for(let i=0;i<aL;i++) applyLoss(src);
  const res=document.getElementById('dres');
  const rollBtn=document.getElementById('btn-roll');
  const retreatBtn=document.getElementById('btn-retreat');
  const cancelBtn=document.getElementById('btn-cancel');
  const conquered=armyPoints(tgt)===0;
  if(conquered||armyPoints(src)===0){
    if(conquered){
    tgt.owner=ctx.attFk;
    G.factions[ctx.attFk].conqueredThisTurn=(G.factions[ctx.attFk].conqueredThisTurn||0)+1;
    // Move attacking units to conquered territory, leave 1 unit in origin
    const apSrc=armyPoints(src);
    if(apSrc>1){
      // Move all to conquered, leave 1 cheapest unit in origin
      // Cheapest = soldier > mech > aircraft > scorpion
      const leaveUnit = src.soldiers>0?'soldiers':src.mechs>0?'mechs':src.aircraft>0?'aircraft':'scorpions';
      // Move everything to tgt first
      tgt.soldiers+=src.soldiers; src.soldiers=0;
      tgt.mechs+=src.mechs; src.mechs=0;
      tgt.aircraft+=src.aircraft; src.aircraft=0;
      tgt.scorpions+=src.scorpions; src.scorpions=0;
      // Put 1 cheapest unit back in origin
      if(leaveUnit==='soldiers'&&tgt.soldiers>0){src.soldiers=1;tgt.soldiers--;}
      else if(leaveUnit==='mechs'&&tgt.mechs>0){src.mechs=1;tgt.mechs--;}
      else if(leaveUnit==='aircraft'&&tgt.aircraft>0){src.aircraft=1;tgt.aircraft--;}
      else if(leaveUnit==='scorpions'&&tgt.scorpions>0){src.scorpions=1;tgt.scorpions--;}
    } else {
      // Only 1 unit left in src - stays, tgt gets nothing (already 0 defenders)
      // Put attacking unit into tgt
      if(src.soldiers>0){src.soldiers--;tgt.soldiers++;}
      else if(src.mechs>0){src.mechs--;tgt.mechs++;}
      else if(src.aircraft>0){src.aircraft--;tgt.aircraft++;}
      else if(src.scorpions>0){src.scorpions--;tgt.scorpions++;}
    }
    res.innerHTML='<div style="color:#88cc44;font-size:13px;">✅ CONQUISTA: '+ctx.targetId+'</div><div style="font-size:10px;color:#777;">Atq-'+aL+' Def-'+dL+'</div>';
    addLog('⚔ CONQUISTA '+ctx.targetId,'combat');
    checkElimination(ctx.defFk);checkWinCondition();
  }
    else{res.innerHTML='<div style="color:#cc4444;">Sin unidades atacantes</div>';addLog('⚔ Sin unidades.','combat');}
    if(rollBtn)rollBtn.style.display='none';if(retreatBtn)retreatBtn.style.display='none';
    if(cancelBtn){cancelBtn.textContent='CERRAR';cancelBtn.style.display='inline-block';cancelBtn.onclick=()=>{closeDice();G.attackSrc=null;if(ctx.callback)ctx.callback();};}
  } else {
    ctx.round++;
    const ap1=armyPoints(src),ap2=armyPoints(tgt);
    res.innerHTML='<div style="color:#C8A800;">R'+(ctx.round-1)+': Atq-'+aL+' Def-'+dL+'</div><div style="font-size:10px;color:#888;">AP Atq:'+ap1+' Def:'+ap2+'</div>';
    addLog('⚔ R'+(ctx.round-1)+': Atq-'+aL+' Def-'+dL+'. AP:'+ap1+' vs '+ap2,'combat');
    // Rebuild pools - always leave 1 unit in origin
    const attRebuild=buildPool(src);
    if(attRebuild.length>0) attRebuild.splice(attRebuild.length-1,1); // remove cheapest
    ctx.attPool=attRebuild; ctx.defPool=buildPool(tgt);
    const aN=Math.min(ctx.attPool.length,Rc.maxAttackDice);
    const dN=Math.min(aN,Rc.maxDefenseDice,ctx.defPool.length);
    ctx.attSelected=ctx.attPool.slice(0,aN);ctx.defSelected=ctx.defPool.slice(0,dN);
    renderDicePools();
    if(ctx.isPlayerAtt){
      // Can only continue if attacker has >1 unit (1 must stay in origin)
      const canContinue = armyPoints(src) > 1 && ctx.attPool && ctx.attPool.length > 0;
      if(rollBtn){rollBtn.textContent= canContinue ? '⚄ CONTINUAR ATAQUE' : '⚠ Sin unidades para continuar';rollBtn.style.display='inline-block';rollBtn.disabled=!canContinue;rollBtn.onclick=canContinue?()=>resolveCombatRound(false):null;}
      if(retreatBtn){retreatBtn.style.display='inline-block';retreatBtn.onclick=()=>retreatCombat();}
      if(cancelBtn){cancelBtn.textContent='TERMINAR COMBATE';cancelBtn.style.display='inline-block';cancelBtn.onclick=()=>{closeDice();G.attackSrc=null;};}
    } else if(ctx.isPlayerDef){
      // Player is defender - see attacker roll then defend
      if(rollBtn){rollBtn.textContent='⚄ VER SIGUIENTE TIRADA ATACANTE';rollBtn.style.display='inline-block';rollBtn.onclick=()=>rollAttackerThenDefend();}
      if(cancelBtn)cancelBtn.style.display='none';
    } else {
      // Spectator - CPU vs CPU, auto-resolve
      if(rollBtn){rollBtn.textContent='▶ VER SIGUIENTE RONDA';rollBtn.style.display='inline-block';rollBtn.onclick=()=>setTimeout(()=>resolveCombatRound(true),400);}
      if(cancelBtn)cancelBtn.style.display='none';
    }
  }
  updateMap();refreshCards();
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
  const total=Object.values(c).reduce((s,v)=>s+v,0);
  if(total===0){addLog('Elige al menos 1 unidad','sys');return;}
  if(total>=armyPoints(src)){addLog('Deja al menos 1 unidad en origen','sys');return;}
  src.soldiers-=(c.soldiers||0);dst.soldiers+=(c.soldiers||0);
  src.mechs-=(c.mechs||0);dst.mechs+=(c.mechs||0);
  src.aircraft-=(c.aircraft||0);dst.aircraft+=(c.aircraft||0);
  src.scorpions-=(c.scorpions||0);dst.scorpions+=(c.scorpions||0);
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
  addLog('↩ Retirada. Combate terminado.','combat');
  closeDice();
}

function closeDice(){
  document.getElementById('dmodal').classList.remove('open');
  if(G_combat && G_combat.targetId){
    clearAttackFlash(G_combat.targetId);
  }
  G_combat=null;
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
function runPrepPhase() {
  // Legacy: called from game-start overlay
  // Income is applied by step engine (executeAutoStep), don't call again
  // Just ensure step engine is running
  if(!G_step || !G_step.currentFk) {
    startPhase('prep', G.setup.order[0]||G.pf);
  }
}

function showReinforcementUI(count) {
  if(count <= 0) { addLog('Sin refuerzos este turno.','res'); return; }
  const R = RULES.prep;
  const myF = G.factions[G.pf];
  const myTers = Object.values(G.territories).filter(t=>t.owner===G.pf);
  const nucTers = myTers.filter(t=>t.hasNuclear);

  let validTers;
  if(G.pf==='erb' && R.placement.ereubsAnywhereOverride) {
    validTers = myTers;
  } else if(!R.placement.onlyInNuclearTerritories) {
    validTers = myTers;
  } else if(nucTers.length > 0) {
    validTers = nucTers;
  } else if(R.placement.fallbackOnePerRegion) {
    // One territory per region
    const byRegion = {};
    myTers.forEach(t=>{ if(!byRegion[t.region]) byRegion[t.region]=t; });
    validTers = Object.values(byRegion);
  } else {
    validTers = myTers;
  }

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
  const t = G.territories[id];
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
function runEndPhase() {
  const R = RULES.end;
  if(!R.maintenanceEnabled){ addLog('Mantenimiento desactivado.','sys'); return; }
  const myTerrs = Object.values(G.territories).filter(t=>t.owner===G.pf&&t.hasNuclear);
  let explosions = 0;
  myTerrs.forEach(t=>{
    const roll = Math.floor(Math.random()*R.maintenanceDie)+1;
    addLog(`🎲 Mantenimiento ${t.id}: D${R.maintenanceDie}=${roll}`, 'sys');
    if(roll===R.maintenanceExplosionOn){
      explosions++;
      t.hasNuclear = false;
      const hasAir = t.aircraft > 0;
      if(hasAir){
        // Aircraft survive, all ground units eliminated
        t.soldiers=0; t.mechs=0; t.scorpions=0;
      } else {
        // All ground eliminated except 1 minimum
        const total = t.soldiers+t.mechs+t.scorpions;
        t.soldiers = Math.max(1, t.soldiers-(t.soldiers>0?t.soldiers:0));
        t.mechs=0; t.scorpions=0;
        if(t.soldiers===0) t.soldiers=1;
      }
      addLog(`💥 EXPLOSIÓN NUCLEAR en ${t.id}! Roll=${roll}`, 'combat');
        showNuclearExplosionBanner(t.id, FDATA[fk]||{name:fk,color:'#88cc44'});
    }
  });
  if(explosions===0) addLog('☢ Mantenimiento completado. Sin explosiones.','res'); markStepDone('maint');
  refreshCards(); updateMap();
}

// ── MISSILES ──────────────────────────────────────────────────
function doMissileBuild() {
  const myF = G.factions[G.pf];
  const R = RULES.prep;
  if(R.buildBeforeFire && (myF.missilesFiredThisTurn||0)>0){
    addLog('⚠ Ya has disparado misiles este turno. No puedes construir más.','sys'); return;
  }
  if(myF.missiles>=R.maxMissiles){ addLog('⚠ Máximo de misiles alcanzado.','sys'); return; }
  if(myF.plutonium<R.missileBuildCost){ addLog('⚠ Plutonium insuficiente.','sys'); return; }
  myF.plutonium-=R.missileBuildCost;
  myF.missiles=Math.min(R.maxMissiles,myF.missiles+1);
  myF.missilesBuiltThisTurn=(myF.missilesBuiltThisTurn||0)+1;
  addLog('Misil construido. '+myF.missiles+'/'+R.maxMissiles+'. -'+R.missileBuildCost+' PLU.','res');
  refreshCards(); updateMap();
  // Force re-render missile step UI to update pip bar
  if(G_step && STEPS[G_step.phase]) {
    const _s=(STEPS[G_step.phase]||[])[G_step.idx];
    if(_s) { const a=document.getElementById('step-actions'); if(a) renderStepActions(_s); }
  }
}

function doMissileFire() {
  const id = G.sel;
  const myF = G.factions[G.pf];
  const R = RULES.prep, Rc = RULES.combat;
  if(!id){ addLog('Selecciona territorio enemigo objetivo.','sys'); return; }
  const t = G.territories[id];
  if(!t||!t.owner||t.owner===G.pf){ addLog('Selecciona un territorio ENEMIGO.','sys'); return; }
  if(myF.missiles<1){ addLog('Sin misiles disponibles.','sys'); return; }

  // Show missile popup
  const ex = document.getElementById('missile-modal');
  if(ex) ex.remove();
  const fd = FDATA[G.pf]||{name:G.pf,color:'#C8A800'};
  const defFd = FDATA[t.owner]||{name:t.owner,color:'#888'};

  const modal = document.createElement('div');
  modal.id = 'missile-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000;display:flex;align-items:center;justify-content:center;';

  const box = document.createElement('div');
  box.style.cssText = 'background:#08080c;border:1px solid #cc4433;padding:24px 32px;min-width:360px;font-family:Orbitron,sans-serif;text-align:center;';
  box.innerHTML = `
    <div style="font-size:13px;letter-spacing:3px;color:#cc4433;margin-bottom:6px;">🚀 LANZAMIENTO DE MISIL</div>
    <div style="font-size:11px;color:#aaa;margin-bottom:16px;">
      <span style="color:${fd.color}">${fd.name}</span> → ${id} 
      (<span style="color:${defFd.color}">${defFd.name}</span>)
    </div>
    <div id="miss-intercept-info" style="font-size:11px;color:#888;margin-bottom:16px;">
      ${G.factions[t.owner]?.missiles>0 ? `⚠ ${defFd.name} tiene ${G.factions[t.owner].missiles} misil(es) de intercepción` : '✓ Sin misiles de intercepción'}
    </div>
    <div id="miss-result" style="font-size:14px;min-height:28px;margin-bottom:16px;"></div>
    <button id="miss-fire-btn" style="background:#0a0a0d;border:1px solid #cc4433;color:#cc4433;padding:12px 28px;font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:2px;cursor:pointer;">
      🚀 LANZAR MISIL
    </button>`;

  modal.appendChild(box);
  document.body.appendChild(modal);

  document.getElementById('miss-fire-btn').onclick = () => {
    const btn = document.getElementById('miss-fire-btn');
    // Check if target has only 1 unit BEFORE firing
    if(armyPoints(t)<=1){
      addLog('⚠ No se puede eliminar la última unidad. Misil conservado.','sys');
      modal.remove(); return;
    }
    btn.disabled=true; btn.style.opacity='0.4';

    myF.missiles--;
    myF.missilesFiredThisTurn=(myF.missilesFiredThisTurn||0)+1;
    G.missileFiringMode=false;

    const defF = G.factions[t.owner];
    let intercepted=false, resultMsg='', resultColor='#cc4433';

    if(defF && defF.missiles>0) {
      defF.missiles--; // always consumed when used to intercept
      const roll=Math.floor(Math.random()*Rc.missileInterceptDie)+1;
      if(roll>=Rc.missileInterceptThreshold) {
        intercepted=true;
        resultMsg=`🛡 INTERCEPTADO — D${Rc.missileInterceptDie}=${roll} (≥${Rc.missileInterceptThreshold})`;
        resultColor='#88cc44';
        addLog(`Misil interceptado (D${Rc.missileInterceptDie}=${roll})`,'res');
      } else {
        resultMsg=`Intercepción fallida — D${Rc.missileInterceptDie}=${roll} (<${Rc.missileInterceptThreshold})`;
      }
    }

    if(!intercepted) {
      const MT=Rc.missileTargets;
      const total=armyPoints(t);
      if(total<=1) {
        resultMsg='⚠ Sin efecto — no puede eliminar la última unidad';
        resultColor='#888';
      } else if(t.soldiers>0) {
        t.soldiers--;
        resultMsg='💀 IMPACTO — 1 Soldado eliminado';
        addLog(`Misil → ${id}: soldado eliminado`,'combat');
      } else if(t.mechs>0) {
        const r=Math.floor(Math.random()*6)+1;
        if(r>=MT.mech){t.mechs--;resultMsg=`💀 IMPACTO — Mech eliminado (D6=${r})`;}
        else resultMsg=`Mech resistió (D6=${r}<${MT.mech})`;
        addLog(`Misil → ${id}: D6=${r}`,'combat');
      } else if(t.aircraft>0) {
        const r=Math.floor(Math.random()*6)+1;
        if(r>=MT.aircraft){t.aircraft--;resultMsg=`💀 IMPACTO — Aircraft eliminado (D6=${r})`;}
        else resultMsg=`Aircraft resistió (D6=${r}<${MT.aircraft})`;
      } else if(t.scorpions>0) {
        const r=Math.floor(Math.random()*6)+1;
        if(r>=MT.scorpion){t.scorpions--;resultMsg=`💀 IMPACTO — Scorpion eliminado (D6=${r})`;}
        else resultMsg=`Scorpion resistió (D6=${r}<${MT.scorpion})`;
      }
    }

    const res=document.getElementById('miss-result');
    if(res){res.textContent=resultMsg;res.style.color=resultColor;}
    updateMap();refreshCards();

    // Re-render step
    const step=(STEPS[G_step.phase]||[])[G_step.idx];
    if(step) renderStepActions(step);

    setTimeout(()=>{ modal.remove(); },2500);
  };
}


