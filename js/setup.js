const SETUP_STEPS = ['roll', 'claim', 'soldiers', 'nuclear'];

function setupLog(msg) {
  const el = document.getElementById('setup-log');
  if(el){ el.innerHTML += msg + '<br>'; el.scrollTop=9999; }
  const barEl = document.getElementById('setup-bar-log');
  if(barEl && document.getElementById('setup-bar-mode').style.display !== 'none') {
    barEl.textContent = msg;
  }
}

function setupBtn(label, onclick, color) {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = onclick;
  b.style.cssText = `background:#0a0a0d;border:1px solid ${color||'#C8A800'};color:${color||'#C8A800'};
    padding:6px 12px;font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:2px;cursor:pointer;`;
  return b;
}

function getSetupActionsDiv() {
  const barMode = document.getElementById('setup-bar-mode');
  if(barMode && barMode.style.display !== 'none') return document.getElementById('setup-bar-actions');
  return document.getElementById('setup-actions');
}

function setupBarLog(msg) {
  const el = document.getElementById('setup-bar-log');
  if(el) el.textContent = msg;
  setupLog(msg);
}

function showSetupPanel(title, info, mode) {
  const p = document.getElementById('setup-panel');
  p.style.display = 'block';
  const rollMode = document.getElementById('setup-roll-mode');
  const barMode  = document.getElementById('setup-bar-mode');
  if(mode === 'bar') {
    rollMode.style.display = 'none';
    barMode.style.display  = 'flex';
    document.getElementById('setup-bar-title').textContent = title;
    document.getElementById('setup-bar-info').innerHTML    = info;
    document.getElementById('setup-bar-actions').innerHTML = '';
    document.getElementById('setup-bar-log').textContent   = '';
  } else {
    rollMode.style.display = 'flex';
    barMode.style.display  = 'none';
    document.getElementById('setup-title').textContent  = title;
    document.getElementById('setup-info').innerHTML     = info;
    document.getElementById('setup-rolls').innerHTML    = '';
    document.getElementById('setup-actions').innerHTML  = '';
  }
}

function hideSetupPanel() {
  document.getElementById('setup-panel').style.display = 'none';
}

// ── Determine which factions are human players ───────────────
// In online mode: factions that have a userId in meta.players
// In local mode: only G.pf is human
let _onlinePlayerFactions = null; // set when game starts online

function isHumanFaction(fk) {
  if (_onlinePlayerFactions) return _onlinePlayerFactions.has(fk);
  return fk === G.pf;
}

function isMyFaction(fk) {
  return fk === G.pf;
}

// ── Start setup ───────────────────────────────────────────────
function startSetupPhase() {
  const allFkeys = Object.keys(FDATA);

  if (typeof ONLINE !== 'undefined' && ONLINE.isOnline()) {
    // Online: use factions from the room players
    // _onlinePlayerFactions populated by _launchOnlineGame
    const humanFks = _onlinePlayerFactions
      ? [..._onlinePlayerFactions]
      : [G.pf];
    // Fill remaining slots with CPU factions
    const cpuFks = allFkeys
      .filter(k => !humanFks.includes(k))
      .slice(0, G.playerCount - humanFks.length);
    G.setup.order = [...humanFks, ...cpuFks];
  } else {
    // Local: player first, then CPUs
    const cpuFkeys = allFkeys.filter(k => k !== G.pf).slice(0, G.playerCount - 1);
    G.setup.order = [G.pf, ...cpuFkeys];
  }

  G.setup.orderIdx   = 0;
  G.setup.rollResults = {};
  G.setup.claimRound  = 0;
  G.setup._tieGroups  = null;
  G.setup._posStart   = {};
  G.setup._inSetup    = true;
  G.setup.soldiersLeft = {};
  G.setup.nukesLeft    = {};

  G.setup.order.forEach(fk => {
    G.setup.soldiersLeft[fk] = G.factions[fk].soldiers;
    G.setup.nukesLeft[fk]    = fk === 'lib' ? 0 : G.factions[fk].nukes;
  });
  runSetupStep(0);
}

function runSetupStep(stepIdx) {
  if(stepIdx >= SETUP_STEPS.length) { endSetupPhase(); return; }
  G.setup._stepIdx = stepIdx;
  const step = SETUP_STEPS[stepIdx];
  if(step === 'roll')     setupStep_Roll();
  else if(step === 'claim')    setupStep_Claim();
  else if(step === 'soldiers') setupStep_PlaceSoldiers();
  else if(step === 'nuclear')  setupStep_PlaceNuclears();
}

