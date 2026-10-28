const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function engine() {
  const overlays = [];
  const timers = [];
  const ctx = vm.createContext({
    console, setTimeout(fn) { timers.push(fn); }, clearTimeout() {},
    document: {
      getElementById() { return null; },
      createElement() { return { style: {}, setAttribute() {} }; },
      body: { appendChild(el) { overlays.push(el); } }
    }
  });
  for (const file of ['data', 'battle', 'engine']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'), ctx);
  }
  vm.runInContext(`
    addLog = flashScreen = updatePhaseBanner = refreshCards = updateMap = () => {};
    G.setup = { order: ['imp', 'lib', 'clt'] };
    G.pf = 'imp'; G.round = 1; G.phase = 'end';
    G.factions = { imp: {alive:true}, lib: {alive:true}, clt: {alive:true} };
    G.territories = { a: {owner:'imp'}, b: {owner:'clt'} };
    RULES.victory = {};
  `, ctx);
  return { run: code => vm.runInContext(code, ctx), overlays, flush: () => { let count=0; while(timers.length) {if(count++>20000)throw Error('Temporizadores sin terminación');timers.shift()();} } };
}

test('la victoria registra al vencedor y solo muestra un resultado', () => {
  const e = engine();
  e.run("G.factions.lib.alive=false; G.factions.clt.alive=false; checkWinCondition(); checkWinCondition();");
  assert.equal(e.run('G.result.winner'), 'imp');
  assert.equal(e.run('G.gameOver'), true);
  assert.equal(e.overlays.length, 1);
});

test('la eliminación se acredita al atacante una sola vez', () => {
  const e = engine();
  e.run("checkElimination('lib', 'clt'); checkElimination('lib', 'clt');");
  assert.equal(e.run('G.factions.clt.eliminatedArmies'), 1);
  assert.equal(e.run('G.factions.imp.eliminatedArmies || 0'), 0);
});

test('la rotación omite eliminados y cuenta la vuelta de ronda', () => {
  const e = engine();
  e.run("G.factions.lib.alive=false; G_step.phase='end'; G_step.currentFk='imp'; startPhase=(phase,fk)=>{G_step.currentFk=fk}; endPhaseForFaction();");
  assert.equal(e.run('G_step.currentFk'), 'clt');
  e.run('endPhaseForFaction()');
  assert.equal(e.run('G_step.currentFk'), 'imp');
  assert.equal(e.run('G.round'), 2);
});

test('las transiciones pendientes no avanzan una partida finalizada', () => {
  const e = engine();
  e.run("declareWin('clt', 'Prueba'); G_step.idx=2; nextStep(); startPhase('prep','lib'); endPhaseForFaction();");
  assert.equal(e.run('G_step.idx'), 2);
  assert.equal(e.run('G.phase'), 'finished');
  assert.equal(e.run('G.result.winner'), 'clt');
});

test('un invitado online no ejecuta ingresos ni pasos CPU', () => {
  const e = engine();
  e.run("ONLINE={isOnline:()=>true,isHost:()=>false}; G_step.currentFk='clt'; G_step.isMyTurn=false; G_step.phase='prep'; G_step.idx=0; updateStepUI=()=>{}; _showSpectatorStep=()=>{}; executeAutoStep=executeCpuStep=()=>{throw Error('Ejecución sin autoridad')}; runCurrentStep();");
});

test('la entrada HTML conserva la función de victoria del motor', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.doesNotMatch(html, /function declareVictory\s*\(/);
});

test('el resultado remoto se muestra sin emitir una victoria de vuelta', () => {
  const e = engine();
  e.run("ONLINE={isOnline:()=>true,pushActionWithState:()=>{throw Error('eco')},signalGameEnd:()=>{throw Error('eco')}}; declareWin('clt', 'Remoto', false);");
  assert.equal(e.run('G.result.winner'), 'clt');
  assert.equal(e.overlays.length, 1);
});

