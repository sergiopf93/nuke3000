const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const ctx=vm.createContext({console});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/data.js'),'utf8'),ctx);
const territories=JSON.parse(vm.runInContext('JSON.stringify(TERRITORIES_DEF)',ctx));
const regions=JSON.parse(vm.runInContext('JSON.stringify(REGIONS)',ctx));

test('60 territorios únicos, 7 de Rusia y tamaños regionales coherentes',()=>{
 assert.equal(territories.length,60);
 assert.equal(new Set(territories.map(t=>t.id)).size,60);
 assert.equal(territories.filter(t=>t.region==='r06').length,7);
 for(const region of regions) assert.equal(territories.filter(t=>t.region===region.id).length,region.size);
});
test('grafo conectado, sin vecinos inexistentes y con adyacencias recíprocas',()=>{
 const byId=Object.fromEntries(territories.map(t=>[t.id,t]));
 for(const t of territories) for(const neighbor of t.adj) {
  assert.ok(byId[neighbor],neighbor);
  assert.ok(byId[neighbor].adj.includes(t.id),`${t.id} ↔ ${neighbor}`);
 }
 const visited=new Set(),queue=[territories[0].id];
 while(queue.length){const id=queue.pop();if(visited.has(id))continue;visited.add(id);queue.push(...byId[id].adj);}
 assert.equal(visited.size,60);
 assert.deepEqual(byId['06_07'].adj,['06_06','01_01']);
});
test('los 59 territorios originales son idénticos salvo conexiones autorizadas',()=>{
 const original=territories.filter(t=>t.id!=='06_07').map(t=>({...t,adj:t.adj.filter(id=>id!=='06_07')}));
 assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'),'da7bfc8ea0ab8a303efd4821a14485fd21c0279f0b7e3a72a0890911feaf65a7');
});
for(const count of [3,4,5,6]) test(`60 territorios se reparten por igual entre ${count} participantes`,()=>{
 const counts=Array(count).fill(0);territories.forEach((_,i)=>counts[i%count]++);
 assert.deepEqual(counts,Array(count).fill(60/count));
});
