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
  for (const file of ['data', 'engine']) {
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
  return { run: code => vm.runInContext(code, ctx), overlays, flush: () => { while(timers.length) timers.shift()(); } };
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