test('el protocolo remoto aplica NEXT_STEP exactamente una vez', () => {
  const e = engine();
  const source = fs.readFileSync(path.join(__dirname, '../js/online.js'), 'utf8');
  const instrumented = source.replace('    signalGameEnd,', '    _handleRemoteAction, _serializeG,\n    signalGameEnd,');
  e.run(instrumented);
  e.run("let visited=[]; runCurrentStep=()=>visited.push(G_step.idx); ONLINE._handleRemoteAction({type:'NEXT_STEP',payload:{idx:3}});");
  assert.equal(e.run('G_step.idx'), 3);
  assert.equal(e.run('visited.join()'), '3');
});

test('el snapshot incluye el resultado y la recepción finaliza sin eco', () => {
  const e = engine();
  const source = fs.readFileSync(path.join(__dirname, '../js/online.js'), 'utf8');
  e.run(source.replace('    signalGameEnd,', '    _handleRemoteAction, _serializeG,\n    signalGameEnd,'));
  e.run("ONLINE._handleRemoteAction({type:'FULL_SYNC',payload:{_G:{gameOver:true,result:{winner:'clt',goal:'Remoto',round:1}}}});");
  assert.equal(e.run('ONLINE._serializeG().result.winner'), 'clt');
  assert.equal(e.run('ONLINE._serializeG().gameOver'), true);
  assert.equal(e.overlays.length, 1);
});

function withSetup() {
  const e = engine();
  e.run(fs.readFileSync(path.join(__dirname, '../js/setup.js'), 'utf8'));
  e.run("G.setup.soldiersLeft={imp:1}; G.setup.nukesLeft={imp:1}; G.setup.deployIdx=0; G.setup._inSetup=true; G.factions.imp.soldiers=1; G.factions.imp.mechs=0; G.territories.a.soldiers=1; setupLog=()=>{};");
  return e;
}

test('la colocación manual no salta al flujo antiguo de soldados', () => {
  const e = withSetup();
  e.run("setupStep_Deploy_ForFaction=()=>{}; setupStep_Soldiers_Next=()=>{throw Error('Ruta antigua')}; setupStep_Soldiers_ForFaction=()=>{throw Error('Ruta antigua')}; doPlaceSoldier('imp','a',1);");
  e.flush();
  assert.equal(e.run('G.setup.soldiersLeft.imp'), 0);
  assert.equal(e.run('G.setup.nukesLeft.imp'), 1);
  assert.equal(e.run('G.setup.orderIdx || 0'), 0);
});

test('endSetupPhase impide iniciar si queda una central obligatoria', () => {
  const e = withSetup();
  e.run("G.setup.soldiersLeft.imp=0; let resumed=false; setupStep_Deploy_Next=()=>{resumed=true}; endSetupPhase();");
  assert.equal(e.run('G.setup._inSetup'), true);
  assert.equal(e.run('resumed'), true);
});

test('la colocación manual rechaza cantidades negativas y territorios ajenos', () => {
  const e = withSetup();
  e.run("doPlaceSoldier('imp','a',-4); doPlaceSoldier('imp','b',1);");
  assert.equal(e.run('G.territories.a.soldiers'), 1);
  assert.equal(e.run('G.setup.soldiersLeft.imp'), 1);
});

