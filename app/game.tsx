'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Pause,Play,X,Activity} from 'lucide-react';
import {chart,duration,keyLabel,type Track,type Difficulty,type Note} from '@/lib/tracks';
import {activePenalties,penaltyKeys,judgmentWindow,extraNotes,penaltyInfo,ATTACK_COMBO,type Attack} from '@/lib/penalties';
import type {RoomView} from '@/lib/room-types';
import {Soundtrack,unlockAudio} from '@/lib/audio';
export type Stats={perfect:number;good:number;miss:number;combo:number;maxCombo:number;score:number;accuracy:number;total:number;comboCharges:number};
export type Settings={keys:string[];speed:number;playbackRate:number;volume:number;offset:number};
export const freshStats=():Stats=>({perfect:0,good:0,miss:0,combo:0,maxCombo:0,score:0,accuracy:100,total:0,comboCharges:0});
export default function Game({track,level,settings,startDelay,multiplayer,room,serverOffset,onAttack,onEnd,onQuit,onProgress}:{track:Track;level:Difficulty;settings:Settings;startDelay?:number;multiplayer:boolean;room:RoomView|null;serverOffset:number;onAttack:(slot:number,s:Stats)=>void;onEnd:(s:Stats)=>void;onQuit:()=>void;onProgress?:(s:Stats)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),sound=useRef<Soundtrack|null>(null),notes=useRef<Note[]>([]),stats=useRef(freshStats()),pressed=useRef(new Set<number>()),held=useRef(new Map<string,number>()),flash=useRef<number[]>(Array(settings.keys.length).fill(0)),judgment=useRef({text:'READY',at:0});
 const live=useRef({room,serverOffset,onAttack});live.current={room,serverOffset,onAttack};const processedAttacks=useRef(new Set<string>());const previousShuffle=useRef(false);
 const [effects,setEffects]=useState<Attack[]>([]),[incoming,setIncoming]=useState<Attack[]>([]),[liveKeys,setLiveKeys]=useState(settings.keys),[workTime,setWorkTime]=useState(0);
 const getEffects=()=>{const r=live.current.room;return r?activePenalties(r.attacks||[],r.me,Date.now()+live.current.serverOffset):[];};
 const [display,setDisplay]=useState(freshStats()),[time,setTime]=useState(-2),[paused,setPaused]=useState(false),[error,setError]=useState('');const pausedRef=useRef(false);const callbacks=useRef({onEnd,onProgress,onQuit});callbacks.current={onEnd,onProgress,onQuit};
 const hit=(lane:number)=>{const audio=sound.current;if(!audio||pausedRef.current)return;const now=audio.elapsed()-settings.offset/1000;if(now<0)return;flash.current[lane]=performance.now();const window=judgmentWindow(getEffects());const note=notes.current.find(n=>n.lane===lane&&!n.hit&&!n.miss&&Math.abs(n.t-now)<=window.good);if(!note)return;note.hit=true;const d=Math.abs(now-note.t),s=stats.current;if(d<=window.perfect){s.perfect++;judgment.current={text:'PERFECT',at:performance.now()};}else{s.good++;judgment.current={text:'GOOD',at:performance.now()};}s.combo++;if(s.combo%ATTACK_COMBO===0)s.comboCharges++;s.maxCombo=Math.max(s.maxCombo,s.combo);};
 const hitRef=useRef(hit);hitRef.current=hit;
 useEffect(()=>{let alive=true,frame=0,lastUi=0,lastSend=0;notes.current=chart(track,level,settings.keys.length);stats.current=freshStats();stats.current.total=notes.current.length;
  const clearHeld=()=>{held.current.clear();pressed.current.clear();};
  const down=(e:KeyboardEvent)=>{if(e.metaKey||e.ctrlKey||e.altKey||held.current.has(e.code))return;if(multiplayer&&/^Digit[1-4]$/.test(e.code)&&(!settings.keys.includes(e.code)||e.shiftKey)){e.preventDefault();live.current.onAttack(Number(e.code.slice(-1)),{...stats.current});return;}const lane=penaltyKeys(settings.keys,getEffects()).indexOf(e.code);if(lane>=0){e.preventDefault();held.current.set(e.code,lane);pressed.current.add(lane);hitRef.current(lane);}};
  const up=(e:KeyboardEvent)=>{const lane=held.current.get(e.code);if(lane!==undefined){held.current.delete(e.code);pressed.current.delete(lane);}};const blur=clearHeld;const visibility=()=>{if(document.hidden)clearHeld();};
  window.addEventListener('keydown',down,true);window.addEventListener('keyup',up,true);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  unlockAudio().then(ctx=>{if(!alive)return;const audio=new Soundtrack(track,ctx,settings.volume,settings.playbackRate);sound.current=audio;audio.play(startDelay??2);
   const render=()=>{if(!alive)return;const now=audio.elapsed(),stamp=performance.now(),s=stats.current,serverNow=Date.now()+live.current.serverOffset,r=live.current.room;
    const pending=r?(r.attacks||[]).filter(a=>a.target===r.me&&a.endsAt>serverNow):[],active=activePenalties(pending,r?.me||'',serverNow),window=judgmentWindow(active);
    for(const attack of pending)if(!processedAttacks.current.has(attack.id)){
     processedAttacks.current.add(attack.id);
     if(attack.type==='burst'){
      const from=Math.max(now+1.8,now+(attack.startsAt-serverNow)/1000),to=Math.min(duration(track)-.5,now+(attack.endsAt-serverNow)/1000);
      notes.current.push(...extraNotes(track,from,to,notes.current,attack.id.charCodeAt(0),settings.keys.length));notes.current.sort((a,b)=>a.t-b.t);s.total=notes.current.length;
     }
    }
    const shuffled=active.some(a=>a.type==='shuffle');if(shuffled!==previousShuffle.current){clearHeld();previousShuffle.current=shuffled;}

    if(!pausedRef.current)for(const n of notes.current)if(!n.hit&&!n.miss&&now-settings.offset/1000>n.t+window.good){n.miss=true;s.miss++;s.combo=0;judgment.current={text:'재현 불가',at:stamp};}
    s.score=Math.round((s.perfect+s.good*.65)/s.total*1000000);const judged=s.perfect+s.good+s.miss;s.accuracy=judged?(s.perfect+s.good*.65)/judged*100:100;
    if(stamp-lastUi>50){setDisplay({...s});setTime(now);setEffects(active);setIncoming(pending);setLiveKeys(penaltyKeys(settings.keys,active));setWorkTime(serverNow);lastUi=stamp;}
    if(stamp-lastSend>1000){callbacks.current.onProgress?.({...s});lastSend=stamp;}
    const el=canvas.current,draw=el?.getContext('2d');if(el&&draw){const w=el.clientWidth,h=el.clientHeight,dpr=Math.min(devicePixelRatio,2);if(el.width!==Math.round(w*dpr)||el.height!==Math.round(h*dpr)){el.width=Math.round(w*dpr);el.height=Math.round(h*dpr);}draw.setTransform(dpr,0,0,dpr,0,0);draw.clearRect(0,0,w,h);const lanes=settings.keys.length,laneW=w/lanes,target=h-70,travel=2.6/(settings.speed*(active.some(a=>a.type==='speed')?1.45:1));const colors=['#b9f36b','#75dbff','#c4a1ff','#ff92b8','#ffd166','#70e1c8','#ff7b72','#a5a6ff','#f0a6ca','#9ee37d'];
     for(let lane=0;lane<lanes;lane++){draw.fillStyle=lane%2?'#11191a':'#0e1516';draw.fillRect(lane*laneW,0,laneW-1,h);if(pressed.current.has(lane)||stamp-flash.current[lane]<110){const g=draw.createLinearGradient(0,target-160,0,h);g.addColorStop(0,'transparent');g.addColorStop(1,colors[lane]+'60');draw.fillStyle=g;draw.fillRect(lane*laneW,0,laneW-1,h);}draw.strokeStyle='#283433';const inset=Math.min(10,laneW*.15);draw.strokeRect(lane*laneW+inset,target-11,laneW-inset*2,22);}
     const beat=60/track.bpm;draw.strokeStyle='#ffffff0b';for(let b=Math.floor(now/beat);b<now/beat+travel/beat+2;b++){const y=target-(b*beat-now)/travel*target;if(y>0&&y<h){draw.beginPath();draw.moveTo(0,y);draw.lineTo(w,y);draw.stroke();}}
     for(const n of notes.current){if(n.hit||n.miss)continue;const y=target-(n.t-now+settings.offset/1000)/travel*target;if(y< -20||y>h)continue;draw.fillStyle=n.extra?'#ffac70':colors[n.lane];draw.shadowColor=colors[n.lane];draw.shadowBlur=10;draw.fillRect(n.lane*laneW+9,y-5,laneW-18,10);draw.shadowBlur=0;if(n.extra){draw.fillStyle='#44220e';draw.font='bold 12px monospace';draw.textAlign='center';draw.fillText('+',n.lane*laneW+laneW/2,y+4);}draw.fillStyle='#ffffff80';draw.fillRect(n.lane*laneW+9,y-5,laneW-18,2);}
     draw.fillStyle='#e7f4dd';draw.fillRect(0,target,w,2);if(stamp-judgment.current.at<650){draw.textAlign='center';draw.font='bold 22px monospace';draw.fillStyle=judgment.current.text==='재현 불가'?'#ff92b8':'#b9f36b';draw.fillText(judgment.current.text,w/2,h*.4);if(s.combo>1){draw.font='bold 48px monospace';draw.fillStyle='#fff';draw.fillText(String(s.combo),w/2,h*.4+57);}}
    }
    if(audio.element.ended||now>duration(track)+.5){audio.stop();callbacks.current.onEnd({...s});return;}frame=requestAnimationFrame(render);
   };frame=requestAnimationFrame(render);
  }).catch(()=>setError('소리를 시작하지 못했어요. 돌아가서 다시 시작해 주세요.'));
  return()=>{alive=false;cancelAnimationFrame(frame);sound.current?.stop();void sound.current?.ctx.resume();window.removeEventListener('keydown',down,true);window.removeEventListener('keyup',up,true);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);clearHeld();};
 },[]);
 async function togglePause(){const audio=sound.current;if(!audio)return;if(pausedRef.current){await audio.resume();pausedRef.current=false;}else{audio.pause();pausedRef.current=true;}setPaused(pausedRef.current);}
 const section=time<0?'합주 준비':Math.floor(time/(60/track.bpm*8))%4===2?'같은 패턴, 다시 재현해 주세요':'비밀 합주 진행 중';
 const me=room?.players.find(p=>p.id===room.me);const ammo=Math.min(3,(me?.ammo??0)+Math.max(0,display.comboCharges-(me?.chargesEarned??0)));
 return <div className={`game-view ${incoming.length?'under-attack':''}`}>
