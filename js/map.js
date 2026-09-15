function initGame() {
  const pc = G.playerCount;
  const setup = RULES.setup.startingAssets[pc] || SETUP[pc];

  // Factions
  const fkeys = Object.keys(FDATA);
  fkeys.forEach((k,i) => {
    const isPlayer = k === G.pf;
    G.factions[k] = {
      ...FDATA[k],
      plutonium: 0,
      soldiers: setup.soldiers,
      mechs: 0, aircraft: 0, scorpions: 0,
      missiles: setup.missiles,
      nukes: setup.nukes,
      alive: true,
      isPlayer: isPlayer,
      eliminatedArmies: 0,
    };
    // Libertos special: start without nukes, get +5pu +5sol instead
    if(k==='lib'){
      G.factions[k].nukes = 0;
      G.factions[k].plutonium = 5;
      G.factions[k].soldiers += 5;
    }
  });

  // Territories
  TERRITORIES_DEF.forEach(td => {
    G.territories[td.id] = {
      ...td,
      owner: null,
      soldiers:0, mechs:0, aircraft:0, scorpions:0,
      hasNuclear: false,
    };
  });

  // Territories are claimed during setup phase (not auto-distributed)
  // distributeStartingTerritories called only for quick-start mode
}

function distributeStartingTerritories(setup) {
  const fkeys = Object.keys(FDATA);
  const allIds = TERRITORIES_DEF.map(t=>t.id);
  const shuffled = [...allIds].sort(()=>Math.random()-.5);
  const terPerFaction = setup.territories;

  fkeys.forEach((fk,fi) => {
    const slice = shuffled.splice(0, terPerFaction);
    slice.forEach(id => {
      const t = G.territories[id];
      t.owner = fk;
      t.soldiers = 1;
    });
    // Place starting nukes
    const ownedIds = slice.slice(0, G.factions[fk].nukes);
    ownedIds.forEach(id => {
      if(fk==='lib') return; // Libertos have no nukes
      G.territories[id].hasNuclear = true;
    });
    // Distribute remaining soldiers
    const extra = G.factions[fk].soldiers - slice.length;
    let remaining = extra;
    slice.forEach(id => {
      if(remaining > 0) { G.territories[id].soldiers += 2; remaining -= 2; }
    });
  });
}

// ── SVG MAP BUILD ─────────────────────────────────────────────
const NS = 'http://www.w3.org/2000/svg';
let svgEl, svgG, pathEls = {}, unitEls = {};

// Territory radius for circular territory display
const T_R = 44;
const HEX_R = 44; // territory circle radius