for (const playerCount of [3,4,5,6]) {
  test(`setup ${playerCount}J conserva reservas y coloca centrales automáticamente`, () => {
    const e = withSetup();
    e.run(fs.readFileSync(path.join(__dirname, '../js/map.js'), 'utf8'));
    e.run(`G.playerCount=${playerCount}; G.territories={}; initGame(); G.setup.order=Object.keys(FDATA).slice(0,${playerCount});
      G.setup.soldiersLeft={}; G.setup.nukesLeft={};
      G.setup.order.forEach(fk=>{G.setup.soldiersLeft[fk]=G.factions[fk].soldiers; G.setup.nukesLeft[fk]=G.factions[fk].nukes});
      TERRITORIES_DEF.forEach((td,i)=>{const fk=G.setup.order[i%G.setup.order.length]; G.territories[td.id].owner=fk; G.territories[td.id].soldiers=1; G.setup.soldiersLeft[fk]--; G.factions[fk].soldiers--});
      G.setup.order.forEach(fk=>{_autoDistributeFaction(fk); placeSetupNuclearsAutomatically(fk)});`);
    for (const fk of e.run('G.setup.order')) {
      assert.equal(e.run(`G.setup.soldiersLeft['${fk}']`), 0);
      assert.equal(e.run(`G.setup.nukesLeft['${fk}']`), 0);
      assert.equal(e.run(`Object.values(G.territories).filter(t=>t.owner==='${fk}').reduce((n,t)=>n+t.soldiers,0)`),
        e.run(`RULES.setup.startingAssets[${playerCount}].soldiers`));
    }
  });
}

test('automatizar centrales no borra reservas imposibles de colocar', () => {
  const e=withSetup();
  e.run("G.setup.nukesLeft.imp=3; placeSetupNuclearsAutomatically('imp');");
  assert.equal(e.run('G.setup.nukesLeft.imp'), 2);
  assert.equal(e.run('G.territories.a.hasNuclear'), true);
});

