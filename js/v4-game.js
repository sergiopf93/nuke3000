// V4 integration. Legacy functions remain available only for explicitly selected V3 games.
// Query preset is explicit; remote snapshots carry the complete versioned rules.
const RULES_V3 = JSON.parse(JSON.stringify(DEFAULT_RULES));
RULES_V3.version='v3';
const RULES_V4 = RulesV4.createPreset(RULES_V3);
RULES = JSON.parse(JSON.stringify(new URLSearchParams(location.search).get('rules')==='v3'?RULES_V3:RULES_V4));
const V4Game = (() => {
  const legacy={};
  const enabled=()=>RULES.version==='v4';
  const legacySteps=typeof STEPS==='undefined'?{}:JSON.parse(JSON.stringify(STEPS));
  const keys=['soldiers','mechs','aircraft','scorpions'];
  const state=()=>({territories:G.territories,factions:G.factions,round:G.round,playerCount:G.playerCount,initialPlayerCount:G.initialPlayerCount,baseCaptures:G.baseCaptures||[],rewardedCaptures:G.rewardedCaptures||[],eliminations:G.eliminations||[],missileEvents:G.missileEvents||{},missileSequence:G.missileSequence||0});
  function apply(s){for(const k of ['territories','factions','baseCaptures','rewardedCaptures','eliminations','missileEvents','missileSequence'])if(s[k]!==undefined)G[k]=s[k];}
  function wrap(name,fn){legacy[name]=window[name];window[name]=function(...args){return enabled()?fn(...args):legacy[name](...args);};}
  function updateEliminations(by){for(const fk of G.setup.order||[])checkElimination(fk,by);}
  function sync(message){updateMap();refreshCards();const hint=document.getElementById('territory-hint');if(enabled()&&hint&&G_step.isMyTurn){const sid=STEPS[G_step.phase]?.[G_step.idx]?.id;if(sid==='attack')hint.textContent='Toca un territorio con tropas comprometidas · Combate obligatorio';if(sid==='move')hint.textContent='Origen propio → destino propio o enemigo · Conserva una unidad en origen';} _syncNow(message,'sys');}
  function effect(kind,data){if(typeof BattleScene!=='undefined')BattleScene.effect(kind,data);if(typeof ONLINE!=='undefined'&&ONLINE.isOnline())ONLINE.pushActionWithState('V4_EFFECT',{kind,data});}
  function configure(){
    if(!enabled()){for(const key of Object.keys(legacySteps))STEPS[key]=JSON.parse(JSON.stringify(legacySteps[key]));return;}
    STEPS.prep=[{id:'income',title:'1. RECURSOS',detail:'3 Pu por base (Prometeo: 4).',isAuto:true},{id:'nuclear',title:'2. CONSTRUCCIÓN NUCLEAR',detail:'Construye bases por 4 Pu en territorios propios.',isAuto:false},{id:'reinf',title:'3. REFUERZOS REGIONALES',detail:'Cada región conserva su fondo de soldados.',isAuto:false},{id:'upgrade',title:'4. REARME',detail:'Mejora unidades en su territorio.',isAuto:false},{id:'move',title:'5. MOVIMIENTO Y ATAQUES',detail:'Compromete tropas en destinos enemigos. El propietario cambia tras vencer.',isAuto:false},{id:'missileBuild',title:'6. FABRICAR MISILES',detail:'1 Pu por misil, máximo 5.',isAuto:false}];
    STEPS.combat=[{id:'missile',title:'1. LANZAR MISILES',detail:'Objetivos: hasta 3 soldados o 1 meca. Sin tirada de impacto.',isAuto:false},{id:'attack',title:'2. COMBATES OBLIGATORIOS',detail:'Resuelve todos los territorios con tropas comprometidas. Sin retirada.',isAuto:false}];
    STEPS.end=[{id:'reward',title:'1. RECOMPENSAS',detail:'1 Pu por base conquistada este turno.',isAuto:true},{id:'maint',title:'2. MANTENIMIENTO NUCLEAR',detail:'Lanza todos los dados y después elige las bases accidentadas.',isAuto:false}];
  }
  const homelands={imp:'r05',lib:'r04',clt:'r08',erb:'r06',prm:'r11',shn:'r09'};
  function claimCandidates(fk){
    const ts=Object.values(G.territories),unclaimed=ts.filter(t=>!t.owner),claimed=ts.filter(t=>t.owner===fk).length;
    if(claimed<3)return unclaimed.filter(t=>t.region===homelands[fk]);
    return unclaimed.filter(t=>{const protectedFaction=(G.setup.order||[]).find(k=>homelands[k]===t.region);if(!protectedFaction)return true;const needed=Math.max(0,3-ts.filter(x=>x.owner===protectedFaction).length);return unclaimed.filter(x=>x.region===t.region).length>needed;});
  }
  function install(){
    const initial=window.initGame;
    window.initGame=function(){configure();initial();if(enabled()){for(const [fk,desc] of Object.entries({imp:'Controla 5 regiones completas al final de tu turno.',lib:'Bases globales ≤ jugadores iniciales al final del turno.',clt:'Elimina la última unidad de un jugador enemigo. Fin de turno.',erb:'Controla al menos la mitad de las bases. Fin de turno.',prm:'Controla al menos la mitad de las bases. Fin de turno.',shn:'Controla 5 regiones completas al final de tu turno.'})){FDATA[fk].goalDesc=desc;G.factions[fk].goalDesc=desc;VICTORY_DETAIL[fk]=desc;}G.initialPlayerCount=G.playerCount;G.baseCaptures=[];G.rewardedCaptures=[];G.eliminations=[];G.missileEvents={};G.missileSequence=0;G.movedUnits={};G.v4Maintenance=null;const f=G.factions.lib;if(f){f.plutonium=5;f.soldiers+=5;f.mechs=RULES.setup.startingAssets[G.playerCount].mechs;f.nukes=0;}}};
    const upgrade=applyUpgrade;window.applyUpgrade=function(fk,id,type){const ok=upgrade(fk,id,type);if(enabled()&&ok)effect('upgrade',{targetId:id,type});return ok;};
    const action=doAct;window.doAct=function(kind){const id=G.sel,had=G.territories[id]?.hasNuclear;action(kind);if(enabled()&&kind==='nuke'&&!had&&G.territories[id]?.hasNuclear)effect('nuclearBuild',{targetId:id});};
    const victory=declareVictory;window.declareVictory=function(goal,fk){victory(goal,fk);if(enabled())effect('victory',{fk:fk||G.result?.winner});};
    wrap('applyIncome',fk=>{
      const f=G.factions[fk];if(G.gameOver||f.alive===false||f._incomeAppliedRound===G.round)return;
      f._incomeAppliedRound=G.round;
      const plan=RulesV4.reinforcements(state(),fk,RULES);f.regionalSoldiers=plan.pools;
      f.pendingSoldiers=Object.values(plan.pools).reduce((a,b)=>a+b,0);
      const n=Object.values(G.territories).filter(t=>t.owner===fk&&t.hasNuclear).length;
      const pu=n*(fk==='prm'?(RULES.prep.prometheusPlutoniumPerNuclear??4):(RULES.prep.plutoniumPerNuclear??3));f.plutonium+=pu;f._plutIncome=pu;f._reinfIncome=plan.total;
      f.missilesFiredThisTurn=0;f._fireStarted=false;f.missilesBuiltThisTurn=0;
      addLog(FDATA[fk].name+': +'+pu+' Pu, '+plan.total+' refuerzos por región y base','res');sync('Recursos V4');
    });
    wrap('reinforcementTargets',fk=>Object.values(G.territories).filter(t=>t.owner===fk&&(G.factions[fk].regionalSoldiers?.[t.region]||0)>0));
    wrap('distributeReinforcements',fk=>{const f=G.factions[fk];for(const [reg,n]of Object.entries(f.regionalSoldiers||{})){const ts=Object.values(G.territories).filter(t=>t.owner===fk&&t.region===reg);if(n&&!ts.length)return false;for(let i=0;i<n;i++)ts[i%ts.length].soldiers++;f.regionalSoldiers[reg]=0;}f.pendingSoldiers=0;return true;});
    wrap('placeReinforcements',(id,qty)=>{const t=G.territories[id],f=G.factions[G.pf];if(G.gameOver||G_step.phase!=='prep'||STEPS.prep[G_step.idx]?.id!=='reinf'||!G_step.isMyTurn||!t||t.owner!==G.pf||!Number.isInteger(qty)||qty<1||qty>(f.regionalSoldiers?.[t.region]||0))return; t.soldiers+=qty;f.regionalSoldiers[t.region]-=qty;f.pendingSoldiers-=qty;effect('reinforcement',{targetId:id,amount:qty});sync('Refuerzos V4');renderStepActions(STEPS.prep[G_step.idx]);showReinforcementUI(f.pendingSoldiers);});
    const originalCounter=showReinforcementCounter;
    window.showReinforcementCounter=function(id,evt){if(!enabled())return originalCounter(id,evt);if(G.reinforcementMode)G.reinforcementMode.left=G.factions[G.pf].regionalSoldiers?.[G.territories[id].region]||0;originalCounter(id,evt);};
    wrap('showReinforcementUI',count=>{if(!count){G.reinforcementMode=null;return;}const ts=reinforcementTargets(G.pf);G.reinforcementMode={left:count,validIds:new Set(ts.map(t=>t.id)),callback:(id,evt)=>{if(!reinforcementTargets(G.pf).some(t=>t.id===id))return false;showReinforcementCounter(id,evt);return true;}};updateMap();});
    wrap('groundMoveTargets',(id)=>new Set(Object.keys(G.territories).filter(dst=>RulesV4.groundPath(state(),G.territories[id]?.owner,id,dst,RULES))));
    wrap('getMovableTargets',id=>{const t=G.territories[id],fk=t?.owner,targets=groundMoveTargets(id);if(t?.aircraft)for(const [dst,d]of Object.entries(G.territories))if(dst!==id&&(d.owner===fk||d.adj.some(n=>G.territories[n]?.owner===fk)))targets.add(dst);return targets;});
    wrap('transferUnits',(src,dst,units)=>{
      if(G.gameOver||!G_step.isMyTurn||G_step.phase!=='prep'||STEPS.prep[G_step.idx]?.id!=='move'||G.territories[src]?.owner!==G.pf)return false;
      const moved=G.movedUnits?.[src]||{};
      if(keys.some(k=>(units[k]||0)>(G.territories[src][k]||0)-(moved[k]||0)))return false;
      try{const result=RulesV4.move(state(),G.pf,src,dst,units,RULES);apply(result);G.movedUnits||={};const arrived=G.movedUnits[dst]||={};for(const k of keys)arrived[k]=(arrived[k]||0)+(units[k]||0);effect('movement',{srcId:src,targetId:dst});sync('Tropas comprometidas V4');return true;}catch(e){addLog(e.message,'sys');return false;}
    });
    const clear=clearInteractionModes;window.clearInteractionModes=function(){const moved=G.movedUnits;clear();if(enabled()&&STEPS[G_step.phase]?.[G_step.idx]?.id==='move')G.movedUnits=moved||{};};
    const advance=advanceStep;window.advanceStep=function(){if(enabled()){
      if(G.pendingMissile){addLog('Resuelve el misil pendiente antes de continuar.','sys');return;}
      if(STEPS[G_step.phase]?.[G_step.idx]?.id==='move'&&Object.values(G.territories).some(t=>t.owner===G_step.currentFk&&!RulesV4.count(t))){addLog('Todos los territorios propios deben conservar una unidad.','sys');return;}
      if(STEPS[G_step.phase]?.[G_step.idx]?.id==='attack'&&RulesV4.pendingAttacks(state(),G_step.currentFk).length){addLog('Quedan combates obligatorios.','sys');return;}
      transition();return;
    }advance();};
    const endPhase=endPhaseForFaction;window.endPhaseForFaction=function(){if(!enabled())return endPhase();transition(true);};
    const render=renderStepActions;window.renderStepActions=function(step){render(step);if(!enabled()||!G_step.isMyTurn)return;const area=document.getElementById('step-actions');if(!area)return;
      if(step.id==='attack'){area.innerHTML='<p>Selecciona un territorio con fuerzas comprometidas.</p>';for(const id of RulesV4.pendingAttacks(state(),G.pf))area.appendChild(button('COMBATIR '+terName(id),()=>battle(id,G.pf)));area.insertAdjacentHTML('beforeend',nextBtn('FINALIZAR COMBATES'));}
      if(step.id==='maint'){const list=document.createElement('p');list.textContent=Object.values(G.territories).filter(t=>t.owner===G.pf&&t.hasNuclear).map(t=>terName(t.id)).join(' · ');area.prepend(list);}
      if(step.id==='missileBuild')area.innerHTML='<p>1 Pu por misil; máximo 5.</p><button class="abtn" onclick="doMissileBuild()">FABRICAR MISIL</button>'+nextBtn();
      if(step.id==='reinf')area.insertAdjacentHTML('afterbegin','<p>'+Object.entries(G.factions[G.pf].regionalSoldiers||{}).filter(([,n])=>n).map(([r,n])=>(REGIONS.find(x=>x.id===r)?.name||r)+': '+n).join(' · ')+'</p>');
      if(step.id==='move')area.insertAdjacentHTML('afterbegin','<p>Terrestres: '+(G.pf==='erb'?4:2)+' saltos. Destino propio o enemigo; tránsito propio. Aeronaves: propias a cualquier distancia, enemigas en frontera.</p>');
      if(step.id==='missile'){const build=area.querySelector('[onclick="doMissileBuild()"]');if(build)build.remove();}
    };
    function prepareRef(fk){const f=G.factions[fk];if(f._reinforcementAppliedRound===G.round)return;f._reinforcementAppliedRound=G.round;const plan=RulesV4.reinforcements(state(),fk,RULES);f.regionalSoldiers=plan.pools;f.pendingSoldiers=Object.values(plan.pools).reduce((a,b)=>a+b,0);f._reinfIncome=plan.total;for(const [id,n]of Object.entries(plan.fixed)){G.territories[id].soldiers+=n;effect('reinforcement',{targetId:id,amount:n});}sync('Refuerzos nucleares y de frontera');}
    const player=executePlayerStep;window.executePlayerStep=function(step){if(enabled()&&step.id==='reinf'){prepareRef(G.pf);renderStepActions(step);}player(step);};
    const cpu=executeCpuStep;window.executeCpuStep=function(step){if(!enabled())return cpu(step);const fk=G_step.currentFk;
      if(step.id==='reinf')prepareRef(fk);
      if(step.id==='move'){cpuMove(fk);scheduleStepAction(advanceStep,500);return;}
      if(step.id==='attack'){cpuBattle(fk);return;}
      if(step.id==='missileBuild'){if(G.factions[fk].missiles<5&&G.factions[fk].plutonium>0){G.factions[fk].missiles++;G.factions[fk].plutonium--;}scheduleStepAction(advanceStep,300);return;}
      if(step.id==='missile'){const target=Object.values(G.territories).filter(t=>t.owner&&t.owner!==fk&&(t.soldiers||t.mechs)).sort((a,b)=>b.soldiers-a.soldiers||a.id.localeCompare(b.id))[0];if(target&&G.factions[fk].missiles>0)missile(target.id,fk,target.soldiers?'sol':'mech',()=>scheduleStepAction(advanceStep,500));else scheduleStepAction(advanceStep,300);return;}
      cpu(step);
    };
    const auto=executeAutoStep;window.executeAutoStep=function(step){if(enabled()&&step.id==='reward'){const r=RulesV4.rewards(state(),G_step.currentFk);apply(r.state);sync('Recompensa: '+r.amount+' Pu');scheduleStepAction(advanceStep,500);return;}auto(step);};
    const click=onTerritoryClick;window.onTerritoryClick=function(id,event){if(enabled()&&!G.setup?._inSetup&&G_step.isMyTurn){const step=STEPS[G_step.phase]?.[G_step.idx]?.id;if(step==='attack'){if(RulesV4.pendingAttacks(state(),G.pf).includes(id))battle(id,G.pf);else selectTerritory(id);return;}if(step==='move'){if(G.moveSrc){if(getMovableTargets(G.moveSrc).has(id))showMoveUnitsPopup(G.moveSrc,id,event);else{G.moveSrc=null;G.moveTargets=null;}return;}if(G.territories[id]?.owner===G.pf){G.moveSrc=id;G.moveMode=true;G.moveTargets=getMovableTargets(id);selectTerritory(id);return;}}}click(id,event);};
    wrap('validAttack',(_src,id,fk)=>RulesV4.pendingAttacks(state(),fk).includes(id));
    wrap('openDice',id=>battle(id,G.pf));
    wrap('retreatCombat',()=>{if(G_combat?.done)closeDice();});
    wrap('runMaintenanceRollsFor',(fk,cb)=>maintenance(fk,cb));
    wrap('resolveNuclearExplosion',t=>{if(!t?.hasNuclear)return false;const r=RulesV4.explode(state(),t.id);apply(r.state);updateEliminations(null);effect('nuclear',{targetId:t.id,centers:r.centers});return true;});
    wrap('checkWinCondition',(moment='elimination',fk=G_step.currentFk)=>{if(G.gameOver||moment!=='end')return;const alive=(G.setup.order||[]).filter(k=>G.factions[k]?.alive!==false);if(alive.length===1){declareWin(alive[0],'Última facción');return;}if(RULES.victory[fk]?.enabled&&RulesV4.objective(state(),fk))declareWin(fk,FDATA[fk].goal);});
    const eliminate=checkElimination;window.checkElimination=function(fk,by=G_step.currentFk){if(!enabled())return eliminate(fk,by);if(G.factions[fk]?.alive===false)return;const present=Object.values(G.territories).some(t=>t.owner===fk&&RulesV4.count(t)>0||RulesV4.count(t.attackers?.[fk]||{})>0);if(!present){G.factions[fk].alive=false;if(by&&by!==fk)(G.eliminations||=[]).push({faction:fk,by,round:G.round});addLog(FDATA[fk].name+' eliminado','combat');}};
    wrap('doMissileBuild',()=>{const f=G.factions[G.pf];if(G.gameOver||!G_step.isMyTurn||G_step.phase!=='prep'||STEPS.prep[G_step.idx]?.id!=='missileBuild'||f.plutonium<1||f.missiles>=5)return;f.plutonium--;f.missiles++;sync('Misil fabricado');renderStepActions(STEPS.prep[G_step.idx]);});
    wrap('activateMissileFire',()=>{if(G_step.phase==='combat'&&G_step.isMyTurn&&STEPS.combat[G_step.idx]?.id==='missile'&&G.factions[G.pf].missiles>0)G.missileFiringMode=true;});
    wrap('doMissileFire',()=>{const t=G.territories[G.sel];if(G.gameOver||!G_step.isMyTurn||G_step.phase!=='combat'||STEPS.combat[G_step.idx]?.id!=='missile'||!t||t.owner===G.pf||G.factions[G.pf].missiles<1)return;const box=dialog('missile-modal','ELEGIR OBJETIVO DEL MISIL');if(t.soldiers)box.appendChild(button('HASTA 3 SOLDADOS',()=>{box.parentElement.remove();missile(t.id,G.pf,'sol');}));if(t.mechs)box.appendChild(button('1 MECA',()=>{box.parentElement.remove();missile(t.id,G.pf,'mech');}));box.appendChild(button('CANCELAR',()=>box.parentElement.remove()));});
  }
  function transition(forceEnd=false){
    if(G.gameOver||G.awaitingStart||G.setup?._inSetup)return;
    if(typeof ONLINE!=='undefined'&&ONLINE.isOnline()&&!G_step.isMyTurn&&(!ONLINE.isHost()||_isOnlineHumanTurn(G_step.currentFk)))return;
    let phase=G_step.phase,fk=G_step.currentFk,idx=G_step.idx+1;
    if(forceEnd||idx>=STEPS[phase].length){
      idx=0;
      if(phase==='prep')phase='combat';
      else if(phase==='combat')phase='end';
      else{
        checkWinCondition('end',fk);if(G.gameOver)return;
        const order=G.setup.order,current=order.indexOf(fk);let next=(current+1)%order.length;
        while(G.factions[order[next]]?.alive===false&&next!==current)next=(next+1)%order.length;
        if(next<=current){G.round++;const label=document.getElementById('rnum');if(label)label.textContent=G.round;}
        fk=order[next];phase='prep';
      }
    }
    clearInteractionModes();G.phase=phase;G.currentFaction=fk;
    Object.assign(G_step,{phase,currentFk:fk,idx,isMyTurn:fk===G.pf,startedKey:null});
    // Publish the resulting step, never an intermediate exhausted phase.
    if(typeof ONLINE!=='undefined'&&ONLINE.isOnline())ONLINE.pushActionWithState('V4_STEP',{});
    runCurrentStep();
  }
  function button(text,action){const b=document.createElement('button');b.className='abtn';b.textContent=text;b.onclick=action;return b;}
  function dialog(id,title){document.getElementById(id)?.remove();const modal=document.createElement('div');modal.id=id;modal.style.cssText='position:fixed;inset:0;background:#000d;z-index:2100;display:grid;place-items:center';const box=document.createElement('div');box.style.cssText='background:#101018;border:1px solid #777;padding:18px;max-height:88vh;max-width:94vw;overflow:auto;display:flex;flex-direction:column;gap:8px';const h=document.createElement('h3');h.textContent=title;box.appendChild(h);modal.appendChild(box);document.body.appendChild(modal);return box;}
  function cpuMove(fk){const used=new Set();for(const src of Object.values(G.territories).filter(t=>t.owner===fk&&RulesV4.count(t)>2)){if(used.has(src.id))continue;const target=Object.values(G.territories).filter(t=>t.owner&&t.owner!==fk&&RulesV4.groundPath(state(),fk,src.id,t.id,RULES)).sort((a,b)=>RulesV4.count(a)-RulesV4.count(b)||a.id.localeCompare(b.id))[0];if(!target)continue;const units=RulesV4.army(src);const guard=keys.find(k=>units[k]>0);units[guard]--;try{apply(RulesV4.move(state(),fk,src.id,target.id,units,RULES));used.add(target.id);effect('movement',{srcId:src.id,targetId:target.id});}catch{} }sync('Movimiento CPU V4');}
  function cpuBattle(fk){const id=RulesV4.pendingAttacks(state(),fk)[0];if(id)battle(id,fk,()=>cpuBattle(fk));else scheduleStepAction(advanceStep,400);}
  function battle(id,fk,callback){
    if(G.gameOver||G_combat&&!G_combat.done||!RulesV4.pendingAttacks(state(),fk).includes(id))return;
    const target=G.territories[id],before={attacker:RulesV4.army(target.attackers[fk]),defender:RulesV4.army(target)};
    const ctx=G_combat={srcId:id,targetId:id,attFk:fk,defFk:target.owner,round:1,history:[],initialAtt:RulesV4.count(before.attacker),initialDef:RulesV4.count(before.defender),isPlayerAtt:false,isPlayerDef:target.owner===G.pf,done:false,stepKey:currentStepKey(),callback,before};
    if(typeof BattleScene!=='undefined')BattleScene.open(ctx,before);
    const present=(action,ms)=>{clearTimeout(ctx.presentationTimer);ctx.nextPresentation=action;const duration=ctx.skip?0:typeof BattleScene!=='undefined'&&BattleScene.duration?BattleScene.duration(ms):ms;ctx.presentationTimer=scheduleStepAction(()=>{ctx.nextPresentation=null;action();},duration);};
    const run=()=>{
      if(G_combat!==ctx||ctx.done||G.gameOver)return;
      const t=G.territories[id],att=t.attackers?.[fk];if(!RulesV4.count(att||{})){finish('repelled');return;}
      const prior={attacker:RulesV4.army(att),defender:RulesV4.army(t)};
      const result=RulesV4.count(t)?RulesV4.round(att,t,{attFk:fk,defFk:ctx.defFk,rules:RULES.combat}):{attacker:RulesV4.army(att),defender:RulesV4.army(t),status:'conquered',attRolls:[],defRolls:[],pairs:[],losses:{attacker:[],defender:[]}};
      Object.assign(t,result.defender);t.attackers[fk]=result.attacker;
      if(result.status==='conquered'){t.owner=fk;Object.assign(t,result.attacker);delete t.attackers[fk];if(t.hasNuclear)(G.baseCaptures||=[]).push({id:G.round+':'+fk+':'+id+':'+G.baseCaptures.length,territory:id,from:ctx.defFk,to:fk});checkElimination(ctx.defFk,fk);}
      if(result.status==='repelled'){delete t.attackers[fk];checkElimination(fk,ctx.defFk);}ctx.history.push(result);ctx.before=prior;G.lastBattle=result;
      showRound(ctx,result);sync('Ronda de combate V4');
      if(result.status!=='ongoing')finish(result.status);else present(run,1700);
    };
    function finish(status){ctx.done=true;ctx.status=status;publishCombatView(ctx,ctx.history.at(-1));if(status==='conquered'&&G.territories[id].hasNuclear&&fk===G.pf){const box=dialog('v4-capture','BASE NUCLEAR CONQUISTADA');box.appendChild(button('CONSERVAR',()=>{box.parentElement.remove();done();}));box.appendChild(button('DESTRUIR: ACCIDENTE NUCLEAR',()=>{box.parentElement.remove();const r=RulesV4.explode(state(),id,fk);apply(r.state);updateEliminations(fk);effect('nuclear',{targetId:id,centers:r.centers});sync('Base destruida');done();}));}else done();}
    function done(){present(()=>{closeDice();if(typeof BattleScene!=='undefined')BattleScene.close();if(callback)callback();else renderStepActions(STEPS.combat[G_step.idx]);},2200);}
    present(run,700);
  }
  function showRound(ctx,result){
    document.getElementById('dmodal').classList.add('open');document.querySelector('#dmodal h2').textContent='COMBATE V4 · RONDA '+ctx.round;document.getElementById('cdesc').textContent=terName(ctx.targetId)+' · '+FDATA[ctx.attFk].name+' contra '+FDATA[ctx.defFk].name;
    for(const id of ['combat-unit-choice','unit-sel-att','unit-sel-def','combat-guard'])document.getElementById(id)?.remove();
    document.getElementById('dlba').textContent=FDATA[ctx.attFk].name;document.getElementById('dlbd').textContent=FDATA[ctx.defFk].name;
    ctx.attSelected=result.attRolls;ctx.defSelected=result.defRolls;renderDicePools();displayBattleResult(ctx,result);
    document.getElementById('btn-roll').style.display='none';document.getElementById('btn-cancel').style.display='none';
    if(typeof BattleScene!=='undefined')BattleScene.result(ctx,result);publishCombatView(ctx,result);
  }
  function maintenance(fk,callback){
    const key=currentStepKey();if(G.gameOver||G_step.maintenanceDone===key||G.v4Maintenance?.key===key)return;
    const m=RulesV4.maintenance(state(),fk);const st=G.v4Maintenance={key,fk,rolls:m.rolls,remaining:m.rolls.filter(n=>n===1).length};
    const finish=()=>{G_step.maintenanceDone=key;G.v4Maintenance=null;document.getElementById('maint-modal')?.remove();sync('Mantenimiento completado');if(callback)callback();};
    const choose=id=>{const t=G.territories[id];if(!t?.hasNuclear||t.owner!==fk||st.remaining<1)return;const r=RulesV4.explode(state(),id);apply(r.state);updateEliminations(null);st.remaining--;effect('nuclear',{targetId:id,centers:r.centers});sync('Accidente nuclear');draw();};
    const draw=()=>{const bases=Object.values(G.territories).filter(t=>t.owner===fk&&t.hasNuclear);st.remaining=Math.min(st.remaining,bases.length);if(fk!==G.pf){while(st.remaining){const next=Object.values(G.territories).filter(t=>t.owner===fk&&t.hasNuclear).sort((a,b)=>RulesV4.count(a)-RulesV4.count(b)||a.id.localeCompare(b.id))[0];if(!next)break;const r=RulesV4.explode(state(),next.id);apply(r.state);updateEliminations(null);st.remaining--;st.remaining=Math.min(st.remaining,Object.values(G.territories).filter(t=>t.owner===fk&&t.hasNuclear).length);effect('nuclear',{targetId:next.id,centers:r.centers});}finish();return;}
      const box=dialog('maint-modal','MANTENIMIENTO NUCLEAR');const dice=document.createElement('p');dice.className=typeof BattleScene!=='undefined'&&BattleScene.duration(600)===0?'v4-maint-static':'v4-maint-dice';if(m.rolls.length){for(const n of m.rolls){const die=document.createElement('span');die.className='die';die.textContent='D12: '+n;dice.appendChild(die);}}else dice.textContent='Sin bases';box.appendChild(dice);const info=document.createElement('p');info.textContent=st.remaining?'Accidentes pendientes: '+st.remaining+'. Elige qué base explota.':'Todas las tiradas resueltas.';box.appendChild(info);if(st.remaining)for(const t of bases)box.appendChild(button('EXPLOTAR '+terName(t.id),()=>choose(t.id)));else box.appendChild(button('FINALIZAR MANTENIMIENTO',finish));};
    draw();
  }
  async function missile(id,fk,target,callback){
    if(G.waitingMissile||G.gameOver)return;
    const key=currentStepKey();let event;
    try{if(G.pendingMissile){if(G.pendingMissile.attFk!==fk||G.pendingMissile.targetId!==id)throw Error('Resuelve el misil pendiente');event=G.pendingMissile;G.pendingMissile=null;}else{const launched=RulesV4.launchMissile(state(),fk,id,target);apply(launched.state);event=launched.event;}}catch(error){addLog(error.message,'sys');return;}
    G.waitingMissile=true;effect('missile',{targetId:id});sync('Misil lanzado contra '+terName(id));
    try{
      let attempts=0;
      while(event.status==='launched'){
        const human=event.defFk===G.pf||_isOnlineHumanTurn(event.defFk);let wants=(G.factions[event.defFk]?.missiles||0)>0&&(human||attempts<(RULES.combat.cpuInterceptionLimit??5));
        if(wants&&_isOnlineHumanTurn(event.defFk)&&event.defFk!==G.pf){
          wants=await new Promise((resolve,reject)=>{ONLINE.requestDecision('intercept',event.defFk,{targetId:id,attFk:fk,target:event.target,interceptions:event.interceptions},(answer,error)=>error?reject(error):resolve(!!answer?.intercept)).then(sent=>{if(sent===false)reject(new Error('Decisión no enviada'));},reject);});
        }else if(wants&&event.defFk===G.pf){
          wants=await new Promise(resolve=>{const box=dialog('v4-intercept','MISIL ENTRANTE');const p=document.createElement('p');p.textContent='Objetivo: '+(target==='sol'?'hasta 3 soldados':'1 meca')+'. Intercepciones previas: '+(event.interceptions.join(', ')||'ninguna');box.appendChild(p);box.appendChild(button('INTERCEPTAR (1 MISIL)',()=>{box.parentElement.remove();resolve(true);}));box.appendChild(button('NO INTERCEPTAR',()=>{box.parentElement.remove();resolve(false);}));});
        }
        if(currentStepKey()!==key||G.gameOver)return;
        const attempt=RulesV4.interceptMissile(state(),event,wants);apply(attempt.state);event=attempt.event;attempts++;
        sync('Intercepción: '+(event.interceptions.at(-1)||'declinada'));
      }
      const result=RulesV4.impactMissile(state(),event);apply(result.state);event=result.event;
      if(result.explosion)effect('nuclear',{targetId:id,centers:result.explosion.centers});
      updateEliminations(fk);G.lastMissile={targetId:id,target,interceptions:event.interceptions,blocked:event.blocked,destroyed:event.destroyed||0,accident:event.accidentRoll};
      effect('missile',{targetId:id,blocked:event.blocked});
      const summary=(event.blocked?'MISIL INTERCEPTADO':'IMPACTO: '+(event.destroyed||0)+' '+(target==='sol'?'soldados':'meca'))+' · Intercepciones: '+(event.interceptions.join(', ')||'ninguna')+(event.accidentRoll?' · Accidente D12: '+event.accidentRoll:'');
      addLog(summary,'combat');sync(summary);
      if(fk===G.pf){const box=dialog('missile-modal','RESULTADO DEL MISIL');const p=document.createElement('p');p.textContent=summary;box.appendChild(p);box.appendChild(button('CONTINUAR',()=>box.parentElement.remove()));}
    }catch(error){
      // Preserve the launched event for retry instead of inventing a defensive decision.
      G.pendingMissile=event;addLog('No se pudo recibir la decisión defensiva. Reintenta cuando se recupere la conexión.','sys');const box=dialog('missile-retry','MISIL PENDIENTE');box.appendChild(button('REINTENTAR DECISIÓN',()=>{box.parentElement.remove();missile(id,fk,target,callback);}));sync('Misil pendiente de decisión');
    }finally{G.waitingMissile=false;if(callback&&!G.pendingMissile)callback();}
  }
  return {enabled,configure,install,state,apply,battle,maintenance,missile,claimCandidates,homelands};
})();
V4Game.install();
if(typeof document!=='undefined')document.addEventListener('battle-scene-skip',e=>{const ctx=G_combat;if(!V4Game.enabled()||!ctx||ctx.remote||ctx.targetId!==e.detail?.targetId)return;ctx.skip=true;clearTimeout(ctx.presentationTimer);const action=ctx.nextPresentation;ctx.nextPresentation=null;if(action)action();});
if(typeof window!=='undefined'){
const resetPresetRules=resetRules;
resetRules=function(){if(!V4Game.enabled())return resetPresetRules();if(rulesLocked())return;RULES=JSON.parse(JSON.stringify(RULES_V4));document.getElementById('rules-modal')?.remove();showRules();};
if(V4Game.enabled()){
 const abilities={imp:'+1 a todos los dados defensivos',lib:'+5 Pu y 1 meca por accidente causado',clt:'+1 a todos los dados atacantes',erb:'Movimiento terrestre de hasta 4 territorios',prm:'4 Pu por base nuclear',shn:'5 soldados por base nuclear'};
 for(const [fk,description] of Object.entries(abilities)){FDATA[fk].abilityDesc=description;VICTORY_DETAIL_FULL[fk]=FDATA[fk].goal+'\n'+({imp:'Controla 5 regiones completas',shn:'Controla 5 regiones completas',lib:'Bases en tablero ≤ jugadores iniciales',clt:'Elimina la última unidad de un enemigo',erb:'Controla al menos la mitad de las bases',prm:'Controla al menos la mitad de las bases'}[fk])+' al final del turno.\n\nHabilidad: '+description;}
}


}
