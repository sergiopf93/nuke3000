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
      detail:'Selecciona un territorio tuyo, luego un destino. Terrestres: hasta 3 saltos. Aircraft: cualquier destino tuyo.',
      isAuto: false },
    { id:'missile',  title:'5. MISILES (opcional)',
      detail:'Construye misiles (antes de disparar). Lanza a territorios enemigos.',
      isAuto: false },
    { id:'nuclear',  title:'6. CONSTRUIR NUCLEARES (opcional)',
      detail:'Construye nuevos Nuclear Complexes en tus territorios (5 Pu cada uno).',
      isAuto: false },
  ],
  combat: [
    { id:'attack',   title:'1. ATACAR (opcional)',
      detail:'Selecciona tu territorio, luego haz clic en uno enemigo adyacente. Puedes atacar varias veces.',
      isAuto: false },
    { id:'cmove',    title:'2. MOVER UNIDADES (opcional)',
      detail:'Reposiciona unidades antes de terminar el turno.',
      isAuto: false },
  ],
  end: [
    { id:'regroup',  title:'1. REAGRUPAR',
      detail:'Mueve unidades entre tus territorios.',
      isAuto: false },
    { id:'maint',    title:'2. MANTENIMIENTO NUCLEAR',
      detail:'D20 por cada Nuclear Complex. Si sale 1: explosión nuclear.',
      isAuto: false },
  ],
};