function completeEngine(){
  const e=engine();
  e.run(fs.readFileSync(path.join(__dirname,'../js/combat.js'),'utf8'));
  e.run(fs.readFileSync(path.join(__dirname,'../js/map.js'),'utf8'));
  e.run(`G.playerCount=6;G.territories={};initGame();G.setup={order:Object.keys(FDATA),_inSetup:false};
    RULES.victory=JSON.parse(JSON.stringify(DEFAULT_RULES.victory));
    Object.values(G.territories).forEach(t=>{t.owner='clt';t.soldiers=1});
    G_step.currentFk='imp';G_step.phase='prep';G_step.idx=0;G_step.isMyTurn=true;`);
  // Engine-only tests replace presentation, retaining the real round/timer/completion lifecycle.
  e.run(`openCombatModal=()=>{const c=G_combat;c.stage='ready';c.presentation=(c.presentation||0)+1;
    c.attSelected=buildPool(G.territories[c.srcId]).slice(0,Math.min(Battle.count(G.territories[c.srcId])-1,RULES.combat.maxAttackDice));
    c.defSelected=buildPool(G.territories[c.targetId]).slice(0,RULES.combat.maxDefenseDice);scheduleCombat(c,resolveCombatRound,900)};
    displayBattleResult=()=>{};closeDice=()=>{G_combat=null};const getElement=document.getElementById;document.getElementById=id=>id==='btn-roll'?{style:{}}:getElement(id);`);
  return e;
}
const victoryFixtures={
 imp:`TERRITORIES_DEF.filter(t=>['r01','r02','r03','r04','r05'].includes(t.region)).forEach(t=>G.territories[t.id].owner='imp')`,
 lib:`Object.values(G.territories).slice(0,3).forEach(t=>t.hasNuclear=true)`,
 clt:`G.factions.clt.eliminatedArmies=2`,
 erb:`REGIONS.slice(0,7).forEach(r=>{const t=Object.values(G.territories).find(t=>t.region===r.id);t.owner='erb';t.hasNuclear=true})`,
 prm:`Object.values(G.territories).slice(0,8).forEach((t,i)=>{t.hasNuclear=true;if(i<4)t.owner='prm'})`,
 shn:`REGIONS.slice(0,7).forEach(r=>{const t=Object.values(G.territories).find(t=>t.region===r.id);t.owner='shn';t.soldiers=50})`
};
for(const [fk,fixture]of Object.entries(victoryFixtures)) {
 test(`victoria ${fk} solo en su turno y momento V3`,()=>{
  const e=completeEngine();e.run(fixture);
  e.run(`checkWinCondition('elimination','${fk}');checkWinCondition('${fk==='imp'?'end':'start'}','${fk}');checkWinCondition('${fk==='imp'?'start':'end'}','${fk==='clt'?'imp':'clt'}')`);
  assert.equal(e.run('!!G.gameOver'),false);
  e.run(`checkWinCondition('${fk==='imp'?'start':'end'}','${fk}')`);
  assert.equal(e.run('G.result.winner'),fk);
 });
 test(`facción eliminada ${fk} no gana su objetivo`,()=>{
  const e=completeEngine();e.run(fixture);e.run(`G.factions.${fk}.alive=false;checkWinCondition('${fk==='imp'?'start':'end'}','${fk}')`);
  assert.equal(e.run('!!G.gameOver'),false);
 });
}
test('condiciones no cumplidas, mitad impar redondeada y cero bases',()=>{
 const e=completeEngine();e.run(`G.factions.clt.eliminatedArmies=1;REGIONS.slice(0,4).forEach(r=>TERRITORIES_DEF.filter(t=>t.region===r.id).forEach(t=>G.territories[t.id].owner='imp'));
 Object.values(G.territories).slice(0,9).forEach((t,i)=>{t.hasNuclear=true;if(i<4)t.owner='prm'});
 checkWinCondition('start','imp');checkWinCondition('end','clt');checkWinCondition('end','prm');checkWinCondition('end','lib');checkWinCondition('end','erb');checkWinCondition('end','shn');`);
 assert.equal(e.run('!!G.gameOver'),false);
 e.run("Object.values(G.territories).forEach(t=>t.hasNuclear=false);checkWinCondition('end','prm')");assert.equal(e.run('!!G.gameOver'),false);
});
test('turno completo CPU avanza sin intervención hasta el siguiente humano',()=>{
 const e=completeEngine();e.run(`RULES.victory={};G.factions.clt.plutonium=10;G.setup.order=['clt','imp'];G.pf='imp';G.setup._inSetup=false;
 Object.values(G.territories).forEach(t=>{t.adj=[];t.hasNuclear=false});
 updateStepUI=()=>{};executePlayerStep=()=>{};startPhase('prep','clt');`);
 e.flush();assert.equal(e.run('G_step.currentFk'),'imp');assert.equal(e.run('G_step.phase'),'prep');
 assert.equal(e.run('G.factions.clt.pendingSoldiers'),0);
 assert.ok(e.run("Object.values(G.territories).some(t=>t.mechs>0)"));
});
test('temporizador obsoleto y botón humano no saltan turnos CPU',()=>{
 const e=completeEngine();e.run(`let fired=0;G_step.isMyTurn=false;G_step.idx=2;nextStep();scheduleStepAction(()=>fired++,10);G_step.idx=3;`);
 e.flush();assert.equal(e.run('fired'),0);assert.equal(e.run('G_step.idx'),3);
});
test('repetir runCurrentStep no duplica CPU o ingresos',()=>{
 const e=completeEngine();e.run(`let times=0;G_step.currentFk='clt';G_step.isMyTurn=false;G_step.idx=1;executeCpuStep=()=>times++;updateStepUI=()=>{};runCurrentStep();runCurrentStep();`);
 assert.equal(e.run('times'),1);
});
test('combate CPU–CPU termina por rondas y notifica una sola vez (presentación sustituida)',()=>{
 const e=completeEngine();e.run(`RULES.victory={};G.territories={'a':{id:'a',owner:'clt',adj:['b'],soldiers:20,mechs:0,aircraft:0,scorpions:0},'b':{id:'b',owner:'lib',adj:['a'],soldiers:1,mechs:0,aircraft:0,scorpions:0}};
 let completed=0;clearAttackFlash=()=>{};openDiceCpu('a','b','clt',()=>completed++);`);
 e.flush();assert.equal(e.run('completed'),1);assert.ok(e.run('G_combat.history.length>0'));assert.ok(e.run("Battle.count(G.territories.a)>=1"));
});
for(const survivor of ['soldiers','mechs','scorpions'])test(`explosión conserva exactamente un ${survivor} elegido`,()=>{
 const e=completeEngine();e.run(`G.setup.order=['imp','clt'];let t={id:'a',owner:'imp',soldiers:5,mechs:2,aircraft:0,scorpions:3,hasNuclear:true};resolveNuclearExplosion(t,'${survivor}')`);
 assert.equal(e.run('Battle.count(t)'),1);assert.equal(e.run(`t.${survivor}`),1);assert.equal(e.run('t.hasNuclear'),false);
});
test('explosión con aircraft conserva solo los aviones, sin fabricar soldados',()=>{
 const e=completeEngine();e.run(`G.setup.order=['imp','clt'];let t={id:'a',owner:'imp',soldiers:5,mechs:2,aircraft:2,scorpions:3,hasNuclear:true};resolveNuclearExplosion(t)`);
 assert.equal(e.run('Battle.count(t)'),2);assert.equal(e.run('t.aircraft'),2);assert.equal(e.run('t.soldiers'),0);
});
test('mantenimiento CPU usa tirada de cada base y ejecuta callback una vez',()=>{
 const e=completeEngine();e.run(`G.setup.order=['imp','clt'];G_step.currentFk='clt';G_step.phase='end';G_step.idx=1;G_step.isMyTurn=false;
 Object.values(G.territories).forEach((t,i)=>{t.owner='clt';t.hasNuclear=i<2});let i=0;Math.random=()=>i++===0?0:0.9;let completed=0;
 runMaintenanceRollsFor('clt',()=>completed++);runMaintenanceRollsFor('clt',()=>completed++);`);
 assert.equal(e.run('completed'),1);assert.equal(e.run('Object.values(G.territories)[0].hasNuclear'),false);assert.equal(e.run('Object.values(G.territories)[1].hasNuclear'),true);
});
test('última unidad blindada protegida y Aircraft impactado con 5',()=>{
 const e=completeEngine();e.run(`let target=G.territories[TERRITORIES_DEF[0].id];target.owner='clt';target.soldiers=0;target.mechs=1;target.aircraft=0;target.scorpions=0;let before=G.factions.imp.missiles;let blocked=launchMissile('imp',target.id,'mechs',false,()=>0.99);`);
 assert.equal(e.run('blocked'),null);assert.equal(e.run('G.factions.imp.missiles===before'),true);
 e.run(`target.mechs=0;target.aircraft=2;let impact=launchMissile('imp',target.id,'aircraft',false,()=>0.7);`);
 assert.equal(e.run('impact.roll'),5);assert.equal(e.run('impact.killed'),true);assert.equal(e.run('target.aircraft'),1);
});
test('intercepción usa regla del dado y consume ambos misiles sin bajas',()=>{
 const e=completeEngine();e.run(`let target=Object.values(G.territories)[0];target.soldiers=3;RULES.combat.missileInterceptDie=12;let result=launchMissile('imp',target.id,'soldiers',true,()=>0.5)`);
 assert.equal(e.run('result.interceptRoll'),7);assert.equal(e.run('result.intercepted'),true);assert.equal(e.run('target.soldiers'),3);assert.equal(e.run('G.factions.imp.missiles'),1);assert.equal(e.run('G.factions.clt.missiles'),1);
});
test('mejoras consumen tropas del tablero y costes configurados',()=>{
 const e=completeEngine();e.run(`let t=Object.values(G.territories)[0];t.owner='imp';t.soldiers=10;G.factions.imp.plutonium=10;RULES.prep.upgrades.mechCost={soldiers:4,plutonium:3};let applied=applyUpgrade('imp',t.id,'mech')`);
 assert.equal(e.run('applied'),true);assert.equal(e.run('t.soldiers'),6);assert.equal(e.run('t.mechs'),1);assert.equal(e.run('G.factions.imp.plutonium'),7);
});
test('refuerzos fallback no se reparten en dos territorios de la misma región',()=>{
 const e=completeEngine();e.run(`G.factions.clt.pendingSoldiers=60;distributeReinforcements('clt')`);
 assert.equal(e.run('G.factions.clt.pendingSoldiers'),0);
 assert.equal(e.run('REGIONS.every(r=>Object.values(G.territories).filter(t=>t.region===r.id&&t.soldiers>1).length<=1)'),true);
});
test('Erebus puede autorreforzar fuera de bases y el resto solo en bases',()=>{
 const e=completeEngine();e.run(`Object.values(G.territories).forEach(t=>t.owner='erb');Object.values(G.territories)[0].hasNuclear=true`);
 assert.equal(e.run("reinforcementTargets('erb').length"),60);
 e.run(`Object.values(G.territories).forEach(t=>t.owner='clt')`);assert.equal(e.run("reinforcementTargets('clt').length"),1);
});
test('Aircraft transporta hasta tres soldados o un mech a territorio distante',()=>{
 const e=completeEngine();e.run(`G_step.idx=3;let a=Object.values(G.territories)[0],b=Object.values(G.territories).at(-1);a.owner=b.owner='imp';a.soldiers=5;a.aircraft=1;a.mechs=1;let denied=transferUnits(a.id,b.id,{aircraft:1,soldiers:4});let valid=transferUnits(a.id,b.id,{aircraft:1,soldiers:3});`);
 assert.equal(e.run('denied'),false);assert.equal(e.run('valid'),true);assert.equal(e.run('a.soldiers'),2);assert.equal(e.run('b.aircraft'),1);
});

