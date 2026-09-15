const SETUP_STEPS = ['roll', 'claim', 'soldiers', 'nuclear'];
// Options: 'roll' | 'claim' | 'soldiers' | 'nuclear'

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
  const barMode = document.getElementById('setup-bar-mode');
  
  if(mode === 'bar') {
    rollMode.style.display = 'none';
    barMode.style.display = 'flex';
    document.getElementById('setup-bar-title').textContent = title;
    document.getElementById('setup-bar-info').innerHTML = info;
    document.getElementById('setup-bar-actions').innerHTML = '';
    document.getElementById('setup-bar-log').textContent = '';
  } else {
    rollMode.style.display = 'flex';
    barMode.style.display = 'none';
    document.getElementById('setup-title').textContent = title;
    document.getElementById('setup-info').innerHTML = info;
    document.getElementById('setup-rolls').innerHTML = '';
    document.getElementById('setup-actions').innerHTML = '';
  }
}

function hideSetupPanel() {
  document.getElementById('setup-panel').style.display = 'none';
}

function startSetupPhase() {
  // Always include player's chosen faction; fill rest with CPU factions
  const allFkeys = Object.keys(FDATA);
  const cpuFkeys = allFkeys.filter(k => k !== G.pf).slice(0, G.playerCount - 1);
  const fkeys = [G.pf, ...cpuFkeys]; // player first, then CPUs
  G.setup.order = fkeys;
  G.setup.orderIdx = 0;
  G.setup.rollResults = {};
  G.setup.claimRound = 0;
  G.setup._tieGroups = null;
  G.setup._posStart = {};
  G.setup._inSetup = true;
  // Init soldiers/nukes tracking
  fkeys.forEach(fk => {
    G.setup.soldiersLeft[fk] = G.factions[fk].soldiers;
    G.setup.nukesLeft[fk] = fk === 'lib' ? 0 : G.factions[fk].nukes;
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
  refreshCards(); // update turn order dots now that order may be set
  runSetupStep((G.setup._stepIdx||0) + 1);
}

// ── STEP: Roll D6 — determine turn order ────────────────────────
function setupStep_Roll() {
  G.setup.rollResults = {};
  showSetupPanel('ROLL D6 — DETERMINE ORDER',
    'Each faction rolls a D6. Highest goes first. Ties re-roll.<br>Click each faction to roll, or use Auto.');

  const rollsDiv = document.getElementById('setup-rolls');
  G.setup.order.forEach(fk => {
    const fd = FDATA[fk];
    const card = document.createElement('div');
    card.id = 'roll-card-'+fk;
    card.style.cssText = `border:1px solid #222;padding:10px 14px;cursor:pointer;min-width:80px;
      text-align:center;transition:border-color 0.3s;`;
    card.innerHTML = `<div style="font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1px;
      color:${fd.color};margin-bottom:8px;">${fd.name.toUpperCase()}</div>
      <div id="roll-result-${fk}" style="font-size:30px;font-family:Orbitron,sans-serif;color:#999;">?</div>`;
    card.onclick = () => rollFor(fk);
    rollsDiv.appendChild(card);
  });

  const acts = document.getElementById('setup-actions');
  const rollAllBtn = setupBtn('ROLL ALL', () => {
    G.setup.order.forEach(fk => { if(G.setup.rollResults[fk]===undefined) rollFor(fk); });
  }, '#555');
  rollAllBtn.id = 'roll-all-btn';
  acts.appendChild(rollAllBtn);
}

function rollFor(fk) {
  if(G.setup.rollResults[fk] !== undefined) return;
  const roll = Math.floor(Math.random()*6)+1;
  G.setup.rollResults[fk] = roll;
  const el = document.getElementById('roll-result-'+fk);
  if(el){ el.textContent = roll; el.style.color = '#fff'; }
  const card = document.getElementById('roll-card-'+fk);
  if(card) card.style.borderColor = FDATA[fk].color;
  setupLog(`${FDATA[fk].name}: ${roll}`);
  // Hide ROLL ALL button once any die is rolled
  const rollAllBtn = document.getElementById('roll-all-btn');
  if(rollAllBtn) rollAllBtn.style.display = 'none';
  // Check if all rolled
  const rolled = G.setup.order.filter(fk2 => G.setup.rollResults[fk2] !== undefined);
  if(rolled.length === G.setup.order.length) {
    setTimeout(resolveRollOrder, 600);
  }
}

function resolveRollOrder() {
  const results = G.setup.rollResults;

  // G.setup._tieGroups: array of arrays — each inner array is a group of factions
  // competing for a specific position range. Initialized on first call.
  if(!G.setup._tieGroups) {
    // First resolution: every faction is in one big group
    G.setup._tieGroups = [G.setup.order.slice()];
    G.setup._posStart = {};
    G.setup.order.forEach((fk,i) => G.setup._posStart[fk] = i+1);
  }

  // Check each group independently
  const groupColors = ['#ffdd00','#ff8800','#ff44ff','#44ffff','#ff4444','#44ff88'];
  let anyPending = false;
  const newTieGroups = [];

  // Resolve each current group
  G.setup._tieGroups.forEach((grp, gi) => {
    // Check if all in this group have rolled
    const rolledInGrp = grp.filter(fk => results[fk] !== undefined);
    if(rolledInGrp.length < grp.length) {
      // Still waiting for some to roll
      newTieGroups.push(grp);
      anyPending = true;
      return;
    }

    // All rolled — check for ties WITHIN this group
    const byValGrp = {};
    grp.forEach(fk => {
      const v = results[fk];
      if(!byValGrp[v]) byValGrp[v] = [];
      byValGrp[v].push(fk);
    });

    const subTies = Object.values(byValGrp).filter(g => g.length > 1);
    if(subTies.length > 0) {
      // Sub-ties within this group — delete their results and re-add as new groups
      // Sort the values to assign positions correctly
      const vals = Object.keys(byValGrp).map(Number).sort((a,b)=>b-a);
      let pos = G.setup._posStart[grp[0]] || 1;
      vals.forEach(v => {
        const subGrp = byValGrp[v];
        subGrp.forEach(fk => G.setup._posStart[fk] = pos);
        if(subGrp.length > 1) {
          subGrp.forEach(fk => { delete results[fk]; });
          newTieGroups.push(subGrp);
          anyPending = true;
        }
        pos += subGrp.length;
      });
    } else {
      // No ties in this group — sort and assign final positions
      const sorted = grp.slice().sort((a,b) => results[b]-results[a]);
      let pos = G.setup._posStart[grp[0]] || 1;
      sorted.forEach(fk => { G.setup._posStart[fk] = pos++; });
      // This group is done — no need to re-add
    }
  });

  G.setup._tieGroups = newTieGroups;

  if(anyPending) {
    // Show re-roll UI for pending groups
    let infoHtml = '<div style="margin-bottom:8px;color:#888;font-size:10px;">Re-roll required:</div>';
    newTieGroups.forEach((grp, gi) => {
      const col = groupColors[gi % groupColors.length];
      const startPos = G.setup._posStart[grp[0]];
      const endPos = startPos + grp.length - 1;
      const posLabel = startPos === endPos ? `Position ${startPos}` : `Positions ${startPos}-${endPos}`;
      infoHtml +=
        `<div style="margin:6px 0;padding:6px 10px;border-left:3px solid ${col};">` +
        `<span style="color:${col};font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:1px;">🎲 ${posLabel}</span><br>` +
        grp.map(fk=>`<span style="color:${FDATA[fk].color};margin-right:8px;">${FDATA[fk].name}</span>`).join('') +
        `</div>`;
    });
    document.getElementById('setup-info').innerHTML = infoHtml;

    const pendingFks = newTieGroups.flat();
    G.setup.order.forEach(fk => {
      const card = document.getElementById('roll-card-'+fk);
      const el = document.getElementById('roll-result-'+fk);
      const grpIdx = newTieGroups.findIndex(g => g.includes(fk));
      if(grpIdx >= 0) {
        if(el){ el.textContent='?'; el.style.color='#333'; }
        if(card){
          const col = groupColors[grpIdx % groupColors.length];
          card.style.borderColor = col;
          card.style.boxShadow = `0 0 6px ${col}44`;
          card.style.cursor = 'pointer';
          card.style.opacity = '1';
        }
      } else {
        if(card){ card.style.opacity='0.35'; card.style.cursor='default'; card.style.boxShadow='none'; }
      }
    });
    return;
  }

  // All groups resolved — build final order from _posStart
  const sorted = G.setup.order.slice().sort((a,b) => G.setup._posStart[a] - G.setup._posStart[b]);
  G.setup.order = sorted;
  G.setup.orderIdx = 0;
  G.setup._tieGroups = null;

  document.getElementById('setup-info').innerHTML =
    `<div style="margin-bottom:10px;color:#C8A800;letter-spacing:2px;font-size:10px;">FINAL ORDER</div>` +
    sorted.map((fk,i) =>
      `<div style="margin:5px 0;display:flex;align-items:center;gap:8px;">` +
      `<span style="color:#777;font-size:18px;font-family:Orbitron,sans-serif;width:20px;">${i+1}</span>` +
      `<span style="color:${FDATA[fk].color};font-family:Orbitron,sans-serif;font-size:12px;letter-spacing:1px;">${FDATA[fk].name}</span>` +
      `<span style="color:#999;font-size:10px;">rolled ${results[fk]}</span></div>`
    ).join('');

  const acts2 = document.getElementById('setup-actions');
  acts2.innerHTML = '';
  acts2.appendChild(setupBtn('CONTINUE ▶', nextSetupStep, '#C8A800'));
}

function setupStep_Claim() {
  // Turn off all LEDs initially — they light up as territories are claimed
  Object.values(G.territories).forEach(t => {
    const led = document.getElementById('led-'+t.id);
    const glow = document.getElementById('glow-'+t.id);
    if(led) led.setAttribute('opacity','0');
    if(glow) glow.setAttribute('opacity','0');
  });

  G.setup.orderIdx = 0;
  setupStep_Claim_Next();
}

function setupStep_Claim_Next() {
  const unclaimed = Object.values(G.territories).filter(t=>!t.owner);
  if(unclaimed.length === 0) { nextSetupStep(); return; }

  const fk = G.setup.order[G.setup.orderIdx % G.setup.order.length];
  const fd = FDATA[fk];
  const isPlayer = fk === G.pf;

  showSetupPanel('TERRITORY CLAIMING',
    `<span style="color:${fd.color}">${fd.name}</span> — pick territory · Unclaimed: <b>${unclaimed.length}</b>`,
    'bar');

  // Highlight unclaimed — static gold border, no animation
  unclaimed.forEach(t => {
    const ring = document.getElementById('tr-'+t.id);
    if(ring){
      ring.setAttribute('stroke','#C8A800');
      ring.setAttribute('stroke-width','2');
      ring.style.animation = 'none';
      ring.style.transition = 'none';
    }
  });

  if(isPlayer) {
    G.setup.claimCallback = (id) => {
      const t = G.territories[id];
      if(t.owner) return false;
      doClaimTerritory(fk, id);
      return true;
    };
  } else {
    // CPU picks random unclaimed territory
    const pick = unclaimed[Math.floor(Math.random()*unclaimed.length)];
    setTimeout(() => doClaimTerritory(fk, pick.id), 350);
  }

  const acts = getSetupActionsDiv();
  acts.innerHTML = '';
  acts.appendChild(setupBtn('AUTO-CLAIM ALL', autoClaimAll, '#444'));
}

function doClaimTerritory(fk, id) {
  G.setup.claimCallback = null;
  // Remove all claim highlights statically before processing
  Object.values(G.territories).forEach(t => {
    const ring = document.getElementById('tr-'+t.id);
    if(ring){ ring.style.animation='none'; ring.style.transition='none'; }
  });
  const t = G.territories[id];
  t.owner = fk;
  t.soldiers = 1;
  G.factions[fk].soldiers = Math.max(0, G.factions[fk].soldiers-1);
  G.setup.soldiersLeft[fk] = Math.max(0, (G.setup.soldiersLeft[fk]||0)-1);
  setupLog(`${FDATA[fk].name} → ${id}`);

  // Clear highlights, light up the LED of claimed territory
  Object.values(G.territories).filter(tt=>!tt.owner).forEach(tt => {
    const ring = document.getElementById('tr-'+tt.id);
    if(ring){ ring.setAttribute('stroke','#1a1a20'); ring.setAttribute('stroke-width','1.5'); }
  });
  // Light up LED for claimed territory
  const led = document.getElementById('led-'+id);
  const glow = document.getElementById('glow-'+id);
  if(led){ led.setAttribute('opacity','0.95'); led.setAttribute('fill', FDATA[fk].color); }
  if(glow){ glow.setAttribute('opacity','0.25'); glow.setAttribute('stroke', FDATA[fk].color); }

  updateMap();
  G.setup.orderIdx++;
  setTimeout(setupStep_Claim_Next, 150);
}

function autoClaimAll() {
  G.setup.claimCallback = null;
  const unclaimed = Object.values(G.territories).filter(t=>!t.owner);
  const shuffled = [...unclaimed].sort(()=>Math.random()-.5);
  let i = G.setup.orderIdx;
  shuffled.forEach(t => {
    const fk = G.setup.order[i % G.setup.order.length];
    t.owner = fk; t.soldiers = 1;
    G.factions[fk].soldiers = Math.max(0, G.factions[fk].soldiers-1);
    G.setup.soldiersLeft[fk] = Math.max(0, (G.setup.soldiersLeft[fk]||0)-1);
    i++;
  });
  updateMap();
  nextSetupStep();
}

// ── STEP: Distribute soldiers ─────────────────────────────────────
function setupStep_PlaceSoldiers() {
  G.setup.orderIdx = 0;
  setupStep_Soldiers_Next();
}

function setupStep_Soldiers_Next() {
  // Find next faction with soldiers to place
  for(let i=0; i<G.setup.order.length; i++){
    const idx = (G.setup.orderIdx + i) % G.setup.order.length;
    const fk = G.setup.order[idx];
    if((G.setup.soldiersLeft[fk]||0) > 0){
      G.setup.orderIdx = idx;
      setupStep_Soldiers_ForFaction(fk);
      return;
    }
  }
  nextSetupStep(); // all done
}

function setupStep_Soldiers_ForFaction(fk) {
  const fd = FDATA[fk];
  const left = G.setup.soldiersLeft[fk]||0;
  const myTers = Object.values(G.territories).filter(t=>t.owner===fk);
  const validTers = myTers; // setup: free placement in any owned territory
  const note = 'Place soldiers freely in any of your territories.';

  showSetupPanel('DISTRIBUTE SOLDIERS',
    `<span style="color:${fd.color}">${fd.name}</span> — place <b>${left}</b> soldier(s) · ${note}`,
    'bar');

  if(fk === G.pf) {
    validTers.forEach(t => {
      const ring = document.getElementById('tr-'+t.id);
      if(ring){ ring.setAttribute('stroke','#44ff88'); ring.setAttribute('stroke-width','2.5'); }
    });
    G.setup.claimCallback = (id, evt) => {
      const t = G.territories[id];
      if(t.owner !== fk) return false;
      // Setup: any owned territory is valid
      showSoldierCounter(fk, id, validTers, evt); return true;
    };
    const acts = getSetupActionsDiv();
    acts.innerHTML='';
    acts.appendChild(setupBtn('AUTO-DISTRIBUTE ALL', autoDistributeAll, '#444'));
  } else {
    // CPU distributes evenly
    let n = left;
    for(let s=0;s<n;s++){
      const pick=validTers[s%validTers.length]; if(pick) pick.soldiers++;
    }
    G.setup.soldiersLeft[fk]=0;
    G.factions[fk].soldiers=0;
    updateMap();
    G.setup.orderIdx=(G.setup.orderIdx+1)%G.setup.order.length;
    setTimeout(setupStep_Soldiers_Next, 200);
  }
}


function showSoldierCounter(fk, id, validTers, evt) {
  const t = G.territories[id];
  const maxAdd = G.setup.soldiersLeft[fk]||0;
  if(maxAdd === 0) return;

  // Remove any existing counter
  const existing = document.getElementById('soldier-counter-popup');
  if(existing) existing.remove();

  // Position near click
  let popX, popY;
  if(evt && evt.clientX) {
    popX = Math.min(evt.clientX - 70, window.innerWidth - 160);
    popY = Math.max(evt.clientY - 130, 10);
  } else {
    const mapWrap = document.getElementById('map-wrap');
    const mRect = mapWrap ? mapWrap.getBoundingClientRect() : {left:300,top:50,width:900};
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
  title.textContent = 'PLACE SOLDIERS';

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px;';

  const btnMinus = document.createElement('button');
  btnMinus.textContent = '−';
  btnMinus.style.cssText = 'background:#111;border:1px solid #333;color:#fff;width:28px;height:28px;cursor:pointer;font-size:16px;line-height:1;';

  const qtyEl = document.createElement('span');
  qtyEl.style.cssText = 'font-size:22px;color:#fff;min-width:32px;display:inline-block;text-align:center;';
  qtyEl.textContent = qty;

  const btnPlus = document.createElement('button');
  btnPlus.textContent = '+';
  btnPlus.style.cssText = 'background:#111;border:1px solid #333;color:#fff;width:28px;height:28px;cursor:pointer;font-size:16px;line-height:1;';

  const maxEl = document.createElement('div');
  maxEl.style.cssText = 'font-size:10px;color:#777;margin-bottom:10px;';
  maxEl.textContent = `available: ${maxAdd}`;

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:6px;';

  const btnOk = document.createElement('button');
  btnOk.textContent = '✓ OK';
  btnOk.style.cssText = `background:#0a0a0d;border:1px solid ${FDATA[fk].color};color:${FDATA[fk].color};
    padding:5px 12px;font-family:Orbitron,sans-serif;font-size:10px;cursor:pointer;flex:1;`;

  const btnX = document.createElement('button');
  btnX.textContent = '✕';
  btnX.style.cssText = 'background:#0a0a0d;border:1px solid #333;color:#888;padding:5px 8px;cursor:pointer;font-size:10px;';

  btnMinus.onclick = (e) => { e.stopPropagation(); if(qty>1){qty--; qtyEl.textContent=qty;} };
  btnPlus.onclick  = (e) => { e.stopPropagation(); if(qty<maxAdd){qty++; qtyEl.textContent=qty;} };
  btnX.onclick     = (e) => { e.stopPropagation(); popup.remove(); };
  btnOk.onclick    = (e) => { e.stopPropagation(); popup.remove(); doPlaceSoldier(fk, id, qty); };

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
  G.territories[id].soldiers += qty;
  G.setup.soldiersLeft[fk] = Math.max(0,(G.setup.soldiersLeft[fk]||0)-qty);
  G.factions[fk].soldiers = Math.max(0, G.factions[fk].soldiers-qty);
  setupLog(`${FDATA[fk].name} +${qty} sol → ${id} (${G.setup.soldiersLeft[fk]} left)`);
  updateMap();
  // Clear highlights
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
    const vt=Object.values(G.territories).filter(t=>t.owner===fk2&&t.hasNuclear);
    const vt2=vt.length>0?vt:Object.values(G.territories).filter(t=>t.owner===fk2);
    for(let s=0;s<n;s++){const p=vt2[s%vt2.length];if(p)p.soldiers++;}
    G.setup.soldiersLeft[fk2]=0;
    G.factions[fk2].soldiers=0;
  });
  updateMap(); nextSetupStep();
}

// ── STEP: Place Nuclear Complexes ─────────────────────────────────
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
  const fd=FDATA[fk];
  const left=G.setup.nukesLeft[fk]||0;
  const myTers=Object.values(G.territories).filter(t=>t.owner===fk&&!t.hasNuclear);

  showSetupPanel('PLACE NUCLEAR COMPLEXES',
    `<span style="color:${fd.color}">${fd.name}</span> — place <b>${left}</b> Nuclear Complex(es) · Click your territory`,
    'bar');

  if(fk===G.pf){
    myTers.forEach(t=>{
      const ring=document.getElementById('tr-'+t.id);
      if(ring){ring.setAttribute('stroke','#ffff00');ring.setAttribute('stroke-width','2.5');}
    });
    G.setup.claimCallback=(id)=>{
      const t=G.territories[id];
      if(t.owner!==fk||t.hasNuclear) return false;
      doPlaceNuclear(fk,id); return true;
    };
    const acts=getSetupActionsDiv();
    acts.innerHTML='';
    acts.appendChild(setupBtn('AUTO-PLACE ALL NUKES', autoPlaceNukes, '#444'));
  } else {
    const pick=myTers[Math.floor(Math.random()*myTers.length)];
    if(pick) setTimeout(()=>doPlaceNuclear(fk,pick.id),300);
    else { G.setup.nukesLeft[fk]=0; G.setup.orderIdx++; setTimeout(setupStep_Nuclear_Next,100); }
  }
}