function nextSetupStep() {
  refreshCards();
  runSetupStep((G.setup._stepIdx||0) + 1);
}

// ════════════════════════════════════════════════════════════════
//  STEP: ROLL D6
//  Online: each human player sees ONLY their own die.
//          When all humans have rolled, results appear for all.
//  Local:  same as before.
// ════════════════════════════════════════════════════════════════
function setupStep_Roll() {
  G.setup.rollResults = {};
  const isOnline = typeof ONLINE !== 'undefined' && ONLINE.isOnline();

  if (isOnline) {
    _setupRoll_Online();
  } else {
    _setupRoll_Local();
  }
}

// ── Online roll UI ────────────────────────────────────────────
function _setupRoll_Online() {
  showSetupPanel('ROLL D6 — DETERMINA EL ORDEN',
    'Tira tu dado para determinar el orden de turno.');

  const rollsDiv = document.getElementById('setup-rolls');
  rollsDiv.innerHTML = '';

  // Show ONLY player's own die
  const myCard = document.createElement('div');
  myCard.id = 'roll-card-' + G.pf;
  const fd = FDATA[G.pf];
  myCard.style.cssText = `border:1px solid #333;padding:20px 30px;cursor:pointer;
    text-align:center;transition:border-color 0.3s;min-width:120px;`;
  myCard.innerHTML = `
    <div style="font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:2px;
      color:${fd.color};margin-bottom:12px;">${fd.name}</div>
    <div id="roll-result-${G.pf}" style="font-size:48px;font-family:Orbitron,sans-serif;color:#333;">?</div>
    <div style="font-size:9px;color:#555;margin-top:8px;letter-spacing:2px;">CLICK PARA TIRAR</div>`;
  myCard.onclick = () => rollFor(G.pf);
  rollsDiv.appendChild(myCard);

  // Waiting indicators for other human players
  const otherHumans = G.setup.order.filter(fk => isHumanFaction(fk) && fk !== G.pf);
  if (otherHumans.length) {
    const waitDiv = document.createElement('div');
    waitDiv.id = 'roll-waiting';
    waitDiv.style.cssText = 'margin-top:16px;font-size:10px;color:#555;letter-spacing:2px;';
    waitDiv.innerHTML = 'ESPERANDO: ' + otherHumans.map(fk =>
      `<span id="roll-wait-${fk}" style="color:${FDATA[fk].color};margin-right:10px;">
        ${FDATA[fk].name} ⏳</span>`
    ).join('');
    rollsDiv.appendChild(waitDiv);
  }
}

// ── Local roll UI (original) ──────────────────────────────────
function _setupRoll_Local() {
  showSetupPanel('ROLL D6 — DETERMINA EL ORDEN',
    'Cada facción tira un D6. El mayor va primero. Empates repiten.');

  const rollsDiv = document.getElementById('setup-rolls');
  G.setup.order.forEach(fk => {
    const fd = FDATA[fk];
    const card = document.createElement('div');
    card.id = 'roll-card-'+fk;
    card.style.cssText = `border:1px solid #222;padding:10px 14px;cursor:pointer;min-width:80px;
      text-align:center;transition:border-color 0.3s;`;
    card.innerHTML = `
      <div style="font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1px;
        color:${fd.color};margin-bottom:8px;">${fd.name}</div>
      <div id="roll-result-${fk}" style="font-size:30px;font-family:Orbitron,sans-serif;color:#999;">?</div>`;
    card.onclick = () => rollFor(fk);
    rollsDiv.appendChild(card);
  });

  const acts = document.getElementById('setup-actions');
  const rollAllBtn = setupBtn('TIRAR TODOS', () => {
    G.setup.order.forEach(fk => { if(G.setup.rollResults[fk]===undefined) rollFor(fk); });
  }, '#555');
  rollAllBtn.id = 'roll-all-btn';
  acts.appendChild(rollAllBtn);
}

// ── Roll for a faction ────────────────────────────────────────
function rollFor(fk) {
  if(G.setup.rollResults[fk] !== undefined) return;
  // Only allow rolling your own faction online
  if (typeof ONLINE !== 'undefined' && ONLINE.isOnline() && fk !== G.pf) return;

  const roll = Math.floor(Math.random()*6)+1;
  _applyRoll(fk, roll);

  // Publish online
  if (typeof ONLINE !== 'undefined' && ONLINE.isOnline()) {
    ONLINE.pushAction('SETUP_ROLL', { fk, roll });
  }
}

