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
  const ex = document.getElementById('rules-modal');
  if(ex){ ex.remove(); return; }

  const R = RULES;
  const modal = document.createElement('div');
  modal.id = 'rules-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:2000;display:flex;align-items:center;justify-content:center;padding:12px;';
  modal.onclick = e=>{ if(e.target===modal) modal.remove(); };

  function inp(path, w='60px') {
    const val = path.split('.').reduce((o,k)=>o&&o[k], R);
    return `<input type="number" value="${val||0}"
      style="background:#0a0a0d;border:1px solid #333;color:#C8A800;width:${w};padding:3px 6px;font-family:Orbitron,sans-serif;font-size:10px;text-align:right;"
      onchange="setRule('${path}',+this.value)">`;
  }
  function chk(path) {
    const val = path.split('.').reduce((o,k)=>o&&o[k], R);
    return `<input type="checkbox" ${val?'checked':''} style="width:16px;height:16px;cursor:pointer;" onchange="setRule('${path}',this.checked)">`;
  }
  function row(label, path, type='num') {
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #0e0e12;">
      <span style="font-size:10px;color:#888;">${label}</span>
      ${type==='chk' ? chk(path) : inp(path)}
    </div>`;
  }
  function sec(t) { return `<div style="font-family:Orbitron,sans-serif;font-size:8px;letter-spacing:3px;color:#C8A800;margin:12px 0 4px;padding-bottom:4px;border-bottom:1px solid #C8A80033;">${t}</div>`; }

  // Phase order editors - drag/text based
  function phaseOrderEditor(phasesArr, idPrefix) {
    return phasesArr.map((p,i)=>`
      <div style="display:flex;align-items:center;gap:6px;margin:3px 0;">
        <span style="font-family:Orbitron,sans-serif;font-size:8px;color:#555;width:14px;">${i+1}.</span>
        <span style="font-size:10px;color:#888;flex:1;">${p.label||p}</span>
      </div>`).join('');
  }

  // Build starting assets for each player count
  const assetRows = [3,4,5,6].map(n => {
    const a = R.setup.startingAssets[n];
    return `<tr>
      <td style="font-size:10px;color:#888;padding:3px 6px;">${n}J</td>
      <td style="padding:2px;"><input type="number" value="${a.soldiers}" style="width:45px;background:#0a0a0d;border:1px solid #333;color:#C8A800;font-size:10px;padding:2px;" onchange="setRule('setup.startingAssets.${n}.soldiers',+this.value)"></td>
      <td style="padding:2px;"><input type="number" value="${a.mechs||0}" style="width:45px;background:#0a0a0d;border:1px solid #333;color:#C8A800;font-size:10px;padding:2px;" onchange="setRule('setup.startingAssets.${n}.mechs',+this.value)"></td>
      <td style="padding:2px;"><input type="number" value="${a.missiles}" style="width:45px;background:#0a0a0d;border:1px solid #333;color:#C8A800;font-size:10px;padding:2px;" onchange="setRule('setup.startingAssets.${n}.missiles',+this.value)"></td>
      <td style="padding:2px;"><input type="number" value="${a.nukes}" style="width:45px;background:#0a0a0d;border:1px solid #333;color:#C8A800;font-size:10px;padding:2px;" onchange="setRule('setup.startingAssets.${n}.nukes',+this.value)"></td>
      <td style="padding:2px;"><input type="number" value="${a.territories}" style="width:45px;background:#0a0a0d;border:1px solid #333;color:#C8A800;font-size:10px;padding:2px;" onchange="setRule('setup.startingAssets.${n}.territories',+this.value)"></td>
    </tr>`;
  }).join('');

  modal.innerHTML = `<div style="background:#08080c;border:1px solid #252530;width:100%;max-width:520px;max-height:92vh;display:flex;flex-direction:column;">
    <div style="padding:12px 16px;border-bottom:1px solid #1a1a20;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
      <div style="font-family:Orbitron,sans-serif;font-size:12px;letter-spacing:3px;color:#C8A800;">⚙ EDITOR DE REGLAS</div>
      <button onclick="document.getElementById('rules-modal').remove()" style="background:none;border:none;color:#666;font-size:18px;cursor:pointer;">✕</button>
    </div>
    <div style="overflow-y:auto;padding:14px 16px;flex:1;font-size:10px;">

      ${sec('GAME SETUP — ACTIVOS INICIALES')}
      <table style="width:100%;border-collapse:collapse;">
        <tr style="font-size:9px;color:#555;">
          <th></th><th>Sol</th><th>Mech</th><th>Misil</th><th>Nuclear</th><th>Terr</th>
        </tr>
        ${assetRows}
      </table>
      ${row('Libertos: +Plutonio (en lugar de nucleares)','setup.libertosSwap.plutonium')}
      ${row('Libertos: +Mechs adicionales','setup.libertosSwap.mechs')}

      ${sec('GAME SETUP — ORDEN DE FASES')}
      <div style="font-size:9px;color:#555;margin-bottom:4px;">Fases de setup (el orden real se define aquí):</div>
      <div style="background:#05050a;padding:8px;border:1px solid #1a1a20;">
        ${sec('1. Reclamar territorio')} <div style="font-size:9px;color:#666;">Por turnos: cada jugador elige 1 territorio hasta que todos estén ocupados.</div>
        ${sec('2. Colocar Nucleares + Soldados')} <div style="font-size:9px;color:#666;">Cada jugador coloca todos sus nucleares y luego todos sus soldados antes de pasar al siguiente.</div>
        ${chk('setup.phases.0.combinedWith')} <span style="font-size:9px;color:#888;margin-left:6px;">Combinar nuclear+soldados en el mismo turno</span>
      </div>

      ${sec('PREPARACIÓN — INGRESOS')}
      ${row('Plutonio por Nuclear Base / turno','prep.plutoniumPerNuclear')}
      ${row('Refuerzo: soldados por 2 territorios','prep.reinforcements.perTwoTerritories')}
      ${row('Refuerzo: soldados por 2 terr. en región completa','prep.reinforcements.perTwoTerritoriesFullRegion')}
      ${row('Refuerzo: soldados por Nuclear Base','prep.reinforcements.perNuclear')}

      ${sec('PREPARACIÓN — CONSTRUCCIÓN')}
      ${row('Coste Nuclear Base (Pu)','prep.nuclearBuildCost')}
      ${row('Coste misil (Pu)','prep.missileBuildCost')}
      ${row('Máx misiles por jugador','prep.maxMissiles')}
      ${row('Rango movimiento (territorios)','prep.movementRange')}

      ${sec('PREPARACIÓN — MEJORAS')}
      ${row('Mech: coste soldados','prep.upgrades.mechCost.soldiers')}
      ${row('Mech: coste Plutonio','prep.upgrades.mechCost.plutonium')}
      ${row('Aircraft: coste soldados','prep.upgrades.aircraftCost.soldiers')}
      ${row('Aircraft: coste Plutonio','prep.upgrades.aircraftCost.plutonium')}
      ${row('Scorpion: coste Mechs','prep.upgrades.scorpionCost.mechs')}
      ${row('Scorpion: coste Plutonio','prep.upgrades.scorpionCost.plutonium')}
      ${row('Máx Aircraft en juego','prep.upgrades.maxAircraft')}

      ${sec('COMBATE — DADOS')}
      ${row('Máx dados atacante','combat.maxAttackDice')}
      ${row('Máx dados defensor','combat.maxDefenseDice')}
      ${row('Dado Soldado (D?)','combat.unitDice.soldier')}
      ${row('Dado Mech (D?)','combat.unitDice.mech')}
      ${row('Dado Aircraft (D?)','combat.unitDice.aircraft')}
      ${row('Dado Scorpion (D?)','combat.unitDice.scorpion')}
      ${row('Empate: gana defensor','combat.tieBreakerDefender','chk')}

      ${sec('COMBATE — MISILES')}
      ${row('Dado intercepción (D?)','combat.missileInterceptDie')}
      ${row('Mínimo para interceptar','combat.missileInterceptThreshold')}
      ${row('Derribar Mech: D6 mínimo','combat.missileTargets.mech')}
      ${row('Derribar Aircraft: D6 mínimo','combat.missileTargets.aircraft')}
      ${row('Derribar Scorpion: D6 mínimo','combat.missileTargets.scorpion')}

      ${sec('FASE FINAL')}
      ${row('Dado mantenimiento (D?)','end.maintenanceDie')}
      ${row('Resultado = explosión','end.maintenanceExplosionOn')}
      ${row('Explosiones: Aircraft sobreviven','end.explosionSpareAircraft','chk')}

      ${sec('VICTORIAS — CONDICIONES NUMÉRICAS')}
      ${row('IMP: regiones completas necesarias','victory.imp.fullRegions')}
      ${row('CLT: ejércitos eliminados necesarios','victory.clt.armiesEliminated')}
      ${row('ERB: regiones con Nuclear necesarias','victory.erb.nuclearRegions')}
      ${row('SHN: regiones con mayor ejército','victory.shn.largestArmyRegions')}

      ${sec('HABILIDADES — BONIFICACIONES')}
      ${row('PRM: Pu extra por Nuclear Base / turno','prep.plutoniumPerNuclear')}
      ${row('SHN: soldados extra por Nuclear Base','prep.reinforcements.perNuclear')}

    </div>
    <div style="padding:10px 16px;border-top:1px solid #1a1a20;display:flex;gap:8px;flex-shrink:0;">
      <button onclick="resetRules()" style="flex:1;background:#0a0a0d;border:1px solid #555;color:#888;padding:8px;font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:2px;cursor:pointer;">RESTAURAR</button>
      <button onclick="document.getElementById('rules-modal').remove()" style="flex:2;background:#0a0a0d;border:1px solid #C8A800;color:#C8A800;padding:8px;font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:2px;cursor:pointer;">CERRAR ▶</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

function setRule(path, value, el) {
  const keys = path.split('.');
  let obj = RULES;
  for(let i=0;i<keys.length-1;i++) obj = obj[keys[i]];
  obj[keys[keys.length-1]] = value;
}

function resetRules() {
  // Deep copy DEFAULT_RULES back to RULES
  Object.assign(RULES, JSON.parse(JSON.stringify(DEFAULT_RULES)));
  document.getElementById('rules-modal').remove();
  showRules();
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
  imp: 'PAX AUGUSTA\n• Controla 5 regiones COMPLETAS al inicio de tu turno\n\nHabilidad — IMPERIAL DEFENSE:\n+1 a todos los dados de defensa',
  lib: 'TOTAL BLACKOUT\n• El número total de Nuclear Bases en el tablero es igual o menor al número de jugadores (fin de turno)\n\nHabilidad — SCORCHED EARTH:\nPor cada Nuclear Base destruida (propia o enemiga): gana 1 Misil + 1 Mech + 2 Pu. El Mech se coloca inmediatamente en ese territorio.',
  clt: 'THE GREAT OFFERING\n• Elimina a DOS jugadores enemigos (fin de turno)\n\nHabilidad — HOLY WAR:\n+1 a todos los dados de ataque',
  erb: 'EQUATION ZERO\n• Controla al menos 1 Nuclear Base en 7 regiones distintas (fin de turno)\n\nHabilidad — HIVE MIND:\nPuedes colocar tus refuerzos en cualquier territorio propio, aunque no tenga Nuclear Base',
  prm: 'TERRAFORMATION\n• Controla la MITAD de todas las Nuclear Bases del tablero (fin de turno)\n\nHabilidad — ADVANCED REACTOR:\n+1 Plutonio extra por cada Nuclear Base que controlas cada turno',
  shn: 'GENETIC SUPREMACY\n• Tienes el mayor ejército (en AP) en 7 regiones distintas (inicio de turno)\n\nHabilidad — MASS CLONING:\n+1 soldado extra por cada Nuclear Base que controlas en ingresos',
};
function showFactionObjective(fk) {
  const fd = FDATA[fk]||{name:fk,color:'#888'};
  const detail = VICTORY_DETAIL_FULL[fk]||fd.goal||'';
  const ex = document.getElementById('obj-modal');
  if(ex) ex.remove();
  const modal = document.createElement('div');
  modal.id = 'obj-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:2000;display:flex;align-items:center;justify-content:center;';
  modal.onclick = (e)=>{ if(e.target===modal) modal.remove(); };
  const lines = detail.split('\n');
  modal.innerHTML = `<div style="background:#08080c;border:1px solid ${fd.color};padding:24px 32px;max-width:420px;font-family:Orbitron,sans-serif;">
    <div style="font-size:13px;color:${fd.color};margin-bottom:4px;letter-spacing:2px;">${fd.name}</div>
    <div style="font-size:10px;color:#555;margin-bottom:16px;">${fd.leader||''}</div>
    ${lines.map((l,i)=>`<div style="font-size:${i===0?'11px':'10px'};color:${i===0?fd.color:'#888'};margin-bottom:6px;line-height:1.6;">${l}</div>`).join('')}
    <button onclick="document.getElementById('obj-modal').remove()" style="margin-top:16px;background:#0a0a0d;border:1px solid ${fd.color};color:${fd.color};padding:8px 20px;font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:2px;cursor:pointer;">CERRAR</button>
  </div>`;
  document.body.appendChild(modal);
}

function refreshCards() {
  const cont = document.getElementById('fcards');
  cont.innerHTML = '';
  // Only show factions actually playing (in turn order)
  let order;
  if(G.setup && G.setup.order && G.setup.order.length > 0) {
    order = G.setup.order; // after setup: only playing factions
  } else {
    // before setup: show first playerCount factions (player + cpus)
    const allFks = Object.keys(G.factions);
    const cpuFks = allFks.filter(k=>k!==G.pf).slice(0, (G.playerCount||4)-1);
    order = [G.pf, ...cpuFks];
  }
  const currentFk = (typeof G_step !== 'undefined') ? G_step.currentFk : null;
  const phaseLabels = {prep:'PREP',combat:'COMBATE',end:'FIN'};
  const phaseLabel = (typeof G_step !== 'undefined') ? (phaseLabels[G_step.phase]||'') : '';

  order.forEach(k => {
    const f = G.factions[k];
    if(!f || f.alive===false) return;
    const terrs = Object.values(G.territories).filter(t=>t.owner===k);
    const nukes = terrs.filter(t=>t.hasNuclear).length;
    const ap = terrs.reduce((s,t)=>s+armyPoints(t),0);
    const isYou = (k===G.pf);
    const isActive = (k===currentFk);
    const d = document.createElement('div');
    d.className = 'fc ' + k + (isYou?' you':'') + (isActive?' fc-active':'');
    if(isActive && FDATA[k]) d.style.setProperty('--fc-color', FDATA[k].color);

    const turnNum = order.indexOf(k) + 1;
    const fc = FDATA[k]||{color:'#888'};
    d.innerHTML =
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">' +
        // Turn number + LED
        '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' +
          '<span style="font-family:Orbitron,sans-serif;font-size:9px;color:' + (isActive?fc.color:'#444') + ';min-width:14px;">' + turnNum + '.</span>' +
          '<div style="width:8px;height:8px;border-radius:50%;background:' + fc.color + ';flex-shrink:0;' +
            (isActive ? 'box-shadow:0 0 6px ' + fc.color + ';animation:led-pulse 1.2s ease-in-out infinite;' : 'opacity:0.25;') + '"></div>' +
        '</div>' +
        // Name + badges
        '<div style="flex:1;display:flex;justify-content:space-between;align-items:center;">' +
          '<div class="fc-name" style="margin:0;">' + f.name + '</div>' +
          '<div style="display:flex;gap:4px;align-items:center;">' +
            (isYou ? '<div class="ybadge">TÚ</div>' : '') +
            (isActive ? '<div style="font-family:Orbitron,sans-serif;font-size:7px;letter-spacing:1px;padding:1px 5px;border:1px solid ' + fc.color + ';color:' + fc.color + ';">' + phaseLabel + '</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="fc-lead">' + f.leader + '</div>' +
      '<div class="fc-grid">' +
        '<div class="fstat"><div class="fsl">TER</div><div class="fsv">' + terrs.length + '</div></div>' +
        '<div class="fstat"><div class="fsl">PLU</div><div class="fsv">' + f.plutonium + '</div></div>' +
        '<div class="fstat"><div class="fsl">NUC</div><div class="fsv">' + nukes + '</div></div>' +
        '<div class="fstat"><div class="fsl">AP</div><div class="fsv">' + ap + '</div></div>' +
        '<div class="fstat"><div class="fsl">MIS</div><div class="fsv">' + (f.missiles||0) + '</div></div>' +
      '</div>' +
      '<div class="goal-badge" title="Ver objetivo — clic para detalle" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;margin-top:4px;">' +
        '<span style="color:' + (isYou?'#999':'#666') + ';font-size:9px;">' + (f.goal||'') + '</span>' +
        '<span style="color:#555;font-size:9px;flex-shrink:0;margin-left:4px;">🎯</span>' +
      '</div>';

    d.querySelector('.goal-badge').addEventListener('click', function(e) {
      e.stopPropagation();
      showFactionObjective(k);
    });
    cont.appendChild(d);
  });
  // Update turn order dots
  if(typeof updateTurnOrderBar === 'function') updateTurnOrderBar();
}

