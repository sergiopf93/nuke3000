const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function load(){const c=vm.createContext({console});for(const f of ['data','battle'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f+'.js'),'utf8'),c);return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',c));}
const army=(type,n=1)=>({soldiers:0,mechs:0,aircraft:0,scorpions:0,[type]:n});
const types={sol:'soldiers',mech:'mechs',air:'aircraft',scorp:'scorpions'};
for(const [type,key] of Object.entries(types)) for(const [other,otherKey] of Object.entries(types)) {
 test(`${type} pierde frente a ${other}: baja del dado correcto`,()=>{
 const run=load();const a={...army(key),soldiers:key==='soldiers'?2:1};
 const r=run(`Battle.round(${JSON.stringify(a)},${JSON.stringify(army(otherKey))},{attUnits:[{type:'${type}'}],defUnits:[{type:'${other}'}],rules:RULES.combat,random:(()=>{let i=0;return ()=>i++===0?0:0.99})()})`);
 assert.equal(r.attacker[key],a[key]-1);
 if(type==='scorp')assert.equal(r.attacker.mechs,1);
 if(type==='mech')assert.equal(r.attacker.soldiers,a.soldiers+1);
 assert.equal(r.defender[otherKey],1);
 assert.equal(r.losses.attacker[0].from,type);
 });
}
test('empates: defensor gana; dados empatados ordenan caras y mech antes que aircraft',()=>{
 const run=load(); const r=run(`Battle.compare([{type:'sol',sides:6,value:5},{type:'air',sides:12,value:5},{type:'scorp',sides:20,value:5},{type:'mech',sides:12,value:5}],[{type:'sol',sides:6,value:5},{type:'sol',sides:6,value:5},{type:'sol',sides:6,value:5},{type:'sol',sides:6,value:5}],RULES.combat)`);
 assert.deepEqual(r.map(p=>p.att.type),['scorp','mech','air','sol']);assert.ok(r.every(p=>p.loser==='attacker'));
});
test('HOLY WAR e IMPERIAL DEFENSE afectan a todos los dados sin recortar el bonus',()=>{
 const run=load();const r=run(`Battle.round(${JSON.stringify(army('soldiers',4))},${JSON.stringify(army('soldiers',4))},{attFk:'clt',defFk:'imp',rules:RULES.combat,random:()=>0.999})`);
 assert.deepEqual(r.attRolls.map(d=>d.value),[7,7,7]);assert.deepEqual(r.defRolls.map(d=>d.value),[7,7,7,7]);
});
test('una unidad blindada sola no puede atacar; defensa usa hasta 4 dados aunque ataque 1',()=>{
 const run=load();assert.equal(run(`Battle.canAttack(${JSON.stringify(army('scorpions'))})`),false);
 const r=run(`Battle.round(${JSON.stringify(army('soldiers',2))},${JSON.stringify(army('soldiers',6))},{rules:RULES.combat,random:()=>0.5})`);
 assert.equal(r.attRolls.length,1);assert.equal(r.defRolls.length,4);assert.equal(r.attacker.soldiers,1);assert.equal(r.status,'repelled');
});
test('bajas simultáneas no vuelven a golpear las unidades recién degradadas',()=>{
 const run=load();const r=run(`Battle.round({soldiers:1,mechs:1,aircraft:0,scorpions:1},${JSON.stringify(army('scorpions',2))},{rules:RULES.combat,random:(()=>{let i=0;return ()=>i++<2?0:0.99})()})`);
 assert.equal(r.attacker.scorpions,0);assert.equal(r.attacker.mechs,1);assert.equal(r.attacker.soldiers,2);
});
test('ataque inválido, selección duplicada o sin guarnición se rechaza antes de mutar',()=>{
 const run=load();assert.throws(()=>run(`Battle.round(${JSON.stringify(army('soldiers',2))},${JSON.stringify(army('soldiers'))},{attUnits:[{type:'sol'},{type:'sol'}],rules:RULES.combat})`));
});
test('combate completo degrada hasta conquista, preserva guarnición y termina en cota finita',()=>{
 const run=load();const r=run(`Battle.fight(${JSON.stringify(army('scorpions',3))},${JSON.stringify(army('scorpions',2))},{rules:RULES.combat,random:(()=>{let i=0;return ()=>i++%4<2?0.99:0})()})`);
 assert.ok(['conquered','repelled'].includes(r.status));assert.ok(r.rounds.length>0);assert.ok(r.rounds.length<30);
});
test('sin dados defensivos no hay bucle: combate vacío se rechaza',()=>{
 const run=load();assert.throws(()=>run(`Battle.fight(${JSON.stringify(army('soldiers',3))},${JSON.stringify(army('soldiers',0))},{rules:RULES.combat})`));
});

for(const [type,key]of Object.entries(types))for(const [attacker,attKey]of Object.entries(types))test(`${type} defiende y pierde ante ${attacker}: degradación simétrica`,()=>{
 const run=load(),a={...army(attKey),soldiers:attKey==='soldiers'?2:1};
 const result=run(`Battle.round(${JSON.stringify(a)},${JSON.stringify(army(key))},{attUnits:[{type:'${attacker}'}],defUnits:[{type:'${type}'}],rules:RULES.combat,random:(()=>{let i=0;return ()=>i++===0?0.99:0})()})`);
 assert.equal(result.defender[key],0);
 if(type==='scorp')assert.equal(result.defender.mechs,1);
 if(type==='mech')assert.equal(result.defender.soldiers,1);
 assert.equal(result.losses.defender[0].from,type);
});
test('guarnición escogida queda fuera del pool y no puede sufrir bajas',()=>{
 const run=load();const r=run(`Battle.round({soldiers:1,mechs:0,aircraft:0,scorpions:1},${JSON.stringify(army('scorpions'))},{guardType:'scorp',rules:RULES.combat,random:()=>0.5})`);
 assert.equal(r.attacker.scorpions,1);assert.equal(r.guard,'scorp');assert.equal(r.attRolls[0].type,'sol');
 assert.throws(()=>run(`Battle.round({soldiers:1,mechs:0,aircraft:0,scorpions:1},${JSON.stringify(army('soldiers'))},{guardType:'scorp',attUnits:[{type:'scorp'}],rules:RULES.combat})`));
});