// ── Apply a roll result (local + remote) ──────────────────────
function _applyRoll(fk, roll) {
  if(G.setup.rollResults[fk] !== undefined) return;
  G.setup.rollResults[fk] = roll;
  setupLog(`${FDATA[fk].name}: ${roll}`);

  const isOnline = typeof ONLINE !== 'undefined' && ONLINE.isOnline();

  if (isOnline) {
    // Update waiting indicator
    const waitEl = document.getElementById('roll-wait-' + fk);
    if (waitEl) {
      waitEl.innerHTML = `${FDATA[fk].name} ✓ <span style="color:#fff;">${roll}</span>`;
    }
    // Update own card if it's mine
    if (fk === G.pf) {
      const el = document.getElementById('roll-result-' + fk);
      if (el) { el.textContent = roll; el.style.color = '#fff'; }
      const card = document.getElementById('roll-card-' + fk);
      if (card) { card.style.borderColor = FDATA[fk].color; card.style.cursor = 'default'; }
    }
  } else {
    const el = document.getElementById('roll-result-'+fk);
    if(el){ el.textContent = roll; el.style.color = '#fff'; }
    const card = document.getElementById('roll-card-'+fk);
    if(card) card.style.borderColor = FDATA[fk].color;
    // Hide ROLL ALL btn
    const b = document.getElementById('roll-all-btn');
    if(b) b.style.display='none';
  }

  // Auto-roll CPU factions
  G.setup.order.forEach(fk2 => {
    if (!isHumanFaction(fk2) && G.setup.rollResults[fk2] === undefined) {
      setTimeout(() => {
        const cpuRoll = Math.floor(Math.random()*6)+1;
        _applyRoll(fk2, cpuRoll);
      }, 300 + Math.random()*400);
    }
  });

  // Check if all have rolled
  const allRolled = G.setup.order.every(fk2 => G.setup.rollResults[fk2] !== undefined);
  if (allRolled) {
    setTimeout(resolveRollOrder, 800);
  }
}

// ── Remote roll handler (called by online.js) ─────────────────
function _onRemoteRoll(fk, roll) {
  _applyRoll(fk, roll);
}

