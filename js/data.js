const TERRITORIES_DEF = [
  {id:'01_01',region:'r01',cx:212.0,cy:136.2,adj:['01_02']},
  {id:'01_02',region:'r01',cx:278.0,cy:174.3,adj:['01_01','01_03','01_04','01_05']},
  {id:'01_03',region:'r01',cx:278.0,cy:250.5,adj:['01_02','01_05','01_06','03_01']},
  {id:'03_01',region:'r03',cx:278.0,cy:326.7,adj:['01_03','01_06','03_02']},
  {id:'03_02',region:'r03',cx:278.0,cy:402.9,adj:['03_01','04_01','04_02']},
  {id:'04_01',region:'r04',cx:278.0,cy:479.2,adj:['03_02','04_02','04_03']},
  {id:'01_04',region:'r01',cx:344.0,cy:136.2,adj:['01_02','01_05','01_07']},
  {id:'01_05',region:'r01',cx:344.0,cy:212.4,adj:['01_02','01_03','01_04','01_06','01_07']},
  {id:'01_06',region:'r01',cx:344.0,cy:288.6,adj:['01_03','01_05','03_01']},
  {id:'04_02',region:'r04',cx:344.0,cy:441.1,adj:['03_02','04_01','04_03','04_04']},
  {id:'04_03',region:'r04',cx:344.0,cy:517.3,adj:['04_01','04_02','04_04','04_05']},
  {id:'01_07',region:'r01',cx:410.0,cy:174.3,adj:['01_04','01_05','02_01']},
  {id:'04_04',region:'r04',cx:410.0,cy:479.2,adj:['04_02','04_03','04_05']},
  {id:'04_05',region:'r04',cx:410.0,cy:555.4,adj:['04_03','04_04','04_06']},
  {id:'04_06',region:'r04',cx:410.0,cy:631.6,adj:['04_05','04_07']},
  {id:'02_01',region:'r02',cx:476.0,cy:136.2,adj:['01_07','02_02']},
  {id:'04_07',region:'r04',cx:476.0,cy:669.7,adj:['04_06','12_01']},
  {id:'02_02',region:'r02',cx:542.0,cy:174.3,adj:['02_01','05_01']},
  {id:'05_01',region:'r05',cx:608.0,cy:212.4,adj:['02_02','05_02','05_03','05_04']},
  {id:'05_02',region:'r05',cx:608.0,cy:288.6,adj:['05_01','05_04','08_01','08_03']},
  {id:'08_01',region:'r08',cx:608.0,cy:364.8,adj:['05_02','08_02','08_03','08_04']},
  {id:'08_02',region:'r08',cx:608.0,cy:441.1,adj:['08_01','08_04']},
  {id:'05_03',region:'r05',cx:674.0,cy:174.3,adj:['05_01','05_04','05_05']},
  {id:'05_04',region:'r05',cx:674.0,cy:250.5,adj:['05_01','05_02','05_03','05_05','05_06','08_03']},
  {id:'08_03',region:'r08',cx:674.0,cy:326.7,adj:['05_02','05_04','05_06','08_01','08_04','08_05']},
  {id:'08_04',region:'r08',cx:674.0,cy:402.9,adj:['08_01','08_02','08_03','08_05','08_06']},
  {id:'05_05',region:'r05',cx:740.0,cy:212.4,adj:['05_03','05_04','05_06','05_07','06_01']},
  {id:'05_06',region:'r05',cx:740.0,cy:288.6,adj:['05_04','05_05','06_01','07_01','08_03','08_05']},
  {id:'08_05',region:'r08',cx:740.0,cy:364.8,adj:['05_06','07_01','07_02','08_03','08_04','08_06']},
  {id:'08_06',region:'r08',cx:740.0,cy:441.1,adj:['07_02','08_04','08_05','08_07']},
  {id:'08_07',region:'r08',cx:740.0,cy:517.3,adj:['08_06','08_08']},
  {id:'08_08',region:'r08',cx:740.0,cy:593.5,adj:['08_07','12_02','12_03']},
  {id:'05_07',region:'r05',cx:806.0,cy:174.3,adj:['05_05','06_01','06_02']},
  {id:'06_01',region:'r06',cx:806.0,cy:250.5,adj:['05_05','05_06','05_07','06_02','07_01','07_03']},
  {id:'07_01',region:'r07',cx:806.0,cy:326.7,adj:['05_06','06_01','07_02','07_03','08_05','09_01']},
  {id:'07_02',region:'r07',cx:806.0,cy:402.9,adj:['07_01','08_05','08_06','09_01']},
  {id:'06_02',region:'r06',cx:872.0,cy:212.4,adj:['05_07','06_01','06_03','06_04','07_03']},
  {id:'07_03',region:'r07',cx:872.0,cy:288.6,adj:['06_01','06_02','06_04','07_01','09_01','09_02']},
  {id:'09_01',region:'r09',cx:872.0,cy:364.8,adj:['07_01','07_02','07_03','09_02','09_03']},
  {id:'06_03',region:'r06',cx:938.0,cy:174.3,adj:['06_02','06_04','06_05']},
  {id:'06_04',region:'r06',cx:938.0,cy:250.5,adj:['06_02','06_03','06_05','07_03','09_02','09_04']},
  {id:'09_02',region:'r09',cx:938.0,cy:326.7,adj:['06_04','07_03','09_01','09_03','09_04','09_05']},
  {id:'09_03',region:'r09',cx:938.0,cy:402.9,adj:['09_01','09_02','09_05','10_01']},
  {id:'11_01',region:'r11',cx:938.0,cy:631.6,adj:['11_02','11_03','12_03']},
  {id:'06_05',region:'r06',cx:1004.0,cy:212.4,adj:['06_03','06_04','06_06','09_04','09_06']},
  {id:'09_04',region:'r09',cx:1004.0,cy:288.6,adj:['06_04','06_05','09_02','09_05','09_06','09_07']},
  {id:'09_05',region:'r09',cx:1004.0,cy:364.8,adj:['09_02','09_03','09_04','09_07','10_01']},
  {id:'10_01',region:'r10',cx:1004.0,cy:441.1,adj:['09_03','09_05','10_02']},
  {id:'11_02',region:'r11',cx:1004.0,cy:593.5,adj:['11_01','11_03','11_04','11_05']},
  {id:'11_03',region:'r11',cx:1004.0,cy:669.7,adj:['11_01','11_02','11_05']},
  {id:'06_06',region:'r06',cx:1070.0,cy:174.3,adj:['06_05','09_06']},
  {id:'09_06',region:'r09',cx:1070.0,cy:250.5,adj:['06_05','06_06','09_04','09_07']},
  {id:'09_07',region:'r09',cx:1070.0,cy:326.7,adj:['09_04','09_05','09_06']},
  {id:'10_02',region:'r10',cx:1070.0,cy:479.2,adj:['10_01','11_04']},
  {id:'11_04',region:'r11',cx:1070.0,cy:555.4,adj:['10_02','11_02','11_05']},
  {id:'11_05',region:'r11',cx:1070.0,cy:631.6,adj:['11_02','11_03','11_04']},
  {id:'12_01',region:'r12',cx:542.0,cy:631.6,cx2:608.0,cy2:669.7,adj:['04_07','12_02']},
  {id:'12_02',region:'r12',cx:674.0,cy:631.6,cx2:740.0,cy2:669.7,adj:['08_08','12_01','12_03']},
  {id:'12_03',region:'r12',cx:806.0,cy:631.6,cx2:872.0,cy2:669.7,adj:['08_08','11_01','12_02']},
];
const FULL_GRID = [{col:1,row:1,cx:146.0,cy:174.3,active:false},{col:1,row:2,cx:146.0,cy:250.5,active:false},{col:1,row:3,cx:146.0,cy:326.7,active:false},{col:1,row:4,cx:146.0,cy:402.9,active:false},{col:1,row:5,cx:146.0,cy:479.2,active:false},{col:1,row:6,cx:146.0,cy:555.4,active:false},{col:1,row:7,cx:146.0,cy:631.6,active:false},{col:2,row:1,cx:212.0,cy:136.2,active:false},{col:2,row:2,cx:212.0,cy:212.4,active:false},{col:2,row:3,cx:212.0,cy:288.6,active:false},{col:2,row:4,cx:212.0,cy:364.8,active:false},{col:2,row:5,cx:212.0,cy:441.1,active:false},{col:2,row:6,cx:212.0,cy:517.3,active:false},{col:2,row:7,cx:212.0,cy:593.5,active:false},{col:2,row:8,cx:212.0,cy:669.7,active:false},{col:3,row:1,cx:278.0,cy:174.3,active:false},{col:3,row:2,cx:278.0,cy:250.5,active:false},{col:3,row:3,cx:278.0,cy:326.7,active:false},{col:3,row:4,cx:278.0,cy:402.9,active:false},{col:3,row:5,cx:278.0,cy:479.2,active:false},{col:3,row:6,cx:278.0,cy:555.4,active:false},{col:3,row:7,cx:278.0,cy:631.6,active:false},{col:4,row:1,cx:344.0,cy:136.2,active:false},{col:4,row:2,cx:344.0,cy:212.4,active:false},{col:4,row:3,cx:344.0,cy:288.6,active:false},{col:4,row:4,cx:344.0,cy:364.8,active:false},{col:4,row:5,cx:344.0,cy:441.1,active:false},{col:4,row:6,cx:344.0,cy:517.3,active:false},{col:4,row:7,cx:344.0,cy:593.5,active:false},{col:4,row:8,cx:344.0,cy:669.7,active:false},{col:5,row:1,cx:410.0,cy:174.3,active:false},{col:5,row:2,cx:410.0,cy:250.5,active:false},{col:5,row:3,cx:410.0,cy:326.7,active:false},{col:5,row:4,cx:410.0,cy:402.9,active:false},{col:5,row:5,cx:410.0,cy:479.2,active:false},{col:5,row:6,cx:410.0,cy:555.4,active:false},{col:5,row:7,cx:410.0,cy:631.6,active:false},{col:6,row:1,cx:476.0,cy:136.2,active:false},{col:6,row:2,cx:476.0,cy:212.4,active:false},{col:6,row:3,cx:476.0,cy:288.6,active:false},{col:6,row:4,cx:476.0,cy:364.8,active:false},{col:6,row:5,cx:476.0,cy:441.1,active:false},{col:6,row:6,cx:476.0,cy:517.3,active:false},{col:6,row:7,cx:476.0,cy:593.5,active:false},{col:6,row:8,cx:476.0,cy:669.7,active:false},{col:7,row:1,cx:542.0,cy:174.3,active:false},{col:7,row:2,cx:542.0,cy:250.5,active:false},{col:7,row:3,cx:542.0,cy:326.7,active:false},{col:7,row:4,cx:542.0,cy:402.9,active:false},{col:7,row:5,cx:542.0,cy:479.2,active:false},{col:7,row:6,cx:542.0,cy:555.4,active:false},{col:7,row:7,cx:542.0,cy:631.6,active:false},{col:8,row:1,cx:608.0,cy:136.2,active:false},{col:8,row:2,cx:608.0,cy:212.4,active:false},{col:8,row:3,cx:608.0,cy:288.6,active:false},{col:8,row:4,cx:608.0,cy:364.8,active:false},{col:8,row:5,cx:608.0,cy:441.1,active:false},{col:8,row:6,cx:608.0,cy:517.3,active:false},{col:8,row:7,cx:608.0,cy:593.5,active:false},{col:8,row:8,cx:608.0,cy:669.7,active:false},{col:9,row:1,cx:674.0,cy:174.3,active:false},{col:9,row:2,cx:674.0,cy:250.5,active:false},{col:9,row:3,cx:674.0,cy:326.7,active:false},{col:9,row:4,cx:674.0,cy:402.9,active:false},{col:9,row:5,cx:674.0,cy:479.2,active:false},{col:9,row:6,cx:674.0,cy:555.4,active:false},{col:9,row:7,cx:674.0,cy:631.6,active:false},{col:10,row:1,cx:740.0,cy:136.2,active:false},{col:10,row:2,cx:740.0,cy:212.4,active:false},{col:10,row:3,cx:740.0,cy:288.6,active:false},{col:10,row:4,cx:740.0,cy:364.8,active:false},{col:10,row:5,cx:740.0,cy:441.1,active:false},{col:10,row:6,cx:740.0,cy:517.3,active:false},{col:10,row:7,cx:740.0,cy:593.5,active:false},{col:10,row:8,cx:740.0,cy:669.7,active:false},{col:11,row:1,cx:806.0,cy:174.3,active:false},{col:11,row:2,cx:806.0,cy:250.5,active:false},{col:11,row:3,cx:806.0,cy:326.7,active:false},{col:11,row:4,cx:806.0,cy:402.9,active:false},{col:11,row:5,cx:806.0,cy:479.2,active:false},{col:11,row:6,cx:806.0,cy:555.4,active:false},{col:11,row:7,cx:806.0,cy:631.6,active:false},{col:12,row:1,cx:872.0,cy:136.2,active:false},{col:12,row:2,cx:872.0,cy:212.4,active:false},{col:12,row:3,cx:872.0,cy:288.6,active:false},{col:12,row:4,cx:872.0,cy:364.8,active:false},{col:12,row:5,cx:872.0,cy:441.1,active:false},{col:12,row:6,cx:872.0,cy:517.3,active:false},{col:12,row:7,cx:872.0,cy:593.5,active:false},{col:12,row:8,cx:872.0,cy:669.7,active:false},{col:13,row:1,cx:938.0,cy:174.3,active:false},{col:13,row:2,cx:938.0,cy:250.5,active:false},{col:13,row:3,cx:938.0,cy:326.7,active:false},{col:13,row:4,cx:938.0,cy:402.9,active:false},{col:13,row:5,cx:938.0,cy:479.2,active:false},{col:13,row:6,cx:938.0,cy:555.4,active:false},{col:13,row:7,cx:938.0,cy:631.6,active:false},{col:14,row:1,cx:1004.0,cy:136.2,active:false},{col:14,row:2,cx:1004.0,cy:212.4,active:false},{col:14,row:3,cx:1004.0,cy:288.6,active:false},{col:14,row:4,cx:1004.0,cy:364.8,active:false},{col:14,row:5,cx:1004.0,cy:441.1,active:false},{col:14,row:6,cx:1004.0,cy:517.3,active:false},{col:14,row:7,cx:1004.0,cy:593.5,active:false},{col:14,row:8,cx:1004.0,cy:669.7,active:false},{col:15,row:1,cx:1070.0,cy:174.3,active:false},{col:15,row:2,cx:1070.0,cy:250.5,active:false},{col:15,row:3,cx:1070.0,cy:326.7,active:false},{col:15,row:4,cx:1070.0,cy:402.9,active:false},{col:15,row:5,cx:1070.0,cy:479.2,active:false},{col:15,row:6,cx:1070.0,cy:555.4,active:false},{col:15,row:7,cx:1070.0,cy:631.6,active:false},{col:16,row:1,cx:1136.0,cy:136.2,active:false},{col:16,row:2,cx:1136.0,cy:212.4,active:false},{col:16,row:3,cx:1136.0,cy:288.6,active:false},{col:16,row:4,cx:1136.0,cy:364.8,active:false},{col:16,row:5,cx:1136.0,cy:441.1,active:false},{col:16,row:6,cx:1136.0,cy:517.3,active:false},{col:16,row:7,cx:1136.0,cy:593.5,active:false},{col:16,row:8,cx:1136.0,cy:669.7,active:false},{col:17,row:1,cx:1202.0,cy:174.3,active:false},{col:17,row:2,cx:1202.0,cy:250.5,active:false},{col:17,row:3,cx:1202.0,cy:326.7,active:false},{col:17,row:4,cx:1202.0,cy:402.9,active:false},{col:17,row:5,cx:1202.0,cy:479.2,active:false},{col:17,row:6,cx:1202.0,cy:555.4,active:false},{col:17,row:7,cx:1202.0,cy:631.6,active:false},{col:18,row:1,cx:1268.0,cy:136.2,active:false},{col:18,row:2,cx:1268.0,cy:212.4,active:false},{col:18,row:3,cx:1268.0,cy:288.6,active:false},{col:18,row:4,cx:1268.0,cy:364.8,active:false},{col:18,row:5,cx:1268.0,cy:441.1,active:false},{col:18,row:6,cx:1268.0,cy:517.3,active:false},{col:18,row:7,cx:1268.0,cy:593.5,active:false},{col:18,row:8,cx:1268.0,cy:669.7,active:false}];