function buildMap() {
  svgEl = document.getElementById('map-svg');
  svgEl.setAttribute('viewBox','0 0 1400 787');
  svgEl.setAttribute('width','1400');
  svgEl.setAttribute('height','787');
  svgEl.style.position = 'absolute';
  svgEl.style.top = '0';
  svgEl.style.left = '0';

  const defs = document.createElementNS(NS,'defs');
  // Apocalyptic texture filters
  defs.innerHTML = `
    <filter id="fx-noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise"/>
      <feColorMatrix type="saturate" values="0" in="noise" result="grey"/>
      <feBlend in="SourceGraphic" in2="grey" mode="overlay" result="blend"/>
      <feComposite in="blend" in2="SourceGraphic" operator="in"/></filter>
    <filter id="fx-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="fx-glow2"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="fx-blur"><feGaussianBlur stdDeviation="2"/></filter>
    <radialGradient id="ocean-grad" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#080c10"/>
      <stop offset="100%" stop-color="#020305"/>
    </radialGradient>
    <radialGradient id="atmo-vignette" cx="50%" cy="50%" r="70%">
      <stop offset="40%" stop-color="transparent"/>
      <stop offset="100%" stop-color="#000003" stop-opacity="0.9"/>
    </radialGradient>
  `;
  svgEl.appendChild(defs);

  // Real apocalyptic map background image
  // BG and overlay go INSIDE svgG so they zoom/pan with everything else
  // (inserted after svgG is created below)
  const _bgImg_data = ASSETS.bg; // store for later insertion into svgG

  // Grid will be added inside svgG after it's created

  // Real BG image handles continent art — no blob drawing needed

  // Main transform group — EVERYTHING goes inside here for unified pan/zoom
  svgG = document.createElementNS(NS,'g');
  svgG.setAttribute('id','world-g');
  svgEl.appendChild(svgG);

  // Background image (first child = bottom layer)
  const bgImg = document.createElementNS(NS,'image');
  bgImg.setAttribute('href', _bgImg_data);
  bgImg.setAttribute('x','0'); bgImg.setAttribute('y','0');
  bgImg.setAttribute('width','1400'); bgImg.setAttribute('height','787');
  bgImg.setAttribute('preserveAspectRatio','xMidYMid slice');
  svgG.appendChild(bgImg);

  // Dark overlay
  const darkOverlay = document.createElementNS(NS,'rect');
  darkOverlay.setAttribute('width','1400'); darkOverlay.setAttribute('height','787');
  darkOverlay.setAttribute('fill','rgba(0,0,0,0.50)');
  svgG.appendChild(darkOverlay);

  // Lat/lon grid lines
  const grid = document.createElementNS(NS,'g');
  grid.setAttribute('opacity','0.04');
  for(let x=0;x<1400;x+=140){const l=document.createElementNS(NS,'line');l.setAttribute('x1',x);l.setAttribute('y1',0);l.setAttribute('x2',x);l.setAttribute('y2',787);l.setAttribute('stroke','#8888aa');l.setAttribute('stroke-width','0.5');grid.appendChild(l);}
  for(let y=0;y<787;y+=80){const l=document.createElementNS(NS,'line');l.setAttribute('x1',0);l.setAttribute('y1',y);l.setAttribute('x2',1400);l.setAttribute('y2',y);l.setAttribute('stroke','#8888aa');l.setAttribute('stroke-width','0.5');grid.appendChild(l);}
  svgG.appendChild(grid);

  // Draw region zones (colored area behind territories)
  drawRegionZones();

  // Draw territory nodes
  TERRITORIES_DEF.forEach(td => {
    drawTerritory(td);
  });

  // Draw adjacency lines FIRST (behind nodes)
  drawAdjLines();

  // Atmosphere vignette — inside svgG so it moves with everything
  const vig = document.createElementNS(NS,'rect');
  vig.setAttribute('width','1400'); vig.setAttribute('height','787');
  vig.setAttribute('fill','url(#atmo-vignette)');
  vig.setAttribute('pointer-events','none');
  svgG.appendChild(vig);

  // No continent labels (clean look)

  // Grid metadata available via: FULL_GRID_CELLS


  // Render full grid: inactive cells as invisible hexes with data-col/row
  FULL_GRID.forEach(function(cell){
    if(cell.active) return; // skip active ones (handled by TERRITORIES_DEF)
    var h=document.createElementNS(NS,'polygon');
    var pts=[];
    for(var i=0;i<6;i++){
      pts.push(((cell.cx+(HEX_R-2)*Math.cos(Math.PI/180*(60*i))).toFixed(1))+','+
               ((cell.cy+(HEX_R-2)*Math.sin(Math.PI/180*(60*i))).toFixed(1)));
    }
    h.setAttribute('points',pts.join(' '));
    h.setAttribute('fill','none');
    h.setAttribute('stroke','none');
    h.setAttribute('pointer-events','none');
    h.dataset.col=cell.col;
    h.dataset.row=cell.row;
    svgG.appendChild(h);
  });
  updateMap();
}

function drawContinentBlobs(parent) {
  // No longer needed — using real bg image
  return;
  // Scorched Earth continent silhouettes — dark land masses
  // Colors: very dark, desaturated, dust-brown/ash tones
  const continents = [
    // North & Central America
    { d:'M60,60 L220,50 L270,80 L290,180 L260,280 L240,370 L210,380 L180,340 L140,300 L100,250 L60,200 L40,130 Z', fill:'#0e0c08' },
    // South America
    { d:'M195,360 L310,345 L340,380 L330,420 L320,490 L290,570 L250,590 L225,570 L200,510 L185,440 L180,380 Z', fill:'#0c0a07' },
    // Europe
    { d:'M490,80 L680,70 L700,110 L670,160 L650,230 L610,260 L570,250 L530,220 L505,170 L480,130 Z', fill:'#0d0b09' },
    // Africa
    { d:'M540,230 L720,210 L760,270 L760,340 L740,420 L720,490 L700,560 L650,590 L600,580 L560,540 L530,460 L510,380 L505,300 Z', fill:'#0e0b08' },
    // Russia/Asia
    { d:'M650,60 L1100,55 L1120,130 L1100,200 L1080,260 L1020,310 L960,360 L900,370 L840,340 L800,290 L780,230 L730,190 L700,150 L670,120 Z', fill:'#0c0c0e' },
    // India subcontinent
    { d:'M800,280 L900,270 L930,310 L920,370 L880,410 L840,420 L808,390 L790,340 Z', fill:'#0d0b0a' },
    // Southeast Asia & Indonesia
    { d:'M940,320 L1090,310 L1120,360 L1100,420 L1060,450 L1000,460 L960,420 L930,380 Z', fill:'#0c0d0b' },
    // Australia
    { d:'M940,430 L1130,425 L1160,480 L1150,560 L1100,590 L1030,595 L965,570 L930,510 L925,465 Z', fill:'#0e0c09' },
    // Antarctica
    { d:'M380,620 L1020,610 L1050,650 L1020,700 L380,705 L350,670 Z', fill:'#0d0d12' },
  ];
  const blobG = document.createElementNS(NS,'g');
  blobG.setAttribute('opacity','1');
  continents.forEach(c => {
    const p = document.createElementNS(NS,'path');
    p.setAttribute('d',c.d);
    p.setAttribute('fill',c.fill);
    p.setAttribute('stroke','#1a1612');
    p.setAttribute('stroke-width','1');
    blobG.appendChild(p);
  });
  parent.appendChild(blobG);
}