function resolveRollOrder() {
  const results = G.setup.rollResults;

  if(!G.setup._tieGroups) {
    G.setup._tieGroups = [G.setup.order.slice()];
    G.setup._posStart  = {};
    G.setup.order.forEach((fk,i) => G.setup._posStart[fk] = i+1);
  }

  const groupColors = ['#ffdd00','#ff8800','#ff44ff','#44ffff','#ff4444','#44ff88'];
  let anyPending = false;
  const newTieGroups = [];

  G.setup._tieGroups.forEach((grp, gi) => {
    const rolledInGrp = grp.filter(fk => results[fk] !== undefined);
    if(rolledInGrp.length < grp.length) {
      newTieGroups.push(grp); anyPending = true; return;
    }
    const byValGrp = {};
    grp.forEach(fk => {
      const v = results[fk];
      if(!byValGrp[v]) byValGrp[v] = [];
      byValGrp[v].push(fk);
    });
    const subTies = Object.values(byValGrp).filter(g => g.length > 1);
    if(subTies.length > 0) {
      const vals = Object.keys(byValGrp).map(Number).sort((a,b)=>b-a);
      let pos = G.setup._posStart[grp[0]] || 1;
      vals.forEach(v => {
        const subGrp = byValGrp[v];
        subGrp.forEach(fk => G.setup._posStart[fk] = pos);
        if(subGrp.length > 1) {
          subGrp.forEach(fk => { delete results[fk]; });
          newTieGroups.push(subGrp); anyPending = true;
        }
        pos += subGrp.length;
      });
    } else {
      const sorted = grp.slice().sort((a,b) => results[b]-results[a]);
      let pos = G.setup._posStart[grp[0]] || 1;
      sorted.forEach(fk => { G.setup._posStart[fk] = pos++; });
    }
  });

  G.setup._tieGroups = newTieGroups;

  if(anyPending) {
    // Show re-roll UI
    const isOnline = typeof ONLINE !== 'undefined' && ONLINE.isOnline();
    let infoHtml = '<div style="margin-bottom:8px;color:#888;font-size:10px;">Re-roll requerido:</div>';
    newTieGroups.forEach((grp, gi) => {
      const col = groupColors[gi % groupColors.length];
      const startPos = G.setup._posStart[grp[0]];
      const endPos   = startPos + grp.length - 1;
      const posLabel = startPos === endPos ? `Posición ${startPos}` : `Posiciones ${startPos}-${endPos}`;
      infoHtml += `<div style="margin:6px 0;padding:6px 10px;border-left:3px solid ${col};">
        <span style="color:${col};font-family:Orbitron,sans-serif;font-size:11px;">🎲 ${posLabel}</span><br>
        ${grp.map(fk=>`<span style="color:${FDATA[fk].color};margin-right:8px;">${FDATA[fk].name}</span>`).join('')}
        </div>`;
    });
    document.getElementById('setup-info').innerHTML = infoHtml;

    if (isOnline) {
      // Online: show only own die if in pending group
      const rollsDiv = document.getElementById('setup-rolls');
      rollsDiv.innerHTML = '';
      const myGroup = newTieGroups.find(g => g.includes(G.pf));
      if (myGroup) {
        const fd = FDATA[G.pf];
        const card = document.createElement('div');
        card.id = 'roll-card-' + G.pf;
        card.style.cssText = `border:1px solid ${groupColors[newTieGroups.indexOf(myGroup)%groupColors.length]};
          padding:20px 30px;cursor:pointer;text-align:center;min-width:120px;`;
        card.innerHTML = `
          <div style="font-family:Orbitron,sans-serif;font-size:11px;color:${fd.color};margin-bottom:12px;">${fd.name}</div>
          <div id="roll-result-${G.pf}" style="font-size:48px;font-family:Orbitron,sans-serif;color:#333;">?</div>
          <div style="font-size:9px;color:#555;margin-top:8px;letter-spacing:2px;">CLICK PARA RE-TIRAR</div>`;
        card.onclick = () => rollFor(G.pf);
        rollsDiv.appendChild(card);

        // Waiting for others in same group
        myGroup.filter(fk => fk !== G.pf && isHumanFaction(fk)).forEach(fk => {
          const w = document.createElement('span');
          w.id = 'roll-wait-' + fk;
          w.style.cssText = `color:${FDATA[fk].color};margin-left:10px;font-size:10px;`;
          w.textContent = FDATA[fk].name + ' ⏳';
          rollsDiv.appendChild(w);
        });
      } else {
        rollsDiv.innerHTML = `<div style="color:#888;font-size:11px;letter-spacing:2px;">
          Esperando re-tirada de otros jugadores...</div>`;
      }
    } else {
      G.setup.order.forEach(fk => {
        const card = document.getElementById('roll-card-'+fk);
        const el   = document.getElementById('roll-result-'+fk);
        const grpIdx = newTieGroups.findIndex(g => g.includes(fk));
        if(grpIdx >= 0) {
          if(el){ el.textContent='?'; el.style.color='#333'; }
          if(card){
            const col = groupColors[grpIdx%groupColors.length];
            card.style.borderColor=col; card.style.cursor='pointer'; card.style.opacity='1';
          }
        } else {
          if(card){ card.style.opacity='0.35'; card.style.cursor='default'; }
        }
      });
    }
    return;
  }

  // All resolved — build final order
  const sorted = G.setup.order.slice().sort((a,b) => G.setup._posStart[a]-G.setup._posStart[b]);
  G.setup.order    = sorted;
  G.setup.orderIdx = 0;
  G.setup._tieGroups = null;

  document.getElementById('setup-info').innerHTML =
    `<div style="margin-bottom:10px;color:#C8A800;letter-spacing:2px;font-size:10px;">ORDEN FINAL</div>` +
    sorted.map((fk,i) =>
      `<div style="margin:5px 0;display:flex;align-items:center;gap:8px;">
        <span style="color:#777;font-size:18px;width:20px;">${i+1}</span>
        <span style="color:${FDATA[fk].color};font-family:Orbitron,sans-serif;font-size:12px;">${FDATA[fk].name}</span>
        <span style="color:#999;font-size:10px;">tiró ${results[fk]}</span>
      </div>`
    ).join('');

  const acts2 = document.getElementById('setup-actions');
  acts2.innerHTML = '';
  acts2.appendChild(setupBtn('CONTINUAR ▶', nextSetupStep, '#C8A800'));
}

// ════════════════════════════════════════════════════════════════
//  STEP: CLAIM TERRITORIES
// ════════════════════════════════════════════════════════════════
function setupStep_Claim() {
  G.setup.orderIdx = 0;
  setupStep_Claim_Next();
}

