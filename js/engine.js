const STEPS = {
  prep: [
    { id:'income',   title:'1. RECIBIR INGRESOS',
      detail:'Plutonio y refuerzos calculados automáticamente según tus Nucleares y territorios.',
      isAuto: true },
    { id:'reinf',    title:'2. COLOCAR REFUERZOS',
      detail:'Haz clic en tus territorios resaltados para colocar soldados. Usa el botón cuando termines.',
      isAuto: false },
    { id:'upgrade',  title:'3. MEJORAS (opcional)',
      detail:'Convierte soldados en unidades más potentes pagando Plutonio.',
      isAuto: false },
    { id:'move',     title:'4. MOVER UNIDADES (opcional)',
      detail:'Selecciona un territorio tuyo, luego un destino. Terrestres: hasta 2 saltos. Aircraft: cualquier destino tuyo.',
      isAuto: false },
    { id:'missile',  title:'5. MISILES (opcional)',
      detail:'Construye misiles (antes de disparar). Lanza a territorios enemigos.',
      isAuto: false },
    { id:'nuclear',  title:'6. CONSTRUIR NUCLEARES (opcional)',
      detail:'Construye nuevos Nuclear Complexes en tus territorios (4 Pu cada uno).',
      isAuto: false },
  ],
  combat: [
    { id:'attack',   title:'1. ATACAR (opcional)',
      detail:'Selecciona tu territorio, luego haz clic en uno enemigo adyacente. Puedes atacar varias veces.',
      isAuto: false },
  ],
  end: [
    { id:'regroup',  title:'1. REAGRUPAR',
      detail:'Mueve unidades entre tus territorios.',
      isAuto: false },
    { id:'maint',    title:'2. MANTENIMIENTO NUCLEAR',
      detail:'D12 por cada Nuclear Complex. Si sale 1: explosión nuclear.',
      isAuto: false },
  ],
};

const VICTORY_DETAIL = {
  imp:'Controla 5 regiones completas al inicio de tu turno.',
  lib:'Nucleares en tablero ≤ número de jugadores al final de tu turno.',
  clt:'Elimina dos jugadores enemigos; se comprueba al final de tu turno.',
  erb:'Controla una Nuclear en 7 regiones distintas al final de tu turno.',
  prm:'Controla al menos la mitad de las Nucleares al final de tu turno.',
  shn:'Mayor ejército en AP en 7 regiones al final de tu turno.',
};

// ── Online helpers ────────────────────────────────────────────
function _isOnlineHumanTurn(fk) {
  // True if fk is a human player in online mode (not CPU)
  if (typeof ONLINE === 'undefined' || !ONLINE.isOnline()) return false;
  if (typeof _onlinePlayerFactions === 'undefined' || !_onlinePlayerFactions) return false;
  return _onlinePlayerFactions.has(fk);
}

function _syncNow(logMsg, logType) {
  // Push full G state to Firebase so observers are up to date
  if (typeof ONLINE === 'undefined' || !ONLINE.isOnline()) return;
  ONLINE.pushActionWithState('FULL_SYNC', {
    logMsg:  logMsg  || '',
    logType: logType || 'sys',
  });
}

// ── State ─────────────────────────────────────────────────────
let G_step = { idx:0, phase:'prep', isMyTurn:true, cpuQueue:[] };

function startPhase(phase, fk) {
  if(G.gameOver || G.awaitingStart || G.setup?._inSetup || G.factions[fk]?.alive===false) return;
  clearInteractionModes();
  if(phase==='prep'){ checkWinCondition('start',fk); if(G.gameOver)return; }
  G.currentFaction = fk;
  G.phase = phase;
  G_step.phase     = phase;
  G_step.idx       = 0;
  G_step.isMyTurn  = (fk === G.pf);
  G_step.currentFk = fk;
  updatePhaseBanner(fk);
  runCurrentStep();
}

function updateTurnOrderBar() {
  const header  = document.getElementById('turn-header');
  const dots    = document.getElementById('turn-dots');
  const phaseLbl= document.getElementById('turn-phase-lbl');
  if(!header||!dots||!G.setup||!G.setup.order||!G.setup.order.length) return;
  header.style.display='block';
  const order      = G.setup.order;
  const currentFk  = G_step.currentFk;
  const phases     = {prep:'PREPARACIÓN',combat:'COMBATE',end:'FIN DE TURNO'};
  if(phaseLbl) phaseLbl.textContent = phases[G_step.phase]||'TURNO';
  dots.innerHTML = order.map(fk=>{
    const fd      = FDATA[fk]||{name:fk,color:'#888'};
    const isActive= fk===currentFk;
    const isMe    = fk===G.pf;
    return '<div title="'+fd.name+(isMe?' (TÚ)':'')+'" style="display:flex;align-items:center;gap:2px;opacity:'+(isActive?1:0.4)+';">'+
      '<div style="width:'+(isActive?10:6)+'px;height:'+(isActive?10:6)+'px;border-radius:50%;background:'+fd.color+';'+(isActive?'box-shadow:0 0 5px '+fd.color+';':'')+'flex-shrink:0;"></div>'+
      (isActive?'<span style="font-family:Orbitron,sans-serif;font-size:7px;color:'+fd.color+';letter-spacing:1px;">'+fd.name.split(' ')[0]+(isMe?' ★':'')+'</span>':'')+
    '</div>';
  }).join('');
}

function updatePhaseBanner(fk) {
  updateTurnOrderBar(); refreshCards();
  const badge=document.getElementById('phase-badge');if(badge)badge.textContent=G.gameOver?'FINAL':G.setup?._inSetup?'SETUP':G_step.phase.toUpperCase();
  const turn=document.getElementById('curturn');if(turn)turn.textContent=FDATA[fk]?.name||'—';
  const next=document.getElementById('btn-next');if(next)next.disabled=!!(G.gameOver||G.awaitingStart||G.setup?._inSetup||!G_step.isMyTurn);
  const labels={prep:'PREPARACIÓN',combat:'COMBATE',end:'FIN DE TURNO'};
  const el=document.getElementById('pg-phase');
  if(el) el.textContent=labels[G_step.phase]||G_step.phase.toUpperCase();
  const own=document.getElementById('pg-turn-owner');
  if(own&&fk&&FDATA[fk]){
    const isMe=fk===G.pf;
    own.innerHTML=`<span style="color:${FDATA[fk].color};">${FDATA[fk].name}</span> ${isMe?'<span style="color:#C8A800;">[TU TURNO]</span>':'[observando]'}`;
  }
  const dots=document.getElementById('step-dots');
  if(dots){
    const steps=STEPS[G_step.phase]||[];
    dots.innerHTML=steps.map((s,i)=>{
      const done  =i<G_step.idx;
      const active=i===G_step.idx;
      return `<div title="${s.title}" style="width:8px;height:8px;border-radius:50%;
        background:${done?'#446644':active?'#C8A800':'#1a1a1a'};
        border:1px solid ${done?'#446644':active?'#C8A800':'#333'};cursor:pointer;"
        aria-label="${s.title}"></div>`;
    }).join('');
  }
  showObjective(G.pf);
}

function showObjective(fk) {
  const sec=document.getElementById('objective-section');
  const el =document.getElementById('faction-objective');
  if(!sec||!el||!fk||!FDATA[fk]) return;
  const fd=FDATA[fk];
  sec.style.display='block';
  el.innerHTML=`<span style="color:${fd.color};font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1px;">${fd.goal||''}</span><br>
    <span style="color:#888;">${VICTORY_DETAIL[fk]||''}</span>`;
}

function runCurrentStep() {
  if(G.gameOver) return;
  if(G.awaitingStart||G.setup?._inSetup)return;
  const key=currentStepKey();
  if(G_step.startedKey===key)return;
  G_step.startedKey=key;
  const steps=STEPS[G_step.phase]||[];
  if(G_step.idx>=steps.length){ endPhaseForFaction(); return; }
  const step=steps[G_step.idx];
  updateStepUI(step);

  // Online: any non-my turn = spectate (covers both human opponents and CPU controlled by host)
  // Offline: only CPU turns execute automatically
  const isOnline = typeof ONLINE !== 'undefined' && ONLINE.isOnline();
  const isOnlineOpponent = isOnline && !G_step.isMyTurn && _isOnlineHumanTurn(G_step.currentFk);
  const isCpuTurn = !G_step.isMyTurn && !isOnlineOpponent;

  if(isOnline && !G_step.isMyTurn && (isOnlineOpponent || !ONLINE.isHost())){
    _showSpectatorStep(step);
  } else if(step.isAuto){
    executeAutoStep(step);
  } else if(isOnlineOpponent) {
    // Show spectator UI — wait for remote action
    _showSpectatorStep(step);
  } else if(isCpuTurn){
    // Only execute CPU if it's actually a CPU faction (not an online human)
    if (!isOnline || !_isOnlineHumanTurn(G_step.currentFk)) {
      executeCpuStep(step);
    } else {
      _showSpectatorStep(step);
    }
  } else {
    executePlayerStep(step);
  }
  updatePhaseBanner(G_step.currentFk);
}