for(const count of [3,4,5,6]) test(`simulación del motor: partida completa ${count}J sin UI ni ganador impuesto`,()=>{
 const e=completeEngine();
 e.run(fs.readFileSync(path.join(__dirname,'../js/setup.js'),'utf8'));
 e.run(`G.playerCount=${count};G.round=1;G.territories={};initGame();G.setup={order:Object.keys(FDATA).slice(0,${count}),_inSetup:false,soldiersLeft:{},nukesLeft:{}};
 G.pf='observer';G_step={idx:0,phase:'prep',isMyTurn:false};G.awaitingStart=false;
 let seed=100+${count};Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 G.setup.order.forEach(fk=>{G.setup.soldiersLeft[fk]=G.factions[fk].soldiers;G.setup.nukesLeft[fk]=G.factions[fk].nukes});
 TERRITORIES_DEF.forEach((td,i)=>{const t=G.territories[td.id],fk=G.setup.order[i%${count}];t.owner=fk;t.soldiers=1;G.setup.soldiersLeft[fk]--;G.factions[fk].soldiers--});
 G.setup.order.forEach(fk=>{_autoDistributeFaction(fk);placeSetupNuclearsAutomatically(fk)});
 updateStepUI=()=>{};clearAttackFlash=flashAttackedTerritory=()=>{};
 startPhase('prep',G.setup.order[0]);`);
 e.flush();assert.equal(e.run('G.gameOver'),true);assert.ok(e.run('G.setup.order.includes(G.result.winner)'));
 assert.ok(e.run('G.round<300'));assert.ok(e.run('Object.values(G.territories).every(t=>t.owner&&Battle.count(t)>=1)'));
});