function setupStep_Claim_Next() {
  const unclaimed = Object.values(G.territories).filter(t=>!t.owner);
  if(unclaimed.length === 0) { nextSetupStep(); return; }

  const fk       = G.setup.order[G.setup.orderIdx % G.setup.order.length];
  const fd       = FDATA[fk];
  const isMe     = isMyFaction(fk);
  const isHuman  = isHumanFaction(fk);

  showSetupPanel('RECLAMAR TERRITORIOS',
    `<span style="color:${fd.color}">${fd.name}</span>${isMe?' (TÚ)':isHuman?' (jugador)':' (CPU)'} — Sin reclamar: <b>${unclaimed.length}</b>`,
    'bar');

  // Highlight unclaimed
  unclaimed.forEach(t => {
    const ring = document.getElementById('tr-'+t.id);
    if(ring){ ring.setAttribute('stroke','#C8A800'); ring.setAttribute('stroke-width','2'); }
  });

  if(isMe) {
    // It's my turn to claim
    G.setup.claimCallback = (id) => {
      const t = G.territories[id];
      if(t.owner) return false;
      doClaimTerritory(fk, id);
      // Publish online
      if (typeof ONLINE !== 'undefined' && ONLINE.isOnline()) {
        ONLINE.pushAction('SETUP_CLAIM', { fk, terId: id });
      }
      return true;
    };
    const acts = getSetupActionsDiv();
    acts.innerHTML = '';
    acts.appendChild(setupBtn('AUTO-RECLAMAR TODO', () => {
      if (typeof ONLINE !== 'undefined' && ONLINE.isOnline()) {
        ONLINE.pushAction('SETUP_AUTOCLAIM', {});
      }
      autoClaimAll();
    }, '#444'));
  } else if(isHuman) {
    // Another human player's turn — wait for their action
    G.setup.claimCallback = null;
    const acts = getSetupActionsDiv();
    acts.innerHTML = '';
    setupBarLog(`Esperando a ${fd.name}...`);
  } else {
    // CPU
    G.setup.claimCallback = null;
    const pick = unclaimed[Math.floor(Math.random()*unclaimed.length)];
    setTimeout(() => doClaimTerritory(fk, pick.id), 350);
  }
}

function doClaimTerritory(fk, id) {
  G.setup.claimCallback = null;
  const t = G.territories[id];
  if(!t || t.owner) return; // already claimed
  t.owner = fk; t.soldiers = 1;
  G.factions[fk].soldiers   = Math.max(0, G.factions[fk].soldiers-1);
  G.setup.soldiersLeft[fk]  = Math.max(0, (G.setup.soldiersLeft[fk]||0)-1);
  setupLog(`${FDATA[fk].name} → ${id}`);

  // Clear highlights
  Object.values(G.territories).filter(tt=>!tt.owner).forEach(tt => {
    const ring = document.getElementById('tr-'+tt.id);
    if(ring){ ring.setAttribute('stroke','#1a1a20'); ring.setAttribute('stroke-width','1.5'); }
  });
  updateMap();
  G.setup.orderIdx++;
  setTimeout(setupStep_Claim_Next, 150);
}

function autoClaimAll() {
  G.setup.claimCallback = null;
  const unclaimed = Object.values(G.territories).filter(t=>!t.owner);
  const shuffled  = [...unclaimed].sort(()=>Math.random()-.5);
  let i = G.setup.orderIdx;
  shuffled.forEach(t => {
    const fk = G.setup.order[i % G.setup.order.length];
    t.owner = fk; t.soldiers = 1;
    G.factions[fk].soldiers  = Math.max(0, G.factions[fk].soldiers-1);
    G.setup.soldiersLeft[fk] = Math.max(0, (G.setup.soldiersLeft[fk]||0)-1);
    i++;
  });
  updateMap();
  nextSetupStep();
}

// ════════════════════════════════════════════════════════════════
//  STEP: PLACE SOLDIERS
// ════════════════════════════════════════════════════════════════
function setupStep_PlaceSoldiers() {
  G.setup.orderIdx = 0;
  setupStep_Soldiers_Next();
}

function setupStep_Soldiers_Next() {
  for(let i=0; i<G.setup.order.length; i++){
    const idx = (G.setup.orderIdx + i) % G.setup.order.length;
    const fk  = G.setup.order[idx];
    if((G.setup.soldiersLeft[fk]||0) > 0){
      G.setup.orderIdx = idx;
      setupStep_Soldiers_ForFaction(fk);
      return;
    }
  }
  nextSetupStep();
}