function _showSpectatorStep(step) {
  const area=document.getElementById('step-actions');
  if(!area) return;
  const fk=G_step.currentFk;
  area.innerHTML=`
    <div style="text-align:center;padding:24px;border:1px solid #1a1a20;background:#08080c;">
      <div style="color:${FDATA[fk]?.color||'#888'};font-family:Orbitron,sans-serif;
        font-size:11px;letter-spacing:2px;margin-bottom:8px;">${FDATA[fk]?.name||fk}</div>
      <div style="color:#666;font-size:10px;letter-spacing:2px;">está jugando su turno...</div>
      <div id="online-spectator-action" style="color:#888;font-size:11px;margin-top:10px;min-height:20px;"></div>
    </div>`;
}

function currentStepKey(){return [G.round,G_step.currentFk,G_step.phase,G_step.idx].join(':');}
function scheduleStepAction(action,delay=400){
  const key=currentStepKey();
  return setTimeout(()=>{if(!G.gameOver&&!G.awaitingStart&&currentStepKey()===key)action();},delay);
}
function clearInteractionModes(){
  G.movedUnits={};
  G.sel=G.attackSrc=G.moveSrc=G.moveTargets=G.reinforcementMode=null;
  G.moveMode=G.nuclearMode=G.missileFiringMode=false;
  for(const id of ['move-popup','soldier-counter-popup','reinf-counter-popup','upgrade-confirm','missile-modal'])document.getElementById(id)?.remove();
  if(typeof window!=='undefined')window._mvPopup=null;
  document.getElementById('map-wrap')?.classList.remove('moving');
  if(typeof G_combat!=='undefined' && G_combat?.done)closeDice();
}
function nextStep(expectedKey){
  if(G.gameOver||G.setup?._inSetup||G.awaitingStart||!G_step.isMyTurn)return;
  if(typeof expectedKey==='string'&&expectedKey!==currentStepKey())return;
  if(G.waitingDecision||typeof G_combat!=='undefined'&&G_combat&&!G_combat.done)return;
  const step=(STEPS[G_step.phase]||[])[G_step.idx];
  if(step?.id==='reinf'&&(G.factions[G_step.currentFk].pendingSoldiers||0)>0)return;
  if(step?.id==='maint'&&RULES.end.maintenanceEnabled&&
    Object.values(G.territories).some(t=>t.owner===G_step.currentFk&&t.hasNuclear)&&G_step.maintenanceDone!==currentStepKey())return;
  advanceStep();
}
function advanceStep(){
  if(G.gameOver||G.setup?._inSetup||G.awaitingStart)return;
  if(typeof ONLINE!=='undefined'&&ONLINE.isOnline()&&!G_step.isMyTurn&&!ONLINE.isHost())return;
  clearInteractionModes();
  G_step.idx++;
  if(typeof ONLINE!=='undefined'&&ONLINE.isOnline())ONLINE.pushActionWithState('NEXT_STEP',{idx:G_step.idx});
  runCurrentStep();
}

function updateStepUI(step) {
  const title=document.getElementById('step-title');
  const detail=document.getElementById('step-detail');
  if(title) title.textContent=step.title;
  if(detail) detail.innerHTML=step.detail;
  renderStepActions(step);
  updatePhaseBanner(G_step.currentFk);
}