test('ataque con 2 unidades y elección de guarnición no deja territorios vacíos',()=>{
 const e=completeEngine();e.run(`RULES.victory={};G.territories={a:{id:'a',owner:'clt',adj:['b'],soldiers:0,mechs:2,aircraft:0,scorpions:0},b:{id:'b',owner:'lib',adj:['a'],soldiers:1,mechs:0,aircraft:0,scorpions:0}};clearAttackFlash=()=>{};Math.random=()=>0.99;openDiceCpu('a','b','clt');`);
 e.flush();assert.equal(e.run("G.territories.b.owner"),'clt');assert.equal(e.run('Battle.count(G.territories.a)'),1);assert.equal(e.run('Battle.count(G.territories.b)'),1);
});

for(const [fk,fixture]of Object.entries(victoryFixtures))test(`hook de transición evalúa victoria ${fk} antes de ejecutar otro turno`,()=>{
 const e=completeEngine();e.run(fixture);
 if(fk==='imp')e.run("startPhase('prep','imp')");
 else e.run(`G_step.currentFk='${fk}';G_step.phase='end';G_step.idx=2;endPhaseForFaction()`);
 assert.equal(e.run('G.result.winner'),fk);
});
test('tiradas de setup duplicadas u obsoletas no consumen otro resultado',()=>{
 const e=withSetup();e.run(`G.setup._stepIdx=0;G.setup.rollGeneration=1;G.setup.rollResults={};let rolls=0;rollFor=()=>rolls++;scheduleSetupRoll('lib',10);scheduleSetupRoll('lib',10)`);
 e.flush();assert.equal(e.run('rolls'),1);
 e.run(`scheduleSetupRoll('clt',10);G.setup.rollGeneration=2`);e.flush();assert.equal(e.run('rolls'),1);
});
test('fases bloquean saltos durante setup, refuerzos pendientes y mantenimiento no resuelto',()=>{
 const e=completeEngine();e.run(`G.setup._inSetup=true;nextStep();G.setup._inSetup=false;G_step.idx=1;G.factions.imp.pendingSoldiers=4;nextStep()`);assert.equal(e.run('G_step.idx'),1);
 e.run(`G_step.phase='end';G_step.idx=1;Object.values(G.territories)[0].owner='imp';Object.values(G.territories)[0].hasNuclear=true;nextStep()`);assert.equal(e.run('G_step.idx'),1);
});