function setupStep_Soldiers_ForFaction(fk) {
  const fd       = FDATA[fk];
  const left     = G.setup.soldiersLeft[fk]||0;
  const myTers   = Object.values(G.territories).filter(t=>t.owner===fk);
  const isMe     = isMyFaction(fk);
  const isHuman  = isHumanFaction(fk);

  showSetupPanel('DISTRIBUIR SOLDADOS',
    `<span style="color:${fd.color}">${fd.name}</span>${isMe?' (TÚ)':isHuman?' (jugador)':''} — coloca <b>${left}</b> soldado(s)`,
    'bar');

  if(isMe) {
    myTers.forEach(t => {
      const ring = document.getElementById('tr-'+t.id);
      if(ring){ ring.setAttribute('stroke','#44ff88'); ring.setAttribute('stroke-width','2.5'); }
    });
    G.setup.claimCallback = (id, evt) => {
      const t = G.territories[id];
      if(t.owner !== fk) return false;
      showSoldierCounter(fk, id, myTers, evt);
      return true;
    };
    const acts = getSetupActionsDiv();
    acts.innerHTML = '';
    acts.appendChild(setupBtn('AUTO-DISTRIBUIR TODO', () => {
      if (typeof ONLINE !== 'undefined' && ONLINE.isOnline()) {
        ONLINE.pushAction('SETUP_AUTODISTRIBUTE', {});
      }
      autoDistributeAll();
    }, '#444'));
  } else if(isHuman) {
    G.setup.claimCallback = null;
    const acts = getSetupActionsDiv();
    acts.innerHTML = '';
    setupBarLog(`Esperando a ${fd.name}...`);
  } else {
    // CPU
    const n = left;
    for(let s=0;s<n;s++){
      const pick = myTers[s%myTers.length]; if(pick) pick.soldiers++;
    }
    G.setup.soldiersLeft[fk] = 0;
    G.factions[fk].soldiers  = 0;
    updateMap();
    G.setup.orderIdx = (G.setup.orderIdx+1) % G.setup.order.length;
    setTimeout(setupStep_Soldiers_Next, 200);
  }
}

function showSoldierCounter(fk, id, validTers, evt) {
  const maxAdd = G.setup.soldiersLeft[fk]||0;
  if(maxAdd === 0) return;
  const existing = document.getElementById('soldier-counter-popup');
  if(existing) existing.remove();

  let popX, popY;
  if(evt && evt.clientX) {
    popX = Math.min(evt.clientX-70, window.innerWidth-160);
    popY = Math.max(evt.clientY-130, 10);
  } else {
    const mRect = document.getElementById('map-wrap').getBoundingClientRect();
    popX = mRect.left + mRect.width/2 - 70;
    popY = mRect.top + 60;
  }

  const popup = document.createElement('div');
  popup.id = 'soldier-counter-popup';
  popup.style.cssText = `position:fixed;left:${popX}px;top:${popY}px;
    background:#08080b;border:1px solid ${FDATA[fk].color};padding:12px 16px;z-index:700;
    font-family:Orbitron,sans-serif;text-align:center;min-width:130px;`;

  let qty = 1;
  const title = document.createElement('div');
  title.style.cssText = `font-size:10px;letter-spacing:2px;color:${FDATA[fk].color};margin-bottom:8px;`;
  title.textContent = 'COLOCAR SOLDADOS';

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px;';
  const btnMinus = document.createElement('button');
  btnMinus.textContent='−';
  btnMinus.style.cssText='background:#111;border:1px solid #333;color:#fff;width:28px;height:28px;cursor:pointer;font-size:16px;';
  const qtyEl = document.createElement('span');
  qtyEl.style.cssText='font-size:22px;color:#fff;min-width:32px;display:inline-block;text-align:center;';
  qtyEl.textContent = qty;
  const btnPlus = document.createElement('button');
  btnPlus.textContent='+';
  btnPlus.style.cssText='background:#111;border:1px solid #333;color:#fff;width:28px;height:28px;cursor:pointer;font-size:16px;';
  const maxEl = document.createElement('div');
  maxEl.style.cssText='font-size:10px;color:#777;margin-bottom:10px;';
  maxEl.textContent=`disponibles: ${maxAdd}`;

  const btnRow = document.createElement('div');
  btnRow.style.cssText='display:flex;gap:6px;';
  const btnOk = document.createElement('button');
  btnOk.textContent='✓ OK';
  btnOk.style.cssText=`background:#0a0a0d;border:1px solid ${FDATA[fk].color};color:${FDATA[fk].color};
    padding:5px 12px;font-family:Orbitron,sans-serif;font-size:10px;cursor:pointer;flex:1;`;
  const btnX = document.createElement('button');
  btnX.textContent='✕';
  btnX.style.cssText='background:#0a0a0d;border:1px solid #333;color:#888;padding:5px 8px;cursor:pointer;font-size:10px;';

  btnMinus.onclick=(e)=>{e.stopPropagation();if(qty>1){qty--;qtyEl.textContent=qty;}};
  btnPlus.onclick =(e)=>{e.stopPropagation();if(qty<maxAdd){qty++;qtyEl.textContent=qty;}};
  btnX.onclick    =(e)=>{e.stopPropagation();popup.remove();};
  btnOk.onclick   =(e)=>{
    e.stopPropagation();
    popup.remove();
    // Publish before applying (so remote gets it)
    if (typeof ONLINE !== 'undefined' && ONLINE.isOnline()) {
      ONLINE.pushAction('SETUP_SOLDIER', { fk, terId: id, qty });
    }
    doPlaceSoldier(fk, id, qty);
  };

  row.appendChild(btnMinus); row.appendChild(qtyEl); row.appendChild(btnPlus);
  btnRow.appendChild(btnOk); btnRow.appendChild(btnX);
  popup.appendChild(title); popup.appendChild(row);
  popup.appendChild(maxEl); popup.appendChild(btnRow);
  document.body.appendChild(popup);
}