const REGIONS = [
  {id:'r01',name:'North America',color:'#2e2a18',borderColor:'#b8982a',size:7},
  {id:'r02',name:'Greenland',color:'#22222e',borderColor:'#9999bb',size:2},
  {id:'r03',name:'Central America',color:'#162214',borderColor:'#4a8840',size:2},
  {id:'r04',name:'South America',color:'#241a32',borderColor:'#7a44bb',size:7},
  {id:'r05',name:'Europe',color:'#1a2800',borderColor:'#88cc00',size:7},
  {id:'r06',name:'Russia',color:'#102020',borderColor:'#3a8888',size:6},
  {id:'r07',name:'Middle East',color:'#281808',borderColor:'#bb7018',size:3},
  {id:'r08',name:'Africa',color:'#280e0e',borderColor:'#bb2a2a',size:8},
  {id:'r09',name:'Asia',color:'#101828',borderColor:'#3366aa',size:7},
  {id:'r10',name:'Southeast Asia',color:'#0e2018',borderColor:'#2a9955',size:2},
  {id:'r11',name:'Oceania',color:'#0c1a24',borderColor:'#1a88bb',size:5},
  {id:'r12',name:'Antarctica',color:'#1e1e28',borderColor:'#8888bb',size:3},
];
// Total: 5+4+6+5+6+4+5+5+7+4+5+4 = 65... adjust to 60
// Actual: r01=5,r02=4,r03=5,r04=5,r05=6,r06=4,r07=5,r08=4,r09=7,r10=4,r11=5,r12=3 = 57... let me use: 6+4+5+5+6+4+5+5+6+4+5+5=60 ✓
const REGION_SIZES = { r01:6, r02:4, r03:5, r04:5, r05:6, r06:4, r07:5, r08:5, r09:6, r10:4, r11:5, r12:5 }; // Total: 60 ✓