<header className="game-header">
<div>
<span className="eyebrow">ISSUE #{String(track.id+1).padStart(3,'0')} · {level.toUpperCase()}</span>
<h2>{track.title}</h2>
</div>
<div className="game-actions">{!multiplayer&&<Button variant="outline" onClick={togglePause} aria-label={paused?'계속 연주':'일시정지'}>{paused?<Play/>:<Pause/>}</Button>}<Button variant="outline" onClick={onQuit}>
<X/> 나가기</Button>
</div>
</header>
<div className="song-progress">
<i style={{width:`${Math.max(0,time/duration(track)*100)}%`}}/>
</div>{multiplayer&&<div className="attack-console">
<div className="attack-charge">
<span className="eyebrow">업무 떠넘기기</span>
<b>{ammo}<small> / 3</small>
</b>
<span>30콤보마다 공격권 +1</span>
<div className="charge-meter">
<i style={{width:`${(display.combo%ATTACK_COMBO)/ATTACK_COMBO*100}%`}}/>
</div>
</div>
<div className="attack-targets">{[1,2,3,4].map(slot=>{const p=room?.players.find(p=>p.slot===slot),own=p?.id===room?.me,conflict=settings.keys.includes(`Digit${slot}`);return <button key={slot} disabled={!p||own||!ammo||time<0||p.finished} onClick={()=>live.current.onAttack(slot,{...stats.current})} aria-label={`${slot}번 ${p?.name||'빈 자리'}${own?' 나':'에게 공격'}`}>
<kbd>{conflict?'⇧ + ':''}{slot}</kbd>
<span>{p?p.name:'빈 자리'}<small>{own?'나':p?'업무 보내기':'참가 대기'}</small>
</span>
</button>;})}</div>
<p className="attack-help">번호키로 상대 선택<br/>게임 키와 겹치면 Shift + 번호</p>
</div>}{multiplayer&&<div className={`workload-banner ${incoming.length?'has-work':''}`}>
<div>
<b>{incoming.length?'업무가 쌓이고 있습니다!':'들어온 업무가 없습니다'}</b>
<span>{incoming.length?`새 업무 ${incoming.length}건 · 효과는 각각 8초 후 해제`:'콤보를 쌓고 상대에게 업무를 보내세요.'}</span>
</div>
<div className="penalty-chips">{incoming.map(a=>
<span className={a.startsAt>workTime?'queued':''} key={a.id}>
<b>{penaltyInfo[a.type].icon} {penaltyInfo[a.type].title}</b>
<small>{a.startsAt>workTime?`${Math.ceil((a.startsAt-workTime)/1000)}초 뒤 시작`:`${Math.ceil((a.endsAt-workTime)/1000)}초 남음`} · {a.fromName}</small>
</span>)}</div>
</div>}<div className="play-grid">
<aside className="play-stats">
<span className="eyebrow">REPRODUCTION SCORE</span>
<strong>{String(display.score).padStart(7,'0')}</strong>
<dl>
<div>
<dt>재현 정확도</dt>
<dd>{display.accuracy.toFixed(1)}%</dd>
</div>
<div>
<dt>최대 콤보</dt>
<dd>{display.maxCombo}</dd>
</div>
<div>
<dt>PERFECT</dt>
<dd>{display.perfect}</dd>
</div>
<div>
<dt>GOOD</dt>
<dd>{display.good}</dd>
</div>
<div>
<dt>재현 불가</dt>
<dd>{display.miss}</dd>
</div>
</dl>
<div className="terminal-note">
<span>qa / live-test</span>
<p>“후렴만 한 번 더<br/>확인할게요.”</p>
</div>
</aside>
<div className="highway">
<div className="highway-label">
<Activity size={14}/>{effects.length?effects.map(a=>penaltyInfo[a.type].description).join(" · "):section}</div>
<canvas ref={canvas} aria-label="위에서 내려오는 노트가 아래 판정선에 닿을 때 해당 키를 누르세요"/>{(time<0||paused||error)&&<div className="countdown">{error|| (paused?'잠시 쉬는 중':Math.ceil(-time)||'GO')}</div>}<div className="lane-keys" style={{gridTemplateColumns:`repeat(${liveKeys.length}, minmax(0, 1fr))`}}>{liveKeys.map((k,i)=>
<button key={i} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);pressed.current.add(i);hitRef.current(i);}} onPointerUp={()=>pressed.current.delete(i)} onPointerCancel={()=>pressed.current.delete(i)}>{keyLabel(k)}</button>)}</div>
</div>
<aside className="play-aside">
<span className="pill">{multiplayer?'공동 조사':'셀프 검증'}</span>
<p>판정선에 닿는 순간<br/>박자에 맞춰 눌러 주세요.</p>
<div className="timing-guide">
<b>PERFECT</b>
<span>±{effects.some(a=>a.type==='strict')?40:65}ms</span>
<b>GOOD</b>
<span>±{effects.some(a=>a.type==='strict')?100:150}ms</span>
</div>{multiplayer&&room&&<div className="live-team">
<h3>{room.mode==='coop'?'함께 재현하는 중':'실시간 점수'}</h3>{room.mode==='coop'&&<p>팀 정확도 {Math.round(room.players.reduce((sum,p)=>sum+(p.id===room.me?display.accuracy:p.stats?.accuracy??0),0)/room.players.length)}% / 목표 80%</p>}{room.players.map(p=>
<div key={p.id}>
<span>{p.name}{p.id===room.me?' (나)':''}</span>
<b>{p.id===room.me?display.score.toLocaleString():p.stats?.score.toLocaleString()??'0'}</b>
</div>)}</div>}<small>실수해도 괜찮아요.<br/>합주는 끝까지 이어집니다.</small>
</aside>
</div>
</div>;
}