function doPlaceSoldier(fk, id, qty) {
  G.setup.claimCallback = null;
  const existing2 = document.getElementById('soldier-counter-popup');
  if(existing2) existing2.remove();
  qty = Math.min(qty, G.setup.soldiersLeft[fk]||0);
  G.territories[id].soldiers     += qty;
  G.setup.soldiersLeft[fk]        = Math.max(0,(G.setup.soldiersLeft[fk]||0)-qty);
  G.factions[fk].soldiers         = Math.max(0, G.factions[fk].soldiers-qty);
  setupLog(`${FDATA[fk].name} +${qty} sol → ${id} (${G.setup.soldiersLeft[fk]} left)`);
  updateMap();
  Object.values(G.territories).filter(t=>t.owner===fk).forEach(t2=>{
    const ring=document.getElementById('tr-'+t2.id);
    if(ring){ring.setAttribute('stroke',FDATA[fk].color);ring.setAttribute('stroke-width','1.5');}
  });
  if(G.setup.soldiersLeft[fk]>0){
    setTimeout(()=>setupStep_Soldiers_ForFaction(fk),100);
  } else {
    G.setup.orderIdx=(G.setup.orderIdx+1)%G.setup.order.length;
    setTimeout(setupStep_Soldiers_Next,200);
  }
}

function autoDistributeAll() {
  G.setup.claimCallback=null;
  G.setup.order.forEach(fk2=>{
    const n=G.setup.soldiersLeft[fk2]||0;
    const vt=Object.values(G.territories).filter(t=>t.owner===fk2);
    for(let s=0;s<n;s++){const p=vt[s%vt.length];if(p)p.soldiers++;}
    G.setup.soldiersLeft[fk2]=0;
    G.factions[fk2].soldiers=0;
  });
  updateMap(); nextSetupStep();
}

// ════════════════════════════════════════════════════════════════
//  STEP: PLACE NUCLEAR COMPLEXES
// ════════════════════════════════════════════════════════════════
function setupStep_PlaceNuclears() {
  G.setup.orderIdx = 0;
  setupStep_Nuclear_Next();
}

function setupStep_Nuclear_Next() {
  for(let i=0;i<G.setup.order.length;i++){
    const idx=(G.setup.orderIdx+i)%G.setup.order.length;
    const fk=G.setup.order[idx];
    if((G.setup.nukesLeft[fk]||0)>0){
      G.setup.orderIdx=idx;
      setupStep_Nuclear_ForFaction(fk); return;
    }
  }
  nextSetupStep();
}

