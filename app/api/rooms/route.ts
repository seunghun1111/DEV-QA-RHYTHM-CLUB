import {roomStore} from '@/lib/room-store';
import type {RoomView} from '@/lib/room-types';
import {duration,tracks} from '@/lib/tracks';
import {penaltyTypes,ATTACK_COMBO} from '@/lib/penalties';
type State=Omit<RoomView,'me'|'serverTime'>;
const cookieName='repro_player';
const fail=(error:string,status=400)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 const url=new URL(request.url),origin=request.headers.get('origin');
 if(!origin||origin!==url.origin)return fail('다른 사이트에서는 이 방에 요청할 수 없어요.',403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return fail('올바르지 않은 요청이에요.');
 if(Number(request.headers.get('content-length')||0)>4096)return fail('요청이 너무 커요.',413);
 const raw=await request.text();if(raw.length>4096)return fail('요청이 너무 커요.',413);
 let input:Record<string,unknown>;try{input=JSON.parse(raw);if(!input||typeof input!=='object')return fail('올바르지 않은 요청이에요.');}catch{return fail('올바르지 않은 요청이에요.');}
 const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 const validToken=token&&/^[0-9a-f-]{36}$/.test(token)?token:null;
 if(!validToken&&!['create','join'].includes(String(input.action)))return fail('방에 다시 참여해 주세요.',401);
 const secret=validToken||crypto.randomUUID();const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret));const me=Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
 const now=Date.now();const respond=(room:State)=>Response.json({...room,me,serverTime:Date.now()},{headers:{'Cache-Control':'no-store',...(!validToken?{'Set-Cookie':`${cookieName}=${secret}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200${url.protocol==='https:'?'; Secure':''}`}:{})}});
 const name=typeof input.name==='string'?input.name.trim().slice(0,16):'익명의 공범';
 try{const db=roomStore();
  if(input.action==='create'){
   const track=Number(input.track);if(!Number.isInteger(track)||!tracks[track]||!['easy','normal','hard'].includes(String(input.level))||!['coop','battle'].includes(String(input.mode)))return fail('곡과 모드를 다시 선택해 주세요.');
   const code=Array.from(crypto.getRandomValues(new Uint8Array(7))).map(n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
   const state:State={code,host:me,track,level:input.level as State['level'],mode:input.mode as State['mode'],players:[{id:me,slot:1,name:name||'익명의 공범',ready:false,seen:now,finished:false,ammo:0,chargesEarned:0,lastAttackAt:0}],startedAt:null,round:crypto.randomUUID(),attacks:[]};
   await db.prepare('INSERT INTO rooms (code,state,version,expires) VALUES (?,?,0,?)').bind(code,JSON.stringify(state),now+7200000).run();return respond(state);
  }
  const code=String(input.code||'').toUpperCase();if(!/^[A-Z2-9]{7}$/.test(code))return fail('7자리 방 코드를 확인해 주세요.');
  for(let retry=0;retry<5;retry++){
   const row=await db.prepare('SELECT state,version,expires FROM rooms WHERE code = ?').bind(code).first<{state:string;version:number;expires:number}>();if(!row||row.expires<now)return fail('방이 없거나 만료되었어요. 새 방을 만들어 주세요.',404);
   const room=JSON.parse(row.state) as State;room.attacks??=[];room.players.forEach((p,i)=>{p.slot??=i+1;p.ammo??=0;p.chargesEarned??=0;p.lastAttackAt??=0;});let player=room.players.find(p=>p.id===me);
   if(!player&&input.action!=='join')return fail('먼저 방에 참여해 주세요.',403);
   if(room.startedAt&&now>room.startedAt+duration(tracks[room.track])*1000+6000){room.startedAt=null;room.players.forEach(p=>p.ready=false);}
   if(input.action==='join'){
    if(room.startedAt)return fail('합주 중인 방이에요. 곡이 끝난 후 참여해 주세요.',409);
    room.players=room.players.filter(p=>now-p.seen<60000||p.id===me);
    if(!player){if(room.players.length>=4)return fail('방이 가득 찼어요. 최대 4명까지 참여할 수 있어요.',409);player={id:me,slot:[1,2,3,4].find(slot=>!room.players.some(p=>p.slot===slot))!,name:name||'익명의 공범',ready:false,seen:now,finished:false,ammo:0,chargesEarned:0,lastAttackAt:0};room.players.push(player);}
   }
   if(!player)return fail('방에 다시 참여해 주세요.',403);player.seen=now;
   if(!room.players.some(p=>p.id===room.host&&now-p.seen<60000))room.host=me;
   switch(input.action){
    case 'join':break;
    case 'ready':if(room.startedAt)return fail('이미 합주 중이에요.',409);player.ready=!player.ready;player.finished=false;player.stats=undefined;break;
    case 'start':if(me!==room.host)return fail('방장만 시작할 수 있어요.',403);if(room.startedAt)return fail('이미 합주 중이에요.',409);room.players=room.players.filter(p=>now-p.seen<15000);if(room.players.length<2||!room.players.every(p=>p.ready))return fail('두 명 이상 모두 준비해야 시작할 수 있어요.',409);room.startedAt=now+5500;room.round=crypto.randomUUID();room.attacks=[];room.players.forEach(p=>{p.finished=false;p.stats=undefined;p.ammo=0;p.chargesEarned=0;p.lastAttackAt=0;});break;
    case 'sync':case 'finish':case 'attack':{
     if(room.startedAt&&now>=room.startedAt&&input.stats&&typeof input.stats==='object'){
      const s=input.stats as Record<string,unknown>;const score=Number(s.score),accuracy=Number(s.accuracy),maxCombo=Number(s.maxCombo),hitCount=Number(s.perfect)+Number(s.good),charges=Number(s.comboCharges);
      if([score,accuracy,maxCombo,hitCount,charges].every(Number.isFinite)&&score>=0&&score<=1000000&&accuracy>=0&&accuracy<=100&&maxCombo>=0&&maxCombo<=1500&&hitCount>=maxCombo&&hitCount<=1500&&Number.isInteger(charges)&&charges>=0&&charges<=Math.floor(hitCount/ATTACK_COMBO)&&hitCount>=(player.stats?.hitCount??0)){
       player.stats={score:Math.round(score),accuracy,maxCombo:Math.round(maxCombo),hitCount:Math.round(hitCount)};
       const earned=Math.max(player.chargesEarned,charges);player.ammo=Math.min(3,player.ammo+earned-player.chargesEarned);player.chargesEarned=earned;
      }
     }
     if(input.action==='attack'){
      if(!room.startedAt||now<room.startedAt||now>room.startedAt+duration(tracks[room.track])*1000||player.finished)return fail('연주 중에만 업무를 보낼 수 있어요.',409);
      if(input.round!==room.round)return fail('이전 합주의 공격이에요.',409);
      const requestId=String(input.requestId||'');if(!/^[0-9a-f-]{36}$/.test(requestId))return fail('공격 요청을 확인해 주세요.');
      if(room.attacks.some(a=>a.id===requestId&&a.from===me))return respond(room);
      const target=room.players.find(p=>p.id===input.target);
      if(!target||target.id===me||target.finished||now-target.seen>15000)return fail('연주 중인 상대를 골라 주세요.',400);
      if(player.ammo<1)return fail('30콤보를 쌓아 공격권을 획득하세요.',409);
      if(now-player.lastAttackAt<2000)return fail('다음 업무는 2초 뒤에 보낼 수 있어요.',429);
      const activeTypes=new Set(room.attacks.filter(a=>a.target===target.id&&a.endsAt>now).map(a=>a.type));
      const available=penaltyTypes.filter(t=>!activeTypes.has(t));if(!available.length)return fail('상대의 업무가 가득 찼어요. 잠시 후 보내 주세요.',409);
      const type=available[crypto.getRandomValues(new Uint32Array(1))[0]%available.length];
      player.ammo--;player.lastAttackAt=now;
      room.attacks=room.attacks.filter(a=>a.endsAt>now-15000).slice(-40);
      room.attacks.push({id:requestId,from:me,fromName:player.name,target:target.id,type,startsAt:now+1800,endsAt:now+9800});
     }
     if(input.action==='finish'&&room.startedAt&&now>=room.startedAt+duration(tracks[room.track])*1000)player.finished=true;
     break;
    }
    case 'leave':room.players=room.players.filter(p=>p.id!==me);if(room.host===me)room.host=room.players[0]?.id||'';break;
    default:return fail('지원하지 않는 요청이에요.');
   }
   const updated=await db.prepare('UPDATE rooms SET state = ?, version = version + 1 WHERE code = ? AND version = ?').bind(JSON.stringify(room),code,row.version).run();if(updated.meta.changes===1)return respond(room);
  }
  return fail('동시에 요청이 몰렸어요. 잠시 후 다시 눌러 주세요.',409);
 }catch{return fail('대기실에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',503);}
}