// ── FACTION DATA ──────────────────────────────────────────────
const FDATA = {
  imp:{ name:'IMPERATORS',   color:'#C8A800', dimColor:'#3a3000', leader:'Augustus XXVII',
    ability:'IMPERIAL DEFENSE', abilityDesc:'+1 a todos los dados de defensa',
    goal:'PAX AUGUSTA', goalDesc:'Controla 5 regiones completas (fin de turno)' },
  lib:{ name:'LIBERTOS',     color:'#4A7C3F', dimColor:'#0f2010', leader:'Vance Cruz',
    ability:'SCORCHED EARTH', abilityDesc:'Por cada Nuclear destruido: gana 1 Misil + 1 Mech + 2 Pu. El Mech se coloca en ese territorio.',
    goal:'TOTAL BLACKOUT', goalDesc:'Nucleares en tablero ≤ nº jugadores (fin de turno)' },
  clt:{ name:'TAL-MAUT',     color:'#8B1A1A', dimColor:'#200505', leader:'Malak-Maut',
    ability:'HOLY WAR', abilityDesc:'+1 a todos los dados de ataque',
    goal:'THE GREAT OFFERING', goalDesc:'Elimina a 2 jugadores enemigos (fin de turno)' },
  erb:{ name:'EREBUS SWARM', color:'#5555aa', dimColor:'#0d0d2a', leader:'IA Colmena',
    ability:'HIVE MIND', abilityDesc:'Coloca refuerzos en cualquier territorio propio aunque no tenga Nuclear',
    goal:'EQUATION ZERO', goalDesc:'Nuclear en 7 regiones distintas (fin de turno)' },
  prm:{ name:'PROMETHEUS',   color:'#1B4F8A', dimColor:'#050f20', leader:'Skye Apex',
    ability:'ADVANCED REACTOR', abilityDesc:'+1 Plutonio extra por cada Nuclear Base que controlas',
    goal:'TERRAFORMATION', goalDesc:'Controla la mitad de los Nucleares del tablero (fin de turno)' },
  shn:{ name:'SHININ',       color:'#b0b0b0', dimColor:'#1e1e20', leader:'Shin Khang',
    ability:'MASS CLONING', abilityDesc:'+1 soldado extra por cada Nuclear Base que controlas',
    goal:'GENETIC SUPREMACY', goalDesc:'Mayor ejército (AP) en 7 regiones distintas (inicio de turno)' },
};