function setupStep_Nuclear_ForFaction(fk) {
  const fd      = FDATA[fk];
  const left    = G.setup.nukesLeft[fk]||0;
  const myTers  = Object.values(G.territories).filter(t=>t.owner===fk&&!t.hasNuclear);
  const isMe    = isMyFaction(fk);
  const isHuman = isHumanFaction(fk);

  showSetupPanel('COLOCAR NUCLEAR COMPLEXES',
    `<span style="color:${fd.color}">${fd.name}</span>${isMe?' (TÚ)':isHuman?' (jugador)':''} — coloca <b>${left}</b> Nuclear Complex(es)`,
    'bar');

  if(isMe){
    myTers.forEach(t=>{
      const ring=document.getElementById('tr-'+t.id);
      if(ring){ring.setAttribute('stroke','#ffff00');ring.setAttribute('stroke-width','2.5');}
    });
    G.setup.claimCallback=(id)=>{
      const t=G.territories[id];
      if(t.owner!==fk||t.hasNuclear) return false;
      // Publish before applying
      if (typeof ONLINE !== 'undefined' && ONLINE.isOnline()) {
        ONLINE.pushAction('SETUP_NUCLEAR', { fk, terId: id });
      }
      doPlaceNuclear(fk,id); return true;
    };
    const acts=getSetupActionsDiv();
    acts.innerHTML='';
    acts.appendChild(setupBtn('AUTO-COLOCAR NUKES', ()=>{
      if (typeof ONLINE !== 'undefined' && ONLINE.isOnline()) {
        ONLINE.pushAction('SETUP_AUTONUKES', {});
      }
      autoPlaceNukes();
    }, '#444'));
  } else if(isHuman){
    G.setup.claimCallback = null;
    const acts = getSetupActionsDiv();
    acts.innerHTML='';
    setupBarLog(`Esperando a ${fd.name}...`);
  } else {
    const pick=myTers[Math.floor(Math.random()*myTers.length)];
    if(pick) setTimeout(()=>doPlaceNuclear(fk,pick.id),300);
    else { G.setup.nukesLeft[fk]=0; G.setup.orderIdx++; setTimeout(setupStep_Nuclear_Next,100); }
  }
}

function doPlaceNuclear(fk,id){
  G.setup.claimCallback=null;
  const t = G.territories[id];
  if(!t || t.hasNuclear) return;
  t.hasNuclear=true;
  G.setup.nukesLeft[fk]--;
  setupLog(`${FDATA[fk].name} ☢ → ${id}`);
  updateMap();
  Object.values(G.territories).filter(t=>t.owner===fk).forEach(t2=>{
    const ring=document.getElementById('tr-'+t2.id);
    if(ring){ring.setAttribute('stroke',FDATA[fk].color);ring.setAttribute('stroke-width','1.5');}
  });
  if(G.setup.nukesLeft[fk]>0){
    setTimeout(()=>setupStep_Nuclear_ForFaction(fk),100);
  } else {
    G.setup.orderIdx=(G.setup.orderIdx+1)%G.setup.order.length;
    setTimeout(setupStep_Nuclear_Next,200);
  }
}

function autoPlaceNukes(){
  G.setup.claimCallback=null;
  G.setup.order.forEach(fk2=>{
    let n=G.setup.nukesLeft[fk2]||0;
    const myT=Object.values(G.territories).filter(t=>t.owner===fk2&&!t.hasNuclear);
    myT.slice(0,n).forEach(t=>{t.hasNuclear=true;});
    G.setup.nukesLeft[fk2]=0;
  });
  updateMap(); nextSetupStep();
}

// ════════════════════════════════════════════════════════════════
//  END SETUP
// ════════════════════════════════════════════════════════════════
function endSetupPhase(){
  hideSetupPanel();
  G.setup.claimCallback=null;
  G.setup._inSetup=false;
  G.phase='prep'; G.round=1;
  G.currentFaction=G.setup.order[0];
  document.getElementById('rnum').textContent=G.round;
  startPhaseProgress();
  updateMap();

  const overlay = document.createElement('div');
  overlay.style.cssText=`position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.85);
    display:flex;align-items:center;justify-content:center;`;
  overlay.innerHTML=`
    <div style="text-align:center;">
      <div style="font-family:Orbitron,sans-serif;font-size:48px;letter-spacing:12px;
        color:#C8A800;text-shadow:0 0 40px #C8A800aa;margin-bottom:20px;">GAME START</div>
      <div style="font-size:14px;color:#888;letter-spacing:4px;margin-bottom:30px;">
        ARMAGEDDON PROTOCOL INITIATED</div>
      <div style="font-size:11px;color:#888;margin-bottom:8px;">Orden de turno:</div>
      <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:30px;">
        ${G.setup.order.map((fk,i)=>
          `<span style="font-family:Orbitron,sans-serif;color:${FDATA[fk].color};font-size:11px;">
            ${i+1}. ${FDATA[fk].name}</span>`
        ).join('')}
      </div>
      <button onclick="this.parentElement.parentElement.remove();runPrepPhase();addLog('☢ ¡Comienza el juego!','sys');refreshCards();updateFactionPanel();"
        style="background:#0a0a0d;border:1px solid #C8A800;color:#C8A800;padding:12px 32px;
        font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:3px;cursor:pointer;">
        COMENZAR ▶
      </button>
    </div>`;
  document.body.appendChild(overlay);
  startPhase('prep', G.setup.order[0]||G.pf);
  refreshCards();
  updateFactionPanel();
}
