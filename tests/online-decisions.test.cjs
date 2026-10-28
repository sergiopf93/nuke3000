const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const meta={host:'a',players:{a:{faction:'imp'},b:{faction:'lib'},c:{faction:'erb'}}};
function client(uid,bus,{fail=false}={}){
 let sequence=0;
 const db={collection:()=>({doc:()=>({get:async()=>({data:()=>({meta}),exists:true}),collection:()=>({add:async action=>{if(fail)throw Error('Red no disponible');bus.push(JSON.parse(JSON.stringify(action)));}})})})};
 const ctx=vm.createContext({console:{log(){},error(){},assert(){}},crypto:{randomUUID:()=>String(++sequence)},setTimeout(){},clearTimeout(){},document:{getElementById:()=>null},firebase:{firestore:{FieldValue:{serverTimestamp:()=>0}}}});
 for(const file of ['data','battle','engine'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),ctx);
 const source=fs.readFileSync(path.join(__dirname,'../js/online.js'),'utf8').replace('    signalGameEnd,','    __configure:(uid,db)=>{_roomId="test";_userId=uid;_db=db;}, _handleRemoteAction,\n    signalGameEnd,');
 vm.runInContext(source,ctx);
 ctx.db=db;ctx.uid=uid;
 vm.runInContext(`ONLINE.__configure(uid,db);G.pf=({a:'imp',b:'lib',c:'erb'})[uid];G.round=1;G.phase='combat';G.setup={order:['imp','lib','clt'],_inSetup:false};G.factions={imp:{alive:true,missiles:2},lib:{alive:true,missiles:2},clt:{alive:true}};G.territories={};G_step={currentFk:'imp',phase:'combat',idx:0};updateMap=refreshCards=updatePhaseBanner=addLog=()=>{};let views=0,replies=0,choice=null,failure=null,respond;showRemoteDecision=(packet,reply)=>{views++;respond=reply};`,ctx);
 return {run:s=>vm.runInContext(s,ctx),deliver:action=>{ctx.action=action;return vm.runInContext('ONLINE._handleRemoteAction(action)',ctx);}};
}
const request="ONLINE.requestDecision('defense','lib',{attFk:'imp',srcId:'x',targetId:'y',attRolls:[]},(answer,error)=>{replies++;choice=answer;failure=error?.message})";
test('dos clientes: espera decisión humana, respuesta única y sin snapshot del defensor',async()=>{
 const bus=[],a=client('a',bus),b=client('b',bus);await a.run(request);assert.equal(a.run('replies'),0);assert.ok(a.run('G.waitingDecision'));
 const req=bus.shift();await b.deliver(req);await b.deliver(req);assert.equal(b.run('views'),1);assert.equal(a.run('replies'),0);
 await b.run("respond({units:[{type:'sol'}]})");const response=bus.shift();assert.equal(response.type,'DECISION_RESPONSE');assert.equal(response.payload._G,undefined);
 await a.deliver(response);await a.deliver(response);assert.equal(a.run('replies'),1);assert.equal(a.run('choice.units[0].type'),'sol');assert.equal(a.run('G.waitingDecision'),null);
});
test('respuesta de otro participante no consume la decisión ni aplica su estado',async()=>{
 const bus=[],a=client('a',bus);await a.run(request);const req=bus.shift();
 await a.deliver({type:'DECISION_RESPONSE',playerId:'c',payload:{id:req.payload.id,choice:{units:[]},_G:{round:99}}});
 assert.equal(a.run('replies'),0);assert.equal(a.run('G.round'),1);assert.ok(a.run('G.waitingDecision'));
});
test('un remitente que no dirige el turno no solicita decisiones',async()=>{
 const bus=[],a=client('a',bus),b=client('b',bus);await a.run(request);const req=bus.shift();req.playerId='c';req.payload.id='c:forged';
 await b.deliver(req);assert.equal(b.run('views'),0);
});
test('cancelar invalida respuestas tardías y cierra la pregunta remota',async()=>{
 const bus=[],a=client('a',bus),b=client('b',bus);await a.run(request);const req=bus.shift();await b.deliver(req);
 a.run('ONLINE.cancelPendingDecision()');await b.deliver(bus.shift());assert.equal(await b.run('respond({units:[{type:"sol"}]})'),false);
 await a.deliver({type:'DECISION_RESPONSE',playerId:'b',payload:{id:req.payload.id,choice:{units:[{type:'sol'}]}}});assert.equal(a.run('replies'),0);
});
test('una solicitud histórica no hace retroceder ronda o paso al reconectar',async()=>{
 const bus=[],a=client('a',bus),b=client('b',bus);b.run('G.round=2');await a.run(request);await b.deliver(bus.shift());assert.equal(b.run('views'),0);assert.equal(b.run('G.round'),2);
});
test('CPU dirigida por host solicita intercepción al humano y acepta NO sin automatizar',async()=>{
 const bus=[],a=client('a',bus),b=client('b',bus);a.run("G_step.currentFk='clt'");
 await a.run("ONLINE.requestDecision('intercept','lib',{attFk:'clt',targetId:'x'},answer=>{replies++;choice=answer})");await b.deliver(bus.shift());assert.equal(b.run('views'),1);assert.equal(a.run('replies'),0);
 await b.run('respond({intercept:false})');await a.deliver(bus.shift());assert.equal(a.run('choice.intercept'),false);assert.equal(a.run('replies'),1);
});
test('fallo al enviar libera la espera sin inventar una defensa',async()=>{
 const bus=[],a=client('a',bus,{fail:true});assert.equal(await a.run(request),false);assert.equal(a.run('G.waitingDecision'),null);assert.equal(a.run('replies'),1);assert.equal(a.run('choice'),null);assert.ok(a.run('failure'));
});