// Starting assets by player count

// ════════════════════════════════════════════════════════════════
// GAME RULES CONFIG — editable at runtime via Rules Editor
// ════════════════════════════════════════════════════════════════
const DEFAULT_RULES = {
  // ── SETUP ─────────────────────────────────────────────────────
  setup: {
    steps: ['roll','claim','deploy'],
    startingAssets: {
      3: {soldiers:60, mechs:4, missiles:2, nukes:4, territories:20, plutonium:0},
      4: {soldiers:45, mechs:3, missiles:2, nukes:3, territories:15, plutonium:0},
      5: {soldiers:36, mechs:2, missiles:2, nukes:2, territories:12, plutonium:0},
      6: {soldiers:30, mechs:2, missiles:2, nukes:2, territories:10, plutonium:0},
    },
    // Libertos: swap starting nukes → +3 Pu + 2 mechs (PDF V3)
    libertosSwap: { enabled:true, plutonium:3, mechs:2 },
    // Setup phase config: perTurn=each player does 1 action; combinedWith=do next phase in same turn
    phases: [
      { id:'claim',    label:'Reclamar Territorio', perTurn:true,  combinedWith:false },
      { id:'nuclear',  label:'Colocar Nucleares',   perTurn:false, combinedWith:true  },
      { id:'soldiers', label:'Distribuir Soldados', perTurn:false, combinedWith:false },
    ],
  },
  // ── PREPARATION ───────────────────────────────────────────────
  prep: {
    phases: ['income','reinf','upgrade','move','miss','nuclear'],
    phaseLabels: { income:'Plutonio y Refuerzos', reinf:'Colocación', upgrade:'Mejoras', move:'Movimiento', miss:'Misiles', nuclear:'Nucleares' },
    plutoniumPerNuclear: 2,
    nuclearBuildCost: 4,          // PDF: 4 Pu
    reinforcements: {
      perTwoTerritories: 1,       // +1 per 2 territories
      perTwoTerritoriesFullRegion: 1, // +1 per 2 territories in fully controlled region
      perNuclear: 1,              // +1 per Nuclear Base
    },
    placement: {
      onlyInNuclearTerritories: true,
      ereubsAnywhereOverride: true,
      fallbackOnePerRegion: true,
    },
    upgrades: {
      mechCost: {soldiers:3, plutonium:1},
      aircraftCost: {soldiers:3, plutonium:1},
      scorpionCost: {mechs:2, plutonium:1},
      maxAircraft: 5,
    },
    movementRange: 2,             // PDF: up to 2 territories
    missileBuildCost: 1,
    maxMissiles: 5,
    buildBeforeFire: true,
  },
  // ── COMBAT ────────────────────────────────────────────────────
  combat: {
    maxAttackDice: 5,
    maxDefenseDice: 4,
    tieBreakerDefender: true,
    unitDice: {soldier:6, mech:12, aircraft:12, scorpion:20},
    allowUnitSelection: true,
    allowRetreat: true,
    missileInterceptDie: 6,
    missileInterceptThreshold: 4,
    // PDF: sol=auto, mech=D6≥5, aircraft=D6≥5, scorpion=D6=6
    missileTargets: {soldier:'auto', mech:5, aircraft:5, scorpion:6},
  },
  // ── END PHASE ─────────────────────────────────────────────────
  end: {
    phases: ['regroup','maint'],
    phaseLabels: { regroup:'Reagrupamiento', maint:'Mantenimiento' },
    maintenanceDie: 12,           // PDF: D12
    maintenanceExplosionOn: 1,    // PDF: result 1 = explosion
    maintenanceEnabled: true,
    explosionSpareAircraft: true,
    explosionOneGroundSurvives: true,
  },
  // ── VICTORY ───────────────────────────────────────────────────
  victory: {
    imp: { enabled:true, fullRegions:5 },
    lib: { enabled:true },
    clt: { enabled:true, armiesEliminated:2 },
    erb: { enabled:true, nuclearRegions:7 },
    prm: { enabled:true, nuclearHalf:true },
    shn: { enabled:true, largestArmyRegions:7 },
  },
};

// Deep-copy for runtime editing
let RULES = JSON.parse(JSON.stringify(DEFAULT_RULES));


const SETUP = {
  3:{ soldiers:60, mechs:4, missiles:2, nukes:4, territories:20 },
  4:{ soldiers:45, mechs:3, missiles:2, nukes:3, territories:15 },
  5:{ soldiers:36, mechs:2, missiles:2, nukes:2, territories:12 },
  6:{ soldiers:30, mechs:2, missiles:2, nukes:2, territories:10 },
};

// ── TERRITORY MAP — 60 territories across 12 regions ─────────────
// Each territory: id, name, region, cx, cy (center in SVG 1400x780), shape path
// Built as an apocalyptic Earth with continent silhouettes


// Verify count
console.assert(TERRITORIES_DEF.length === 59, 'Expected 59 territories, got ' + TERRITORIES_DEF.length);

// ── GAME STATE ─────────────────────────────────────────────────
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

// ── INIT ───────────────────────────────────────────────────────


// ════════════════════════════════════════════════════════════════
// SETUP PHASE
// Steps are defined in SETUP_STEPS array — reorder freely
// ════════════════════════════════════════════════════════════════

// ── STEP ORDER: change sequence here ────────────────────────────