test('callbacks de setup finalizado no reabren despliegue ni reclaman territorios',()=>{
 const e=withSetup();e.run(`G.setup._inSetup=false;G.setup._stepIdx=1;G.territories.b.owner=null;let soldierBefore=G.setup.soldiersLeft.imp;doClaimTerritory('imp','b');doPlaceSoldier('imp','a',1);endSetupPhase()`);
 assert.equal(e.run('G.territories.b.owner'),null);assert.equal(e.run('G.setup.soldiersLeft.imp===soldierBefore'),true);
});
test('configuración inválida no puede dejar a CPU mejorando indefinidamente',()=>{
 const e=completeEngine();e.run(`RULES.prep.upgrades.mechCost={soldiers:0,plutonium:0};G.territories['01_01'].owner='imp';let upgraded=applyUpgrade('imp','01_01','mech')`);assert.equal(e.run('upgraded'),false);
});

test('editor rechaza dados/cantidades imposibles y no cambia reglas en partida',()=>{
 const e=engine();e.run(fs.readFileSync(path.join(__dirname,'../js/ui.js'),'utf8'));
 e.run(`G.setup.order=[];let invalid=setRule('combat.maxAttackDice',0);let malformed=setRule('prep.upgrades.mechCost.soldiers',-1);let accepted=setRule('prep.nuclearBuildCost',4);G.setup.order=['imp'];let locked=setRule('prep.nuclearBuildCost',1)`);
 assert.equal(e.run('invalid'),false);assert.equal(e.run('malformed'),false);assert.equal(e.run('accepted'),true);assert.equal(e.run('locked'),false);assert.equal(e.run('RULES.prep.nuclearBuildCost'),4);
});

test('reclamación y tiradas fuera del turno/etapa se rechazan',()=>{
 const e=withSetup();e.run(`G.setup.orderIdx=0;G.setup._stepIdx=1;G.territories.b.owner=null;doClaimTerritory('lib','b');G.setup.rollResults={};_applyRoll('lib',6);G.setup._inSetup=false;_applyRoll('imp',6)`);
 assert.equal(e.run('G.territories.b.owner'),null);assert.equal(e.run('Object.keys(G.setup.rollResults).length'),0);
});