const VICTORY_DETAIL = {
  imp: 'Controla <b>5 regiones completas</b> al inicio de tu turno.<br>O controla <b>30 territorios</b> al inicio de tu turno.',
  lib: '<b>6 regiones sin Nuclear Complex</b> en el tablero.<br>O <b>4 regiones sin Nuclear</b> + eliminar ejército Erebus.',
  clt: '<b>10 territorios conquistados</b> + eliminar 1 ejército en el mismo turno.<br>O <b>1 Nuclear por enemigo</b> conquistado en el mismo turno.',
  erb: 'Eliminar <b>2 ejércitos</b> completos.<br>O <b>1 ejército</b> + más Pu que el resto juntos.',
  prm: 'Nuclear en <b>7 regiones distintas</b>.<br>O <b>el doble de Nucleares</b> que el segundo.',
  shn: 'Mayor ejército (AP) en <b>6 regiones</b>.<br>O <b>el doble de AP</b> que el segundo.',
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
        onclick="if(${done}) jumpToStep(${i});"></div>`;
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
  const steps=STEPS[G_step.phase]||[];
  if(G_step.idx>=steps.length){ endPhaseForFaction(); return; }
  const step=steps[G_step.idx];
  updateStepUI(step);

  // Online: any non-my turn = spectate (covers both human opponents and CPU controlled by host)
  // Offline: only CPU turns execute automatically
  const isOnline = typeof ONLINE !== 'undefined' && ONLINE.isOnline();
  const isOnlineOpponent = isOnline && !G_step.isMyTurn && _isOnlineHumanTurn(G_step.currentFk);
  const isCpuTurn = !G_step.isMyTurn && !isOnlineOpponent;

  if(step.isAuto){
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

function nextStep() {
  G_step.idx++;
  // Online: if it's my turn, push NEXT_STEP with new idx so observers advance too
  if (typeof ONLINE !== 'undefined' && ONLINE.isOnline() && G_step.isMyTurn) {
    ONLINE.pushActionWithState('NEXT_STEP', { idx: G_step.idx });
  }
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
    const reinfGained=myF._reinfIncome!==undefined?myF._reinfIncome:(myF.pendingSoldiers||0);
    const plutGained =myF._plutIncome !==undefined?myF._plutIncome:0;
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
      ${left>0?nextBtn('SIGUIENTE (dejar sin colocar)'):''}`;
  } else if(sid==='upgrade') {
    G.sel=null; G.attackSrc=null;
    const f=G.factions[fk];
    const myTersU=Object.values(G.territories).filter(t=>t.owner===fk);
    const totalSol=myTersU.reduce((s,t)=>s+t.soldiers,0);
    const totalMech=myTersU.reduce((s,t)=>s+t.mechs,0);
    const canMech =totalSol>=3&&f.plutonium>=1;
    const canAir  =totalSol>=3&&f.plutonium>=1&&totalAircraft()<5;
    const canScorp=totalMech>=2&&f.plutonium>=1;
    area.innerHTML=`
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
        <button class="abtn" onclick="doUpgrade('mech')" ${canMech?'':'disabled'} style="display:flex;align-items:center;gap:8px;padding:8px;">
          <img src="${getAsset('mech')}" style="width:24px;height:24px;object-fit:contain;">
          <div><div style="font-size:11px;">Mech</div><div style="font-size:10px;color:#888;">3 Sol + 1 Pu</div></div>
        </button>
        <button class="abtn" onclick="doUpgrade('air')" ${canAir?'':'disabled'} style="display:flex;align-items:center;gap:8px;padding:8px;">
          <img src="${getAsset('aircraft')}" style="width:24px;height:24px;object-fit:contain;">
          <div><div style="font-size:11px;">Aircraft</div><div style="font-size:10px;color:#888;">3 Sol + 1 Pu (máx 5)</div></div>
        </button>
        <button class="abtn" onclick="doUpgrade('sco')" ${canScorp?'':'disabled'} style="display:flex;align-items:center;gap:8px;padding:8px;">
          <img src="${getAsset('scorpion')}" style="width:24px;height:24px;object-fit:contain;">
          <div><div style="font-size:11px;">Scorpion</div><div style="font-size:10px;color:#888;">2 Mech + 1 Pu</div></div>
        </button>
      </div>
      ${nextBtn('SIGUIENTE (sin mejoras)')}`;
  } else if(sid==='move'||sid==='cmove'||sid==='regroup') {
    area.innerHTML=`
      <div style="font-size:11px;color:#888;margin-bottom:10px;">
        Selecciona un territorio tuyo → luego clic en destino.<br>
        Terrestres: hasta <b>3 territorios</b>. Aircraft: cualquier territorio tuyo.
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
        ${Array.from({length:5},(_,i)=>`<div style="width:16px;height:16px;border-radius:2px;
          background:${i<mCount?'#C8A800':'#111'};border:1px solid ${i<mCount?'#C8A800':'#222'};"></div>`).join('')}
        <span style="font-size:11px;color:#999;margin-left:4px;">${mCount}/5 misiles</span>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:6px;">
        <button class="abtn" onclick="doMissileBuild()" ${canBuild&&mCount<5?'':'disabled'} style="flex:1;">
          Construir <span class="acost">1 Pu</span>
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
      ${nextBtn('PASAR AL MOVIMIENTO')}`;
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
  return `<button class="abtn" onclick="nextStep()" style="width:100%;margin-top:4px;border-color:#999;color:#888;font-size:10px;">
    ${label||'SIGUIENTE ▶'}</button>`;
}

function getAsset(key) {
  try { return ASSETS[key]||''; } catch(e){ return ''; }
}

function executeAutoStep(step) {
  if(step.id==='income'){
    applyIncome(G_step.currentFk);
    if(!G_step.isMyTurn) setTimeout(nextStep, 800);
    else {
      // Sync income to observers
      _syncNow(`[${FDATA[G_step.currentFk]?.name}] recibe ingresos`, 'res');
    }
  }
}

function applyIncome(fk) {
  const R=RULES.prep, myF=G.factions[fk];
  const myTers=Object.values(G.territories).filter(t=>t.owner===fk);
  const nukes=myTers.filter(t=>t.hasNuclear).length;
  let plutIncome=nukes*R.plutoniumPerNuclear;
  if(fk==='prm') plutIncome+=Math.floor(nukes/2);
  myF.plutonium+=plutIncome;
  let reinf=0;
  if(R.reinforcements.perTwoTerritories) reinf+=Math.floor(myTers.length/2);
  if(R.reinforcements.perTwoTerritoriesInControlledRegion){
    REGIONS.forEach(reg=>{
      const rTs=TERRITORIES_DEF.filter(t=>t.region===reg.id);
      const owned=rTs.filter(t=>G.territories[t.id].owner===fk);
      if(owned.length===rTs.length) reinf+=Math.floor(owned.length/2);
    });
  }
  if(R.reinforcements.perNuclear) reinf+=nukes;
  if(fk==='shn') reinf+=Math.floor(nukes/2);
  myF.pendingSoldiers=(myF.pendingSoldiers||0)+reinf;
  myF.missilesFiredThisTurn=0; myF.missilesBuiltThisTurn=0; myF._fireStarted=false;
  myF._plutIncome=plutIncome; myF._reinfIncome=reinf;
  addLog(`[${FDATA[fk]?.name||fk}] +${plutIncome} Pu | +${reinf} refuerzos`,'res');
  refreshCards(); updateMap();
}

function executeCpuStep(step) {
  const fk=G_step.currentFk;
  const desc=document.getElementById('cpu-action-desc');
  const delay=800;
  if(step.id==='reinf'){
    if(desc) desc.textContent='Colocando refuerzos...';
    const myF=G.factions[fk];
    const n=myF.pendingSoldiers||0;
    const myTers=Object.values(G.territories).filter(t=>t.owner===fk);
    const nucTers=myTers.filter(t=>t.hasNuclear);
    const validTers=nucTers.length>0?nucTers:myTers;
    for(let s=0;s<n;s++){const p=validTers[s%validTers.length];if(p)p.soldiers++;}
    myF.pendingSoldiers=0;
    addLog(`[${FDATA[fk]?.name||fk}] Coloca ${n} refuerzos`,'res');
    updateMap(); setTimeout(nextStep, delay);
  } else if(step.id==='upgrade'){
    const myF=G.factions[fk]; let upgraded=0;
    while(myF.soldiers>=3&&myF.plutonium>=1&&myF.mechs<6){myF.soldiers-=3;myF.plutonium-=1;myF.mechs++;upgraded++;}
    if(upgraded>0) addLog(`[${FDATA[fk]?.name||fk}] Mejora ${upgraded} Mech`,'res');
    if(desc) desc.textContent=upgraded>0?`Mejora ${upgraded} unidades.`:'Sin mejoras.';
    updateMap(); setTimeout(nextStep, delay);
  } else if(step.id==='move'||step.id==='cmove'||step.id==='regroup'){
    if(desc) desc.textContent='Sin movimiento.';
    setTimeout(nextStep, 500);
  } else if(step.id==='missile'){
    if(desc) desc.textContent='Sin misiles.';
    setTimeout(nextStep, 400);
  } else if(step.id==='nuclear'){
    if(desc) desc.textContent='Sin construcciones.';
    setTimeout(nextStep, 400);
  } else if(step.id==='attack'){
    if(desc) desc.textContent='Evaluando ataques...';
    setTimeout(()=>executeCpuAttack(fk, desc), 1200);
  } else if(step.id==='maint'){
    runMaintenanceRollsFor(fk, ()=>setTimeout(nextStep,600));
  } else {
    setTimeout(nextStep, 400);
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

function applyExplosions(box, modal, fk, nucTers, rolls, R, explosionCount, isMyMaint, callback) {
  const fd=FDATA[fk]||{name:fk,color:'#888'};
  const explodedIndices=rolls.map((v,i)=>v===R.maintenanceExplosionOn?i:-1).filter(i=>i>=0);
  if(!isMyMaint){
    explodedIndices.forEach(i=>{
      const t=nucTers[i]; t.hasNuclear=false;
      if(t.aircraft>0){t.soldiers=0;t.mechs=0;t.scorpions=0;}
      else{t.soldiers=Math.max(1,t.soldiers);t.mechs=0;t.scorpions=0;}
      addLog('EXPLOSION en '+terName(t.id),'combat');
      showNuclearExplosionBanner(t.id, fd);
    });
    updateMap(); refreshCards();
    setTimeout(()=>{modal.remove();if(callback)callback();},3000);
    return;
  }
  const allMyNucs=Object.values(G.territories).filter(t=>t.owner===G.pf&&t.hasNuclear);
  const chosen=new Set();
  const selDiv=document.createElement('div');
  selDiv.style.cssText='margin-top:16px;text-align:left;';
  selDiv.innerHTML='<div style="font-family:Orbitron,sans-serif;font-size:10px;color:#ff4444;letter-spacing:2px;margin-bottom:10px;text-align:center;">ELIGE '+explosionCount+' NUCLEAR A DESTRUIR</div>';
  const grid=document.createElement('div');
  grid.style.cssText='display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto;';
  const confirmBtn=document.createElement('button');
  confirmBtn.textContent='CONFIRMAR DESTRUCCION';
  confirmBtn.disabled=true;
  confirmBtn.style.cssText='margin-top:14px;width:100%;background:#0a0a0d;border:1px solid #ff4444;color:#ff4444;padding:10px;font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:2px;cursor:pointer;opacity:0.4;';
  allMyNucs.forEach(t=>{
    const btn=document.createElement('button');
    btn.dataset.tid=t.id;
    btn.style.cssText='background:#0a0a0d;border:1px solid #333;color:#888;padding:8px 12px;font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:1px;cursor:pointer;text-align:left;';
    btn.textContent=terName(t.id);
    btn.onclick=()=>{
      if(chosen.has(t.id)){chosen.delete(t.id);btn.style.background='#0a0a0d';btn.style.borderColor='#333';btn.style.color='#888';}
      else if(chosen.size<explosionCount){chosen.add(t.id);btn.style.background='#1a0000';btn.style.borderColor='#ff4444';btn.style.color='#ff4444';}
      confirmBtn.disabled=(chosen.size!==explosionCount);
      confirmBtn.style.opacity=chosen.size===explosionCount?'1':'0.4';
    };
    grid.appendChild(btn);
  });
  confirmBtn.onclick=()=>{
    chosen.forEach(tid=>{
      const t=G.territories[tid]; if(!t) return;
      t.hasNuclear=false;
      if(t.aircraft>0){t.soldiers=0;t.mechs=0;t.scorpions=0;}
      else{t.soldiers=Math.max(1,t.soldiers);t.mechs=0;t.scorpions=0;}
      addLog('EXPLOSION: '+terName(tid)+' destruido','combat');
      showNuclearExplosionBanner(tid, fd);
    });
    updateMap(); refreshCards();
    // Sync after explosion resolution
    _syncNow('Mantenimiento nuclear resuelto', 'combat');
    modal.remove(); if(callback) callback();
  };
  selDiv.appendChild(grid); selDiv.appendChild(confirmBtn);
  box.appendChild(selDiv);
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

function resolveCpuCpuSilent(srcId, targetId, cpuFk, callback) {
  const src=G.territories[srcId], tgt=G.territories[targetId];
  if(!src||!tgt){if(callback)callback();return;}
  const Rc=RULES.combat;
  let round=0;
  function doRound(){
    if(round++>10||armyPoints(src)<=1||armyPoints(tgt)===0){
      if(armyPoints(tgt)===0){tgt.owner=cpuFk;addLog('['+((FDATA[cpuFk]&&FDATA[cpuFk].name)||cpuFk)+'] conquista '+terName(targetId),'combat');checkElimination(tgt.owner);}
      updateMap();refreshCards();if(callback)callback();return;
    }
    const attP=buildPool(src);if(attP.length>0)attP.splice(attP.length-1,1);
    const defP=buildPool(tgt);
    const aN=Math.min(attP.length,Rc.maxAttackDice);
    const dN=Math.min(aN,Rc.maxDefenseDice,defP.length);
    const aR=attP.slice(0,aN).map(d=>Math.floor(Math.random()*d.sides)+1);
    const dR=defP.slice(0,dN).map(d=>Math.floor(Math.random()*d.sides)+1);
    if(cpuFk==='clt'){const mi=aR.indexOf(Math.min(...aR));if(mi>=0)aR[mi]++;}
    const aS=[...aR].sort((a,b)=>b-a),dS=[...dR].sort((a,b)=>b-a);
    for(let i=0;i<Math.min(aS.length,dS.length);i++){
      if(Rc.tieBreakerDefender?aS[i]>dS[i]:aS[i]>=dS[i])applyLoss(tgt);else applyLoss(src);
    }
    doRound();
  }
  doRound();
}

function executeCpuAttack(fk, descEl) {
  const myTers=Object.values(G.territories).filter(t=>t.owner===fk&&armyPoints(t)>1);
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
        setTimeout(()=>nextStep(),1000);
      });
      return;
    }
  }
  if(!attacked){if(descEl)descEl.textContent='Sin ataques posibles.';setTimeout(nextStep,500);}
}

function runMaintenanceRolls() {
  runMaintenanceRollsFor(G.pf, () => {
    _syncNow('Mantenimiento resuelto', 'sys');
    nextStep();
  });
}

function runMaintenanceRollsFor(fk, callback) {
  const R=RULES.end;
  const nucTers=Object.values(G.territories).filter(t=>t.owner===fk&&t.hasNuclear);
  if(nucTers.length===0){if(callback)callback();return;}
  openMaintenanceModal(fk,nucTers,R,callback);
}

function openMaintenanceModal(fk,nucTers,R,callback){
  const ex=document.getElementById('maint-modal');if(ex)ex.remove();
  const fd=FDATA[fk]||{name:fk,color:'#888'};
  const modal=document.createElement('div');
  modal.id='maint-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000;display:flex;align-items:center;justify-content:center;';
  const box=document.createElement('div');
  box.style.cssText='background:#08080c;border:1px solid #333;padding:28px 36px;min-width:380px;font-family:Orbitron,sans-serif;text-align:center;';
  const isMyMaint=(fk===G.pf);
  const btnLabel=isMyMaint?`🎲 LANZAR D${R.maintenanceDie}`:`▶ VER RESULTADO`;
  const btnColor=isMyMaint?'#C8A800':'#555';
  box.innerHTML=`
    <div style="font-size:13px;letter-spacing:3px;color:#C8A800;margin-bottom:6px;">☢ MANTENIMIENTO NUCLEAR</div>
    <div style="font-size:11px;color:${fd.color};margin-bottom:16px;">${fd.name}</div>
    <div style="font-size:11px;color:#888;margin-bottom:20px;">
      ${nucTers.length} Nuclear Complex${nucTers.length!==1?'es':''} — D${R.maintenanceDie} por cada uno<br>
      <span style="color:#cc4444;font-size:10px;">Si sale ${R.maintenanceExplosionOn} → EXPLOSIÓN</span>
    </div>
    <div id="maint-dice" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:20px;">
      ${nucTers.map((_,i)=>`<div id="md${i}" style="width:50px;height:50px;border:2px solid #333;display:flex;align-items:center;justify-content:center;font-size:22px;color:#555;">?</div>`).join('')}
    </div>
    <div id="maint-result" style="font-size:13px;color:#888;min-height:24px;margin-bottom:16px;"></div>
    <button id="maint-roll-btn" style="background:#0a0a0d;border:1px solid ${btnColor};color:${btnColor};padding:12px 28px;font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:2px;cursor:pointer;">
      ${btnLabel}
    </button>`;
  modal.appendChild(box); document.body.appendChild(modal);
  const doRoll=()=>{
    const btn=document.getElementById('maint-roll-btn');
    if(btn){btn.disabled=true;btn.style.opacity='0.4';}
    const rolls=nucTers.map(()=>Math.floor(Math.random()*R.maintenanceDie)+1);
    let explosions=0;
    rolls.forEach((v,i)=>{
      const el=document.getElementById('md'+i);
      if(el){el.textContent=v;el.style.borderColor=v===R.maintenanceExplosionOn?'#ff4444':'#446644';el.style.color=v===R.maintenanceExplosionOn?'#ff4444':'#88cc44';el.style.fontSize='24px';}
      if(v===R.maintenanceExplosionOn) explosions++;
      else addLog(`☢ ${terName(nucTers[i].id)}: D${R.maintenanceDie}=${v} — seguro`,'res');
    });
    const res=document.getElementById('maint-result');
    if(res){res.textContent=explosions>0?`${explosions} EXPLOSIÓN${explosions>1?'ES':''}!`:'Sin explosiones ✓';res.style.color=explosions>0?'#ff4444':'#88cc44';}
    const rollBtn2=document.getElementById('maint-roll-btn');if(rollBtn2)rollBtn2.style.display='none';
    if(explosions===0){
      updateMap();refreshCards();
      if(isMyMaint){
        const closeBtn=document.createElement('button');
        closeBtn.textContent='CERRAR ▶';
        closeBtn.style.cssText='background:#0a0a0d;border:1px solid #C8A800;color:#C8A800;padding:10px 24px;font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:2px;cursor:pointer;margin-top:8px;';
        closeBtn.onclick=()=>{modal.remove();if(callback)callback();};
        box.appendChild(closeBtn);
      } else {setTimeout(()=>{modal.remove();if(callback)callback();},2500);}
    } else {
      applyExplosions(box,modal,fk,nucTers,rolls,R,explosions,isMyMaint,callback);
    }
  };
  document.getElementById('maint-roll-btn').onclick=doRoll;
  if(!isMyMaint) setTimeout(doRoll,600);
}

function autoDistributeReinf() {
  const fk=G.pf, myF=G.factions[fk];
  const n=myF.pendingSoldiers||0;
  const myTers=Object.values(G.territories).filter(t=>t.owner===fk);
  const nucTers=myTers.filter(t=>t.hasNuclear);
  const validTers=nucTers.length>0?nucTers:myTers;
  for(let s=0;s<n;s++){const p=validTers[s%validTers.length];if(p)p.soldiers++;}
  myF.pendingSoldiers=0;
  Object.values(G.territories).forEach(t=>{
    const ring=document.getElementById('tr-'+t.id);
    if(ring){ring.setAttribute('stroke',FDATA[t.owner]?FDATA[t.owner].color:'#1a1a20');ring.setAttribute('stroke-width','1.5');}
  });
  G.reinforcementMode=null;
  addLog(`Auto-distribuidos ${n} refuerzos`,'res');
  updateMap(); refreshCards();
  _syncNow(`[${FDATA[fk]?.name}] coloca refuerzos`, 'res');
  nextStep();
}

function startMoveMode() {
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

function checkElimination(fk) {
  if(!fk||!G.factions[fk]) return;
  const remaining=Object.values(G.territories).filter(t=>t.owner===fk);
  if(remaining.length===0){
    G.factions[fk].alive=false;
    addLog('☠ '+(FDATA[fk]?.name||fk)+' ELIMINADO!','combat');
    if(G.factions[G.pf]) G.factions[G.pf].eliminatedArmies=(G.factions[G.pf].eliminatedArmies||0)+1;
    flashScreen();
  }
}

function totalArmyPoints(fk) {
  return Object.values(G.territories).filter(t=>t.owner===fk).reduce((s,t)=>s+armyPoints(t),0);
}

function checkWinCondition() {
  const V=RULES.victory, myF=G.factions[G.pf];
  const myTers=Object.values(G.territories).filter(t=>t.owner===G.pf);
  const myNukes=myTers.filter(t=>t.hasNuclear).length;
  let fullRegions=0, regionsNoNuke=0;
  REGIONS.forEach(reg=>{
    const rTs=TERRITORIES_DEF.filter(t=>t.region===reg.id);
    if(rTs.every(t=>G.territories[t.id].owner===G.pf)) fullRegions++;
    if(!rTs.some(t=>G.territories[t.id].hasNuclear)) regionsNoNuke++;
  });
  let won=false, winGoal='';
  if(G.pf==='imp'&&V.imp.enabled){
    if(fullRegions>=V.imp.fullRegions){won=true;winGoal='PAX AUGUSTA: '+V.imp.fullRegions+' regiones';}
    if(myTers.length>=V.imp.territories){won=true;winGoal='PAX AUGUSTA: '+V.imp.territories+' territorios';}
  }
  if(G.pf==='lib'&&V.lib.enabled){
    if(regionsNoNuke>=V.lib.regionsNoNuclear){won=true;winGoal='TOTAL BLACKOUT';}
  }
  if(G.pf==='prm'&&V.prm.enabled){
    const nukeRegs=new Set(myTers.filter(t=>t.hasNuclear).map(t=>t.region));
    if(nukeRegs.size>=V.prm.nuclearRegions){won=true;winGoal='TERRAFORMATION';}
  }
  if(G.pf==='shn'&&V.shn.enabled){
    const myAP=totalArmyPoints(G.pf);
    const others=Object.keys(G.factions).filter(k=>k!==G.pf&&G.factions[k].alive).map(k=>totalArmyPoints(k));
    if(myAP>=V.shn.apMultiplier*Math.max(0,...others)&&myAP>0){won=true;winGoal='GENETIC SUPREMACY';}
  }
  if(G.pf==='erb'&&V.erb.enabled){
    const elim=myF.eliminatedArmies||0;
    if(elim>=V.erb.armiesEliminated){won=true;winGoal='EQUATION ZERO';}
  }
  if(won) declareVictory(winGoal);
}

function declareVictory(goal) {
  const fc=FDATA[G.pf]||{name:G.pf,color:'#C8A800'};
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;';
  ov.innerHTML='<div style="text-align:center;">'
    +'<div style="font-family:Orbitron,sans-serif;font-size:48px;letter-spacing:8px;color:'+fc.color+';text-shadow:0 0 40px '+fc.color+'aa;margin-bottom:16px;">VICTORIA</div>'
    +'<div style="font-size:16px;color:'+fc.color+';font-family:Orbitron,sans-serif;margin-bottom:8px;">'+fc.name+'</div>'
    +'<div style="font-size:13px;color:#888;margin-bottom:30px;">'+goal+'</div>'
    +'<button onclick="location.reload()" style="background:#0a0a0d;border:1px solid '+fc.color+';color:'+fc.color+';padding:12px 32px;font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:3px;cursor:pointer;">NUEVA PARTIDA</button>'
    +'</div>';
  document.body.appendChild(ov);
  addLog('🏆 VICTORIA: '+fc.name+' — '+goal,'win');
}

function endPhaseForFaction() {
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
    const nextIdx=(currentIdx+1)%order.length;
    const nextFk=order[nextIdx];
    const isNewRound=nextIdx===0;
    if(isNewRound){
      G.round++;
      document.getElementById('rnum').textContent=G.round;
      addLog('═══ RONDA '+G.round+' ═══','sys');
      flashScreen();
    }
    addLog('📋 Turno de '+((FDATA[nextFk]&&FDATA[nextFk].name)||nextFk),'sys');
    G.phase='prep'; startPhase('prep', nextFk);
  }
}

// ── Stubs ─────────────────────────────────────────────────────
function updatePhaseGuide(){if(typeof updateStepUI==='function'&&G_step){const steps=STEPS[G_step.phase]||[];if(steps[G_step.idx])updateStepUI(steps[G_step.idx]);}}
function startPhaseProgress(){if(typeof startPhase==='function')startPhase(G.phase,G.pf);}
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
function getMovableTargets(srcId,maxSteps){const visited=new Set([srcId]);let frontier=[srcId];for(let step=0;step<maxSteps;step++){const next=[];frontier.forEach(id=>{const t=G.territories[id];if(!t||!t.adj)return;t.adj.forEach(nid=>{if(!visited.has(nid)&&G.territories[nid]&&G.territories[nid].owner===G.pf){visited.add(nid);next.push(nid);}});});frontier=next;if(!frontier.length)break;}visited.delete(srcId);return visited;}
function canMoveTarget(id){if(!G.moveSrc)return false;if(!G.moveTargets)G.moveTargets=getMovableTargets(G.moveSrc,3);return G.moveTargets.has(id);}
function isAdjOwned(id){const t=G.territories[id];return t.adj.some(aid=>{const a=G.territories[aid];return a&&a.owner===G.pf;});}
function blendHex(a,b,t){const pr=c=>parseInt(c.slice(1,3),16),pg=c=>parseInt(c.slice(3,5),16),pb=c=>parseInt(c.slice(5,7),16);const lr=(x,y)=>Math.min(255,Math.round(x*(1-t)+y*t));return'#'+[lr(pr(a),pr(b)),lr(pg(a),pg(b)),lr(pb(a),pb(b))].map(v=>v.toString(16).padStart(2,'0')).join('');}
function totalAircraft(){return Object.values(G.territories).filter(t=>t.owner===G.pf).reduce((s,t)=>s+t.aircraft,0);}

function onTerritoryClick(id,event){
  if(G.setup&&G.setup.claimCallback){const handled=G.setup.claimCallback(id,event);if(handled)return;return;}
  if(G.reinforcementMode&&G.reinforcementMode.callback){const handled=G.reinforcementMode.callback(id,event);if(handled)return;return;}
  if(G.pendingCpuAttack&&G.pendingCpuAttack[id]){const pending=G.pendingCpuAttack[id];if(pending.spectator){if(pending._timer)clearTimeout(pending._timer);delete G.pendingCpuAttack[id];clearAttackFlash(id);openCombatModal('cpu-att-cpu-def');}else{openCombatModal('cpu-att-player-def');}return;}
  if(G.setup&&G.setup._inSetup){return;}
  if(G.nuclearMode){const tgt=G.territories[id];if(tgt&&tgt.owner===G.pf&&!tgt.hasNuclear){G.sel=id;doAct('nuke');G.nuclearMode=false;Object.values(G.territories).forEach(t=>{const ring=document.getElementById('tr-'+t.id);if(ring){ring.setAttribute('stroke',FDATA[t.owner]?FDATA[t.owner].color:'#1a1a20');ring.setAttribute('stroke-width','1.5');}});return;}}
  if(G.missileFiringMode){const tgt=G.territories[id];if(!tgt||!tgt.owner||tgt.owner===G.pf){addLog('Selecciona un territorio ENEMIGO para el misil.','sys');return;}G.missileFiringMode=false;G.sel=id;doMissileFire();return;}
  if(G.dragging)return;
  if(G.moveSrc){const src=G.territories[G.moveSrc],dst=G.territories[id];if(id===G.moveSrc){G.moveSrc=null;document.getElementById('map-wrap').classList.remove('moving');updateMap();return;}if(dst&&dst.owner===G.pf&&src.adj&&src.adj.includes(id)){showMoveUnitsPopup(G.moveSrc,id,event);}else{addLog(`${id} no es destino válido.`,'sys');}return;}
  if(G.moveMode&&G.territories[id]?.owner===G.pf&&armyPoints(G.territories[id])>0){G.moveSrc=id;G.moveTargets=getMovableTargets(id,3);document.getElementById('map-wrap').classList.add('moving');addLog(`Origen: ${terName(id)}. Clic en destino.`,'move');updateMap();return;}
  if(G_step&&G_step.phase==='combat'&&G_step.isMyTurn){const tgt=G.territories[id];if(G.attackSrc&&tgt&&tgt.owner&&tgt.owner!==G.pf){const src=G.territories[G.attackSrc];if(src&&src.adj&&src.adj.includes(id)){const btn=document.getElementById('ba-attack');if(btn){btn.disabled=false;btn.onclick=()=>{G.sel=G.attackSrc;openDice(id);};btn.textContent='⚔ ATACAR '+id;}selectTerritory(id);return;}else{addLog('Territorio no adyacente.','sys');}}if(tgt&&tgt.owner===G.pf&&armyPoints(tgt)>1){G.attackSrc=id;G.moveTargets=null;const btn=document.getElementById('ba-attack');if(btn){btn.disabled=true;btn.textContent='⚔ ATACAR TERRITORIO SELECCIONADO';}selectTerritory(id);addLog(`Origen: ${terName(id)}. Clic en enemigo adyacente.`,'sys');return;}}
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
  document.getElementById('ba-nuke').disabled=!(inPrep&&isOwn&&!t.hasNuclear&&myF.plutonium>=5);
  document.getElementById('ba-missile-build').disabled=!(inPrep&&myF.missiles<5&&myF.plutonium>=1);
  document.getElementById('ba-missile-fire').disabled=!(inPrep&&myF.missiles>0&&isEnemy);
  document.getElementById('ba-attack').disabled=!(inCombat&&isEnemy&&isAdj);
  document.getElementById('upg-mech').disabled=!(inPrep&&isOwn&&t.soldiers>=3&&myF.plutonium>=1);
  document.getElementById('upg-air').disabled=!(inPrep&&isOwn&&t.soldiers>=3&&myF.plutonium>=1&&totalAircraft()<5);
  document.getElementById('upg-sco').disabled=!(inPrep&&isOwn&&t.mechs>=2&&myF.plutonium>=1);
  updateMissilePips();
}

function activateNuclearMode(){const myF=G.factions[G.pf];if(myF.plutonium<RULES.prep.nuclearBuildCost){addLog('Plutonio insuficiente.','sys');return;}G.nuclearMode=true;G.moveMode=false;G.moveSrc=null;Object.values(G.territories).forEach(t=>{const ring=document.getElementById('tr-'+t.id);if(!ring)return;if(t.owner===G.pf&&!t.hasNuclear){ring.setAttribute('stroke','#C8A800');ring.setAttribute('stroke-width','2.5');}else{ring.setAttribute('stroke',FDATA[t.owner]?FDATA[t.owner].color:'#1a1a20');ring.setAttribute('stroke-width','1.5');}});addLog('Clic en un territorio tuyo para construir Nuclear Complex.','sys');}

function doAct(action){
  const id=G.sel; if(!id) return;
  const t=G.territories[id];const myF=G.factions[G.pf];
  if(action==='nuke'){
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
  if(action==='move-action'){G.moveSrc=id;G.moveTargets=getMovableTargets(id,3);document.getElementById('map-wrap').classList.add('moving');addLog(`Selecciona destino desde ${t.name}.`,'move');updateMap();}
}

function doUpgrade(type){
  const id=G.sel;const myF=G.factions[G.pf];
  if(!id||!G.territories[id]||G.territories[id].owner!==G.pf){addLog('Selecciona primero un territorio TUYO.','sys');return;}
  const t=G.territories[id];
  if(type==='mech'){if(t.soldiers<3||myF.plutonium<1)return;t.soldiers-=3;t.mechs+=1;myF.plutonium-=1;addLog(`3 Sol → 1 Mech en ${t.id}. −1 PLU.`,'res');}
  if(type==='air'){if(t.soldiers<3||myF.plutonium<1||totalAircraft()>=5)return;t.soldiers-=3;t.aircraft+=1;myF.plutonium-=1;addLog(`3 Sol → 1 Aircraft en ${t.id}. −1 PLU.`,'res');}
  if(type==='sco'){if(t.mechs<2||myF.plutonium<1)return;t.mechs-=2;t.scorpions+=1;myF.plutonium-=1;addLog(`2 Mech → 1 Scorpion en ${t.id}. −1 PLU.`,'res');}
  _syncNow(`[${FDATA[G.pf]?.name}] mejora en ${terName(id)}`, 'res');
  refreshCards();selectTerritory(id);updateMap();
}

function updateMissilePips(){const myF=G.factions[G.pf];const cont=document.getElementById('miss-pips');if(!cont)return;cont.innerHTML='';for(let i=0;i<5;i++){const p=document.createElement('div');p.className='miss-pip'+(i<myF.missiles?' full':'');cont.appendChild(p);}}