function renderStepActions(step) {
  const area=document.getElementById('step-actions');
  if(!area) return;
  const isMe =G_step.isMyTurn;
  const fk   =G_step.currentFk;
  const myF  =G.factions[fk];
  const isOnlineOpponent = _isOnlineHumanTurn(fk) && !isMe;

  // Spectator view for online opponents
  if(isOnlineOpponent) { _showSpectatorStep(step); return; }

  // CPU spectator view
  if(!isMe && !isOnlineOpponent) {
    area.innerHTML=`<div style="text-align:center;padding:20px;color:#999;font-size:11px;
      font-family:Orbitron,sans-serif;letter-spacing:2px;">
      <div style="color:${FDATA[fk]?.color||'#888'};margin-bottom:8px;">${FDATA[fk]?.name||fk}</div>
      está realizando su turno...<br>
      <div id="cpu-action-desc" style="color:#888;margin-top:8px;"></div>
    </div>`;
    return;
  }

  const sid=step.id;
  if(sid==='income') {
    const myTers=Object.values(G.territories).filter(t=>t.owner===fk);
    const nukes =myTers.filter(t=>t.hasNuclear).length;
    // Compute income preview (same formula as applyIncome) so render is accurate
    const rc=RULES.prep.reinforcements||{};
    let previewReinf=Math.floor(myTers.length/2)*(typeof rc.perTwoTerritories==='number'?rc.perTwoTerritories:1);
    REGIONS.forEach(reg=>{
      const rTs=TERRITORIES_DEF.filter(t=>t.region===reg.id);
      if(rTs.every(t=>G.territories[t.id]&&G.territories[t.id].owner===fk))
        previewReinf+=Math.floor(rTs.length/2)*(typeof rc.perTwoTerritoriesFullRegion==='number'?rc.perTwoTerritoriesFullRegion:1);
    });
    previewReinf+=nukes*(typeof rc.perNuclear==='number'?rc.perNuclear:1);
    if(fk==='shn') previewReinf+=nukes;
    const reinfGained=myF._reinfIncome!==undefined?myF._reinfIncome:previewReinf;
    const plutGained =myF._plutIncome !==undefined?myF._plutIncome:(nukes*(RULES.prep.plutoniumPerNuclear||2));
    area.innerHTML=`
      <div style="background:#080810;border:1px solid #1a1a20;padding:12px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:11px;color:#aaa;">☢ Plutonio ganado</span>
          <span style="color:#C8A800;font-family:Orbitron,sans-serif;font-size:13px;">+${plutGained} Pu</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:11px;color:#aaa;">🪖 Refuerzos</span>
          <span style="color:#88cc44;font-family:Orbitron,sans-serif;font-size:13px;">+${reinfGained} Sol</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:11px;color:#777;">Nucleares / Territorios</span>
          <span style="color:#888;font-size:11px;">${nukes} / ${myTers.length}</span>
        </div>
      </div>
      ${nextBtn('COLOCAR REFUERZOS ▶')}`;
  } else if(sid==='reinf') {
    const left=myF.pendingSoldiers||0;
    area.innerHTML=`
      <div style="font-size:10px;color:#88cc44;font-family:Orbitron,sans-serif;margin-bottom:8px;">
        ${left} soldados por colocar</div>
      <div style="font-size:11px;color:#888;margin-bottom:10px;">Haz clic en tus territorios resaltados (verde)</div>
      ${left===0?nextBtn():`<button class="abtn" onclick="autoDistributeReinf()" style="width:100%;margin-bottom:6px;border-color:#336633;color:#448844;">AUTO-DISTRIBUIR</button>`}
`;
  } else if(sid==='upgrade') {
    G.sel=null; G.attackSrc=null;
    const f=G.factions[fk];
    const myTersU=Object.values(G.territories).filter(t=>t.owner===fk);
    const totalSol=myTersU.reduce((s,t)=>s+t.soldiers,0);
    const totalMech=myTersU.reduce((s,t)=>s+t.mechs,0);
    const upgrades=RULES.prep.upgrades;
    const canMech =totalSol>=upgrades.mechCost.soldiers&&f.plutonium>=upgrades.mechCost.plutonium;
    const canAir=totalSol>=upgrades.aircraftCost.soldiers&&f.plutonium>=upgrades.aircraftCost.plutonium&&totalAircraft()<upgrades.maxAircraft;
    const canScorp=totalMech>=upgrades.scorpionCost.mechs&&f.plutonium>=upgrades.scorpionCost.plutonium;
    area.innerHTML=`
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
        <button class="abtn" onclick="doUpgrade('mech')" ${canMech?'':'disabled'} style="display:flex;align-items:center;gap:8px;padding:8px;">
          <img src="${getAsset('mech')}" style="width:24px;height:24px;object-fit:contain;">
          <div><div style="font-size:11px;">Mech</div><div style="font-size:10px;color:#888;">${upgrades.mechCost.soldiers} Sol + ${upgrades.mechCost.plutonium} Pu</div></div>
        </button>
        <button class="abtn" onclick="doUpgrade('air')" ${canAir?'':'disabled'} style="display:flex;align-items:center;gap:8px;padding:8px;">
          <img src="${getAsset('aircraft')}" style="width:24px;height:24px;object-fit:contain;">
          <div><div style="font-size:11px;">Aircraft</div><div style="font-size:10px;color:#888;">${upgrades.aircraftCost.soldiers} Sol + ${upgrades.aircraftCost.plutonium} Pu (máx ${upgrades.maxAircraft})</div></div>
        </button>
        <button class="abtn" onclick="doUpgrade('sco')" ${canScorp?'':'disabled'} style="display:flex;align-items:center;gap:8px;padding:8px;">
          <img src="${getAsset('scorpion')}" style="width:24px;height:24px;object-fit:contain;">
          <div><div style="font-size:11px;">Scorpion</div><div style="font-size:10px;color:#888;">${upgrades.scorpionCost.mechs} Mech + ${upgrades.scorpionCost.plutonium} Pu</div></div>
        </button>
      </div>
      ${nextBtn('SIGUIENTE (sin mejoras)')}`;
  } else if(sid==='move'||sid==='cmove'||sid==='regroup') {
    area.innerHTML=`
      <div style="font-size:11px;color:#888;margin-bottom:10px;">
        Selecciona un territorio tuyo → luego clic en destino.<br>
        Terrestres: hasta <b>${RULES.prep.movementRange} territorios</b>. Aircraft: cualquier territorio tuyo.
      </div>
      <button class="abtn" id="ba-move-btn" onclick="startMoveMode()" style="width:100%;margin-bottom:6px;border-color:#336699;color:#4488bb;">
        ↗ ACTIVAR MODO MOVIMIENTO
      </button>
      ${nextBtn('SIGUIENTE (sin mover)')}`;
  } else if(sid==='missile') {
    const mCount=myF.missiles||0;
    const mFired=myF.missilesFiredThisTurn||0;
    const canBuild=!RULES.prep.buildBeforeFire||mFired===0;
    area.innerHTML=`
      <div style="display:flex;gap:4px;margin-bottom:8px;">
        ${Array.from({length:RULES.prep.maxMissiles},(_,i)=>`<div style="width:16px;height:16px;border-radius:2px;
          background:${i<mCount?'#C8A800':'#111'};border:1px solid ${i<mCount?'#C8A800':'#222'};"></div>`).join('')}
        <span style="font-size:11px;color:#999;margin-left:4px;">${mCount}/${RULES.prep.maxMissiles} misiles</span>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:6px;">
        <button class="abtn" onclick="doMissileBuild()" ${canBuild&&mCount<RULES.prep.maxMissiles?'':'disabled'} style="flex:1;">
          Construir <span class="acost">${RULES.prep.missileBuildCost} Pu</span>
        </button>
        <button class="abtn" onclick="activateMissileFire()" ${mCount>0?'':'disabled'} style="flex:1;border-color:#cc4433;color:#cc4433;">
          Lanzar
        </button>
      </div>
      ${!canBuild?'<div style="font-size:10px;color:#553333;">Ya has disparado este turno</div>':''}
      ${nextBtn('SIGUIENTE')}`;
  } else if(sid==='nuclear') {
    const canBuild=myF.plutonium>=RULES.prep.nuclearBuildCost;
    const validNucTers=Object.values(G.territories).filter(t=>t.owner===fk&&!t.hasNuclear);
    G.nuclearMode=false; G.moveMode=false; G.moveSrc=null;
    area.innerHTML=`
      <div style="font-size:11px;color:#aaa;margin-bottom:8px;">
        Coste: ${RULES.prep.nuclearBuildCost} Pu | Tienes: ${myF.plutonium} Pu
      </div>
      <div style="font-size:11px;color:#${canBuild?'88cc44':'cc4444'};margin-bottom:10px;">
        ${canBuild?'✓ '+validNucTers.length+' territorios disponibles':'⚠ Plutonio insuficiente'}
      </div>
      <button class="abtn" onclick="activateNuclearMode()" ${canBuild?'':'disabled'} style="width:100%;margin-bottom:8px;">
        ☢ CONSTRUIR NUCLEAR COMPLEX
      </button>
      ${nextBtn('SIGUIENTE (sin construir)')}`;
  } else if(sid==='attack') {
    area.innerHTML=`
      <div style="font-size:11px;color:#888;margin-bottom:10px;">
        Selecciona tu territorio origen → clic en territorio enemigo adyacente.
      </div>
      <button class="abtn" id="ba-attack" onclick="doAct('attack')" disabled style="width:100%;margin-bottom:6px;border-color:#cc4433;color:#cc4433;">
        ⚔ ATACAR TERRITORIO SELECCIONADO
      </button>
      ${nextBtn('PASAR A FASE FINAL')}`;
  } else if(sid==='maint') {
    const nukes=Object.values(G.territories).filter(t=>t.owner===fk&&t.hasNuclear).length;
    area.innerHTML=isMe?
      `<div style="font-size:11px;color:#aaa;margin-bottom:10px;">
        Tienes <b>${nukes}</b> Nuclear Complex${nukes!==1?'es':''}.<br>
        Lanza D${RULES.end.maintenanceDie} por cada uno. Si sale ${RULES.end.maintenanceExplosionOn} → explosión.
      </div>
      <button class="abtn" onclick="runMaintenanceRolls()" style="width:100%;margin-bottom:8px;" ${nukes===0?'disabled':''}>
        🎲 LANZAR DADOS DE MANTENIMIENTO
      </button>
      ${nukes===0?nextBtn('SIGUIENTE (sin Nucleares)'):''}`:
      `<div style="font-size:11px;color:#aaa;margin-bottom:10px;">
        ${FDATA[fk]?.name||fk} tiene ${nukes} Nuclear Complex${nukes!==1?'es':''}. Mantenimiento automático.
      </div>
      <div id="maint-results" style="font-size:11px;color:#888;min-height:20px;"></div>`;
    if(!G_step.isMyTurn) setTimeout(()=>runMaintenanceRolls(), 600);
  }
}

function nextBtn(label) {
  return `<button class="abtn" onclick="nextStep('${currentStepKey()}')" style="width:100%;margin-top:4px;border-color:#999;color:#888;font-size:10px;">
    ${label||'SIGUIENTE ▶'}</button>`;
}

function getAsset(key) {
  try { return ASSETS[key]||''; } catch(e){ return ''; }
}

function executeAutoStep(step) {
  if(step.id==='income'){
    applyIncome(G_step.currentFk);
    if(!G_step.isMyTurn) scheduleStepAction(advanceStep, 800);
    else {
      // Sync income to observers
      _syncNow(`[${FDATA[G_step.currentFk]?.name}] recibe ingresos`, 'res');
    }
  }
}

function applyIncome(fk) {
  const R=RULES.prep, myF=G.factions[fk];
  // Guard against double application in same round
  if(G.gameOver||myF.alive===false||myF._incomeAppliedRound === G.round) { addLog('[DEBUG] Income ya aplicado esta ronda','sys'); return; }
  myF._incomeAppliedRound = G.round;
  myF.reinforcementRegions={};
  const myTers=Object.values(G.territories).filter(t=>t.owner===fk);
  const nukes=myTers.filter(t=>t.hasNuclear).length;
  const rc=R.reinforcements||{};

  // Plutonium: +2 per Nuclear Base (PDF V3)
  let plutIncome=nukes*(R.plutoniumPerNuclear??2);
  if(fk==='prm') plutIncome+=nukes; // ADVANCED REACTOR: +1 Pu per Nuclear
  myF.plutonium+=plutIncome;

  // Reinforcements (PDF V3):
  // +1 per 2 territories owned
  let reinf=Math.floor(myTers.length/2)*(typeof rc.perTwoTerritories==='number'?rc.perTwoTerritories:1);
  // +1 per 2 territories in FULLY controlled regions
  REGIONS.forEach(reg=>{
    const rTs=TERRITORIES_DEF.filter(t=>t.region===reg.id);
    const allOwned=rTs.every(t=>G.territories[t.id]&&G.territories[t.id].owner===fk);
    if(allOwned) reinf+=Math.floor(rTs.length/2)*(typeof rc.perTwoTerritoriesFullRegion==='number'?rc.perTwoTerritoriesFullRegion:1);
  });
  // +1 per Nuclear Base
  reinf+=nukes*(typeof rc.perNuclear==='number'?rc.perNuclear:1);
  if(fk==='shn') reinf+=nukes; // MASS CLONING: +1 soldier per Nuclear

  myF.pendingSoldiers=(myF.pendingSoldiers||0)+reinf;
  myF.missilesFiredThisTurn=0; myF.missilesBuiltThisTurn=0; myF._fireStarted=false;
  myF._plutIncome=plutIncome; myF._reinfIncome=reinf;
  addLog(`[${FDATA[fk]?.name||fk}] +${plutIncome} Pu | +${reinf} refuerzos`,'res');
  refreshCards(); updateMap();
}

function executeCpuStep(step) {
  if(G.gameOver) return;
  const fk=G_step.currentFk;
  if(_isOnlineHumanTurn(fk)||typeof ONLINE!=='undefined'&&ONLINE.isOnline()&&!ONLINE.isHost())return;
  const desc=document.getElementById('cpu-action-desc');
  const delay=800;
  if(step.id==='reinf'){
    if(desc) desc.textContent='Colocando refuerzos...';
    distributeReinforcements(fk);
    updateMap(); scheduleStepAction(advanceStep, delay);
  } else if(step.id==='upgrade'){
    let upgraded=0;
    Object.values(G.territories).filter(t=>t.owner===fk).forEach(t=>{while(applyUpgrade(fk,t.id,'mech'))upgraded++;});
    if(upgraded>0) addLog(`[${FDATA[fk]?.name||fk}] Mejora ${upgraded} Mech`,'res');
    if(desc) desc.textContent=upgraded>0?`Mejora ${upgraded} unidades.`:'Sin mejoras.';
    updateMap(); scheduleStepAction(advanceStep, delay);
  } else if(step.id==='move'||step.id==='cmove'||step.id==='regroup'){
    if(desc) desc.textContent='Sin movimiento.';
    scheduleStepAction(advanceStep, 500);
  } else if(step.id==='missile'){
    if(desc) desc.textContent='Sin misiles.';
    scheduleStepAction(advanceStep, 400);
  } else if(step.id==='nuclear'){
    if(desc) desc.textContent='Sin construcciones.';
    scheduleStepAction(advanceStep, 400);
  } else if(step.id==='attack'){
    if(desc) desc.textContent='Evaluando ataques...';
    scheduleStepAction(()=>executeCpuAttack(fk, desc), 1200);
  } else if(step.id==='maint'){
    runMaintenanceRollsFor(fk, ()=>scheduleStepAction(advanceStep,600));
  } else {
    scheduleStepAction(advanceStep, 400);
  }
}

function executePlayerStep(step) {
  if(step.id==='income') executeAutoStep(step);
  else if(step.id==='reinf'){
    const myF=G.factions[G.pf];
    const left=myF.pendingSoldiers||0;
    if(left>0) showReinforcementUI(left);
    else addLog('Sin refuerzos este turno.','res');
  }
}


function showNuclearExplosionBanner(terId, fd) {
  const ring=document.getElementById('tr-'+terId);
  if(ring){ring.setAttribute('stroke','#ff8800');ring.setAttribute('stroke-width','5');ring.setAttribute('filter','url(#fx-glow)');
    setTimeout(()=>{if(ring){ring.setAttribute('stroke','');ring.setAttribute('stroke-width','1.5');ring.setAttribute('filter','');}},4000);}
  const td=TERRITORIES_DEF.find(x=>x.id===terId);
  if(td){
    const oldLbl=document.getElementById('nuke-lbl-'+terId); if(oldLbl) oldLbl.remove();
    const bg=document.createElementNS(NS,'rect');
    bg.setAttribute('x',td.cx-22);bg.setAttribute('y',td.cy-8);bg.setAttribute('width','44');bg.setAttribute('height','14');
    bg.setAttribute('rx','2');bg.setAttribute('fill','rgba(255,140,0,0.9)');bg.setAttribute('pointer-events','none');
    const lbl=document.createElementNS(NS,'text');
    lbl.setAttribute('x',td.cx);lbl.setAttribute('y',td.cy+3);lbl.setAttribute('text-anchor','middle');
    lbl.setAttribute('font-size','7');lbl.setAttribute('font-weight','700');lbl.setAttribute('font-family','Orbitron,monospace');
    lbl.setAttribute('fill','#000');lbl.setAttribute('pointer-events','none');lbl.textContent='EXPLOSION';
    const grp=document.createElementNS(NS,'g');grp.setAttribute('id','nuke-lbl-'+terId);
    grp.appendChild(bg);grp.appendChild(lbl);svgG.appendChild(grp);
    setTimeout(()=>{const g=document.getElementById('nuke-lbl-'+terId);if(g)g.remove();},5000);
  }
  const ex=document.getElementById('explosion-banner');if(ex)ex.remove();
  const banner=document.createElement('div');
  banner.id='explosion-banner';
  banner.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:800;'+
    'background:#001a00;border:2px solid #44ff44;padding:10px 24px;font-family:Orbitron,sans-serif;'+
    'text-align:center;box-shadow:0 0 24px #44ff4488;cursor:pointer;';
  banner.innerHTML='<div style="font-size:12px;color:#44ff44;letter-spacing:3px;margin-bottom:4px;">☢ EXPLOSION NUCLEAR</div>'+
    '<div style="font-size:10px;color:#aaa;">'+terName(terId)+' — <span style="color:'+(fd.color||'#888')+'">'+fd.name+'</span></div>';
  banner.onclick=()=>banner.remove();
  document.body.appendChild(banner);
  setTimeout(()=>{const b=document.getElementById('explosion-banner');if(b)b.remove();},6000);
  updateMap();
}

function flashAttackedTerritory(tgtId, srcId, attFk) {
  if(!G.pendingCpuAttack) G.pendingCpuAttack={};
  G.pendingCpuAttack[tgtId]={srcId,attFk};
  const ring=document.getElementById('tr-'+tgtId);
  if(ring){ring.setAttribute('stroke','#ff2222');ring.setAttribute('stroke-width','4');ring.setAttribute('filter','url(#fx-glow)');}
  const td=TERRITORIES_DEF.find(x=>x.id===tgtId);
  if(td){
    const oldLbl=document.getElementById('atk-lbl-'+tgtId);if(oldLbl)oldLbl.remove();
    const bg=document.createElementNS(NS,'rect');
    bg.setAttribute('x',td.cx-28);bg.setAttribute('y',td.cy-8);bg.setAttribute('width','56');bg.setAttribute('height','14');
    bg.setAttribute('rx','2');bg.setAttribute('fill','rgba(180,0,0,0.85)');bg.setAttribute('pointer-events','none');
    const lbl=document.createElementNS(NS,'text');
    lbl.setAttribute('x',td.cx);lbl.setAttribute('y',td.cy+3);lbl.setAttribute('text-anchor','middle');
    lbl.setAttribute('font-size','7');lbl.setAttribute('font-weight','700');lbl.setAttribute('font-family','Orbitron,monospace');
    lbl.setAttribute('fill','#ffffff');lbl.setAttribute('pointer-events','none');lbl.textContent='BAJO ATAQUE';
    const grp=document.createElementNS(NS,'g');grp.setAttribute('id','atk-lbl-'+tgtId);
    grp.appendChild(bg);grp.appendChild(lbl);svgG.appendChild(grp);
  }
  const tgt=G.territories[tgtId];
  if(tgt&&tgt.owner===G.pf){
    const fd=FDATA[attFk]||{name:attFk,color:'#888'};
    const ex=document.getElementById('attack-banner');if(ex)ex.remove();
    const banner=document.createElement('div');
    banner.id='attack-banner';
    banner.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:800;'+
      'background:#1a0000;border:2px solid #ff2222;padding:8px 20px;font-family:Orbitron,sans-serif;'+
      'text-align:center;box-shadow:0 0 20px #ff222288;';
    banner.innerHTML='<div style="font-size:10px;color:#ff4444;letter-spacing:2px;">'+fd.name+' ATACA '+terName(tgtId)+
      '</div><div style="font-size:9px;color:#888;margin-top:3px;">Pulsa el hexágono para defender</div>';
    document.body.appendChild(banner);
    setTimeout(()=>{const b=document.getElementById('attack-banner');if(b)b.remove();},8000);
  }
  updateMap();
}

function clearAttackFlash(tgtId) {
  const ring=document.getElementById('tr-'+tgtId);
  if(ring){ring.setAttribute('stroke','');ring.setAttribute('stroke-width','1.5');ring.setAttribute('filter','');}
  const lbl=document.getElementById('atk-lbl-'+tgtId); if(lbl) lbl.remove();
  if(G.pendingCpuAttack) delete G.pendingCpuAttack[tgtId];
  const b=document.getElementById('attack-banner'); if(b) b.remove();
}

function resolveCpuCpuSilent(srcId,targetId,cpuFk,callback) {
  if(G.gameOver)return;
  if(!validAttack(srcId,targetId,cpuFk)){if(callback)callback();return;}
  const src=G.territories[srcId],tgt=G.territories[targetId],defFk=tgt.owner;
  const result=Battle.fight(src,tgt,{rules:RULES.combat,attFk:cpuFk,defFk});
  Object.assign(src,result.attacker);Object.assign(tgt,result.defender);
  if(result.status==='conquered') {
    tgt.owner=cpuFk;G.factions[cpuFk].conqueredThisTurn=(G.factions[cpuFk].conqueredThisTurn||0)+1;
    checkElimination(defFk,cpuFk);checkWinCondition();
  }
  G.lastBattle=result;
  clearAttackFlash(targetId);
  addLog('⚔ '+FDATA[cpuFk].name+' → '+terName(targetId)+': '+result.status+' ('+result.rounds.length+' rondas)','combat');
  updateMap();refreshCards();
  if(callback&&!G.gameOver)callback();
}

function executeCpuAttack(fk, descEl) {
  if(G.gameOver) return;
  const myTers=Object.values(G.territories).filter(t=>t.owner===fk&&Battle.canAttack(t));
  let attacked=false;
  for(const src of myTers){
    const adjEnemies=(src.adj||[]).map(id=>G.territories[id]).filter(t=>t&&t.owner&&t.owner!==fk&&armyPoints(t)>0);
    if(adjEnemies.length>0){
      const tgt=adjEnemies[Math.floor(Math.random()*adjEnemies.length)];
      attacked=true;
      addLog(`[${FDATA[fk]?.name||fk}] ⚔ Ataca ${tgt.id}`,'combat');
      if(descEl) descEl.innerHTML='Atacando <b>'+terName(tgt.id)+'</b>...';
      flashAttackedTerritory(tgt.id,src.id,fk);
      openDiceCpu(src.id,tgt.id,fk,()=>{
        // Sync after CPU attack
        _syncNow(`[${FDATA[fk]?.name||fk}] atacó ${terName(tgt.id)}`, 'combat');
        scheduleStepAction(advanceStep,1000);
      });
      return;
    }
  }
  if(!attacked){if(descEl)descEl.textContent='Sin ataques posibles.';scheduleStepAction(advanceStep,500);}
}

function resolveNuclearExplosion(t,survivor){
  if(!t.hasNuclear)return false;
  if(!t.aircraft && Battle.count(t)>0 && (!['soldiers','mechs','scorpions'].includes(survivor)||!t[survivor]))throw Error('Elige una unidad terrestre superviviente');
  const keepAir=t.aircraft||0;
  t.hasNuclear=false;t.soldiers=t.mechs=t.scorpions=0;
  if(!keepAir&&survivor)t[survivor]=1;
  applyLibertosScorchedEarth(t.id);
  return true;
}
function runMaintenanceRolls(){
  if(G.gameOver||G_step.currentFk!==G.pf||G_step.phase!=='end'||G_step.idx!==1)return;
  runMaintenanceRollsFor(G.pf,()=>scheduleStepAction(advanceStep,200));
}
function runMaintenanceRollsFor(fk,callback){
  if(G.gameOver)return;
  const key=currentStepKey();
  if(G.maintenance?.key===key || G_step.maintenanceDone===key)return;
  const bases=Object.values(G.territories).filter(t=>t.owner===fk&&t.hasNuclear);
  if(!RULES.end.maintenanceEnabled||!bases.length){G_step.maintenanceDone=key;if(callback)callback();return;}
  const rolls=RULES.end.maintenanceEnabled?bases.map(t=>({id:t.id,roll:Math.floor(Math.random()*RULES.end.maintenanceDie)+1})):[];
  const exploded=rolls.filter(r=>r.roll===RULES.end.maintenanceExplosionOn).map(r=>r.id);
  const st=G.maintenance={key,fk,rolls,exploded,choices:{},callback};
  const finish=()=>{
    if(G.gameOver||G.maintenance!==st||currentStepKey()!==key)return;
    for(const id of exploded){const t=G.territories[id];resolveNuclearExplosion(t,st.choices[id]);addLog('💥 Explosión en '+terName(id),'combat');}
    G_step.maintenanceDone=key;G.maintenance=null;
    updateMap();refreshCards();_syncNow('Mantenimiento: '+exploded.length+' explosiones','combat');
    document.getElementById('maint-modal')?.remove();
    if(callback)callback();
  };
  const choices=exploded.filter(id=>{const t=G.territories[id];return !t.aircraft&&Battle.count(t)>0;});
  choices.forEach(id=>{const t=G.territories[id];st.choices[id]=['scorpions','mechs','soldiers'].find(type=>t[type]>0);});
  if(fk!==G.pf){finish();return;}
  const modal=document.createElement('div');modal.id='maint-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:1000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML='<div style="background:#08080c;border:1px solid #555;padding:24px;max-height:85vh;overflow:auto"><h3>MANTENIMIENTO NUCLEAR</h3>'+
    rolls.map(r=>'<p>'+terName(r.id)+': D'+RULES.end.maintenanceDie+' = '+r.roll+(exploded.includes(r.id)?' — EXPLOSIÓN':' — seguro')+'</p>').join('')+
    choices.map(id=>'<p>'+terName(id)+' — conserva <select data-survivor="'+id+'">'+['scorpions','mechs','soldiers'].filter(type=>G.territories[id][type]>0).map(type=>'<option value="'+type+'">'+type+'</option>').join('')+'</select></p>').join('')+
    '<button id="maint-confirm">CONFIRMAR Y CONTINUAR</button></div>';
  document.body.appendChild(modal);
  modal.querySelector('#maint-confirm').onclick=()=>{
    modal.querySelectorAll('[data-survivor]').forEach(select=>st.choices[select.dataset.survivor]=select.value);
    finish();
  };
}

function reinforcementTargets(fk){
  const my=Object.values(G.territories).filter(t=>t.owner===fk),bases=my.filter(t=>t.hasNuclear),R=RULES.prep.placement;
  if(fk==='erb'&&R.ereubsAnywhereOverride||!R.onlyInNuclearTerritories)return my;
  if(bases.length)return bases;
  const chosen=G.factions[fk].reinforcementRegions||{};
  return R.fallbackOnePerRegion?my.filter(t=>!chosen[t.region]||chosen[t.region]===t.id):my;
}
function distributeReinforcements(fk){
  const f=G.factions[fk],n=f.pendingSoldiers||0;
  let targets=reinforcementTargets(fk);
  if(!targets.length)return false;
  const R=RULES.prep.placement;
  if(!(fk==='erb'&&R.ereubsAnywhereOverride)&&R.onlyInNuclearTerritories&&!targets.some(t=>t.hasNuclear)&&R.fallbackOnePerRegion){
    const perRegion={};targets.forEach(t=>{if(!perRegion[t.region])perRegion[t.region]=t;});targets=Object.values(perRegion);
  }
  for(let i=0;i<n;i++)targets[i%targets.length].soldiers++;
  f.pendingSoldiers=0;return true;
}
function autoDistributeReinf(){
  if(G.gameOver||!G_step.isMyTurn||STEPS[G_step.phase]?.[G_step.idx]?.id!=='reinf')return;
  if(!distributeReinforcements(G.pf))return;
  G.reinforcementMode=null;updateMap();refreshCards();_syncNow('Refuerzos distribuidos','res');nextStep();
}
function upgradeSpec(type){
  const R=RULES.prep.upgrades;
  return {mech:{source:'soldiers',target:'mechs',cost:R.mechCost},air:{source:'soldiers',target:'aircraft',cost:R.aircraftCost},sco:{source:'mechs',target:'scorpions',cost:R.scorpionCost}}[type];
}
function applyUpgrade(fk,id,type){
  const t=G.territories[id],f=G.factions[fk],spec=upgradeSpec(type);
  if(G.gameOver||!t||t.owner!==fk||!spec)return false;
  const quantity=spec.cost[spec.source],pu=spec.cost.plutonium;
  if(!Number.isInteger(quantity)||quantity<1||!Number.isFinite(pu)||pu<0)return false;
  const aircraft=Object.values(G.territories).filter(t=>t.owner===fk).reduce((n,t)=>n+t.aircraft,0);
  if(t[spec.source]<quantity||f.plutonium<pu||type==='air'&&aircraft>=RULES.prep.upgrades.maxAircraft)return false;
  t[spec.source]-=quantity;t[spec.target]++;f.plutonium-=pu;return true;
}
function doUpgrade(type){
  if(G.gameOver||!G_step.isMyTurn||STEPS[G_step.phase]?.[G_step.idx]?.id!=='upgrade')return;
  const id=G.sel,t=G.territories[id],spec=upgradeSpec(type),f=G.factions[G.pf];
  if(!t||t.owner!==G.pf||!spec){addLog('Selecciona un territorio propio.','sys');return;}
  const quantity=spec.cost[spec.source],pu=spec.cost.plutonium;
  if(t[spec.source]<quantity||f.plutonium<pu)return;
  const key=currentStepKey();document.getElementById('upgrade-confirm')?.remove();
  const dialog=document.createElement('div');dialog.id='upgrade-confirm';
  dialog.style.cssText='position:fixed;inset:0;z-index:1000;background:#000d;display:flex;align-items:center;justify-content:center';
  dialog.innerHTML='<div style="background:#08080c;border:1px solid #888;padding:24px"><h3>CONFIRMAR MEJORA</h3><p>'+quantity+' '+spec.source+' + '+pu+' Pu → 1 '+spec.target+'</p><p>Quedan '+(t[spec.source]-quantity)+' '+spec.source+', '+(t[spec.target]+1)+' '+spec.target+' y '+(f.plutonium-pu)+' Pu</p><button id="upgrade-ok">CONFIRMAR</button> <button id="upgrade-cancel">CANCELAR</button></div>';
  document.body.appendChild(dialog);
  dialog.querySelector('#upgrade-cancel').onclick=()=>dialog.remove();
  dialog.querySelector('#upgrade-ok').onclick=()=>{
    dialog.remove();if(key!==currentStepKey()||!G_step.isMyTurn)return;
    if(applyUpgrade(G.pf,id,type)){addLog('Mejora aplicada en '+terName(id),'res');refreshCards();selectTerritory(id);updateMap();_syncNow('Mejora aplicada','res');}
  };
}

function startMoveMode() {
  if(G.gameOver||!G_step.isMyTurn||!['move','regroup'].includes(STEPS[G_step.phase]?.[G_step.idx]?.id))return;
  const btn=document.getElementById('ba-move-btn');
  if(btn){btn.textContent='↗ ACTIVO — clic en origen';btn.style.borderColor='#C8A800';btn.style.color='#C8A800';}
  G.moveMode=true; G.moveSrc=null;
  document.getElementById('map-wrap').classList.add('moving');
  addLog('Clic en tu territorio ORIGEN, luego en el DESTINO.','sys');
}

function activateMissileFire() {
  addLog('Selecciona el territorio enemigo objetivo en el mapa','sys');
  G.missileFiringMode=true;
}

function checkElimination(fk, attackerFk = G_step.currentFk) {
  if(G.gameOver || !fk || !G.factions[fk] || G.factions[fk].alive===false) return;
  const remaining=Object.values(G.territories).filter(t=>t.owner===fk);
  if(remaining.length===0){
    G.factions[fk].alive=false;
    addLog('☠ '+(FDATA[fk]?.name||fk)+' ELIMINADO!','combat');
    if(attackerFk!==fk && G.factions[attackerFk]) {
      G.factions[attackerFk].eliminatedArmies=(G.factions[attackerFk].eliminatedArmies||0)+1;
    }
    flashScreen();
  }
}

function checkWinCondition(moment = 'elimination', activeFk = G_step.currentFk) {
  if(G.gameOver) return;
  const order = G.setup.order || Object.keys(G.factions);
  const alive = order.filter(fk=>G.factions[fk]?.alive!==false);
  if(alive.length===1){ declareWin(alive[0],'Last faction standing'); return; }
  const totalNuclears = Object.values(G.territories).filter(t=>t.hasNuclear).length;

  order.forEach(fk=>{
    if(G.gameOver || G.factions[fk]?.alive===false || fk!==activeFk) return;
    if(fk==='imp' ? moment!=='start' : moment!=='end') return;
    const V=RULES.victory[fk]; if(!V||!V.enabled) return;
    const myTers=Object.values(G.territories).filter(t=>t.owner===fk);
    const myNucs=myTers.filter(t=>t.hasNuclear);

    if(fk==='imp'){
      let fullR=0; REGIONS.forEach(r=>{const rTs=TERRITORIES_DEF.filter(t=>t.region===r.id);if(rTs.every(t=>G.territories[t.id]?.owner===fk))fullR++;});
      if(fullR>=(V.fullRegions??5)){ declareWin(fk,'PAX AUGUSTA — '+fullR+' regiones completas'); return; }
    }
    if(fk==='lib'){
      if(totalNuclears<=G.playerCount){ declareWin(fk,'TOTAL BLACKOUT — Solo '+totalNuclears+' Nucleares'); return; }
    }
    if(fk==='clt'){
      if((G.factions[fk].eliminatedArmies||0)>=(V.armiesEliminated??2)){ declareWin(fk,'THE GREAT OFFERING — '+V.armiesEliminated+' jugadores eliminados'); return; }
    }
    if(fk==='erb'){
      const nucReg=new Set(myNucs.map(t=>TERRITORIES_DEF.find(x=>x.id===t.id)?.region).filter(Boolean));
      if(nucReg.size>=(V.nuclearRegions??7)){ declareWin(fk,'EQUATION ZERO — Nuclear en '+nucReg.size+' regiones'); return; }
    }
    if(fk==='prm'){
      if(totalNuclears>0&&myNucs.length>=Math.ceil(totalNuclears/2)){ declareWin(fk,'TERRAFORMATION — '+myNucs.length+'/'+totalNuclears+' Nucleares'); return; }
    }
    if(fk==='shn'){
      let regions7=0;
      REGIONS.forEach(r=>{
        const rTs=TERRITORIES_DEF.filter(t=>t.region===r.id);
        const myAP=rTs.reduce((s,t)=>s+(G.territories[t.id]?.owner===fk?armyPoints(G.territories[t.id]):0),0);
        const maxOther=Math.max(0,...order.filter(k=>k!==fk).map(k=>rTs.reduce((s,t)=>s+(G.territories[t.id]?.owner===k?armyPoints(G.territories[t.id]):0),0)));
        if(myAP>0&&myAP>maxOther) regions7++;
      });
      if(regions7>=(V.largestArmyRegions??7)){ declareWin(fk,'GENETIC SUPREMACY — Mayor ejército en '+regions7+' regiones'); return; }
    }
  });
}

function declareWin(fk, goal, broadcast = true) {
  if(G.gameOver || !G.factions[fk]) return;
  G.gameOver = true;
  document.getElementById('online-decision-modal')?.remove();
  if(typeof ONLINE!=='undefined'&&ONLINE.isOnline()&&ONLINE.cancelPendingDecision)ONLINE.cancelPendingDecision();
  const nextButton=document.getElementById('btn-next');if(nextButton)nextButton.disabled=true;
  const combatModal=document.getElementById('dmodal');
  if(combatModal) combatModal.classList.remove('open');
  G.result = { winner: fk, goal, round: G.round };
  G.phase = 'finished';
  G.attackSrc = G.moveSrc = G.sel = null;
  G.missileFiringMode = G.nuclearMode = false;
  if(typeof G_combat !== 'undefined') {
    if(G_combat) G_combat.done = true;
    G_combat = null;
  }
  Object.values(G.pendingCpuAttack || {}).forEach(attack => clearTimeout(attack._timer));
  G.pendingCpuAttack = {};
  updatePhaseBanner(G_step.currentFk||fk);
  declareVictory(goal, fk);
  if(broadcast && typeof ONLINE !== 'undefined' && ONLINE.isOnline()) {
    ONLINE.pushActionWithState('GAME_FINISHED', { result: G.result });
    ONLINE.signalGameEnd();
  }
}

function declareVictory(goal, fk = G.result?.winner || G.pf) {
  const fc=FDATA[fk]||{name:fk,color:'#C8A800'};
  const safeGoal=String(goal).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ov=document.createElement('div');
  ov.id='game-result';
  ov.setAttribute('role','dialog');
  ov.setAttribute('aria-label','Resultado de la partida');
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;';
  ov.innerHTML='<div style="text-align:center;">'
    +'<div style="font-family:Orbitron,sans-serif;font-size:48px;letter-spacing:8px;color:'+fc.color+';text-shadow:0 0 40px '+fc.color+'aa;margin-bottom:16px;">VICTORIA</div>'
    +'<div style="font-size:16px;color:'+fc.color+';font-family:Orbitron,sans-serif;margin-bottom:8px;">'+fc.name+'</div>'
    +'<div style="font-size:13px;color:#888;margin-bottom:30px;">'+safeGoal+'</div>'
    +'<button onclick="location.reload()" style="background:#0a0a0d;border:1px solid '+fc.color+';color:'+fc.color+';padding:12px 32px;font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:3px;cursor:pointer;">NUEVA PARTIDA</button>'
    +'</div>';
  document.body.appendChild(ov);
  addLog('🏆 VICTORIA: '+fc.name+' — '+goal,'win');
}

function endPhaseForFaction() {
  if(G.gameOver) return;
  const order=G.setup.order||Object.keys(G.factions);
  const currentFk=G_step.currentFk;
  const currentIdx=order.indexOf(currentFk);

  // Push END_PHASE with full G state so observers advance
  if (typeof ONLINE !== 'undefined' && ONLINE.isOnline() && G_step.isMyTurn) {
    ONLINE.pushActionWithState('END_PHASE', { fk: currentFk, phase: G_step.phase });
  }

  if(G_step.phase==='prep'){
    addLog('⚔ '+((FDATA[currentFk]&&FDATA[currentFk].name)||currentFk)+': FASE COMBATE','sys');
    G.phase='combat'; startPhase('combat', currentFk);
  } else if(G_step.phase==='combat'){
    addLog('🔚 '+((FDATA[currentFk]&&FDATA[currentFk].name)||currentFk)+': FASE FINAL','sys');
    G.phase='end'; startPhase('end', currentFk);
  } else if(G_step.phase==='end'){
    checkWinCondition('end',currentFk);
    if(G.gameOver)return;
    const living = order.filter(fk => G.factions[fk]?.alive!==false);
    if(living.length<=1){ checkWinCondition(); return; }
    let nextIdx=(currentIdx+1)%order.length;
    while(G.factions[order[nextIdx]]?.alive===false) nextIdx=(nextIdx+1)%order.length;
    const nextFk=order[nextIdx];
    const isNewRound=nextIdx<=currentIdx;
    if(isNewRound){
      G.round++;
      const roundLabel=document.getElementById('rnum');
      if(roundLabel) roundLabel.textContent=G.round;
      addLog('═══ RONDA '+G.round+' ═══','sys');
      flashScreen();
    }
    addLog('📋 Turno de '+((FDATA[nextFk]&&FDATA[nextFk].name)||nextFk),'sys');
    G.phase='prep'; startPhase('prep', nextFk);
  }
}

// ── Stubs ─────────────────────────────────────────────────────
function updatePhaseGuide(){if(typeof updateStepUI==='function'&&G_step){const steps=STEPS[G_step.phase]||[];if(steps[G_step.idx])updateStepUI(steps[G_step.idx]);}}
function startPhaseProgress(){startPhase(G.phase,G.currentFaction||G.setup.order[0]);}
function markStepDone(id){updatePhaseBanner(G_step.currentFk);}
function setStepActive(id){}
function guideStepClick(id,action){}

function terName(id){
  if(!id) return id;
  const td=TERRITORIES_DEF.find(x=>x.id===id); if(!td) return id;
  const reg=REGIONS.find(r=>r.id===td.region);
  const regName=reg?reg.name:td.region;
  const regTers=TERRITORIES_DEF.filter(x=>x.region===td.region);
  const pos=regTers.findIndex(x=>x.id===id)+1;
  return regName+' '+pos;
}

function updateMap(){
  Object.keys(G.territories).forEach(id=>{
    const t=G.territories[id];
    const fc=t.owner?FDATA[t.owner]:null;
    const reg=REGIONS.find(r=>r.id===t.region);
    const isSelected=id===G.sel;
    const isMoveTarget=G.moveSrc&&canMoveTarget(id);
    const isAttackTarget=G.phase==='combat'&&t.owner&&t.owner!==G.pf&&isAdjOwned(id);
    const bg=document.getElementById('tc-'+id); if(!bg) return;
    const reg2=REGIONS.find(r=>r.id===t.region);
    let fillColor=reg2?reg2.color:'#0a0a0e';
    if(fc) fillColor=blendHex(reg2?reg2.color:'#0a0a0e',fc.dimColor,0.3);
    bg.setAttribute('fill',fillColor); bg.setAttribute('opacity','0.88');
    const ring=document.getElementById('tr-'+id);
    if(ring){
      if(isSelected){ring.setAttribute('stroke','#C8A800');ring.setAttribute('stroke-width','3.5');ring.setAttribute('filter','url(#fx-glow)');}
      else if(isMoveTarget){ring.setAttribute('stroke','#4488cc');ring.setAttribute('stroke-width','2.5');ring.setAttribute('filter','');}
      else if(isAttackTarget){ring.setAttribute('stroke','#cc2222');ring.setAttribute('stroke-width','2.5');ring.setAttribute('filter','');}
      else{ring.setAttribute('stroke',reg?reg.borderColor:'#444');ring.setAttribute('stroke-width','1.5');ring.setAttribute('filter','');}
    }
    const uig=document.getElementById('uig-'+id);
    if(uig){
      while(uig.firstChild) uig.removeChild(uig.firstChild);
      if(fc){
        const glowRing=document.createElementNS(NS,'circle');
        glowRing.setAttribute('cx',t.cx+-15);glowRing.setAttribute('cy',t.cy+-26);glowRing.setAttribute('r','5');
        glowRing.setAttribute('fill',fc.color);glowRing.setAttribute('opacity','0.25');glowRing.setAttribute('filter','url(#fx-glow)');
        uig.appendChild(glowRing);
        const led=document.createElementNS(NS,'circle');
        led.setAttribute('cx',t.cx+-15);led.setAttribute('cy',t.cy+-26);led.setAttribute('r','3.5');
        led.setAttribute('fill',fc.color);led.setAttribute('opacity','0.95');uig.appendChild(led);
        const ledCenter=document.createElementNS(NS,'circle');
        ledCenter.setAttribute('cx',t.cx+-15);ledCenter.setAttribute('cy',t.cy+-26);ledCenter.setAttribute('r','1.5');
        ledCenter.setAttribute('fill','#ffffff');ledCenter.setAttribute('opacity','0.7');uig.appendChild(ledCenter);
        const unitDefs=[{label:'SOL',count:t.soldiers||0},{label:'MCH',count:t.mechs||0},{label:'AIR',count:t.aircraft||0},{label:'SCP',count:t.scorpions||0}];
        const colW=18,startUX=t.cx-colW*2+colW/2;
        const rowY=t.cy+14;
        unitDefs.forEach((u,i)=>{
          const ux=startUX+i*colW;
          const lbl=document.createElementNS(NS,'text');
          lbl.setAttribute('x',ux);lbl.setAttribute('y',rowY-7);lbl.setAttribute('text-anchor','middle');
          lbl.setAttribute('font-size','4.5');lbl.setAttribute('font-family','Orbitron,monospace');
          lbl.setAttribute('fill',fc?fc.color:'#666');lbl.setAttribute('opacity','0.7');lbl.textContent=u.label;uig.appendChild(lbl);
          const cnt=document.createElementNS(NS,'text');
          cnt.setAttribute('x',ux);cnt.setAttribute('y',rowY+2);cnt.setAttribute('text-anchor','middle');
          cnt.setAttribute('font-size','8');cnt.setAttribute('font-family','Orbitron,monospace');cnt.setAttribute('font-weight','700');
          cnt.setAttribute('fill',u.count>0?'#ffffff':'#333');cnt.setAttribute('stroke',u.count>0?'#000':'none');cnt.setAttribute('stroke-width','0.4');
          cnt.textContent=u.count;uig.appendChild(cnt);
        });
      }
    }
    const utxt=document.getElementById('tu-'+id); if(utxt) utxt.textContent='';
    const ntxt=document.getElementById('tn-'+id); if(ntxt) ntxt.textContent='';
    const nucImgId='nucimg-'+id;
    let nucImg2=document.getElementById(nucImgId);
    const td2=TERRITORIES_DEF.find(x=>x.id===id);
    if(td2){
      if(t.hasNuclear){
        if(!nucImg2){
          nucImg2=document.createElementNS(NS,'image');nucImg2.setAttribute('id',nucImgId);
          nucImg2.setAttribute('href',ASSETS.nuclear);nucImg2.setAttribute('width','28');nucImg2.setAttribute('height','28');
          nucImg2.setAttribute('opacity','0.9');nucImg2.setAttribute('pointer-events','none');svgG.appendChild(nucImg2);
        }
        nucImg2.setAttribute('x',td2.cx-14);nucImg2.setAttribute('y',td2.cy-34);nucImg2.style.display='';
      } else if(nucImg2){nucImg2.style.display='none';}
    }
  });
  document.querySelectorAll('[id^="adj-"]').forEach(l=>{
    if(!G.sel||!l.id.includes(G.sel)){l.setAttribute('stroke','rgba(255,255,255,0.06)');l.setAttribute('stroke-width','0.8');}
  });
  svgG.setAttribute('transform',`translate(${G.vx},${G.vy}) scale(${G.vscale})`);
}

function armyPoints(t){return t.soldiers+t.mechs*3+t.aircraft*3+t.scorpions*6;}
function totalArmyPoints(faction){return Object.values(G.territories).filter(t=>t.owner===faction).reduce((sum,t)=>sum+armyPoints(t),0);}
function buildUnitString(t){const p=[];if(t.scorpions>0)p.push(t.scorpions+'S');if(t.mechs>0)p.push(t.mechs+'M');if(t.aircraft>0)p.push(t.aircraft+'A');if(t.soldiers>0)p.push(t.soldiers+'s');return p.join(' ')||'';}
function groundMoveTargets(srcId,maxSteps){
  const src=G.territories[srcId];if(!src)return new Set();
  const visited=new Set([srcId]);let frontier=[srcId];
  for(let step=0;step<maxSteps;step++){
    const next=[];for(const id of frontier)for(const n of G.territories[id].adj||[]){if(!visited.has(n)&&G.territories[n]?.owner===src.owner){visited.add(n);next.push(n);}}
    frontier=next;
  }
  visited.delete(srcId);return visited;
}
function getMovableTargets(srcId,maxSteps){
  const targets=groundMoveTargets(srcId,maxSteps),src=G.territories[srcId];
  if(src?.aircraft>0)for(const t of Object.values(G.territories))if(t.owner===src.owner&&t.id!==srcId)targets.add(t.id);
  return targets;
}
function transferUnits(srcId,dstId,chosen){
  const src=G.territories[srcId],dst=G.territories[dstId];
  if(G.gameOver||!src||!dst||src===dst||src.owner!==G.pf||dst.owner!==G.pf)return false;
  const step=STEPS[G_step.phase]?.[G_step.idx]?.id;
  if(!G_step.isMyTurn||!['move','regroup'].includes(step))return false;
  const keys=Object.values(Battle.keys),total=keys.reduce((n,k)=>n+(chosen[k]||0),0);
  const moved=G.movedUnits?.[srcId]||{};
  if(total<1||total>=Battle.count(src)||keys.some(k=>!Number.isInteger(chosen[k]||0)||(chosen[k]||0)<0||(chosen[k]||0)>(src[k]||0)-(moved[k]||0)))return false;
  const near=groundMoveTargets(srcId,RULES.prep.movementRange).has(dstId);
  if(!near){
    const air=chosen.aircraft||0,mechs=chosen.mechs||0,soldiers=chosen.soldiers||0;
    if(air<1||chosen.scorpions>0||mechs>air||soldiers>3*(air-mechs))return false;
  }
  G.movedUnits||={};G.movedUnits[dstId]||={};
  for(const key of keys){const n=chosen[key]||0;src[key]-=n;dst[key]+=n;G.movedUnits[dstId][key]=(G.movedUnits[dstId][key]||0)+n;}
  return true;
}

function canMoveTarget(id){if(!G.moveSrc)return false;if(!G.moveTargets)G.moveTargets=getMovableTargets(G.moveSrc,RULES.prep.movementRange||2);return G.moveTargets.has(id);}
function isAdjOwned(id){const t=G.territories[id];return t.adj.some(aid=>{const a=G.territories[aid];return a&&a.owner===G.pf;});}
function blendHex(a,b,t){const pr=c=>parseInt(c.slice(1,3),16),pg=c=>parseInt(c.slice(3,5),16),pb=c=>parseInt(c.slice(5,7),16);const lr=(x,y)=>Math.min(255,Math.round(x*(1-t)+y*t));return'#'+[lr(pr(a),pr(b)),lr(pg(a),pg(b)),lr(pb(a),pb(b))].map(v=>v.toString(16).padStart(2,'0')).join('');}
function totalAircraft(){return Object.values(G.territories).filter(t=>t.owner===G.pf).reduce((s,t)=>s+t.aircraft,0);}

function onTerritoryClick(id,event){
  if(G.gameOver) return;
  if(!G.setup?._inSetup && !G_step.isMyTurn)return;
  if(G.setup&&G.setup.claimCallback){const handled=G.setup.claimCallback(id,event);if(handled)return;return;}
  if(G.reinforcementMode&&G.reinforcementMode.callback){const handled=G.reinforcementMode.callback(id,event);if(handled)return;return;}
  if(G.pendingCpuAttack&&G.pendingCpuAttack[id]){const pending=G.pendingCpuAttack[id];if(pending.spectator){if(pending._timer)clearTimeout(pending._timer);delete G.pendingCpuAttack[id];clearAttackFlash(id);openCombatModal('cpu-att-cpu-def');}else{openCombatModal('cpu-att-player-def');}return;}
  if(G.setup&&G.setup._inSetup){return;}
  if(G.nuclearMode){const tgt=G.territories[id];if(tgt&&tgt.owner===G.pf&&!tgt.hasNuclear){G.sel=id;doAct('nuke');G.nuclearMode=false;Object.values(G.territories).forEach(t=>{const ring=document.getElementById('tr-'+t.id);if(ring){ring.setAttribute('stroke',FDATA[t.owner]?FDATA[t.owner].color:'#1a1a20');ring.setAttribute('stroke-width','1.5');}});return;}}
  if(G.missileFiringMode){const tgt=G.territories[id];if(!tgt||!tgt.owner||tgt.owner===G.pf){addLog('Selecciona un territorio ENEMIGO para el misil.','sys');return;}G.missileFiringMode=false;G.sel=id;doMissileFire();return;}
  if(G.dragging)return;
  if(G.moveSrc){const src=G.territories[G.moveSrc],dst=G.territories[id];if(id===G.moveSrc){G.moveSrc=null;G.moveTargets=null;document.getElementById('map-wrap').classList.remove('moving');updateMap();return;}if(!G.moveTargets)G.moveTargets=getMovableTargets(G.moveSrc,RULES.prep.movementRange||2);if(dst&&G.moveTargets.has(id)){showMoveUnitsPopup(G.moveSrc,id,event);}else{addLog(`${terName(id)} no es destino válido (fuera de rango).`,'sys');}return;}
  if(G.moveMode&&G.territories[id]?.owner===G.pf&&armyPoints(G.territories[id])>0){G.moveSrc=id;G.moveTargets=getMovableTargets(id,RULES.prep.movementRange||2);document.getElementById('map-wrap').classList.add('moving');addLog(`Origen: ${terName(id)}. Clic en destino.`,'move');updateMap();return;}
  if(G_step&&G_step.phase==='combat'&&G_step.isMyTurn){const tgt=G.territories[id];if(G.attackSrc&&tgt&&tgt.owner&&tgt.owner!==G.pf){const src=G.territories[G.attackSrc];if(src&&src.adj&&src.adj.includes(id)){const btn=document.getElementById('ba-attack');if(btn){btn.disabled=false;btn.onclick=()=>{G.sel=G.attackSrc;openDice(id);};btn.textContent='⚔ ATACAR '+id;}selectTerritory(id);return;}else{addLog('Territorio no adyacente.','sys');}}if(tgt&&tgt.owner===G.pf&&Battle.canAttack(tgt)){G.attackSrc=id;G.moveTargets=null;const btn=document.getElementById('ba-attack');if(btn){btn.disabled=true;btn.textContent='⚔ ATACAR TERRITORIO SELECCIONADO';}selectTerritory(id);addLog(`Origen: ${terName(id)}. Clic en enemigo adyacente.`,'sys');return;}}
  selectTerritory(id);
}

function selectTerritory(id){
  G.sel=id;updateMap();
  const t=G.territories[id];const fc=t.owner?FDATA[t.owner]:null;
  const reg=REGIONS.find(r=>r.id===t.region);const myF=G.factions[G.pf];
  const det=document.getElementById('tdetail');
  if(!det)return;
  det.className='on';
  det.innerHTML=`<div class="tbadge ${t.hasNuclear?'tb-nuclear':'tb-r0'}">${t.hasNuclear?'⚡ NUCLEAR COMPLEX':reg.name.toUpperCase()}</div>
    <div style="line-height:1.8;margin-top:3px">
      ${fc?`<div style="color:#888">CONTROL: <span style="color:${fc.color}">${fc.name}</span></div>`:'<div style="color:#2a2a2e">SIN CONTROL</div>'}
      <div style="color:#888">REGIÓN: <span style="color:#777">${reg.name}</span></div>
      ${armyPoints(t)>0?`<div style="color:#888">FUERZA: <span style="color:#888">${armyPoints(t)} AP</span></div>`:''}
    </div>`;
  document.getElementById('u-sol-dummy').textContent=t.soldiers||'0';
  document.getElementById('u-mec-dummy').textContent=t.mechs||'0';
  document.getElementById('u-air-dummy').textContent=t.aircraft||'0';
  document.getElementById('u-sco-dummy').textContent=t.scorpions||'0';
  const isOwn=t.owner===G.pf,isEnemy=t.owner&&t.owner!==G.pf,isAdj=isAdjOwned(id);
  const inPrep=G.phase==='prep',inCombat=G.phase==='combat';
  document.getElementById('ba-nuke').disabled=!(inPrep&&isOwn&&!t.hasNuclear&&myF.plutonium>=RULES.prep.nuclearBuildCost);
  document.getElementById('ba-missile-build').disabled=!(inPrep&&myF.missiles<5&&myF.plutonium>=1);
  document.getElementById('ba-missile-fire').disabled=!(inPrep&&myF.missiles>0&&isEnemy);
  document.getElementById('ba-attack').disabled=!(inCombat&&isEnemy&&isAdj);
  document.getElementById('upg-mech').disabled=!(inPrep&&isOwn&&t.soldiers>=3&&myF.plutonium>=1);
  document.getElementById('upg-air').disabled=!(inPrep&&isOwn&&t.soldiers>=3&&myF.plutonium>=1&&totalAircraft()<5);
  document.getElementById('upg-sco').disabled=!(inPrep&&isOwn&&t.mechs>=2&&myF.plutonium>=1);
  updateMissilePips();
}

function activateNuclearMode(){if(G.gameOver||!G_step.isMyTurn||STEPS[G_step.phase]?.[G_step.idx]?.id!=='nuclear')return;const myF=G.factions[G.pf];if(myF.plutonium<RULES.prep.nuclearBuildCost){addLog('Plutonio insuficiente.','sys');return;}G.nuclearMode=true;G.moveMode=false;G.moveSrc=null;Object.values(G.territories).forEach(t=>{const ring=document.getElementById('tr-'+t.id);if(!ring)return;if(t.owner===G.pf&&!t.hasNuclear){ring.setAttribute('stroke','#C8A800');ring.setAttribute('stroke-width','2.5');}else{ring.setAttribute('stroke',FDATA[t.owner]?FDATA[t.owner].color:'#1a1a20');ring.setAttribute('stroke-width','1.5');}});addLog('Clic en un territorio tuyo para construir Nuclear Complex.','sys');}

function doAct(action){
  if(G.gameOver||!G_step.isMyTurn) return;
  const id=G.sel; if(!id) return;
  const t=G.territories[id];const myF=G.factions[G.pf];
  if(action==='nuke'){
    if(STEPS[G_step.phase]?.[G_step.idx]?.id!=='nuclear'||t.owner!==G.pf)return;
    if(myF.plutonium<RULES.prep.nuclearBuildCost){addLog(`⚠ Plutonio insuficiente.`,'sys');return;}
    if(t.hasNuclear){addLog('⚠ Ya tiene Nuclear Complex.','sys');return;}
    myF.plutonium-=RULES.prep.nuclearBuildCost;t.hasNuclear=true;
    addLog(`⚡ Nuclear Complex en ${t.id}. −${RULES.prep.nuclearBuildCost} PLU.`,'res');
    _syncNow(`[${FDATA[G.pf]?.name}] construye Nuclear en ${terName(id)}`, 'res');
    markStepDone('nuke');refreshCards();selectTerritory(id);updateMap();
  }
  if(action==='mbuild'){doMissileBuild();return;}
  if(action==='mfire'){doMissileFire();return;}
  if(action==='attack'){if(G.phase!=='combat'){addLog('Solo en fase Combat.','sys');return;}openDice(id);}
  if(action==='move-action'){G.moveSrc=id;G.moveTargets=getMovableTargets(id,RULES.prep.movementRange||2);document.getElementById('map-wrap').classList.add('moving');addLog(`Selecciona destino desde ${t.name}.`,'move');updateMap();}
}

function updateMissilePips(){const myF=G.factions[G.pf];const cont=document.getElementById('miss-pips');if(!cont)return;cont.innerHTML='';for(let i=0;i<RULES.prep.maxMissiles;i++){const p=document.createElement('div');p.className='miss-pip'+(i<myF.missiles?' full':'');cont.appendChild(p);}}
