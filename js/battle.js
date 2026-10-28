// V3 combat domain: no DOM, shared by human and CPU resolution.
const Battle = (() => {
  const keys={sol:'soldiers',mech:'mechs',air:'aircraft',scorp:'scorpions'};
  const diceKeys={sol:'soldier',mech:'mech',air:'aircraft',scorp:'scorpion'};
  const priority={scorp:0,mech:1,air:2,sol:3};
  const labels={sol:'🪖',mech:'🤖',air:'✈',scorp:'🦂'};
  const count=t=>Object.values(keys).reduce((sum,key)=>sum+(t[key]||0),0);
  const canAttack=t=>count(t)>1;
  function pool(t,rules) {
    return Object.keys(keys).sort((a,b)=>rules.unitDice[diceKeys[b]]-rules.unitDice[diceKeys[a]]||priority[a]-priority[b]).flatMap(type=>
      Array.from({length:t[keys[type]]||0},(_,index)=>({type,sides:rules.unitDice[diceKeys[type]],label:labels[type],index})));
  }
  function select(t,chosen,limit,rules) {
    const available=pool(t,rules), used={};
    const selected=chosen || available.slice(0,limit);
    if(!selected.length || selected.length>limit) throw Error('Selección de combate inválida');
    return selected.map(unit=>{
      if(!keys[unit.type]) throw Error('Unidad desconocida');
      const index=used[unit.type]||0;used[unit.type]=index+1;
      const actual=available.filter(u=>u.type===unit.type)[index];
      if(!actual)throw Error('Unidad no disponible');
      return actual;
    });
  }
  function roll(units,fk,side,random=Math.random) {
    const bonus=(side==='attacker'&&fk==='clt')||(side==='defender'&&fk==='imp')?1:0;
    return units.map(unit=>{
      const value=random();
      if(!(value>=0&&value<1))throw Error('Resultado aleatorio inválido');
      const raw=Math.floor(value*unit.sides)+1;
      return {...unit,raw,bonus,value:raw+bonus};
    });
  }
  function compare(attRolls,defRolls,rules) {
    const sort=(a,b)=>b.value-a.value||b.sides-a.sides||priority[a.type]-priority[b.type];
    const a=[...attRolls].sort(sort), d=[...defRolls].sort(sort);
    return Array.from({length:Math.min(a.length,d.length)},(_,i)=>({att:a[i],def:d[i],
      loser:(rules.tieBreakerDefender?a[i].value>d[i].value:a[i].value>=d[i].value)?'defender':'attacker'}));
  }
  function losses(army,units) {
    const result={...army};
    // Remove originals first, then add downgraded survivors (simultaneous casualties).
    units.forEach(u=>{if(!(result[keys[u.type]]>0))throw Error('Baja inválida');result[keys[u.type]]--;});
    const changes=units.map(u=>({from:u.type,to:u.type==='scorp'?'mech':u.type==='mech'?'sol':null}));
    changes.forEach(c=>{if(c.to)result[keys[c.to]]++;});
    return {army:result,changes};
  }
  function round(attacker,defender,options) {
    const {rules,random=Math.random,attFk,defFk}=options;
    if(!canAttack(attacker)||count(defender)===0)throw Error('Combate terminado o sin unidades');
    const eligible={...attacker};
    if(options.guardType){const key=keys[options.guardType];if(!key||!eligible[key])throw Error('Guarnición inválida');eligible[key]--;}
    const att=select(eligible,options.attUnits,Math.min(count(attacker)-1,rules.maxAttackDice),rules);
    const def=select(defender,null,Math.min(count(defender),rules.maxDefenseDice),rules);
    const attRolls=options.attRolls || roll(att,attFk,'attacker',random);
    const defRolls=roll(def,defFk,'defender',random);
    if(attRolls.length!==att.length || attRolls.some((u,i)=>u.type!==att[i].type))throw Error('Dados atacantes obsoletos');
    const pairs=compare(attRolls,defRolls,rules);
    const a=losses(attacker,pairs.filter(p=>p.loser==='attacker').map(p=>p.att));
    const d=losses(defender,pairs.filter(p=>p.loser==='defender').map(p=>p.def));
    const status=count(d.army)===0?'conquered':!canAttack(a.army)?'repelled':'ongoing';
    const unused={...attacker};att.forEach(u=>unused[keys[u.type]]--);
    const guard=options.guardType||Object.keys(keys).reverse().find(type=>unused[keys[type]]>0);
    return {attacker:a.army,defender:d.army,attRolls,defRolls,pairs,
      losses:{attacker:a.changes,defender:d.changes},status,guard};
  }
  function occupy(attacker,defender,guard) {
    if(!canAttack(attacker)||count(defender)!==0)throw Error('Conquista inválida');
    const a={...attacker},d={...defender};
    for(const key of Object.values(keys)){d[key]=a[key]||0;a[key]=0;}
    const key=keys[guard];if(!key||d[key]<1)throw Error('Guarnición inválida');
    a[key]++;d[key]--;
    return {attacker:a,defender:d};
  }
  function fight(attacker,defender,options) {
    if(!canAttack(attacker)||count(defender)===0)throw Error('Combate inválido');
    let a={...attacker},d={...defender},result;const rounds=[];
    // Each comparison consumes at least one finite damage level: scorp=3, mech=2, others=1.
    const life=t=>(t.soldiers||0)+(t.aircraft||0)+2*(t.mechs||0)+3*(t.scorpions||0);
    const bound=life(a)+life(d);
    for(let i=0;i<bound;i++) {
      result=round(a,d,options);rounds.push(result);a=result.attacker;d=result.defender;
      if(result.status!=='ongoing') {
        if(result.status==='conquered'){const occupied=occupy(a,d,result.guard);a=occupied.attacker;d=occupied.defender;}
        return {...result,attacker:a,defender:d,rounds};
      }
    }
    throw Error('El combate no progresa');
  }
  return {keys,count,canAttack,pool,select,roll,compare,round,occupy,fight};
})();