test('mantenimiento desactivado no tira dados ni abre modal y avanza una vez',()=>{
 const e=completeEngine();e.run(`RULES.end.maintenanceEnabled=false;Math.random=()=>{throw Error('No deben tirarse dados')};let completed=0;runMaintenanceRollsFor('imp',()=>completed++);runMaintenanceRollsFor('imp',()=>completed++)`);assert.equal(e.run('completed'),1);
});

test('Libertos solo recibe recompensa al destruir una base propia y coloca mech inmediato',()=>{
 const e=completeEngine();e.run(`let own=Object.values(G.territories)[0],enemy=Object.values(G.territories)[1];own.owner='lib';own.hasNuclear=true;own.soldiers=3;enemy.owner='imp';enemy.hasNuclear=true;let beforePu=G.factions.lib.plutonium;let beforeMiss=G.factions.lib.missiles;resolveNuclearExplosion(enemy,'soldiers')`);
 assert.equal(e.run('G.factions.lib.plutonium'),e.run('beforePu'));assert.equal(e.run('G.factions.lib.missiles'),e.run('beforeMiss'));
 e.run(`resolveNuclearExplosion(own,'soldiers')`);assert.equal(e.run('own.soldiers'),1);assert.equal(e.run('own.mechs'),1);assert.equal(e.run('G.factions.lib.plutonium'),e.run('beforePu+2'));assert.equal(e.run('G.factions.lib.missiles'),e.run('beforeMiss+1'));
 e.run(`resolveNuclearExplosion(own,'soldiers')`);assert.equal(e.run('own.mechs'),1);
});
test('Shinin no gana empatando AP en siete regiones',()=>{
 const e=completeEngine();e.run(`REGIONS.slice(0,7).forEach(r=>{const ts=Object.values(G.territories).filter(t=>t.region===r.id);ts.forEach(t=>t.soldiers=0);ts[0].owner='shn';ts[0].soldiers=10;ts[1].owner='imp';ts[1].soldiers=10});checkWinCondition('end','shn')`);
 assert.equal(e.run('!!G.gameOver'),false);
 e.run(`Object.values(G.territories).filter(t=>t.owner==='shn').forEach(t=>t.soldiers++);checkWinCondition('end','shn')`);assert.equal(e.run('G.result.winner'),'shn');
});
test('una unidad no encadena movimientos pero vuelve a estar disponible en reagrupamiento',()=>{
 const e=completeEngine();e.run(`let a=Object.values(G.territories)[0],b=Object.values(G.territories).at(-1);a.owner=b.owner='imp';a.soldiers=4;a.aircraft=1;b.soldiers=1;b.aircraft=0;G_step.idx=3;let first=transferUnits(a.id,b.id,{aircraft:1,soldiers:3});let repeated=transferUnits(b.id,a.id,{aircraft:1,soldiers:3});clearInteractionModes();G_step.phase='end';G_step.idx=0;let regrouped=transferUnits(b.id,a.id,{aircraft:1,soldiers:3})`);
 assert.equal(e.run('first'),true);assert.equal(e.run('repeated'),false);assert.equal(e.run('regrouped'),true);
});

test('misiles: construir antes de disparar sigue permitido; después de disparar queda bloqueado',()=>{
 const e=completeEngine();e.run(`G_step={currentFk:'imp',isMyTurn:true,phase:'prep',idx:4};G.factions.imp.missiles=1;G.factions.imp.plutonium=10;G.factions.imp.missilesFiredThisTurn=0;refreshMissileState=()=>{};doMissileBuild()`);
 assert.equal(e.run('G.factions.imp.missiles'),2);assert.equal(e.run('G.factions.imp.plutonium'),9);
 e.run(`const target=Object.values(G.territories).find(t=>t.owner!=='imp');target.soldiers=2;launchMissile('imp',target.id,'soldiers',false);doMissileBuild()`);
 assert.equal(e.run('G.factions.imp.missiles'),1);assert.equal(e.run('G.factions.imp.plutonium'),9);
});