function doPlaceNuclear(fk,id){
  G.setup.claimCallback=null;
  G.territories[id].hasNuclear=true;
  G.setup.nukesLeft[fk]--;
  setupLog(`${FDATA[fk].name} ☢ → ${id}`);
  updateMap();
  Object.values(G.territories).filter(t=>t.owner===fk).forEach(t2=>{
    const ring=document.getElementById('tr-'+t2.id);
    if(ring){ring.setAttribute('stroke',FDATA[fk].color);ring.setAttribute('stroke-width','1.5');}
  });
  G.setup.claimCallback=null;
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

// ── END SETUP ─────────────────────────────────────────────────────
function endSetupPhase(){
  hideSetupPanel();
  G.setup.claimCallback=null;
  G.setup._inSetup=false;
  G.phase='prep'; G.round=1;
  G.currentFaction=G.setup.order[0];
  document.getElementById('rnum').textContent=G.round;
  startPhaseProgress();
  updateMap();

  // Big "GAME START" announcement overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.85);
    display:flex;align-items:center;justify-content:center;`;
  overlay.innerHTML = `
    <div style="text-align:center;">
      <div style="font-family:Orbitron,sans-serif;font-size:48px;letter-spacing:12px;
        color:#C8A800;text-shadow:0 0 40px #C8A800aa;margin-bottom:20px;">
        GAME START
      </div>
      <div style="font-size:14px;color:#888;letter-spacing:4px;margin-bottom:30px;">
        ARMAGEDDON PROTOCOL INITIATED
      </div>
      <div style="font-size:11px;color:#888;margin-bottom:8px;">Turn order:</div>
      <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:30px;">
        ${G.setup.order.map((fk,i)=>
          `<span style="font-family:Orbitron,sans-serif;color:${FDATA[fk].color};font-size:11px;">
            ${i+1}. ${FDATA[fk].name}
          </span>`
        ).join('')}
      </div>
      <button onclick="this.parentElement.parentElement.remove();runPrepPhase();addLog('☢ Game begins!','sys');refreshCards();updateFactionPanel();"
        style="background:#0a0a0d;border:1px solid #C8A800;color:#C8A800;padding:12px 32px;
        font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:3px;cursor:pointer;">
        BEGIN ▶
      </button>
    </div>`;
  document.body.appendChild(overlay);
  startPhase('prep', G.setup.order[0]||G.pf);
  refreshCards();
  updateFactionPanel();
}


