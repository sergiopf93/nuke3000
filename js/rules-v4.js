// V4 domain. No DOM, timers or implicit global state. State commands return copies.
const RulesV4 = (() => {
  const keys={sol:'soldiers',mech:'mechs',air:'aircraft',scorp:'scorpions'};
  const sides={sol:6,mech:12,air:12,scorp:20};
  const priority={sol:0,mech:1,air:2,scorp:3};
  const preset=Object.freeze({version:'v4',prep:Object.freeze({nuclearBuildCost:4,plutoniumPerNuclear:3,maxAircraft:5,maxMissiles:5}),combat:Object.freeze({maxAttackDice:5,maxDefenseDice:4,minimumD12:3,minimumD20:5,tieBreakerDefender:true}),maintenanceDie:12});
  const copy=x=>JSON.parse(JSON.stringify(x));
  const count=t=>Object.values(keys).reduce((n,k)=>n+(t[k]||0),0);
  const army=t=>Object.fromEntries(Object.values(keys).map(k=>[k,t[k]||0]));
  const fail=(ok,msg)=>{if(!ok)throw Error(msg);};
  function die(n,random=Math.random){const v=random();fail(v>=0&&v<1,'Aleatorio inválido');return 1+Math.floor(v*n);}
  function pool(t,rules={}){const unitDice=rules.unitDice||{};const names={sol:'soldier',mech:'mech',air:'aircraft',scorp:'scorpion'};const faces=type=>unitDice[names[type]]??sides[type];return Object.keys(keys).sort((a,b)=>faces(b)-faces(a)||priority[a]-priority[b]).flatMap(type=>Array.from({length:t[keys[type]]||0},(_,index)=>({type,sides:faces(type),index})));}
  function roll(units,fk,side,random=Math.random,rules={}){const bonus=(fk==='clt'&&side==='attacker')||(fk==='imp'&&side==='defender')?1:0;return units.map(u=>{const raw=die(u.sides,random);return {...u,raw,bonus,value:Math.max(raw,u.sides===20?(rules.minimumD20??5):u.sides===12?(rules.minimumD12??3):1)+bonus};});}
  function compare(a,d){const sort=(x,y)=>y.value-x.value||x.sides-y.sides||priority[x.type]-priority[y.type];a=[...a].sort(sort);d=[...d].sort(sort);return a.slice(0,Math.min(a.length,d.length)).map((att,i)=>({att,def:d[i],loser:att.value>d[i].value?'defender':'attacker'}));}
  function losses(t,units){const result=army(t);units.forEach(u=>{fail(result[keys[u.type]]>0,'Baja inválida');result[keys[u.type]]--;});const changes=units.map(u=>({from:u.type,to:u.type==='scorp'?'mech':u.type==='mech'?'sol':null}));changes.forEach(c=>{if(c.to)result[keys[c.to]]++;});return {army:result,changes};}
  function round(a,d,o={}){fail(count(a)>0&&count(d)>0,'Combate sin unidades');const rules=o.rules?.combat||o.rules||{};const attLimit=rules.maxAttackDice??5,defLimit=rules.maxDefenseDice??4;fail(Number.isInteger(attLimit)&&attLimit>0&&Number.isInteger(defLimit)&&defLimit>0,'Límite de dados inválido');const attRolls=roll(pool(a,rules).slice(0,attLimit),o.attFk,'attacker',o.random,rules),defRolls=roll(pool(d,rules).slice(0,defLimit),o.defFk,'defender',o.random,rules),pairs=compare(attRolls,defRolls);const x=losses(a,pairs.filter(p=>p.loser==='attacker').map(p=>p.att)),y=losses(d,pairs.filter(p=>p.loser==='defender').map(p=>p.def));return {attacker:x.army,defender:y.army,attRolls,defRolls,pairs,losses:{attacker:x.changes,defender:y.changes},status:!count(y.army)?'conquered':!count(x.army)?'repelled':'ongoing'};}
  function fight(a,d,o={}){const rounds=[];let r;const life=t=>(t.soldiers||0)+(t.aircraft||0)+2*(t.mechs||0)+3*(t.scorpions||0);const bound=life(a)+life(d);for(let i=0;i<bound;i++){r=round(a,d,o);rounds.push(r);a=r.attacker;d=r.defender;if(r.status!=='ongoing')return {...r,rounds};}throw Error('Combate sin progreso');}
  function reinforcements(state,fk,rules={}){const rc=rules.prep?.reinforcements||{};const regions={},fixed={};for(const [id,t]of Object.entries(state.territories)){(regions[t.region]??=[]).push(id);if(t.owner===fk&&t.hasNuclear)fixed[id]=fk==='shn'?(rc.shininSoldiersPerNuclear??5):(rc.soldiersPerNuclear??3);}
    const pools={};for(const [reg,ids]of Object.entries(regions)){const own=ids.filter(id=>state.territories[id].owner===fk);pools[reg]=Math.floor(own.length/2);if(own.length===ids.length)for(const id of own){const t=state.territories[id];if((t.adj||[]).some(n=>state.territories[n]&&state.territories[n].region!==reg))fixed[id]=(fixed[id]||0)+(rc.fullRegionBorder??1);}}
    return {pools,fixed,total:Object.values(pools).reduce((a,b)=>a+b,0)+Object.values(fixed).reduce((a,b)=>a+b,0)};}
  function groundPath(state,fk,src,dst,rules={}){if(src===dst||state.territories[src]?.owner!==fk||!state.territories[dst])return null;const queue=[[src]],seen=new Set([src]),range=fk==='erb'?(rules.prep?.erebusMovementRange??4):(rules.prep?.movementRange??2);while(queue.length){const path=queue.shift();if(path.length>range)continue;for(const id of state.territories[path.at(-1)].adj||[]){if(!state.territories[id]||seen.has(id))continue;const next=[...path,id];if(id===dst)return next;seen.add(id);if(state.territories[id].owner===fk)queue.push(next);}}return null;}
  function move(state,fk,src,dst,units,rules={}){const s=state.territories[src],d=state.territories[dst];fail(s&&d&&s.owner===fk&&src!==dst,'Origen/destino inválido');const u=army(units);for(const k of Object.values(keys))fail(Number.isInteger(u[k])&&u[k]>=0&&u[k]<=(s[k]||0),'Unidades inválidas');fail(count(u)>0&&count(s)>count(u),'El origen debe conservar una unidad');const air=u.aircraft,land=u.soldiers+u.mechs+u.scorpions;
    if(air){fail(d.owner===fk||(d.adj||[]).some(id=>state.territories[id]?.owner===fk),'Destino aéreo inválido');}
    // Cargo may mix one mech or up to three soldiers per aircraft; scorpions cannot fly.
    const transported=air&&u.scorpions===0&&u.mechs+Math.ceil(u.soldiers/3)<=air;
    fail(!land||transported||groundPath(state,fk,src,dst,rules),'Sin ruta terrestre o transporte suficiente');
    const next=copy(state),from=next.territories[src],to=next.territories[dst];let target=to;if(to.owner!==fk){to.attackers??={};target=to.attackers[fk]??=army({});}for(const k of Object.values(keys)){from[k]=(from[k]||0)-u[k];target[k]=(target[k]||0)+u[k];}return next;}
  function pendingAttacks(state,fk){return Object.entries(state.territories).filter(([,t])=>t.owner!==fk&&count(t.attackers?.[fk]||{})>0).map(([id])=>id);}
  function resolveBattle(state,fk,id,o={}){const next=copy(state),t=next.territories[id];fail(t&&t.owner!==fk&&count(t.attackers?.[fk]||{})>0,'Sin ataque pendiente');const previousOwner=t.owner,r=count(t)?fight(t.attackers[fk],t,{...o,attFk:fk,defFk:t.owner}):{attacker:army(t.attackers[fk]),defender:army(t),status:'conquered',attRolls:[],defRolls:[],pairs:[],losses:{attacker:[],defender:[]},rounds:[]};Object.assign(t,r.defender);t.attackers[fk]=r.attacker;if(r.status==='conquered'){t.owner=fk;Object.assign(t,r.attacker);delete t.attackers[fk];if(t.hasNuclear){next.baseCaptures??=[];next.baseCaptures.push({id:o.captureId||`${next.round||1}:${fk}:${id}:${next.baseCaptures.length}`,territory:id,from:previousOwner,to:fk});}}
    else delete t.attackers[fk];return {state:next,...r};}
  function explode(state,id,causeFk){fail(state.territories[id],'Territorio inválido');const next=copy(state),queue=[id],centers=new Set(),affected=new Set(),destroyedBases=[],affectedBy={};while(queue.length){const center=queue.shift();if(centers.has(center))continue;centers.add(center);for(const target of [center,...(next.territories[center].adj||[])]){const t=next.territories[target];if(!t)continue;if(t.hasNuclear){t.hasNuclear=false;destroyedBases.push(target);if(target!==center)queue.push(target);}if(!affected.has(target))affectedBy[target]=center;affected.add(target);}}
    for(const target of affected){const t=next.territories[target],groups=[t,...Object.values(t.attackers||{})];const hasAir=groups.some(g=>(g.aircraft||0)>0);let survivor=null;if(!hasAir)for(const type of ['sol','mech','scorp']){const group=groups.find(g=>(g[keys[type]]||0)>0);if(group){survivor={group,key:keys[type]};break;}}for(const g of groups){g.soldiers=0;g.mechs=0;g.scorpions=0;}if(survivor)survivor.group[survivor.key]=1;}
    if(causeFk==='lib'&&next.factions.lib){next.factions.lib.plutonium=(next.factions.lib.plutonium||0)+5*centers.size;for(const center of centers){const t=next.territories[center];const group=t.owner==='lib'?t:((t.attackers??={}).lib??=army({}));group.mechs=(group.mechs||0)+1;}}
    const effects=[...affected].map(target=>({territoryId:target,centerId:affectedBy[target],isCenter:centers.has(target),before:copy(state.territories[target]),after:copy(next.territories[target])}));const frames=[...centers].map(centerId=>({centerId,effects:effects.filter(e=>e.centerId===centerId)}));return {state:next,centers:[...centers],affected:[...affected],destroyedBases,effects,frames};}
  function maintenance(state,fk,random=Math.random){const bases=Object.entries(state.territories).filter(([,t])=>t.owner===fk&&t.hasNuclear).map(([id])=>id);const rolls=bases.map(()=>die(12,random));return {bases,rolls,failures:rolls.filter(n=>n===1).length};}
  function chooseAccidents(state,maintenanceResult,ids,causeFk){const failures=maintenanceResult.rolls.filter(n=>n===1).length;fail(new Set(ids).size===ids.length&&ids.length===failures&&ids.every(id=>maintenanceResult.bases.includes(id)&&state.territories[id]?.hasNuclear),'Selección de mantenimiento inválida');let next=state;const events=[];for(const id of ids)if(next.territories[id].hasNuclear){const result=explode(next,id,causeFk);next=result.state;events.push(result);}return {state:next,events};}
  // Persist the ledger along with the state: replayed network decisions cannot spend twice.
  function launchMissile(state,fk,id,target,eventId){
    const next=copy(state);next.missileEvents??={};
    if(eventId&&next.missileEvents[eventId])return {state:next,event:copy(next.missileEvents[eventId])};
    const t=next.territories[id],att=next.factions[fk];
    fail(t&&t.owner&&t.owner!==fk&&att?.missiles>0,'Misil inválido');
    fail(target==='sol'||target==='mech','Objetivo inválido');fail((t[keys[target]]||0)>0,'Sin unidades objetivo');
    next.missileSequence=(next.missileSequence||0)+1;
    const event={id:eventId||`missile:${next.round||1}:${next.missileSequence}`,attFk:fk,defFk:t.owner,targetId:id,target,interceptions:[],blocked:false,status:'launched',revision:0,before:copy(t)};
    fail(!next.missileEvents[event.id],'Identificador de misil repetido');att.missiles--;next.missileEvents[event.id]=copy(event);return {state:next,event};
  }
  function currentMissile(state,event){
    fail(event&&event.id&&state.missileEvents?.[event.id],'Misil no registrado');
    return copy(state.missileEvents[event.id]);
  }
  function interceptMissile(state,event,wants,random=Math.random){
    const next=copy(state),current=currentMissile(next,event);
    if(current.status!=='launched'||event.revision!==current.revision)return {state:next,event:current};
    const defender=next.factions[current.defFk];
    if(!wants||!(defender?.missiles>0))current.status='impact-ready';
    else{defender.missiles--;const value=die(6,random);current.interceptions.push(value);if(value>=4){current.blocked=true;current.status='intercepted';}else if(!defender.missiles)current.status='impact-ready';}
    current.revision++;next.missileEvents[current.id]=copy(current);return {state:next,event:current};
  }
  function impactMissile(state,event,random=Math.random){
    let next=copy(state);const current=currentMissile(next,event);
    if(current.status==='impacted'||current.status==='intercepted')return {state:next,event:current};
    fail(current.status==='impact-ready','Resuelve primero la intercepción');
    const t=next.territories[current.targetId];fail(t&&t.owner===current.defFk,'El objetivo del misil ha cambiado');
    current.beforeImpact=copy(t);const key=keys[current.target];current.destroyed=Math.min(t[key]||0,current.target==='sol'?3:1);t[key]=(t[key]||0)-current.destroyed;
    current.accidentRoll=t.hasNuclear?die(12,random):null;
    let explosion;if(current.accidentRoll===1){explosion=explode(next,current.targetId,current.attFk);next=explosion.state;}
    current.after=copy(next.territories[current.targetId]);current.status='impacted';current.revision++;next.missileEvents[current.id]=copy(current);
    return {state:next,event:current,...(explosion?{explosion}:{})};
  }
  function missile(state,fk,id,target,interceptions=0,random=Math.random){
    fail(Number.isInteger(interceptions)&&interceptions>=0&&interceptions<=(state.factions[state.territories[id]?.owner]?.missiles||0),'Intercepción inválida');
    let result=launchMissile(state,fk,id,target);
    for(let i=0;i<interceptions&&result.event.status==='launched';i++)result=interceptMissile(result.state,result.event,true,random);
    if(result.event.status==='launched')result=interceptMissile(result.state,result.event,false,random);
    result=impactMissile(result.state,result.event,random);
    return {state:result.state,blocked:result.event.blocked,rolls:result.event.interceptions,accidentRoll:result.event.accidentRoll??null,event:result.event,...(result.explosion?{explosion:result.explosion}:{})};
  }
  function rewards(state,fk){const next=copy(state);next.rewardedCaptures??=[];let amount=0;for(const c of next.baseCaptures||[]){if(c.to!==fk||next.rewardedCaptures.includes(c.id))continue;const payer=next.factions[c.from];if(payer?.plutonium>0)payer.plutonium--;next.factions[fk].plutonium=(next.factions[fk].plutonium||0)+1;next.rewardedCaptures.push(c.id);amount++;}return {state:next,amount};}
  function objective(state,fk,phase='end'){if(phase!=='end')return false;const ts=Object.values(state.territories),bases=ts.filter(t=>t.hasNuclear),owned=bases.filter(t=>t.owner===fk).length,regions=[...new Set(ts.map(t=>t.region))],complete=regions.filter(r=>ts.filter(t=>t.region===r).every(t=>t.owner===fk)).length;switch(fk){case'imp':case'shn':return complete>=5;case'lib':return bases.length<=(state.initialPlayerCount||state.playerCount);case'prm':case'erb':return bases.length>0&&owned>=Math.ceil(bases.length/2);case'clt':return (state.factions?.[fk]?.eliminatedArmies||0)>=1||Object.values(state.eliminatedArmies||{}).some(k=>k===fk)||(state.eliminations||[]).some(e=>e.by===fk);default:return false;}}
  function createPreset(base={}){
    const r=copy(base);r.version='v4';
    r.setup={...(r.setup||{}),libertosSwap:{enabled:true,plutonium:5,soldiers:5,mechs:0}};
    r.prep={...(r.prep||{}),...preset.prep,movementRange:2,erebusMovementRange:4,prometheusPlutoniumPerNuclear:4};
    r.prep.upgrades={...(r.prep.upgrades||{}),mechCost:{soldiers:3,plutonium:1},aircraftCost:{soldiers:1,plutonium:1},scorpionCost:{mechs:2,plutonium:1},maxAircraft:5};
    r.prep.reinforcements={perTwoTerritories:0,perTwoTerritoriesFullRegion:0,perNuclear:0,regionalPools:true,fullRegionBorder:1,soldiersPerNuclear:3,shininSoldiersPerNuclear:5};
    r.prep.placement={onlyInNuclearTerritories:false,ereubsAnywhereOverride:false,fallbackOnePerRegion:false,regionalPools:true};
    r.combat={...(r.combat||{}),...preset.combat,unitDice:{soldier:6,mech:12,aircraft:12,scorpion:20},allowRetreat:false,allowUnitSelection:false,missileTargets:{soldier:'auto',mech:'auto'},missileInterceptDie:6,missileInterceptThreshold:4,cpuInterceptionLimit:5};
    r.end={...(r.end||{}),phases:['reward','maint'],maintenanceDie:12,maintenanceExplosionOn:1,maintenanceEnabled:true,explosionSpareAircraft:true,explosionOneGroundSurvives:true};
    r.victory={imp:{enabled:true,fullRegions:5},lib:{enabled:true},clt:{enabled:true,armiesEliminated:1},erb:{enabled:true,nuclearHalf:true},prm:{enabled:true,nuclearHalf:true},shn:{enabled:true,fullRegions:5}};
    return r;
  }
  function reinforcementPlan(territories,fk){return reinforcements({territories},fk);}
  return {preset,createPreset,reinforcementPlan,keys,sides,count,army,die,pool,roll,compare,losses,round,fight,reinforcements,groundPath,move,pendingAttacks,resolveBattle,explode,maintenance,chooseAccidents,launchMissile,interceptMissile,impactMissile,missile,rewards,objective};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=RulesV4;