function drawRegionZones() {
  // For each region, draw a soft colored glow behind its territories
  REGIONS.forEach(reg => {
    const terrs = TERRITORIES_DEF.filter(t=>t.region===reg.id);
    if(!terrs.length) return;
    // Compute convex hull approx as circle cluster
    terrs.forEach(t => {
      const circle = document.createElementNS(NS,'circle');
      circle.setAttribute('cx',t.cx); circle.setAttribute('cy',t.cy);
      circle.setAttribute('r','40');
      circle.setAttribute('fill',reg.borderColor);
      circle.setAttribute('opacity','0.12');
      circle.setAttribute('filter','url(#fx-blur)');
      circle.setAttribute('pointer-events','none');
      svgG.appendChild(circle);
    });
  });
}

function drawAdjLines() {
  // Draw once adjacency lines
  const drawn = new Set();
  TERRITORIES_DEF.forEach(td => {
    td.adj.forEach(adjId => {
      const key = [td.id,adjId].sort().join('-');
      if(drawn.has(key)) return;
      drawn.add(key);
      const adjT = TERRITORIES_DEF.find(x=>x.id===adjId);
      if(!adjT) return;
      const line = document.createElementNS(NS,'line');
      line.setAttribute('x1',td.cx); line.setAttribute('y1',td.cy);
      line.setAttribute('x2',adjT.cx); line.setAttribute('y2',adjT.cy);
      line.setAttribute('stroke','rgba(255,255,255,0.06)');
      line.setAttribute('stroke-width','0.8');
      line.setAttribute('pointer-events','none');
      line.setAttribute('id','adj-'+key);
      svgG.insertBefore(line, svgG.firstChild);
    });
  });
}

function hexPts(cx, cy) {
  const r = 42;
  const pts = [];
  for(let i=0;i<6;i++){
    const a = Math.PI/180*(60*i);
    pts.push((cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1));
  }
  return pts.join(' ');
}




function doubleHexPts(cx1,cy1,cx2,cy2){
  // 10-sided outer perimeter: two flat-top hexes sharing edge (hex1.v0=hex2.v4, hex1.v1=hex2.v3)
  var r=HEX_R-2;
  function vx(cx,i){return (cx+r*Math.cos(Math.PI/180*(60*i))).toFixed(1);}
  function vy(cy,i){return (cy+r*Math.sin(Math.PI/180*(60*i))).toFixed(1);}
  return [
    vx(cx1,1)+','+vy(cy1,1),
    vx(cx1,2)+','+vy(cy1,2),
    vx(cx1,3)+','+vy(cy1,3),
    vx(cx1,4)+','+vy(cy1,4),
    vx(cx1,5)+','+vy(cy1,5),
    vx(cx1,0)+','+vy(cy1,0),
    vx(cx2,5)+','+vy(cy2,5),
    vx(cx2,0)+','+vy(cy2,0),
    vx(cx2,1)+','+vy(cy2,1),
    vx(cx2,2)+','+vy(cy2,2)
  ].join(' ');
}

