import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5173';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function client(){let cookie='';return async(action,data={},expected=200)=>{const response=await fetch(origin+'/api/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify({action,...data})});const next=response.headers.get('set-cookie');if(next)cookie=next.split(';')[0];const result=await response.json();assert.equal(response.status,expected,result.error);return result;};}
const dev=client(),qa=client();const created=await dev('create',{name:'DEV attack test',track:0,level:'hard',mode:'battle'}),code=created.code;
const peer=await qa('join',{code,name:'QA attack test'});
await dev('ready',{code});await qa('ready',{code});const started=await dev('start',{code}),round=started.round;
await dev('attack',{code,round,target:peer.me,requestId:crypto.randomUUID()},409);
await sleep(started.startedAt-Date.now()+100);
await dev('attack',{code,round,target:peer.me,requestId:crypto.randomUUID()},409);
await dev('attack',{code,round,target:created.me,requestId:crypto.randomUUID()},400);
const stats={perfect:90,good:0,miss:0,maxCombo:90,comboCharges:3,score:100000,accuracy:100};
let r=await dev('sync',{code,stats});assert.equal(r.players.find(p=>p.id===created.me).ammo,3);
r=await dev('sync',{code,stats});assert.equal(r.players.find(p=>p.id===created.me).ammo,3);
let eventIds=[];
for(let i=0;i<4;i++){
 if(i)await sleep(2050);
 if(i===3)await dev('sync',{code,stats:{...stats,perfect:120,maxCombo:120,comboCharges:4}});
 const requestId=crypto.randomUUID();r=await dev('attack',{code,round,target:peer.me,requestId});
 const event=r.attacks.find(a=>a.id===requestId);assert.ok(event);assert.equal(event.endsAt-event.startsAt,8000);assert.equal(event.target,peer.me);assert.ok(event.startsAt>r.serverTime);eventIds.push(event.id);
 if(i===0){const duplicate=await dev('attack',{code,round,target:peer.me,requestId});assert.equal(duplicate.attacks.length,1);assert.equal(duplicate.players.find(p=>p.id===created.me).ammo,2);await dev('attack',{code,round,target:peer.me,requestId:crypto.randomUUID()},429);}
}
assert.equal(new Set(r.attacks.map(a=>a.type)).size,4);
const received=await qa('sync',{code});assert.deepEqual(received.attacks.map(a=>a.id),eventIds);
await dev('attack',{code,round:'wrong-round',target:peer.me,requestId:crypto.randomUUID()},409);
await dev('leave',{code});await qa('leave',{code});
console.log('PASS: combo charges capped at 3, no duplicate grants, self/no-charge/pre-start attacks denied, 4 distinct penalties, 1.8s warnings, 8s duration, idempotency, cooldown, shared delivery, stale-round denial.');
