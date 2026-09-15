// === STATE — Global game object and constants ===

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
      detail:'Reposiciona unidades entre tus territorios antes de terminar el turno.',
      isAuto: false },
  ],
  end: [
    { id:'regroup',  title:'1. REAGRUPAR',
      detail:'Mueve unidades entre tus territorios (mismas reglas que en preparación).',
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


let G = {
  pf:'imp', pname:'COMANDANTE', playerCount:4,
  round:1, phase:'prep',
  currentFaction:'imp',
  territories:{}, factions:{},
  sel:null, moveSrc:null, diceCtx:null,
  vx:0, vy:0, vscale:1, vscaleMin:0.1,
  dragging:false, dragStart:null,
  eliminatedArmies:{},
  // Setup phase state
  setup: {
    _stepIdx: 0,        // current step index into SETUP_STEPS
    order: [],          // faction keys in play order (after roll)
    orderIdx: 0,        // current faction index in rotation
    claimRound: 0,
    rollResults: {},    // fk -> roll value
    soldiersLeft: {},   // fk -> soldiers still to place
    nukesLeft: {},      // fk -> nukes still to place
    claimCallback: null,// set during player's turn for map click intercept
  }
};

let G_step = { idx:0, phase:'prep', isMyTurn:true, cpuQueue:[] };

// ── Start a new phase ────────────────────────────────────────────
function startPhase(phase, fk) {
  G_step.phase = phase;
  G_step.idx = 0;
  G_step.isMyTurn = (fk === G.pf);
  G_step.currentFk = fk;
  updatePhaseBanner(fk);
  runCurrentStep();
}


function updateTurnOrderBar() {
  const header = document.getElementById('turn-header');
  const dots = document.getElementById('turn-dots');
  const phaseLbl = document.getElementById('turn-phase-lbl');
  if(!header || !dots || !G.setup || !G.setup.order || !G.setup.order.length) return;
  header.style.display = 'block';
  const order = G.setup.order;
  const currentFk = (typeof G_step!=='undefined') ? G_step.currentFk : null;
  const phases = {prep:'PREPARACIÓN',combat:'COMBATE',end:'FIN DE TURNO'};
  if(phaseLbl && typeof G_step!=='undefined') phaseLbl.textContent = phases[G_step.phase]||'TURNO';
  dots.innerHTML = order.map(fk=>{
    const fd = FDATA[fk]||{name:fk,color:'#888'};
    const isActive = fk===currentFk;
    const isMe = fk===G.pf;
    return '<div title="'+fd.name+(isMe?' (TÚ)':'')+'" style="display:flex;align-items:center;gap:2px;opacity:'+(isActive?1:0.4)+';">' +
      '<div style="width:'+(isActive?10:6)+'px;height:'+(isActive?10:6)+'px;border-radius:50%;background:'+fd.color+';'+(isActive?'box-shadow:0 0 5px '+fd.color+';transition:all 0.3s;':'')+' flex-shrink:0;"></div>' +
      (isActive ? '<span style="font-family:Orbitron,sans-serif;font-size:7px;color:'+fd.color+';letter-spacing:1px;">'+fd.name.split(' ')[0]+(isMe?' ★':'')+'</span>' : '') +
    '</div>';
  }).join('');
}

function updatePhaseBanner(fk) {
  updateTurnOrderBar();
  refreshCards();
  const labels={prep:'PREPARACIÓN',combat:'COMBATE',end:'FIN DE TURNO'};
  const el = document.getElementById('pg-phase');
  if(el) el.textContent = labels[G_step.phase]||G_step.phase.toUpperCase();
  const own = document.getElementById('pg-turn-owner');
  if(own && fk && FDATA[fk]) {
    const isMe = fk===G.pf;
    own.innerHTML = `<span style="color:${FDATA[fk].color};">${FDATA[fk].name}</span> ${isMe?'<span style="color:#C8A800;">[TU TURNO]</span>':'[observando]'}`;
  }
  // Step dots
  const dots = document.getElementById('step-dots');
  if(dots) {
    const steps = STEPS[G_step.phase]||[];
    dots.innerHTML = steps.map((s,i)=>{
      const done = i < G_step.idx;
      const active = i === G_step.idx;
      return `<div title="${s.title}" style="width:8px;height:8px;border-radius:50%;
        background:${done?'#446644':active?'#C8A800':'#1a1a1a'};
        border:1px solid ${done?'#446644':active?'#C8A800':'#333'};
        cursor:pointer;" onclick="if(${done}) jumpToStep(${i});"></div>`;
    }).join('');
  }
  // Objective
  showObjective(G.pf);
}

function showObjective(fk) {
  const sec = document.getElementById('objective-section');
  const el = document.getElementById('faction-objective');
  if(!sec||!el||!fk||!FDATA[fk]) return;
  const fd = FDATA[fk];
  sec.style.display='block';
  el.innerHTML = `<span style="color:${fd.color};font-family:Orbitron,sans-serif;font-size:10px;
    letter-spacing:1px;">${fd.goal||''}</span><br>
    <span style="color:#888;">${VICTORY_DETAIL[fk]||''}</span>`;
}

function runCurrentStep() {
  const steps = STEPS[G_step.phase]||[];
  if(G_step.idx >= steps.length) { endPhaseForFaction(); return; }
  const step = steps[G_step.idx];
  updateStepUI(step);
  if(step.isAuto) {
    executeAutoStep(step);
  } else if(!G_step.isMyTurn) {
    executeCpuStep(step);
  } else {
    executePlayerStep(step);
  }
  updatePhaseBanner(G_step.currentFk);
}

function nextStep() {
  G_step.idx++;
  runCurrentStep();
}

function updateStepUI(step) {
  const title = document.getElementById('step-title');
  const detail = document.getElementById('step-detail');
  if(title) title.textContent = step.title;
  if(detail) detail.innerHTML = step.detail;
  // Render step actions
  renderStepActions(step);
  updatePhaseBanner(G_step.currentFk);
}

function renderStepActions(step) {
  const area = document.getElementById('step-actions');
  if(!area) return;
  const isMe = G_step.isMyTurn;
  const fk = G_step.currentFk;
  const myF = G.factions[fk];

  if(!isMe) {
    // Spectator view — CPU animating
    area.innerHTML = `<div style="text-align:center;padding:20px;color:#999;font-size:11px;font-family:Orbitron,sans-serif;letter-spacing:2px;">
      <div style="color:${FDATA[fk]?.color||'#888'};margin-bottom:8px;">${FDATA[fk]?.name||fk}</div>
      está realizando su turno...<br>
      <div id="cpu-action-desc" style="color:#888;margin-top:8px;"></div>
    </div>`;
    return;
  }

  // Player steps
  const phase = G_step.phase;
  const sid = step.id;

  if(sid==='income') {
    const myTers = Object.values(G.territories).filter(t=>t.owner===fk);
    const nukes = myTers.filter(t=>t.hasNuclear).length;
    // Show actual values already applied by applyIncome
    const reinfGained = myF._reinfIncome !== undefined ? myF._reinfIncome : (myF.pendingSoldiers||0);
    const plutGained = myF._plutIncome !== undefined ? myF._plutIncome : 0;
    area.innerHTML = `
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
    const left = myF.pendingSoldiers||0;
    area.innerHTML = `
      <div style="font-size:10px;color:#88cc44;font-family:Orbitron,sans-serif;margin-bottom:8px;">
        ${left} soldados por colocar
      </div>
      <div style="font-size:11px;color:#888;margin-bottom:10px;">Haz clic en tus territorios resaltados (verde)</div>
      ${left===0 ? nextBtn() : `<button class="abtn" onclick="autoDistributeReinf()" style="width:100%;margin-bottom:6px;border-color:#336633;color:#448844;">AUTO-DISTRIBUIR</button>`}
      <div id="reinf-left-display" style="font-size:11px;color:#888;margin-top:6px;"></div>`;

  } else if(sid==='upgrade') {
    const f = G.factions[fk];
    const myTersU = Object.values(G.territories).filter(t=>t.owner===fk);
    const totalSol = myTersU.reduce((s,t)=>s+t.soldiers,0);
    const totalMech = myTersU.reduce((s,t)=>s+t.mechs,0);
    const canMech = totalSol>=3 && f.plutonium>=1;
    const canAir = totalSol>=3 && f.plutonium>=1 && totalAircraft()<5;
    const canScorp = totalMech>=2 && f.plutonium>=1;
    area.innerHTML = `
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

  } else if(sid==='move' || sid==='cmove' || sid==='regroup') {
    area.innerHTML = `
      <div style="font-size:11px;color:#888;margin-bottom:10px;">
        Selecciona un territorio tuyo → luego clic en destino.<br>
        Terrestres: hasta <b>3 territorios</b>. Aircraft: cualquier territorio tuyo.
      </div>
      <button class="abtn" id="ba-move-btn" onclick="startMoveMode()" style="width:100%;margin-bottom:6px;border-color:#336699;color:#4488bb;">
        ↗ ACTIVAR MODO MOVIMIENTO
      </button>
      ${nextBtn('SIGUIENTE (sin mover)')}`;

  } else if(sid==='missile') {
    const mCount = myF.missiles||0;
    const mFired = myF.missilesFiredThisTurn||0;
    const canBuild = !RULES.prep.buildBeforeFire||mFired===0;
    area.innerHTML = `
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
    const canBuild = myF.plutonium>=RULES.prep.nuclearBuildCost;
    const validNucTers = Object.values(G.territories).filter(t=>t.owner===fk&&!t.hasNuclear);
    G.nuclearMode = false; G.moveMode=false; G.moveSrc=null;
    area.innerHTML = `
      <div style="font-size:11px;color:#aaa;margin-bottom:8px;">
        Coste: ${RULES.prep.nuclearBuildCost} Pu | Tienes: ${myF.plutonium} Pu
      </div>
      <div style="font-size:11px;color:#${canBuild?'88cc44':'cc4444'};margin-bottom:10px;">
        ${canBuild ? '✓ '+validNucTers.length+' territorios disponibles' : '⚠ Plutonio insuficiente'}
      </div>
      <button class="abtn" onclick="activateNuclearMode()" ${canBuild?'':'disabled'} style="width:100%;margin-bottom:8px;">
        ☢ CONSTRUIR NUCLEAR COMPLEX
      </button>
      ${nextBtn('SIGUIENTE (sin construir)')}`;

} else if(sid==='attack') {
    area.innerHTML = `
      <div style="font-size:11px;color:#888;margin-bottom:10px;">
        Selecciona tu territorio origen → clic en territorio enemigo adyacente → pulsa ATACAR.
      </div>
      <button class="abtn" id="ba-attack" onclick="doAct('attack')" disabled style="width:100%;margin-bottom:6px;border-color:#cc4433;color:#cc4433;">
        ⚔ ATACAR TERRITORIO SELECCIONADO
      </button>
      ${nextBtn('PASAR AL MOVIMIENTO')}`;

  } else if(sid==='maint') {
    const nukes = Object.values(G.territories).filter(t=>t.owner===fk&&t.hasNuclear).length;
    area.innerHTML = `
      <div style="font-size:11px;color:#aaa;margin-bottom:10px;">
        ${nukes} Nuclear Complex${nukes!==1?'es':''}. Mantenimiento automático (D20 por cada uno).
      </div>
      <div id="maint-results" style="font-size:11px;color:#888;min-height:20px;"></div>`;
    // Auto-run maintenance for current faction (no player interaction needed)
    setTimeout(()=>runMaintenanceRolls(), 600);
  }
}

function nextBtn(label) {
  return `<button class="abtn" onclick="nextStep()" style="width:100%;margin-top:4px;border-color:#999;color:#888;font-size:10px;">
    ${label||'SIGUIENTE ▶'}</button>`;
}

function getAsset(key) {
  try { return ASSETS[key]||''; } catch(e){ return ''; }
}

// ── Auto steps (income) ──────────────────────────────────────────
function executeAutoStep(step) {
  if(step.id==='income') {
    applyIncome(G_step.currentFk);
    // Short delay then auto-advance for CPU; player sees the numbers and clicks Next
    if(!G_step.isMyTurn) setTimeout(nextStep, 800);
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
  myF._plutIncome = plutIncome;
  myF._reinfIncome = reinf;
  addLog(`[${FDATA[fk]?.name||fk}] +${plutIncome} Pu | +${reinf} refuerzos`,'res');
  refreshCards(); updateMap();
}

// ── CPU step execution ────────────────────────────────────────────
function executeCpuStep(step) {
  const fk = G_step.currentFk;
  const desc = document.getElementById('cpu-action-desc');
  const delay = 800;

  if(step.id==='reinf') {
    if(desc) desc.textContent = 'Colocando refuerzos...';
    const myF=G.factions[fk];
    const n=myF.pendingSoldiers||0;
    const myTers=Object.values(G.territories).filter(t=>t.owner===fk);
    const nucTers=myTers.filter(t=>t.hasNuclear);
    const validTers=nucTers.length>0?nucTers:(RULES.prep.placement.ereubsAnywhereOverride&&fk==='erb')?myTers:myTers;
    for(let s=0;s<n;s++){const p=validTers[s%validTers.length];if(p)p.soldiers++;}
    myF.pendingSoldiers=0;
    addLog(`[${FDATA[fk]?.name||fk}] Coloca ${n} refuerzos`,'res');
    updateMap(); setTimeout(nextStep, delay);

  } else if(step.id==='upgrade') {
    // CPU basic upgrade logic
    const myF=G.factions[fk];
    let upgraded=0;
    while(myF.soldiers>=3&&myF.plutonium>=1&&myF.mechs<6){
      myF.soldiers-=3;myF.plutonium-=1;myF.mechs++;upgraded++;
    }
    if(upgraded>0) addLog(`[${FDATA[fk]?.name||fk}] Mejora ${upgraded} Mech`,'res');
    if(desc) desc.textContent = upgraded>0?`Mejora ${upgraded} unidades.`:'Sin mejoras.';
    updateMap(); setTimeout(nextStep, delay);

  } else if(step.id==='move'||step.id==='cmove'||step.id==='regroup') {
    if(desc) desc.textContent='Sin movimiento este turno.';
    setTimeout(nextStep, 500);

  } else if(step.id==='missile') {
    if(desc) desc.textContent='Sin misiles este turno.';
    setTimeout(nextStep, 400);

  } else if(step.id==='nuclear') {
    if(desc) desc.textContent='Sin construcciones.';
    setTimeout(nextStep, 400);

  } else if(step.id==='attack') {
    if(desc) desc.textContent='Evaluando posibles ataques...';
    setTimeout(()=>executeCpuAttack(fk, desc), 1200);

  } else if(step.id==='maint') {
    runMaintenanceRollsFor(fk, ()=>setTimeout(nextStep,600));

  } else {
    setTimeout(nextStep, 400);
  }
}

function executePlayerStep(step) {
  if(step.id==='income') {
    executeAutoStep(step);
  } else if(step.id==='reinf') {
    // Activate reinforcement placement mode
    const myF = G.factions[G.pf];
    const left = myF.pendingSoldiers||0;
    if(left > 0) showReinforcementUI(left);
    else { addLog('Sin refuerzos este turno.','res'); }
  }
  // Other steps: player interacts via buttons rendered by renderStepActions
}

// ── CPU Attack ────────────────────────────────────────────────────
function executeCpuAttack(fk, descEl) {
  // Find a valid attack target
  const myTers = Object.values(G.territories).filter(t=>t.owner===fk&&armyPoints(t)>1);
  let attacked=false;
  for(const src of myTers) {
    const adjEnemies = (src.adj||[]).map(id=>G.territories[id]).filter(t=>t&&t.owner&&t.owner!==fk&&armyPoints(t)>0);
    if(adjEnemies.length>0) {
      const tgt = adjEnemies[Math.floor(Math.random()*adjEnemies.length)];
      attacked=true;
      addLog(`[${FDATA[fk]?.name||fk}] ⚔ Ataca ${tgt.id} desde ${src.id}`,'combat');
      if(descEl) descEl.innerHTML=`Atacando <b>${tgt.id}</b>...`;
      // Open dice modal for CPU attack (player defends!)
      openDiceCpu(src.id, tgt.id, fk, ()=>setTimeout(()=>nextStep(), 1000));
      return;
    }
  }
  if(!attacked){
    if(descEl) descEl.textContent='Sin ataques posibles.';
    setTimeout(nextStep, 500);
  }
}

// ── Maintenance rolls ─────────────────────────────────────────────
function runMaintenanceRolls() {
  runMaintenanceRollsFor(G.pf, nextStep);
}

function runMaintenanceRollsFor(fk, callback) {
  const R=RULES.end;
  const nucTers=Object.values(G.territories).filter(t=>t.owner===fk&&t.hasNuclear);
  if(nucTers.length===0){if(callback)callback();return;}

  // Show maintenance dice modal
  openMaintenanceModal(fk, nucTers, R, callback);
}

function openMaintenanceModal(fk, nucTers, R, callback) {
  // Remove any existing maintenance modal
  const ex = document.getElementById('maint-modal');
  if(ex) ex.remove();

  const fd = FDATA[fk]||{name:fk,color:'#888'};
  const modal = document.createElement('div');
  modal.id = 'maint-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000;display:flex;align-items:center;justify-content:center;';

  const box = document.createElement('div');
  box.style.cssText = 'background:#08080c;border:1px solid #333;padding:28px 36px;min-width:380px;font-family:Orbitron,sans-serif;text-align:center;';

  const isMyMaint = (fk === G.pf);
  const btnLabel = isMyMaint ? `🎲 LANZAR D${R.maintenanceDie}` : `▶ VER RESULTADO`;
  const btnColor = isMyMaint ? '#C8A800' : '#555';
  box.innerHTML = `
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
    </button>
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  const doRoll = () => {
    const btn = document.getElementById('maint-roll-btn');
    if(btn){btn.disabled=true;btn.style.opacity='0.4';}

    const rolls = nucTers.map(() => Math.floor(Math.random()*R.maintenanceDie)+1);
    let explosions = 0;

    rolls.forEach((v,i) => {
      const el = document.getElementById('md'+i);
      if(el) {
        el.textContent = v;
        el.style.borderColor = v===R.maintenanceExplosionOn ? '#ff4444' : '#446644';
        el.style.color = v===R.maintenanceExplosionOn ? '#ff4444' : '#88cc44';
        el.style.fontSize = '24px';
      }
      if(v===R.maintenanceExplosionOn) {
        explosions++;
        nucTers[i].hasNuclear = false;
        if(nucTers[i].aircraft>0){nucTers[i].soldiers=0;nucTers[i].mechs=0;nucTers[i].scorpions=0;}
        else{nucTers[i].soldiers=Math.max(1,nucTers[i].soldiers);nucTers[i].mechs=0;nucTers[i].scorpions=0;}
        addLog(`💥 EXPLOSIÓN en ${nucTers[i].id} (D${R.maintenanceDie}=${v})`,'combat');
      } else {
        addLog(`☢ ${nucTers[i].id}: D${R.maintenanceDie}=${v} — seguro`,'res');
      }
    });

    const res = document.getElementById('maint-result');
    if(res) {
      res.textContent = explosions>0 ? `${explosions} EXPLOSIÓN${explosions>1?'ES':''}!` : 'Sin explosiones ✓';
      res.style.color = explosions>0 ? '#ff4444' : '#88cc44';
    }

    updateMap(); refreshCards();

    // Player: show CERRAR button. Others (CPU): auto-close
    const res2 = document.getElementById('maint-result');
    const rollBtn2 = document.getElementById('maint-roll-btn');
    if(rollBtn2) rollBtn2.style.display='none';
    if(isMyMaint) {
      const closeBtn=document.createElement('button');
      closeBtn.textContent='CERRAR ▶';
      closeBtn.style.cssText='background:#0a0a0d;border:1px solid #C8A800;color:#C8A800;padding:10px 24px;font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:2px;cursor:pointer;margin-top:8px;';
      closeBtn.onclick=()=>{modal.remove();if(callback)callback();};
      box.appendChild(closeBtn);
    } else {
      // CPU/spectator: auto-close after showing result
      setTimeout(()=>{modal.remove();if(callback)callback();},2500);
    }
  };

  document.getElementById('maint-roll-btn').onclick = doRoll;
  // Auto-roll for CPU
  if(!isMyMaint) setTimeout(doRoll, 600);
}


// ── Reinforce helpers ────────────────────────────────────────────
function autoDistributeReinf() {
  const fk=G.pf, myF=G.factions[fk];
  const n=myF.pendingSoldiers||0;
  const myTers=Object.values(G.territories).filter(t=>t.owner===fk);
  const nucTers=myTers.filter(t=>t.hasNuclear);
  const validTers=nucTers.length>0?nucTers:myTers;
  for(let s=0;s<n;s++){const p=validTers[s%validTers.length];if(p)p.soldiers++;}
  myF.pendingSoldiers=0;
  // Clear highlights
  Object.values(G.territories).forEach(t=>{
    const ring=document.getElementById('tr-'+t.id);
    if(ring){ring.setAttribute('stroke',FDATA[t.owner]?FDATA[t.owner].color:'#1a1a20');ring.setAttribute('stroke-width','1.5');}
  });
  G.reinforcementMode=null;
  addLog(`Auto-distribuidos ${n} refuerzos`,'res');
  updateMap(); refreshCards();
  nextStep();
}

function startMoveMode() {
  const btn=document.getElementById('ba-move-btn');
  if(btn){btn.textContent='↗ ACTIVO — clic en origen';btn.style.borderColor='#C8A800';btn.style.color='#C8A800';}
  G.moveMode=true;
  G.moveSrc=null;
  document.getElementById('map-wrap').classList.add('moving');
  addLog('Clic en tu territorio ORIGEN, luego en el DESTINO adyacente.','sys');
}

function activateMissileFire() {
  addLog('Selecciona el territorio enemigo objetivo en el mapa','sys');
  G.missileFiringMode=true;
}

// ── End phase for current faction, then rotate ───────────────────

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
    if(nukeRegs.size>=V.prm.nuclearRegions){won=true;winGoal='TERRAFORMATION: Nuclear en '+V.prm.nuclearRegions+' regiones';}
  }
  if(G.pf==='shn'&&V.shn.enabled){
    const myAP=totalArmyPoints(G.pf);
    const others=Object.keys(G.factions).filter(k=>k!==G.pf&&G.factions[k].alive).map(k=>totalArmyPoints(k));
    if(myAP>=V.shn.apMultiplier*Math.max(0,...others)&&myAP>0){won=true;winGoal='GENETIC SUPREMACY';}
  }
  if(G.pf==='erb'&&V.erb.enabled){
    const elim=myF.eliminatedArmies||0;
    if(elim>=V.erb.armiesEliminated){won=true;winGoal='EQUATION ZERO: '+elim+' ejércitos eliminados';}
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
  // CORRECT: each player does prep → combat → end, THEN next player
  const order=G.setup.order||Object.keys(G.factions);
  const currentFk=G_step.currentFk;
  const currentIdx=order.indexOf(currentFk);

  if(G_step.phase==='prep'){
    // Same player moves to combat
    addLog('⚔ '+((FDATA[currentFk]&&FDATA[currentFk].name)||currentFk)+': FASE COMBATE','sys');
    G.phase='combat';
    startPhase('combat', currentFk);

  } else if(G_step.phase==='combat'){
    // Same player moves to end
    addLog('🔚 '+((FDATA[currentFk]&&FDATA[currentFk].name)||currentFk)+': FASE FINAL','sys');
    G.phase='end';
    startPhase('end', currentFk);

  } else if(G_step.phase==='end'){
    // Player done — next player starts prep
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
    G.phase='prep';
    startPhase('prep', nextFk);
  }
}



// ── Stubs for legacy calls (replaced by step engine) ────────────
function updatePhaseGuide() { if(typeof updateStepUI==='function' && G_step) { const steps=STEPS[G_step.phase]||[]; if(steps[G_step.idx]) updateStepUI(steps[G_step.idx]); } }
function startPhaseProgress() { if(typeof startPhase==='function') startPhase(G.phase, G.pf); }
function markStepDone(id) {
  // Mark step visually complete but don't auto-advance
  // Player uses SIGUIENTE button to advance
  updatePhaseBanner(G_step.currentFk);
}
function setStepActive(id) { }
function guideStepClick(id, action) { }

function updateMap() {
  Object.keys(G.territories).forEach(id => {
    const t = G.territories[id];
    const fc = t.owner ? FDATA[t.owner] : null;
    const reg = REGIONS.find(r=>r.id===t.region);
    const isSelected = id === G.sel;
    const isMoveTarget = G.moveSrc && canMoveTarget(id);
    const isAttackTarget = G.phase==='combat' && t.owner && t.owner !== G.pf && isAdjOwned(id);

    const bg = document.getElementById('tc-'+id);
    if(!bg) return;
    const reg2 = REGIONS.find(r=>r.id===t.region);
    // Region base color; if owned blend slightly with faction
    let fillColor = reg2 ? reg2.color : '#0a0a0e';
    if(fc) fillColor = blendHex(reg2 ? reg2.color : '#0a0a0e', fc.dimColor, 0.3);
    bg.setAttribute('fill', fillColor);
    bg.setAttribute('opacity', '0.88');

    // Ring color & width
    const ring = document.getElementById('tr-'+id);
    if(ring){
      if(isSelected){
        ring.setAttribute('stroke','#C8A800');
        ring.setAttribute('stroke-width','3.5');
        ring.setAttribute('filter','url(#fx-glow)');
      } else if(isMoveTarget){
        ring.setAttribute('stroke','#4488cc');
        ring.setAttribute('stroke-width','2.5');
        ring.setAttribute('filter','');
      } else if(isAttackTarget){
        ring.setAttribute('stroke','#cc2222');
        ring.setAttribute('stroke-width','2.5');
        ring.setAttribute('filter','');
      } else {
        // Always region color
        ring.setAttribute('stroke', reg ? reg.borderColor : '#444');
        ring.setAttribute('stroke-width', '1.5');
        ring.setAttribute('filter','');
      }
    }

    // Unit display: faction LED dot + unit images in a row
    const uig = document.getElementById('uig-'+id);
    if(uig){
      while(uig.firstChild) uig.removeChild(uig.firstChild);
      if(fc){
        // ── LED dot (faction color indicator, top-left of circle) ────────
        // Outer glow ring
        const glowRing = document.createElementNS(NS,'circle');
        glowRing.setAttribute('cx', t.cx+-15);
        glowRing.setAttribute('cy', t.cy+-26);
        glowRing.setAttribute('r','5');
        glowRing.setAttribute('fill', fc.color);
        glowRing.setAttribute('opacity','0.25');
        glowRing.setAttribute('filter','url(#fx-glow)');
        uig.appendChild(glowRing);
        // Inner LED
        const led = document.createElementNS(NS,'circle');
        led.setAttribute('cx', t.cx+-15);
        led.setAttribute('cy', t.cy+-26);
        led.setAttribute('r','3.5');
        led.setAttribute('fill', fc.color);
        led.setAttribute('opacity','0.95');
        uig.appendChild(led);
        // Bright center spot
        const ledCenter = document.createElementNS(NS,'circle');
        ledCenter.setAttribute('cx', t.cx+-15);
        ledCenter.setAttribute('cy', t.cy+-26);
        ledCenter.setAttribute('r','1.5');
        ledCenter.setAttribute('fill','#ffffff');
        ledCenter.setAttribute('opacity','0.7');
        uig.appendChild(ledCenter);

        if(true){ // always show unit counters
          // ── Unit counters: SOL / MCH / AIR / SCP ─────────────────────
          // Labels row (tiny, above counts)
          const unitDefs = [
            {label:'SOL', count:t.soldiers||0},
            {label:'MCH', count:t.mechs||0},
            {label:'AIR', count:t.aircraft||0},
            {label:'SCP', count:t.scorpions||0}
          ];
          const colW = 18, startUX = t.cx - colW*2 + colW/2;
          const rowY = t.cy + 14; // below center, below nuclear

          unitDefs.forEach((u,i) => {
            const ux = startUX + i*colW;
            // Label
            const lbl = document.createElementNS(NS,'text');
            lbl.setAttribute('x', ux);
            lbl.setAttribute('y', rowY - 7);
            lbl.setAttribute('text-anchor','middle');
            lbl.setAttribute('font-size','4.5');
            lbl.setAttribute('font-family','Orbitron,monospace');
            lbl.setAttribute('fill', fc ? fc.color : '#666');
            lbl.setAttribute('opacity','0.7');
            lbl.textContent = u.label;
            uig.appendChild(lbl);
            // Count
            const cnt = document.createElementNS(NS,'text');
            cnt.setAttribute('x', ux);
            cnt.setAttribute('y', rowY + 2);
            cnt.setAttribute('text-anchor','middle');
            cnt.setAttribute('font-size','8');
            cnt.setAttribute('font-family','Orbitron,monospace');
            cnt.setAttribute('font-weight','700');
            cnt.setAttribute('fill', u.count > 0 ? '#ffffff' : '#333');
            cnt.setAttribute('stroke', u.count > 0 ? '#000' : 'none');
            cnt.setAttribute('stroke-width','0.4');
            cnt.textContent = u.count;
            uig.appendChild(cnt);
          });


        } else {
          // Unowned: show grey zero counters
          const unitDefs2 = [{label:'SOL'},{label:'MCH'},{label:'AIR'},{label:'SCP'}];
          const colW2=18, startUX2=t.cx-colW2*2+colW2/2;
          unitDefs2.forEach((u,i)=>{
            const ux=startUX2+i*colW2;
            const lbl=document.createElementNS(NS,'text');
            lbl.setAttribute('x',ux); lbl.setAttribute('y',t.cy-1);
            lbl.setAttribute('text-anchor','middle'); lbl.setAttribute('font-size','4.5');
            lbl.setAttribute('font-family','Orbitron,monospace'); lbl.setAttribute('fill','#333');
            lbl.textContent=u.label; uig.appendChild(lbl);
            const cnt=document.createElementNS(NS,'text');
            cnt.setAttribute('x',ux); cnt.setAttribute('y',t.cy+10);
            cnt.setAttribute('text-anchor','middle'); cnt.setAttribute('font-size','8');
            cnt.setAttribute('font-family','Orbitron,monospace'); cnt.setAttribute('font-weight','700');
            cnt.setAttribute('fill','#2a2a2a'); cnt.textContent='0'; uig.appendChild(cnt);
          });
        }
      }
    }
    // Clear old text unit display
    const utxt = document.getElementById('tu-'+id);
    if(utxt) utxt.textContent = '';

    // Nuclear complex icon — real image top-right
    const ntxt = document.getElementById('tn-'+id);
    if(ntxt){ ntxt.textContent = ''; } // text cleared, use image below
    const nucImgId = 'nucimg-'+id;
    let nucImg2 = document.getElementById(nucImgId);
    const td2 = TERRITORIES_DEF.find(x=>x.id===id);
    if(td2){
      if(t.hasNuclear){
        if(!nucImg2){
          nucImg2 = document.createElementNS(NS,'image');
          nucImg2.setAttribute('id',nucImgId);
          nucImg2.setAttribute('href',ASSETS.nuclear);
          nucImg2.setAttribute('width','28'); nucImg2.setAttribute('height','28');
          nucImg2.setAttribute('opacity','0.9');
          nucImg2.setAttribute('pointer-events','none');
          svgG.appendChild(nucImg2);
        }
        nucImg2.setAttribute('x',td2.cx-14); nucImg2.setAttribute('y',td2.cy-34);
      } else if(nucImg2){
        nucImg2.style.display='none';
      }
    }

    // Move/attack flash
    const adjLine = document.getElementById('adj-'+[id,G.sel].sort().join('-'));
    if(adjLine && isSelected){
      adjLine.setAttribute('stroke','rgba(200,168,0,0.3)');
      adjLine.setAttribute('stroke-width','2');
    }
  });

  // Reset adj lines
  document.querySelectorAll('[id^="adj-"]').forEach(l=>{
    if(!G.sel || !l.id.includes(G.sel)){
      l.setAttribute('stroke','rgba(255,255,255,0.06)');
      l.setAttribute('stroke-width','0.8');
    }
  });

  // Apply pan/zoom — all content inside svgG moves together
  svgG.setAttribute('transform',`translate(${G.vx},${G.vy}) scale(${G.vscale})`);
}

function buildUnitString(t) {
  const parts = [];
  if(t.scorpions>0) parts.push(t.scorpions+'S');
  if(t.mechs>0) parts.push(t.mechs+'M');
  if(t.aircraft>0) parts.push(t.aircraft+'A');
  if(t.soldiers>0) parts.push(t.soldiers+'s');
  return parts.join(' ') || '';
}

function armyPoints(t) {
  return t.soldiers + t.mechs*3 + t.aircraft*3 + t.scorpions*6;
}

function totalArmyPoints(faction) {
  return Object.values(G.territories).filter(t=>t.owner===faction)
    .reduce((sum,t)=>sum+armyPoints(t),0);
}


function getMovableTargets(srcId, maxSteps) {
  // BFS through owned territories - returns set of reachable territory IDs
  const visited = new Set([srcId]);
  let frontier = [srcId];
  for(let step=0; step<maxSteps; step++) {
    const next = [];
    frontier.forEach(id => {
      const t = G.territories[id];
      if(!t || !t.adj) return;
      t.adj.forEach(nid => {
        if(!visited.has(nid) && G.territories[nid] && G.territories[nid].owner===G.pf) {
          visited.add(nid);
          next.push(nid);
        }
      });
    });
    frontier = next;
    if(!frontier.length) break;
  }
  visited.delete(srcId); // can't move to self
  return visited;
}

function canMoveTarget(id) {
  if(!G.moveSrc) return false;
  if(!G.moveTargets) G.moveTargets = getMovableTargets(G.moveSrc, 3);
  return G.moveTargets.has(id);
}

function isAdjOwned(id) {
  const t = G.territories[id];
  return t.adj.some(aid => {
    const a = G.territories[aid];
    return a && a.owner === G.pf;
  });
}

function blendHex(a, b, t) {
  const pr=c=>parseInt(c.slice(1,3),16), pg=c=>parseInt(c.slice(3,5),16), pb=c=>parseInt(c.slice(5,7),16);
  const lr=(x,y)=>Math.min(255,Math.round(x*(1-t)+y*t));
  return '#'+[lr(pr(a),pr(b)),lr(pg(a),pg(b)),lr(pb(a),pb(b))].map(v=>v.toString(16).padStart(2,'0')).join('');
}

// ── TERRITORY CLICK ────────────────────────────────────────────
function onTerritoryClick(id, event) {
  // Setup phase intercept
  if(G.setup && G.setup.claimCallback) {
    const handled = G.setup.claimCallback(id, event);
    if(handled) return;
    return;
  }
  // Reinforcement placement mode
  if(G.reinforcementMode && G.reinforcementMode.callback) {
    const handled = G.reinforcementMode.callback(id, event);
    if(handled) return;
    return;
  }
  // During setup, block all territory interaction
  if(G.setup && G.setup._inSetup) { return; }

  // Nuclear build mode
  if(G.nuclearMode) {
    const tgt = G.territories[id];
    if(tgt && tgt.owner===G.pf && !tgt.hasNuclear) {
      G.sel = id;
      doAct('nuke');
      G.nuclearMode = false;
      // Re-highlight
      Object.values(G.territories).forEach(t=>{
        const ring=document.getElementById('tr-'+t.id);
        if(ring){ring.setAttribute('stroke',FDATA[t.owner]?FDATA[t.owner].color:'#1a1a20');ring.setAttribute('stroke-width','1.5');}
      });
      return;
    }
  }

  // Missile firing mode
  if(G.missileFiringMode) {
    const tgt = G.territories[id];
    if(!tgt || !tgt.owner || tgt.owner===G.pf) {
      addLog('Selecciona un territorio ENEMIGO para el misil.','sys'); return;
    }
    G.missileFiringMode = false;
    G.sel = id;
    doMissileFire();
    return;
  }

  if(G.dragging) return;

  // Move mode: first click = origin (if not set), second click = destination
  if(G.moveSrc) {
    const src = G.territories[G.moveSrc];
    const dst = G.territories[id];
    if(id === G.moveSrc) { G.moveSrc=null; document.getElementById('map-wrap').classList.remove('moving'); updateMap(); return; }
    if(dst && dst.owner===G.pf && src.adj && src.adj.includes(id)) {
      showMoveUnitsPopup(G.moveSrc, id, event);
    } else {
      addLog(`${id} no es destino válido (debe ser tuyo y adyacente).`,'sys');
    }
    return;
  }
  // If move mode is active and clicking own territory = set as origin
  if(G.moveMode && G.territories[id]?.owner === G.pf && armyPoints(G.territories[id]) > 0) {
    G.moveSrc = id; G.moveTargets = getMovableTargets(id, 3);
    document.getElementById('map-wrap').classList.add('moving');
    addLog(`Origen: ${id}. Ahora clic en territorio destino adyacente.`,'move');
    updateMap();
    return;
  }

  // Combat step logic
  if(G_step && G_step.phase==='combat' && G_step.isMyTurn) {
    const tgt = G.territories[id];
    // If we have an attack source set, clicking enemy = attack
    if(G.attackSrc && tgt && tgt.owner && tgt.owner!==G.pf) {
      const src = G.territories[G.attackSrc];
      if(src && src.adj && src.adj.includes(id)) {
        // Launch attack
        G.sel = G.attackSrc;
        openDice(id);
        return;
      } else {
        addLog('Territorio no adyacente al origen.','sys');
      }
    }
    // Clicking own territory = set as attack source
    if(tgt && tgt.owner===G.pf && armyPoints(tgt)>1) {
      G.attackSrc = id; G.moveTargets=null; selectTerritory(id);
      addLog(`Origen: ${id}. Ahora clic en territorio enemigo adyacente (rojo).`,'sys');
      return;
    }
  }
  selectTerritory(id);
}

function selectTerritory(id) {
  G.sel = id;
  updateMap();
  const t = G.territories[id];
  const fc = t.owner ? FDATA[t.owner] : null;
  const reg = REGIONS.find(r=>r.id===t.region);
  const myF = G.factions[G.pf];

  const det = document.getElementById('tdetail');
  det.className = 'on';
  det.innerHTML = `
    <div class="tbadge ${t.hasNuclear?'tb-nuclear':'tb-r0'}">${t.hasNuclear?'⚡ NUCLEAR COMPLEX':reg.name.toUpperCase()}</div>
    <div style="line-height:1.8;margin-top:3px">
      ${fc?`<div style="color:#888">CONTROL: <span style="color:${fc.color}">${fc.name}</span></div>`:'<div style="color:#2a2a2e">SIN CONTROL</div>'}
      <div style="color:#888">REGIÓN: <span style="color:#777">${reg.name}</span></div>
      ${armyPoints(t)>0?`<div style="color:#888">FUERZA: <span style="color:#888">${armyPoints(t)} AP</span></div>`:''}
    </div>`;

  // Update unit display
  document.getElementById('u-sol-dummy').textContent = t.soldiers || '0';
  document.getElementById('u-mec-dummy').textContent = t.mechs || '0';
  document.getElementById('u-air-dummy').textContent = t.aircraft || '0';
  document.getElementById('u-sco-dummy').textContent = t.scorpions || '0';

  const isOwn = t.owner === G.pf;
  const isEnemy = t.owner && t.owner !== G.pf;
  const isAdj = isAdjOwned(id);

  // Enable action buttons based on phase
  const inPrep = G.phase === 'prep';
  const inCombat = G.phase === 'combat';

  document.getElementById('ba-nuke').disabled = !(inPrep && isOwn && !t.hasNuclear && myF.plutonium >= 5);
  document.getElementById('ba-missile-build').disabled = !(inPrep && myF.missiles < 5 && myF.plutonium >= 1);
  document.getElementById('ba-missile-fire').disabled = !(inPrep && myF.missiles > 0 && isEnemy);
  document.getElementById('ba-attack').disabled = !(inCombat && isEnemy && isAdj);
  document.getElementById('upg-mech').disabled = !(inPrep && isOwn && t.soldiers>=3 && myF.plutonium>=1);
  document.getElementById('upg-air').disabled = !(inPrep && isOwn && t.soldiers>=3 && myF.plutonium>=1 && totalAircraft()<5);
  document.getElementById('upg-sco').disabled = !(inPrep && isOwn && t.mechs>=2 && myF.plutonium>=1);
  updateMissilePips();
}

function totalAircraft() {
  return Object.values(G.territories).filter(t=>t.owner===G.pf).reduce((s,t)=>s+t.aircraft,0);
}

// ── ACTIONS ───────────────────────────────────────────────────
function activateNuclearMode() {
  const myF=G.factions[G.pf];
  if(myF.plutonium<RULES.prep.nuclearBuildCost){addLog('Plutonio insuficiente.','sys');return;}
  G.nuclearMode=true; G.moveMode=false; G.moveSrc=null;
  Object.values(G.territories).forEach(t=>{
    const ring=document.getElementById('tr-'+t.id);
    if(!ring)return;
    if(t.owner===G.pf&&!t.hasNuclear){ring.setAttribute('stroke','#C8A800');ring.setAttribute('stroke-width','2.5');}
    else{ring.setAttribute('stroke',FDATA[t.owner]?FDATA[t.owner].color:'#1a1a20');ring.setAttribute('stroke-width','1.5');}
  });
  addLog('Clic en un territorio tuyo para construir Nuclear Complex.','sys');
}

function doAct(action) {
  const id = G.sel; if(!id) return;
  const t = G.territories[id];
  const myF = G.factions[G.pf];

  if(action==='nuke'){
    if(myF.plutonium < RULES.prep.nuclearBuildCost){
      addLog(`⚠ Plutonio insuficiente (necesitas ${RULES.prep.nuclearBuildCost} Pu).`,'sys'); return;
    }
    if(t.hasNuclear){ addLog('⚠ Ya tiene Nuclear Complex.','sys'); return; }
    myF.plutonium -= RULES.prep.nuclearBuildCost;
    t.hasNuclear = true;
    addLog(`⚡ Nuclear Complex en ${t.id}. −${RULES.prep.nuclearBuildCost} PLU.`,'res');
    markStepDone('nuke'); refreshCards(); selectTerritory(id); updateMap();
  }
  if(action==='mbuild'){ doMissileBuild(); return; } if(action==='__unused_mbuild'){
    myF.plutonium -= 1;
    myF.missiles = Math.min(5, myF.missiles + 1);
    markStepDone('miss'); addLog(`🚀 Misil construido. Stock: ${myF.missiles}/5. −1 PLU.`,'res');
    refreshCards(); selectTerritory(id); updateMap();
  }
  if(action==='mfire'){ doMissileFire(); return; } if(action==='__unused_mfire'){
    // Launch missile at selected enemy territory
    if(myF.missiles < 1 || !t.owner || t.owner===G.pf) return;
    myF.missiles -= 1;
    // Defender intercepts on D6 ≥ 4?
    const intercept = Math.floor(Math.random()*6)+1;
    if(intercept >= 4){
      addLog(`🚀 Misil sobre ${t.name} — INTERCEPTADO (D6=${intercept}).`,'sys');
    } else {
      // Choose target: soldier first (auto-eliminate), then mech D6≥5, air D6=6, scorp D6=6
      let hit = '';
      if(t.soldiers > 0 && armyPoints(t)>1){ t.soldiers--; hit='🪖 Soldado'; }
      else if(t.mechs>0){ const r=Math.floor(Math.random()*6)+1; if(r>=5){ t.mechs--; hit='🤖 Mech('+r+')'; } else hit='🤖 Mech resistió('+r+')';}
      else if(t.aircraft>0){ const r=Math.floor(Math.random()*6)+1; if(r===6){ t.aircraft--; hit='✈ Aircraft('+r+')'; } else hit='✈ Aircraft resistió('+r+')';}
      else if(t.scorpions>0){ const r=Math.floor(Math.random()*6)+1; if(r===6){ t.scorpions--; hit='🦂 Scorpion('+r+')'; } else hit='🦂 Scorpion resistió('+r+')';}
      addLog(`☢ MISIL sobre ${t.name} — ${hit}. Misiles restantes: ${myF.missiles}.`,'combat');
    }
    refreshCards(); selectTerritory(id); updateMap();
  }
  if(action==='attack'){
    if(G.phase !== 'combat') { addLog('Solo puedes atacar en la fase Combat.','sys'); return; }
    // id = currently selected territory (should be enemy target)
    // G.sel = same as id here
    openDice(id);
  }
  if(action==='move-action'){
    G.moveSrc = id; G.moveTargets = getMovableTargets(id, 3);
    document.getElementById('map-wrap').classList.add('moving');
    markStepDone('mov2'); addLog(`Selecciona destino para mover desde ${t.name}. Haz click en el destino.`,'move');
    updateMap();
  }
}

function doUpgrade(type) {
  // Use selected territory, or auto-pick one with enough units
  let id = G.sel;
  const myF = G.factions[G.pf];
  const myTers = Object.values(G.territories).filter(t=>t.owner===G.pf);
  if(!id || G.territories[id]?.owner !== G.pf) {
    // Auto-pick best territory for this upgrade
    if(type==='mech'||type==='air') {
      const best = myTers.filter(t=>t.soldiers>=3).sort((a,b)=>b.soldiers-a.soldiers)[0];
      id = best?.id;
    } else if(type==='sco') {
      const best = myTers.filter(t=>t.mechs>=2).sort((a,b)=>b.mechs-a.mechs)[0];
      id = best?.id;
    }
  }
  if(!id) { addLog('Selecciona un territorio primero.','sys'); return; }
  const t = G.territories[id];
  if(type==='mech'){
    if(t.soldiers<3 || myF.plutonium<1) return;
    t.soldiers-=3; t.mechs+=1; myF.plutonium-=1;
    addLog(`3 Soldados → 1 Mech en ${t.id}. −1 PLU.`,'res');
  }
  if(type==='air'){
    if(t.soldiers<3 || myF.plutonium<1 || totalAircraft()>=5) return;
    t.soldiers-=3; t.aircraft+=1; myF.plutonium-=1;
    addLog(`3 Soldados → 1 Aircraft en ${t.id}. −1 PLU.`,'res');
  }
  if(type==='sco'){
    if(t.mechs<2 || myF.plutonium<1) return;
    t.mechs-=2; t.scorpions+=1; myF.plutonium-=1;
    addLog(`2 Mechs → 1 Scorpion en ${t.id}. −1 PLU.`,'res');
  }
  refreshCards(); selectTerritory(id); updateMap();
}

function updateMissilePips() {
  const myF = G.factions[G.pf];
  const cont = document.getElementById('miss-pips');
  cont.innerHTML = '';
  for(let i=0;i<5;i++){
    const p = document.createElement('div');
    p.className = 'miss-pip' + (i < myF.missiles ? ' full' : '');
    cont.appendChild(p);
  }
}

// ── COMBAT / DICE ─────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════
// COMBAT — iterative with unit selection and retreat
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// COMBAT DICE — interactive for both player and CPU attacks
// ════════════════════════════════════════════════════════════════

// State for current combat
let G_combat = null;

// Called when PLAYER attacks
function openDice(targetId) {
  const srcId=G.sel;
  if(!srcId){addLog('Selecciona tu territorio origen primero','sys');return;}
  const src=G.territories[srcId], tgt=G.territories[targetId];
  if(!src||!tgt||src.owner!==G.pf){addLog('Selecciona tu territorio','sys');return;}
  if(armyPoints(src)===0){addLog('Sin unidades en origen','sys');return;}
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
  openCombatModal(isPlayerDef?'cpu-att-player-def':'cpu-att-cpu-def');
}

function openCombatModal(mode) {
  const Rc=RULES.combat, ctx=G_combat;
  const src=G.territories[ctx.srcId], tgt=G.territories[ctx.targetId];
  const af=FDATA[ctx.attFk]||{name:ctx.attFk,color:'#C8A800'};
  const df=FDATA[ctx.defFk]||{name:ctx.defFk,color:'#4488ff'};

  // Auto-pick best units up to max (no popup selector)
  const attFull=buildPool(src); const defFull=buildPool(tgt);
  const attN=Math.min(attFull.length,Rc.maxAttackDice);
  const defN=Math.min(attN,Rc.maxDefenseDice,defFull.length); // Risk-style
  ctx.attPool=attFull; ctx.defPool=defFull;
  ctx.attSelected=attFull.slice(0,attN);
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

  const rollBtn=document.querySelector('#dmodal .dbtns .dbtn:not(.cx)');
  const cancelBtn=document.querySelector('#dmodal .dbtns .dbtn.cx');
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
  const rollBtn=document.querySelector('#dmodal .dbtns .dbtn:not(.cx)');
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
  const rollBtn=document.querySelector('#dmodal .dbtns .dbtn:not(.cx)');
  const retreatBtn=document.getElementById('btn-retreat');
  const cancelBtn=document.querySelector('#dmodal .dbtns .dbtn.cx');
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
    ctx.attPool=buildPool(src);ctx.defPool=buildPool(tgt);
    const aN=Math.min(ctx.attPool.length,Rc.maxAttackDice);
    const dN=Math.min(aN,Rc.maxDefenseDice,ctx.defPool.length);
    ctx.attSelected=ctx.attPool.slice(0,aN);ctx.defSelected=ctx.defPool.slice(0,dN);
    renderDicePools();
    if(ctx.isPlayerAtt){
      // Player is attacker
      if(rollBtn){rollBtn.textContent='⚄ CONTINUAR ATAQUE';rollBtn.style.display='inline-block';rollBtn.onclick=()=>resolveCombatRound(false);}
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
  addLog('Movidos '+total+' uds: '+srcId+' → '+dstId,'move');
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
  // Clear any combat highlights
  if(G_combat && G_combat.targetId){
    const ring=document.getElementById('tr-'+G_combat.targetId);
    if(ring){ring.setAttribute('stroke','');ring.setAttribute('stroke-width','1.5');ring.setAttribute('filter','');}
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
  addLog(`+${qty} soldados → ${id}. Restantes: ${G.reinforcementMode.left}`, 'res');
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


function updateUI(){ refreshCards(); updatePhaseBanner(G.pf); }

function addLog(msg,type){
  const log=document.getElementById('clog');
  const e=document.createElement('div');
  e.className=`le ${type}`;e.textContent=msg;
  log.insertBefore(e,log.firstChild);
  while(log.children.length>40) log.removeChild(log.lastChild);
}

function flashScreen(){
  const el=document.getElementById('pflash');
  el.style.display='block';setTimeout(()=>el.style.display='none',400);
}

function showRules(){
  alert('FASES:\n1. PREPARACIÓN: Recibe Plutonio (2/Nuclear), recibe soldados (⌊ter/2⌋+⌊ter_región/2⌋+nukes), upgrades (3sol+1PLU→Mech, 3sol+1PLU→Air, 2Mech+1PLU→Scorpion), misiles (1PLU=1misil, max5), construye Nucleares (5PLU)\n2. COMBATE: Ataca territorios adyacentes. Atacante max 5 dados, defensor max 4. Sol=D6, Mech/Air=D12, Scorpion=D20. Empate=defensor gana. Scorpion pierde→Mech, Mech pierde→Sol, Air/Sol pierden→eliminados.\n3. FIN: Reagrupar unidades, Mantenimiento D20 por Nuclear (1=explota)');
}

function showTip(e,id){
  const t=G.territories[id];
  const fc=t.owner?FDATA[t.owner]:null;
  const reg=REGIONS.find(r=>r.id===t.region);
  const tip=document.getElementById('tip');
  tip.innerHTML=`<strong>${t.name}</strong>${reg.name}<br>${fc?`Control: ${fc.name}`:'Sin control'}<br>AP: ${armyPoints(t)}${t.hasNuclear?'<br>⚡ Nuclear Complex':''}`;
  tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY-12)+'px';tip.className='show';
}
function hideTip(){ document.getElementById('tip').className=''; }

// ── LOBBY ──────────────────────────────────────────────────────
let selF=null;
function pickF(el){ document.querySelectorAll('.fp').forEach(e=>e.classList.remove('sel')); el.classList.add('sel'); selF=el.dataset.f; }
function startGame(){
  if(!selF){ alert('Elige una facción.'); return; }
  G.pf=selF;
  G.pname=document.getElementById('pname').value.trim()||'COMANDANTE';
  G.playerCount=parseInt(document.getElementById('pcount').value);
  initGame();
  document.getElementById('lobby').style.display='none';
  document.getElementById('hdr').style.display='flex';
  document.getElementById('main').style.display='grid';
  document.getElementById('rcode').textContent=Math.random().toString(36).slice(2,8).toUpperCase();
  buildMap();
  updateUI();
  addLog(`${G.pname} comanda ${FDATA[G.pf].name}.`,'sys');
  setupPanZoom();
  // Start setup phase (roll dice, claim territories, etc.)
  startSetupPhase();
}

// ── PAN & ZOOM ─────────────────────────────────────────────────
function setupPanZoom(){
  const wrap=document.getElementById('map-wrap');
  const bw=wrap.clientWidth, bh=wrap.clientHeight;
  svgEl.setAttribute('width', bw);
  svgEl.setAttribute('height', bh);
  svgEl.setAttribute('viewBox', '0 0 '+bw+' '+bh);
  const sc=Math.min(bw/1400, bh/787)*0.93;
  G.vscaleMin=sc; G.vscale=sc;
  G.vx=(bw-1400*sc)/2; G.vy=(bh-787*sc)/2;
  updateMap();

  wrap.addEventListener('click',e=>{
    if(G.dragging) return;
    const el=document.elementFromPoint(e.clientX,e.clientY);
    if(!el) return;
    let tid=null;
    for(const [id,g] of Object.entries(pathEls)){
      if(g===el||g.contains(el)){tid=id;break;}
    }
    if(tid) onTerritoryClick(tid,e);
    else{G.sel=null;G.moveSrc=null;wrap.classList.remove('moving');updateMap();}
  });

  let ds=null;
  wrap.addEventListener('mousedown',e=>{G.dragging=false;ds={x:e.clientX-G.vx,y:e.clientY-G.vy};});
  window.addEventListener('mousemove',e=>{
    if(!ds)return;
    const dx=e.clientX-ds.x-G.vx,dy=e.clientY-ds.y-G.vy;
    if(Math.hypot(dx,dy)>5){G.dragging=true;G.vx=e.clientX-ds.x;G.vy=e.clientY-ds.y;updateMap();}
  });
  window.addEventListener('mouseup',()=>{setTimeout(()=>G.dragging=false,50);ds=null;});

  wrap.addEventListener('wheel',e=>{
    e.preventDefault();
    const factor=e.deltaY<0?1.12:0.89;
    const rect=wrap.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const newScale=Math.min(4, Math.max(G.vscaleMin||0.1, G.vscale*factor));
    G.vx=mx-(mx-G.vx)*(newScale/G.vscale);
    G.vy=my-(my-G.vy)*(newScale/G.vscale);
    G.vscale=newScale;
    updateMap();
  },{passive:false});

  window.addEventListener('resize',()=>{
    const bw2=wrap.clientWidth,bh2=wrap.clientHeight;
    svgEl.setAttribute('width',bw2); svgEl.setAttribute('height',bh2);
    svgEl.setAttribute('viewBox','0 0 '+bw2+' '+bh2);
    const sc2=Math.min(bw2/1400,bh2/787)*0.93;
    G.vscaleMin=sc2; G.vscale=sc2;
    G.vx=(bw2-1400*sc2)/2; G.vy=(bh2-787*sc2)/2;
    updateMap();
  });
}

function resetV(){
  const wrap=document.getElementById('map-wrap');
  const bw=wrap.clientWidth,bh=wrap.clientHeight;
  svgEl.setAttribute('width',bw); svgEl.setAttribute('height',bh);
  svgEl.setAttribute('viewBox','0 0 '+bw+' '+bh);
  const sc=Math.min(bw/1400,bh/787)*0.93;
  G.vscaleMin=sc; G.vscale=sc;
  G.vx=(bw-1400*sc)/2; G.vy=(bh-787*sc)/2;
  updateMap();
}

function resetMapView(){ resetV(); }

function zv(f){
  const newScale=Math.min(4,Math.max(G.vscaleMin||0.1,G.vscale*f));
  const wrap=document.getElementById('map-wrap');
  const mx=wrap.clientWidth/2, my=wrap.clientHeight/2;
  G.vx=mx-(mx-G.vx)*(newScale/G.vscale);
  G.vy=my-(my-G.vy)*(newScale/G.vscale);
  G.vscale=newScale;
  updateMap();
}







// Restored from v3
function buildTerritoryData() {
  // We lay out the 60 territories as organic shapes on a 1400x780 SVG
  // Continents visible as dark land masses, ocean as near-black
  // Each region has a distinct tint overlaid on scorched earth texture

  const territories = [];

  // ── NORTH AMERICA (r01) — 6 territories ──
  const na = [
    {id:'na1',name:'Alaska-Canadá',adj:['na2','na3','ru1']},
    {id:'na2',name:'Pacific Coast',adj:['na1','na3','na4','ca1']},
    {id:'na3',name:'Great Plains', adj:['na1','na2','na4','na5']},
    {id:'na4',name:'Eastern USA',  adj:['na2','na3','na5','na6']},
    {id:'na5',name:'Gulf Coast',   adj:['na3','na4','na6','ca1']},
    {id:'na6',name:'Appalachia',   adj:['na4','na5']},
  ];
  // Approximate SVG positions — NA sits left-center of map
  const naPos = [[115,90],[108,155],[175,145],[230,150],[195,215],[260,175]];
  na.forEach((t,i)=>{ territories.push({...t,region:'r01',cx:naPos[i][0],cy:naPos[i][1]}); });

  // ── CENTRAL AMERICA (r02) — 4 territories ──
  const ca = [
    {id:'ca1',name:'México',        adj:['na2','na5','ca2','sa1']},
    {id:'ca2',name:'Centroamérica', adj:['ca1','ca3','sa1']},
    {id:'ca3',name:'Caribe Oeste',  adj:['ca2','ca4','sa1','sa2']},
    {id:'ca4',name:'Caribe Este',   adj:['ca3','sa2']},
  ];
  const caPos = [[175,270],[185,330],[225,320],[265,325]];
  ca.forEach((t,i)=>{ territories.push({...t,region:'r02',cx:caPos[i][0],cy:caPos[i][1]}); });

  // ── SOUTH AMERICA (r03) — 5 territories ──
  const sa = [
    {id:'sa1',name:'Colombia-Venezuela',adj:['ca1','ca2','ca3','sa2','sa3']},
    {id:'sa2',name:'Brasil Norte',adj:['ca3','ca4','sa1','sa3','sa4']},
    {id:'sa3',name:'Brasil Sur',  adj:['sa1','sa2','sa4','sa5']},
    {id:'sa4',name:'Perú-Bolivia',adj:['sa2','sa3','sa5']},
    {id:'sa5',name:'Argentina',   adj:['sa3','sa4']},
  ];
  const saPos = [[230,378],[290,380],[295,450],[235,450],[258,528]];
  sa.forEach((t,i)=>{ territories.push({...t,region:'r03',cx:saPos[i][0],cy:saPos[i][1]}); });

  // ── EUROPE (r04) — 5 territories ──
  const eu = [
    {id:'eu1',name:'Iberia-Francia',adj:['eu2','eu3','af1']},
    {id:'eu2',name:'Bretaña-Norte', adj:['eu1','eu3']},
    {id:'eu3',name:'Europa Central',adj:['eu1','eu2','eu4','eu5','ru1']},
    {id:'eu4',name:'Balcanes',      adj:['eu3','eu5','af1','me1']},
    {id:'eu5',name:'Escandinavia',  adj:['eu2','eu3','eu4','ru1']},
  ];
  const euPos = [[540,175],[510,120],[595,145],[615,210],[620,100]];
  eu.forEach((t,i)=>{ territories.push({...t,region:'r04',cx:euPos[i][0],cy:euPos[i][1]}); });

  // ── RUSSIA (r05) — 6 territories ──
  const ru = [
    {id:'ru1',name:'Russia Oeste',adj:['eu3','eu5','na1','ru2','ru3','as1']},
    {id:'ru2',name:'Siberia Cent',adj:['ru1','ru3','ru4','as1','as2']},
    {id:'ru3',name:'Ural',        adj:['ru1','ru2','ru4','as1']},
    {id:'ru4',name:'Siberia Este',adj:['ru2','ru3','ru5','as2','as3']},
    {id:'ru5',name:'Far East',    adj:['ru4','ru6','as3','as4']},
    {id:'ru6',name:'Kamchatka',   adj:['ru5','as4','na1']},
  ];
  const ruPos = [[700,120],[790,105],[740,175],[860,105],[960,115],[1020,105]];
  ru.forEach((t,i)=>{ territories.push({...t,region:'r05',cx:ruPos[i][0],cy:ruPos[i][1]}); });

  // ── MIDDLE EAST (r06) — 4 territories ──
  const me = [
    {id:'me1',name:'Anatolia-Levante',adj:['eu4','me2','me3','af1','ru1']},
    {id:'me2',name:'Arabia',          adj:['me1','me3','me4','af2']},
    {id:'me3',name:'Persia-Iraq',     adj:['me1','me2','me4','as1']},
    {id:'me4',name:'Asia Central Sur',adj:['me2','me3','as1','as2']},
  ];
  const mePos = [[680,210],[695,285],[740,250],[790,250]];
  me.forEach((t,i)=>{ territories.push({...t,region:'r06',cx:mePos[i][0],cy:mePos[i][1]}); });

  // ── AFRICA WEST (r07) — 5 territories ──
  const aw = [
    {id:'af1',name:'Magreb',      adj:['eu1','eu4','me1','af2','af3','af5']},
    {id:'af2',name:'Sahara',      adj:['af1','me2','af3','af4','af5']},
    {id:'af3',name:'África Oeste',adj:['af1','af2','af4','af5']},
    {id:'af4',name:'África Cent', adj:['af2','af3','af5','af6','af7']},
    {id:'af5',name:'Nigeria',     adj:['af1','af2','af3','af4','af6']},
  ];
  const awPos = [[605,228],[638,290],[573,315],[620,365],[572,370]];
  aw.forEach((t,i)=>{ territories.push({...t,region:'r07',cx:awPos[i][0],cy:awPos[i][1]}); });

  // ── AFRICA EAST (r08) — 5 territories ──
  const ae = [
    {id:'af6',name:'Cuerno de África',adj:['af4','af5','me2','af7','af8']},
    {id:'af7',name:'África Este',     adj:['af4','af6','af8','af9']},
    {id:'af8',name:'África Sur-E',    adj:['af6','af7','af9','af10']},
    {id:'af9',name:'África Sur-O',    adj:['af4','af7','af8','af10']},
    {id:'af10',name:'Sudáfrica',      adj:['af8','af9','an1']},
  ];
  const aePos = [[672,315],[673,385],[680,460],[620,460],[646,530]];
  ae.forEach((t,i)=>{ territories.push({...t,region:'r08',cx:aePos[i][0],cy:aePos[i][1]}); });

  // ── ASIA (r09) — 6 territories ──
  const as = [
    {id:'as1',name:'India',        adj:['me3','me4','ru1','ru3','as2','as3','se1']},
    {id:'as2',name:'China Norte',  adj:['ru2','ru4','me4','as1','as3','as4']},
    {id:'as3',name:'China Sur',    adj:['as1','as2','as4','se1','se2']},
    {id:'as4',name:'Manchuria',    adj:['ru4','ru5','as2','as3','as5']},
    {id:'as5',name:'Japón-Corea',  adj:['ru5','as4']},
    {id:'as6',name:'Mongolia',     adj:['ru2','ru3','ru4','as2','me4']},
  ];
  const asPos = [[840,285],[895,215],[905,305],[975,210],[1035,225],[860,175]];
  as.forEach((t,i)=>{ territories.push({...t,region:'r09',cx:asPos[i][0],cy:asPos[i][1]}); });

  // ── SOUTHEAST ASIA (r10) — 4 territories ──
  const se = [
    {id:'se1',name:'Indochina',adj:['as1','as3','se2','se3','oc1']},
    {id:'se2',name:'Indonesia', adj:['se1','se3','se4','oc1','oc2']},
    {id:'se3',name:'Filipinas', adj:['as3','as5','se1','se2','se4']},
    {id:'se4',name:'Micronesia',adj:['se2','se3','oc2','oc3']},
  ];
  const sePos = [[965,340],[990,415],[1040,345],[1075,380]];
  se.forEach((t,i)=>{ territories.push({...t,region:'r10',cx:sePos[i][0],cy:sePos[i][1]}); });

  // ── OCEANIA (r11) — 5 territories ──
  const oc = [
    {id:'oc1',name:'Australia Norte',adj:['se1','se2','oc2','oc3']},
    {id:'oc2',name:'Australia Oeste',adj:['se2','oc1','oc3','oc4']},
    {id:'oc3',name:'Australia Este', adj:['se4','oc1','oc2','oc4','oc5']},
    {id:'oc4',name:'Australia Sur',  adj:['oc2','oc3','oc5']},
    {id:'oc5',name:'Nueva Zelanda',  adj:['oc3','oc4','an2']},
  ];
  const ocPos = [[1035,450],[975,490],[1065,490],[1020,545],[1105,540]];
  oc.forEach((t,i)=>{ territories.push({...t,region:'r11',cx:ocPos[i][0],cy:ocPos[i][1]}); });

  // ── ANTARCTICA (r12) — 5 territories (connected in pairs) ──
  const an = [
    {id:'an1',name:'Antártida Af', adj:['af10','an2']},
    {id:'an2',name:'Antártida SA', adj:['sa5','an1','an3']},
    {id:'an3',name:'Antártida Oc', adj:['an2','an4','oc5']},
    {id:'an4',name:'Antártida As', adj:['an3','an5']},
    {id:'an5',name:'Antártida Pa', adj:['an4']},
  ];
  const anPos = [[640,640],[410,660],[700,670],[820,660],[950,650]];
  an.forEach((t,i)=>{ territories.push({...t,region:'r12',cx:anPos[i][0],cy:anPos[i][1]}); });

  return territories;
}

function cpuTurns() {
  Object.keys(G.factions).filter(k=>k!==G.pf&&G.factions[k].alive).forEach(key=>{
    // Simple CPU: expand into adjacent unclaimed
    const owned=Object.values(G.territories).filter(t=>t.owner===key&&t.soldiers>1);
    owned.forEach(src=>{
      const adjEmpty=src.adj.filter(aid=>{const a=G.territories[aid];return a&&!a.owner;});
      if(adjEmpty.length&&Math.random()>.5){
        const dst=G.territories[adjEmpty[0]];
        dst.owner=key; dst.soldiers=1; src.soldiers--;
      }
    });
    // Collect plutonium
    const nukes=Object.values(G.territories).filter(t=>t.owner===key&&t.hasNuclear).length;
    G.factions[key].plutonium+=nukes*2;
  });
}


const VICTORY_DETAIL_FULL = {
  imp: 'PAX AUGUSTA:\n• Controla 5 regiones completas al inicio de tu turno\n• O controla 30 territorios al inicio de tu turno\nHabilidad: +1 al dado más bajo en defensa',
  lib: 'TOTAL BLACKOUT:\n• 6 regiones sin Nuclear Complex en el tablero\n• O 4 regiones sin Nuclear + eliminar ejército Erebus\nHabilidad: al destruir Nuclear propio: +5 Pu +5 Soldados',
  clt: 'THE GREAT OFFERING:\n• Conquista 10 territorios Y elimina 1 ejército en el mismo turno\n• O conquista 1 Nuclear de cada enemigo en el mismo turno\nHabilidad: +1 al dado más bajo en ataque',
  erb: 'EQUATION ZERO:\n• Elimina 2 ejércitos completos\n• O elimina 1 ejército Y tienes más Pu que el resto juntos\nHabilidad: coloca refuerzos en cualquier territorio',
  prm: 'TERRAFORMATION:\n• Nuclear en 7 regiones distintas\n• O el doble de Nucleares que el segundo jugador\nHabilidad: +1 Pu extra por cada 2 Nucleares',
  shn: 'GENETIC SUPREMACY:\n• Mayor ejército (AP) en 6 regiones distintas\n• O el doble de AP que el segundo jugador\nHabilidad: +1 soldado extra por cada 2 Nucleares',
};


let G_combat = null;

const VICTORY_DETAIL_FULL = {
  imp: 'PAX AUGUSTA:\n• Controla 5 regiones completas al inicio de tu turno\n• O controla 30 territorios al inicio de tu turno\nHabilidad: +1 al dado más bajo en defensa',
  lib: 'TOTAL BLACKOUT:\n• 6 regiones sin Nuclear Complex en el tablero\n• O 4 regiones sin Nuclear + eliminar ejército Erebus\nHabilidad: al destruir Nuclear propio: +5 Pu +5 Soldados',
  clt: 'THE GREAT OFFERING:\n• Conquista 10 territorios Y elimina 1 ejército en el mismo turno\n• O conquista 1 Nuclear de cada enemigo en el mismo turno\nHabilidad: +1 al dado más bajo en ataque',
  erb: 'EQUATION ZERO:\n• Elimina 2 ejércitos completos\n• O elimina 1 ejército Y tienes más Pu que el resto juntos\nHabilidad: coloca refuerzos en cualquier territorio',
  prm: 'TERRAFORMATION:\n• Nuclear en 7 regiones distintas\n• O el doble de Nucleares que el segundo jugador\nHabilidad: +1 Pu extra por cada 2 Nucleares',
  shn: 'GENETIC SUPREMACY:\n• Mayor ejército (AP) en 6 regiones distintas\n• O el doble de AP que el segundo jugador\nHabilidad: +1 soldado extra por cada 2 Nucleares',
};