function drawTerritory(td) {
  const reg = REGIONS.find(r=>r.id===td.region);
  const g = document.createElementNS(NS,'g');
  g.setAttribute('id','tg-'+td.id);
  g.setAttribute('cursor','pointer');
  g.addEventListener('click', e => { e.stopPropagation(); onTerritoryClick(td.id, e); });
  g.addEventListener('mouseenter', e => showTip(e, td.id));
  g.addEventListener('mouseleave', () => hideTip());

  // Hex fill (double-polygon for Antarctica)
  var _pts=(td.region==='r12'&&td.cx2!==undefined)?doubleHexPts(td.cx,td.cy,td.cx2,td.cy2):hexPts(td.cx,td.cy);
  const hex = document.createElementNS(NS,'polygon');
  hex.setAttribute('points', _pts);
  hex.setAttribute('id','tc-'+td.id);
  g.appendChild(hex);

  // Hex border (region color)
  const brd = document.createElementNS(NS,'polygon');
  brd.setAttribute('points', _pts);
  brd.setAttribute('fill','none');
  brd.setAttribute('stroke', reg ? reg.borderColor : '#555');
  brd.setAttribute('stroke-width','1.5');
  brd.setAttribute('id','tr-'+td.id);
  g.appendChild(brd);

  // Unit group
  const uig = document.createElementNS(NS,'g');
  uig.setAttribute('id','uig-'+td.id);
  uig.setAttribute('pointer-events','none');
  g.appendChild(uig);

  // AP text bottom
  const apt = document.createElementNS(NS,'text');
  apt.setAttribute('x',td.cx); apt.setAttribute('y',td.cy+34);
  apt.setAttribute('text-anchor','middle');
  apt.setAttribute('font-size','7');
  apt.setAttribute('font-family','Orbitron,monospace');
  apt.setAttribute('font-weight','700');
  apt.setAttribute('fill','rgba(255,255,255,0.85)');
  apt.setAttribute('pointer-events','none');
  apt.setAttribute('id','tu-'+td.id);
  g.appendChild(apt);

  // Nuclear icon top-right corner
  const nuc = document.createElementNS(NS,'text');
  nuc.setAttribute('x',td.cx+14.0);
  nuc.setAttribute('y',td.cy-12.6);
  nuc.setAttribute('text-anchor','middle');
  nuc.setAttribute('font-size','9');
  nuc.setAttribute('pointer-events','none');
  nuc.setAttribute('id','tn-'+td.id);
  g.appendChild(nuc);

  pathEls[td.id] = g;
  svgG.appendChild(g);
}

function drawContinentLabels(parent) {
  const labels = [
    {x:155,y:42,t:'NORTH AMERICA'},{x:255,y:338,t:'CENTRAL AM.'},{x:258,y:360,t:''},{x:255,y:535,t:'SOUTH AMERICA'},
    {x:580,y:68,t:'EUROPE'},{x:840,y:68,t:'RUSSIA'},
    {x:685,y:198,t:'MIDDLE EAST'},{x:600,y:210,t:'AFRICA'},{x:1000,y:195,t:'ASIA'},
    {x:1010,y:330,t:'SE ASIA'},{x:1040,y:430,t:'OCEANIA'},{x:680,y:620,t:'ANTARCTICA'},
  ];
  labels.forEach(lb => {
    if(!lb.t) return;
    const t = document.createElementNS(NS,'text');
    t.setAttribute('x',lb.x); t.setAttribute('y',lb.y);
    t.setAttribute('text-anchor','middle');
    t.setAttribute('font-size','8');
    t.setAttribute('font-family','Orbitron,monospace');
    t.setAttribute('fill','rgba(255,255,255,0.05)');
    t.setAttribute('letter-spacing','2');
    t.setAttribute('pointer-events','none');
    t.textContent = lb.t;
    svgG.appendChild(t);
  });
}


function fixUnitIcons(){
  // Set img src for unit boxes using embedded assets
  try {
    const mapping = [
      ['uico-sol','soldier'],['uico-mec','mech'],
      ['uico-air','aircraft'],['uico-sco','scorpion']
    ];
    mapping.forEach(([id,key])=>{
      const el=document.getElementById(id);
      if(el){
        const img=el.querySelector('img');
        if(img&&ASSETS[key]) img.src=ASSETS[key];
      }
    });
    // Also upgrade buttons
    const upMap=[['upg-mech','mech'],['upg-air','aircraft'],['upg-sco','scorpion']];
    upMap.forEach(([id,key])=>{
      const el=document.getElementById(id);
      if(el){const img=el.querySelector('img');if(img&&ASSETS[key])img.src=ASSETS[key];}
    });
    // Nuclear build button
    const nb=document.getElementById('ba-nuke');
    if(nb){const img=nb.querySelector('img');if(img&&ASSETS.nuclear)img.src=ASSETS.nuclear;}
  } catch(e){}
}

function buildRegionLegend(){}

// ── MAP UPDATE ─────────────────────────────────────────────────


// ════════════════════════════════════════════════════════════════
// STEP ENGINE — guided turn flow with Next buttons
// ════════════════════════════════════════════════════════════════

// All phase steps definitions
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

// ── State ────────────────────────────────────────────────────────
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


