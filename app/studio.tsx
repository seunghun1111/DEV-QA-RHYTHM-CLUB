'use client';
import {useEffect,useRef,useState} from 'react';
import {Bug,Code2,Headphones,Play,Settings2,Users,ArrowUpRight,Terminal,Check,Copy,Radio,RotateCcw,Volume2,Keyboard,ChevronRight,Square,Music2,LockKeyhole,UserRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Slider} from '@/components/ui/slider';
import {Input} from '@/components/ui/input';
import {tracks,duration,keyLabel,chart,type Difficulty,type Track} from '@/lib/tracks';
import {Soundtrack,unlockAudio} from '@/lib/audio';
import Game,{type Stats,type Settings} from './game';
import {penaltyInfo,penaltyTypes} from '@/lib/penalties';
import type {RoomView} from '@/lib/room-types';
import {youtubeKoreaTop20,youtubeMusicSearchUrl,youtubeCover} from '@/lib/youtube-chart';
const keyPresets:Record<number,string[]>={4:['KeyD','KeyF','KeyJ','KeyK'],6:['KeyS','KeyD','KeyF','KeyJ','KeyK','KeyL'],7:['KeyS','KeyD','KeyF','Space','KeyJ','KeyK','KeyL'],8:['KeyA','KeyS','KeyD','KeyF','KeyJ','KeyK','KeyL','Semicolon'],10:['KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Semicolon']};
const defaults:Settings={keys:keyPresets[4],speed:1,playbackRate:1,volume:.65,offset:0};
const personalKeys=(count:number,current:string[])=>{if(current.length===count)return current;try{const presets=JSON.parse(localStorage.getItem('repro-key-presets')||'{}');const keys=presets[count];if(Array.isArray(keys)&&keys.length===count&&new Set(keys).size===count&&keys.every((key:unknown)=>typeof key==='string'))return keys;}catch{}return [...keyPresets[count]];};
const themes=['terminal','intellij','claude','codex'] as const;
type Theme=typeof themes[number];
const reserved=new Set(['Escape','Tab','Enter','CapsLock','MetaLeft','MetaRight','ControlLeft','ControlRight','AltLeft','AltRight','Backspace','Delete','ContextMenu']);
const timeLabel=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const LOBBY_IDLE_MS=10*60*1000;
const youtubeTrack=(index:number):Track=>{const item=youtubeKoreaTop20[index];if(!item.videoId||!item.bpm||!item.duration)throw new Error('이 곡의 게임 데이터가 아직 준비되지 않았어요.');return{id:100+index,title:item.title,subtitle:item.artist,artist:item.artist,genre:'YOUTUBE MUSIC / CHART',bpm:item.bpm,beatOffset:item.beatOffset??.15,duration:item.duration,audio:'',youtubeId:item.videoId,color:'#ff5a65',tag:'CHART SYNC',story:`${item.artist}의 공식 영상 재생 시간에 맞춰 노트가 내려옵니다.`,melody:[0,3,7,10,14,7,3,12]};};
export default function Studio(){
 const [selected,setSelected]=useState(0),[library,setLibrary]=useState<'original'|'youtube'>('original'),[youtubePlaying,setYoutubePlaying]=useState<number|null>(null),[level,setLevel]=useState<Difficulty>('normal'),[mode,setMode]=useState('solo'),[settings,setSettings]=useState<Settings>(defaults),[theme,setTheme]=useState<Theme>('terminal'),[settingsOpen,setSettingsOpen]=useState(false),[profileOpen,setProfileOpen]=useState(false),[binding,setBinding]=useState<number|null>(null),[hint,setHint]=useState(''),[preview,setPreview]=useState(false),[active,setActive]=useState<{track:number;youtube?:number;level:Difficulty;delay:number;multi:boolean}|null>(null),[result,setResult]=useState<Stats|null>(null),[roomOpen,setRoomOpen]=useState(false),[room,setRoom]=useState<RoomView|null>(null),[nickname,setNickname]=useState(''),[roomCode,setRoomCode]=useState(''),[busy,setBusy]=useState(false),[toast,setToast]=useState(''),[access,setAccess]=useState<'checking'|'locked'|'open'>('checking'),[accessCode,setAccessCode]=useState(''),[accessError,setAccessError]=useState(''),[accessBusy,setAccessBusy]=useState(false);
 const sample=useRef<Soundtrack|null>(null),previewTimer=useRef<ReturnType<typeof setTimeout>|null>(null),settingsRef=useRef(settings),playedRound=useRef(''),roomRef=useRef(room),activeRef=useRef(active),serverOffset=useRef(0),progress=useRef<Stats|null>(null),attackBusy=useRef(false),lastLobbyActivity=useRef(Date.now()),idleWarned=useRef(false);settingsRef.current=settings;roomRef.current=room;activeRef.current=active;
 const track=tracks[selected];
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('repro-preferences')||'null');if(saved&&Array.isArray(saved.keys)&&[4,6,7,8,10].includes(saved.keys.length)&&new Set(saved.keys).size===saved.keys.length&&saved.keys.every((k:unknown)=>typeof k==='string'&&/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right)|Numpad[0-9]|Semicolon|Quote|Comma|Period|Slash|BracketLeft|BracketRight|Backslash|Minus|Equal|Backquote)$/.test(k))){setSettings({keys:saved.keys,speed:Math.max(.6,Math.min(2,Number(saved.speed)||1)),playbackRate:Math.max(.5,Math.min(1.5,Number(saved.playbackRate)||1)),volume:Math.max(0,Math.min(1,Number.isFinite(saved.volume)?saved.volume:.65)),offset:Math.max(-200,Math.min(200,Number(saved.offset)||0))});const presets=JSON.parse(localStorage.getItem('repro-key-presets')||'{}');presets[saved.keys.length]=saved.keys;localStorage.setItem('repro-key-presets',JSON.stringify(presets));}const savedName=localStorage.getItem('repro-nickname');if(savedName)setNickname(savedName.slice(0,16));const savedTheme=localStorage.getItem('repro-theme') as Theme;if(themes.includes(savedTheme))setTheme(savedTheme);}catch{}return()=>{sample.current?.stop();if(previewTimer.current)clearTimeout(previewTimer.current);};},[]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer);},[toast]);
 useEffect(()=>{fetch('/api/access',{cache:'no-store'}).then(r=>r.json()).then(data=>setAccess(data.authorized?'open':'locked')).catch(()=>setAccess('locked'));},[]);
 useEffect(()=>{if(binding===null)return;const listen=(e:KeyboardEvent)=>{e.preventDefault();e.stopPropagation();if(e.code==='Escape'){setBinding(null);return;}if(e.metaKey||e.ctrlKey||e.altKey||reserved.has(e.code)||/^F\d+$/.test(e.code)||!e.code){setHint('브라우저 단축키를 제외한 문자·숫자·방향키 등을 눌러 주세요.');return;}if(settings.keys.some((k,i)=>k===e.code&&i!==binding)){setHint('이미 다른 레인에 지정된 키예요.');return;}const next={...settings,keys:settings.keys.map((k,i)=>i===binding?e.code:k)};saveSettings(next);setBinding(null);setHint('키 설정을 저장했어요.');};window.addEventListener('keydown',listen,true);return()=>window.removeEventListener('keydown',listen,true);},[binding,settings]);
 function saveSettings(next:Settings){setSettings(next);try{localStorage.setItem('repro-preferences',JSON.stringify(next));const presets=JSON.parse(localStorage.getItem('repro-key-presets')||'{}');presets[next.keys.length]=next.keys;localStorage.setItem('repro-key-presets',JSON.stringify(presets));}catch{setHint('이 브라우저에서는 설정을 저장할 수 없어요. 현재 플레이에는 적용됩니다.');}}
 function stopPreview(){sample.current?.stop();sample.current=null;if(previewTimer.current)clearTimeout(previewTimer.current);setPreview(false);}
 async function listen(){if(preview){stopPreview();return;}try{const ctx=await unlockAudio();const audio=new Soundtrack(track,ctx,settings.volume,settings.playbackRate);sample.current=audio;audio.play(.1);setPreview(true);previewTimer.current=setTimeout(stopPreview,12000);}catch{setToast('브라우저의 소리 재생을 허용한 뒤 다시 눌러 주세요.');}}
 async function enterSite(e:React.FormEvent){e.preventDefault();setAccessBusy(true);setAccessError('');try{const response=await fetch('/api/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:accessCode})});const data=await response.json();if(!response.ok)throw new Error(data.error||'입장 코드를 확인해 주세요.');setAccess('open');setAccessCode('');}catch(error){setAccessError((error as Error).message);}finally{setAccessBusy(false);}}
 async function begin(){stopPreview();try{await unlockAudio();setResult(null);progress.current=null;setActive({track:selected,level,delay:2,multi:false});}catch{setToast('소리 재생을 시작하지 못했어요. 다시 눌러 주세요.');}}
 function beginYoutube(){if(youtubePlaying===null)return;try{youtubeTrack(youtubePlaying);setResult(null);progress.current=null;setActive({track:selected,youtube:youtubePlaying,level,delay:1.5,multi:false});}catch(error){setToast((error as Error).message);}}
 async function api(action:string,extra:Record<string,unknown>={}){const start=Date.now();const response=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,code:roomRef.current?.code,...extra})});const data=await response.json() as RoomView & {error?:string};if(!response.ok)throw new Error(data.error||'연결을 확인한 뒤 다시 시도해 주세요.');serverOffset.current=data.serverTime-(start+Date.now())/2;return data as RoomView;}
 async function roomAction(action:string,extra:Record<string,unknown>={}){setBusy(true);try{if(action==='ready')await unlockAudio();stopPreview();const data=await api(action,{name:nickname.trim()||'익명의 공범',code:action==='join'?roomCode.trim().toUpperCase():room?.code,track:selected,level,mode:mode==='battle'?'battle':'coop',playbackRate:settings.playbackRate,speed:settings.speed,keyCount:settings.keys.length,...extra});setRoom(data);if(action==='create'||action==='join'||action==='configure'){setSelected(data.track);setLevel(data.level);setMode(data.mode==='battle'?'battle':'coop');saveSettings({...settings,keys:personalKeys(data.keyCount,settings.keys),speed:data.speed,playbackRate:data.playbackRate});}setRoomOpen(true);}catch(e){setToast((e as Error).message);}finally{setBusy(false);}}
 useEffect(()=>{if(!room?.code)return;let cancelled=false,working=false,errors=0;const poll=async()=>{if(working)return;working=true;try{const r=await api('sync',{stats:progress.current});if(cancelled)return;errors=0;setRoom(r);setSelected(r.track);setLevel(r.level);setSettings(current=>current.keys.length===r.keyCount&&current.speed===r.speed&&current.playbackRate===r.playbackRate?current:{...current,keys:personalKeys(r.keyCount,current.keys),speed:r.speed,playbackRate:r.playbackRate});if(r.startedAt&&r.round!==playedRound.current&&!activeRef.current){playedRound.current=r.round;const delay=(r.startedAt-Date.now()-serverOffset.current)/1000;if(delay>-.8&&r.players.find(p=>p.id===r.me)?.ready){stopPreview();setRoomOpen(false);setResult(null);progress.current=null;setActive({track:r.track,level:r.level,delay,multi:true});}else setToast('이번 합주 시작을 놓쳤어요. 다음 합주에서 준비를 눌러 주세요.');}}catch(e){const message=(e as Error).message;if(message.includes('무료 멀티 사용량')){cancelled=true;clearInterval(timer);setRoom(null);roomRef.current=null;setRoomOpen(false);setToast(message);return;}errors++;if(errors===3)setToast('방 연결이 불안정해요. 다시 연결하는 중입니다.');}finally{working=false;}};const timer=setInterval(poll,2000);poll();return()=>{cancelled=true;clearInterval(timer);};},[room?.code]);
 useEffect(()=>{if(!room?.code||active)return;lastLobbyActivity.current=Date.now();idleWarned.current=false;const touch=()=>{lastLobbyActivity.current=Date.now();idleWarned.current=false;};const events=['pointerdown','keydown','touchstart'] as const;events.forEach(event=>window.addEventListener(event,touch,{passive:true}));const timer=setInterval(()=>{const idle=Date.now()-lastLobbyActivity.current;if(idle>=LOBBY_IDLE_MS){void leave().then(()=>setToast('10분 동안 입력이 없어 대기실 연결을 종료했어요.'));}else if(idle>=LOBBY_IDLE_MS-60000&&!idleWarned.current){idleWarned.current=true;setToast('1분 뒤 대기실 연결이 자동으로 종료돼요.');}},15000);return()=>{events.forEach(event=>window.removeEventListener(event,touch));clearInterval(timer);};},[room?.code,active]);
 async function leave(){try{await api('leave');}catch{}setRoom(null);roomRef.current=null;setRoomOpen(false);}
 async function rename(){const name=nickname.trim();if(!name)return setToast('닉네임을 입력해 주세요.');setBusy(true);try{setRoom(await api('rename',{name}));localStorage.setItem('repro-nickname',name);setToast('닉네임을 변경했어요.');}catch(e){setToast((e as Error).message);}finally{setBusy(false);}}
 function saveHomeNickname(){const name=nickname.trim();if(!name)return setToast('닉네임을 입력해 주세요.');setNickname(name);localStorage.setItem('repro-nickname',name);setProfileOpen(false);setToast(`${name}님, 오늘도 버그와 박자가 잘 맞네요.`);}
 async function kick(playerId:string){setBusy(true);try{setRoom(await api('kick',{target:playerId}));setToast('연결이 끊긴 사용자를 방에서 내보냈어요.');}catch(e){setToast((e as Error).message);}finally{setBusy(false);}}
 async function attack(slot:number,s:Stats){const r=roomRef.current;if(!r||attackBusy.current)return;const target=r.players.find(p=>p.slot===slot);if(!target||target.id===r.me)return;attackBusy.current=true;progress.current=s;try{const data=await api('attack',{target:target.id,round:r.round,requestId:crypto.randomUUID(),stats:s});setRoom(data);const sent=data.attacks.filter(a=>a.from===data.me).at(-1);setToast(`${target.name}에게 ${sent?penaltyInfo[sent.type].title:'업무'}을 보냈어요.`);}catch(e){setToast((e as Error).message);}finally{attackBusy.current=false;}}
 async function finish(s:Stats){progress.current=s;setResult(s);setActive(null);if(roomRef.current){try{setRoom(await api('finish',{stats:s}));}catch{setToast('결과 전송이 지연되고 있어요. 연결되면 다시 반영됩니다.');}}}
 async function quit(){setActive(null);progress.current=null;if(roomRef.current)await leave();}
 if(access!=='open')return <main className="access-gate">
<section>
<div className="access-mark">
<Bug size={24}/>
</div>
<span className="eyebrow">DEV × QA · INTERNAL ACCESS</span>
<h1>{access==='checking'?'접속 권한 확인 중':'사내 합주실 입장'}</h1>
<p>{access==='checking'?'잠시만 기다려 주세요.':'팀에서 공유한 입장 코드를 입력하세요.'}</p>{access==='locked'&&<form onSubmit={enterSite}>
<label htmlFor="site-code">사내 공용 입장 코드</label>
<Input id="site-code" type="password" autoComplete="current-password" value={accessCode} onChange={e=>setAccessCode(e.target.value)} placeholder="입장 코드" autoFocus/>
<Button disabled={accessBusy||!accessCode.trim()}>
<LockKeyhole size={16}/>{accessBusy?'확인 중…':'합주실 입장'}</Button>{accessError&&<span role="alert">{accessError}</span>}</form>}<small>승인된 팀원에게만 코드를 공유해 주세요.</small>
</section>
</main>;
 if(active){const activeTrack=active.youtube===undefined?tracks[active.track]:youtubeTrack(active.youtube);return <div className={`app-shell theme-${theme}`}>
<Game key={`${active.track}-${active.youtube??'local'}-${playedRound.current}`} track={activeTrack} level={active.level} settings={settings} startDelay={active.delay} multiplayer={active.multi} room={room} serverOffset={serverOffset.current} onAttack={attack} onEnd={finish} onQuit={quit} onProgress={s=>{progress.current=s;}}/>{toast&&<div className="toast" role="status">{toast}</div>}</div>;}
 if(room&&roomOpen){const host=room.me===room.host,configure=(extra:Record<string,unknown>)=>roomAction('configure',{track:room.track,level:room.level,mode:room.mode,playbackRate:room.playbackRate,speed:room.speed,keyCount:room.keyCount,...extra});return <div className={`app-shell theme-${theme}`}>
<header className="topbar"><button className="brand" onClick={()=>setRoomOpen(false)}><span className="brand-mark"><Bug size={22}/></span><span>재현 부탁드립니다<span className="brand-sub">MULTIPLAYER LOBBY</span></span></button><div className="top-actions"><span className="internal-tag">ROOM {room.code}</span><Button variant="outline" onClick={()=>void leave()}>방 나가기</Button></div></header>
<main className="room-page"><section className="room-hero"><div><span className="eyebrow"><span className="live-dot"/> SHARED REPRODUCTION ENVIRONMENT</span><h1>공동 조사 대기실</h1><p>{host?'방장이 바꾸는 설정은 모든 참여자에게 즉시 적용됩니다.':'방장이 설정한 동일한 환경으로 합주를 준비합니다.'}</p></div><div className="room-code"><b>{room.code}</b><Button variant="ghost" aria-label="방 코드 복사" onClick={async()=>{try{await navigator.clipboard.writeText(room.code);setToast('방 코드를 복사했어요.');}catch{setToast(`방 코드: ${room.code}`);}}}><Copy/></Button></div></section>
<div className="room-layout"><section className="room-config"><div className="panel-heading"><h2><Settings2 size={17}/> 공통 재현 환경</h2><span>{host?'HOST CONTROL':'READ ONLY'}</span></div>
<label className="field-label">음원</label><select aria-label="멀티 공통 음원" disabled={!host||busy} value={room.track} onChange={e=>void configure({track:Number(e.target.value)})}>{tracks.map((t,i)=><option value={i} key={t.id}>{t.title} · {t.bpm} BPM</option>)}</select>
<label className="field-label">모드</label><div className="choice-grid room-choice two">{(['coop','battle'] as const).map(value=><button disabled={!host||busy} className={room.mode===value?'selected':''} key={value} onClick={()=>void configure({mode:value})}>{value==='coop'?'협동':'대결'}</button>)}</div>
<label className="field-label">난이도</label><div className="choice-grid room-choice three">{(['easy','normal','hard'] as const).map(value=><button disabled={!host||busy} className={room.level===value?'selected':''} key={value} onClick={()=>void configure({level:value})}>{value.toUpperCase()}</button>)}</div>
<label className="field-label">공통 레인 수 · 키 배치는 개인 설정 유지</label><div className="choice-grid room-choice">{[4,6,7,8,10].map(count=><button disabled={!host||busy} className={room.keyCount===count?'selected':''} key={count} onClick={()=>void configure({keyCount:count})}>{count}키</button>)}</div>
<label className="slider-label">노트 속도 <b>{room.speed.toFixed(1)}×</b></label><Slider disabled={!host||busy} value={[room.speed]} min={.6} max={2} step={.1} onValueCommit={([value])=>void configure({speed:value})}/>
<label className="slider-label">음원 배속 <b>{room.playbackRate.toFixed(2)}×</b></label><Slider disabled={!host||busy} value={[room.playbackRate]} min={.5} max={1.5} step={.05} onValueCommit={([value])=>void configure({playbackRate:value})}/>
<div className="shared-summary"><span>{tracks[room.track].title}</span><b>{room.level.toUpperCase()} · {room.keyCount}KEY · {room.speed.toFixed(1)}× · AUDIO {room.playbackRate.toFixed(2)}×</b></div></section>
<aside className="room-team"><div className="panel-heading"><h2><Users size={17}/> 참여자</h2><span>{room.players.length}/4</span></div><div className="nickname-editor"><Input aria-label="닉네임 변경" maxLength={16} value={nickname} onChange={e=>setNickname(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void rename();}}/><Button variant="outline" disabled={busy||!nickname.trim()} onClick={rename}>변경</Button></div><div className="players">{room.players.map(p=><div key={p.id}><span><kbd className="player-slot">{p.slot}</kbd>{p.name}{p.id===room.host?' · 방장':''}{p.id===room.me?' (나)':''}</span><span className={p.ready?'ready':''}>{Date.now()+serverOffset.current-p.seen>15000?<>{'연결 끊김'}{host&&p.id!==room.me&&<button className="kick-button" disabled={busy} onClick={()=>kick(p.id)}>강퇴</button>}</>:p.ready?'준비 완료':'준비 중'}</span></div>)}</div><p className="setting-hint">설정이 바뀌면 모두의 준비가 자동으로 해제됩니다.</p><Button className="start-button" disabled={busy||!!room.startedAt} onClick={()=>roomAction('ready')}><Check/>{room.players.find(p=>p.id===room.me)?.ready?'준비 취소':'소리 켜고 준비 완료'}</Button>{host&&<Button variant="outline" className="room-start" disabled={busy||room.players.length<2||!room.players.every(p=>p.ready)||!!room.startedAt} onClick={()=>roomAction('start')}><Play/>모두 같은 환경으로 시작</Button>}</aside></div></main>{toast&&<div className="toast" role="status">{toast}</div>}</div>;}
 return <div className={`app-shell theme-${theme}`}>
<header className="topbar">
<a className="brand" href="/" aria-label="재현 부탁드립니다 홈">
<span className="brand-mark">
<Bug size={22}/>
</span>
<span>재현 부탁드립니다<span className="brand-sub">DEV × QA RHYTHM CLUB</span>
</span>
</a>
<div className="top-actions">
<span className="internal-tag">INTERNAL PLAYGROUND</span>
<Button variant="ghost" className="profile-button" onClick={()=>setProfileOpen(true)} aria-label="홈에서 닉네임 변경"><UserRound size={15}/><span>{nickname||'닉네임 설정'}</span></Button>
<Button variant="outline" aria-label="플레이 설정" onClick={()=>setSettingsOpen(true)}>
<Settings2 size={16}/>
<span>플레이 설정</span>
</Button>
</div>
</header>
 <main className="lobby">
<div className="intro-row">
<div>
<div className="eyebrow">
<span className="live-dot"/> BACKGROUND PROCESS / ONLINE</div>
<h1>업무는 잠깐.<br className="mobile-break"/> 합주는 진심.</h1>
<p>개발과 QA의 은밀한 공동 조사. 오늘도 재현해 볼까요?</p>
</div>
<div className="issue-stamp">
<span>ASSIGNED TO</span>
<div>
<Code2 size={17}/> DEV <span>×</span>
<Bug size={17}/> QA</div>
</div>
</div>
 <div className="workspace">
<section className="track-panel">
<div className="panel-heading">
<h2>
<Music2 size={17}/> 오늘의 이슈</h2>
<span>{library==='original'?'05 TRACKS':'TOP 20'}</span>
</div>
<Tabs value={library} onValueChange={v=>setLibrary(v as 'original'|'youtube')}>
<TabsList className="library-tabs">
<TabsTrigger value="original">게임 OST</TabsTrigger>
<TabsTrigger value="youtube">YouTube Music Top 20</TabsTrigger>
</TabsList>
</Tabs>{library==='original'?<>
<div className="track-list">{tracks.map((t,i)=>
<button className={`track-row ${selected===i?'selected':''}`} key={t.id} onClick={()=>{stopPreview();setSelected(i);}} disabled={!!room} style={{'--track':t.color} as React.CSSProperties}>
<span className="track-number">{selected===i?<span className="equalizer">
<i/>
<i/>
<i/>
</span>:String(i+1).padStart(2,'0')}</span>
<span className="track-text">
<strong>{t.title}</strong>
<span>{t.genre}</span>
</span>
<span className="track-meta">{t.bpm}<small>BPM</small>
</span>
</button>)}</div>
<div className="original-label">
<span className="mini-disc"/>
<div>
<b>ORIGINAL SOUNDTRACK</b>
<p>이 합주를 위해 만든 5개의 비트</p>
</div>
<Headphones size={18}/>
</div>
</>:<>
<div className="track-list chart-list">{youtubeKoreaTop20.map(({artist,title,streams,videoId},i)=>
<button className={`track-row chart-row ${youtubePlaying===i?'selected':''}`} key={`${artist}-${title}`} onClick={()=>videoId?setYoutubePlaying(current=>current===i?null:i):setToast('공식 재생 영상을 확인 중인 곡이에요. YouTube Music에서 먼저 들을 수 있어요.')} aria-label={`${artist} ${title}, ${videoId?(youtubePlaying===i?'재생 정지':'재생'):'YouTube Music에서 찾기'}`}>
{videoId?<img className="chart-cover" src={youtubeCover(videoId)} alt=""/>:<span className="chart-cover chart-cover-fallback"><Music2 size={14}/></span>}
<span className="track-number">{String(i+1).padStart(2,'0')}</span>
<span className="track-text">
<strong>{title}</strong>
<span>{artist}</span>
</span>
<span className="track-meta">{streams}<small>주간 재생</small>
</span>
{videoId?(youtubePlaying===i?<Square size={14}/>:<Play size={14}/>):<ArrowUpRight size={14}/>}
</button>)}</div>{youtubePlaying!==null&&youtubeKoreaTop20[youtubePlaying].videoId&&<div className="youtube-player"><iframe title={`${youtubeKoreaTop20[youtubePlaying].artist} ${youtubeKoreaTop20[youtubePlaying].title} 재생`} allow="autoplay; encrypted-media; picture-in-picture" src={`https://www.youtube-nocookie.com/embed/${youtubeKoreaTop20[youtubePlaying].videoId}?autoplay=1&playsinline=1`}/><div className="youtube-actions"><Button onClick={beginYoutube}><Play size={14}/>이 곡으로 리듬 게임</Button><a href={youtubeMusicSearchUrl(youtubeKoreaTop20[youtubePlaying].artist,youtubeKoreaTop20[youtubePlaying].title)} target="_blank" rel="noreferrer">YouTube Music에서 열기 <ArrowUpRight size={13}/></a></div><p>공식 영상 시간과 노트 판정을 동기화합니다 · 솔로 베타</p></div>}
<div className="chart-source">
<div>
<b>YOUTUBE MUSIC · KOREA</b>
<p>2026.09.04—09.10 주간 차트</p>
</div>
<a href="https://charts.youtube.com/charts/TopSongs/kr/weekly" target="_blank" rel="noreferrer">공식 차트 <ArrowUpRight size={13}/>
</a>
</div>
</>}</section>
 <section className="selected-panel" style={{'--track':track.color} as React.CSSProperties}>
<div className="track-cover">
<div className="cover-top">
<span>REPRODUCE<br/>PLEASE.</span>
<span className="cover-tag">VOL. 0{selected+1}</span>
</div>
<div className="cover-type">
<span>{['GILDED','GREAT','SKY','SHATTER','APEX'][selected]}</span>
<span className="outline-type">{['VELOCITY','MOUNTAIN','RACING','THE','PURSUIT'][selected]}</span>
<span>{['DRIVE.','RISE.','HIGH.','SKIES.','CHASE.'][selected]}</span>
</div>
<div className="cover-bottom">
<span>{track.genre}</span>
<span>DEV / QA — SESSIONS</span>
</div>
<div className="cover-lines" aria-hidden="true"/>
</div>
<div className="selected-heading">
<div>
<span className="eyebrow">ISSUE #{String(selected+1).padStart(3,'0')} <span className="tag-small">{track.tag}</span>
</span>
<h2>{track.title}</h2>
<p>{track.story}</p>
</div>
<Button variant="outline" size="icon" className="preview-button" onClick={listen} aria-label={preview?'미리듣기 정지':'12초 미리듣기'}>{preview?<Square/>:<Headphones/>}</Button>
</div>
<div className="song-details">
<span>
<b>{track.bpm}</b> BPM</span>
<span>
<b>{timeLabel(duration(track))}</b> LENGTH</span>
<span>
<b>{settings.keys.length}</b> KEYS</span>
<span className="original-badge">ORIGINAL</span>
</div>
</section>
 <aside className="session-panel">
<div className="panel-heading">
<h2>
<Terminal size={17}/> 재현 환경</h2>
<span>CONFIG</span>
</div>
<label className="field-label">플레이 모드</label>
<Tabs value={mode} onValueChange={v=>{if(!room)setMode(v);}}>
<TabsList className="mode-tabs">
<TabsTrigger value="solo" disabled={!!room}>솔로</TabsTrigger>
<TabsTrigger value="coop" disabled={!!room}>협동</TabsTrigger>
<TabsTrigger value="battle" disabled={!!room}>대결</TabsTrigger>
</TabsList>
</Tabs>
<div className="mode-description">
<span>{mode==='solo'?<Code2 size={19}/>:<Users size={19}/>}</span>
<div>
<b>{mode==='solo'?'로컬에서는 됨':mode==='coop'?'잠깐 공동 조사 좀':'제 쪽은 정상인데요'}</b>
<p>{mode==='solo'?'혼자서도 완벽한 비밀 합주':mode==='coop'?'2–4명, 업무 공격 속 공동 목표 달성':'2–4명, 콤보를 쌓아 상대에게 공격'}</p>
</div>
</div>
<label className="field-label">난이도</label>
<Tabs value={level} onValueChange={v=>setLevel(v as Difficulty)}>
<TabsList className="difficulty-tabs">{(['easy','normal','hard'] as const).map(d=>
<TabsTrigger key={d} value={d} disabled={!!room}>{d.toUpperCase()}</TabsTrigger>)}</TabsList>
</Tabs>
<p className="difficulty-note">{level==='easy'?'박자부터 천천히':level==='normal'?'리듬이 손에 붙는 순간':'동시 입력까지 완벽하게'} · {chart(track,level,settings.keys.length).length}개의 노트</p>
<div className="field-row">
<label className="field-label">키 설정</label>
<button className="text-button" onClick={()=>setSettingsOpen(true)}>변경 <ArrowUpRight size={13}/>
</button>
</div>
<div className="keycaps">{settings.keys.map((k,i)=>
<button key={i} onClick={()=>{setSettingsOpen(true);setBinding(i);}} aria-label={`${i+1}번 레인 키 변경`}>{keyLabel(k)}</button>)}</div>
<label className="slider-label environment-speed">노트 속도 <b>{settings.speed.toFixed(1)}×</b>
</label>
<Slider aria-label="재현 환경 노트 속도" value={[settings.speed]} min={.6} max={2} step={.1} onValueChange={([v])=>saveSettings({...settings,speed:v})}/>
<div className="environment-line">
<span>0.6×—2.0×</span>
<span>
<Volume2 size={13}/>{Math.round(settings.volume*100)}%</span>
</div>
<Button className="start-button" onClick={mode==='solo'?begin:()=>setRoomOpen(true)}>
<Play fill="currentColor" size={17}/>{mode==='solo'?'재현 시작하기':room?'합주 대기실로':'팀원과 재현하기'}<ChevronRight size={17}/>
</Button>
<p className="start-hint">{mode==='solo'?'이어폰을 끼고, 업무는 잠시 뒤로.':'방 코드를 공유하고 함께 시작하세요.'}</p>
</aside>
</div>
 <div className="bottom-strip">
<div>
<span className="quote-label">QA</span>
<p>“캐시는 지웠고, 변명도 지웠습니다.”</p>
<span className="quote-label dev">DEV</span>
<p>“한 번만 더는 보통 다섯 번입니다.”</p>
</div>
<span>
<Keyboard size={15}/> 키보드 권장 · 터치 지원</span>
</div>
<footer>
<span>STATUS: BUGS ARE NOW DANCING</span>
<span>재현율 100%, 퇴근 확률은 계산 중.</span>
</footer>
</main>
 <div className="mobile-playbar">
<span>{track.title}</span>
<Button onClick={mode==='solo'?begin:()=>setRoomOpen(true)}>
<Play size={16}/>{mode==='solo'?'선택 곡 재현 시작':'멀티 대기실'}</Button>
</div>
 <Dialog open={settingsOpen} onOpenChange={v=>{setSettingsOpen(v);if(!v)setBinding(null);}}>
<DialogContent className="settings-dialog" onEscapeKeyDown={e=>{if(binding!==null)e.preventDefault();}}>
<DialogTitle>재현 환경 설정</DialogTitle>
<DialogDescription>이 브라우저에 저장됩니다. 다음 합주부터 적용돼요.</DialogDescription>
<label className="field-label">레인 수</label>
<div className="choice-grid">{[4,6,7,8,10].map(count=>{const applied=settings.keys.length===count;return <button key={count} aria-pressed={applied} className={applied?'selected':''} onClick={()=>{saveSettings({...settings,keys:[...keyPresets[count]]});setBinding(null);}}>{applied?<Check size={14}/>:null}<span>{count}키</span></button>;})}</div>
<label className="field-label">자유 키 설정</label>
<div className="keycaps modal-keys">{settings.keys.map((k,i)=>
<button className={binding===i?'binding':''} key={i} onClick={()=>{setBinding(i);setHint('원하는 키를 눌러 주세요. Esc로 취소할 수 있어요.');}}>
<small>LANE {i+1}</small>{binding===i?'입력 대기':keyLabel(k)}</button>)}</div>
<p className="setting-hint" role="status">{hint||'레인을 선택한 뒤 원하는 키를 누르세요. 중복 키는 사용할 수 없어요.'}</p>
<label className="slider-label">노트 속도 <b>{settings.speed.toFixed(1)}×</b>
</label>
<Slider aria-label="노트 속도" value={[settings.speed]} min={.6} max={2} step={.1} onValueChange={([v])=>saveSettings({...settings,speed:v})}/>
<label className="slider-label">음원 배속 <b>{settings.playbackRate.toFixed(2)}×</b>
</label>
<Slider aria-label="음원 배속" value={[settings.playbackRate]} min={.5} max={1.5} step={.05} onValueChange={([v])=>saveSettings({...settings,playbackRate:v})}/>
<p className="setting-hint">음원과 노트가 같은 비율로 느려지거나 빨라집니다.</p>
<label className="slider-label">음량 <b>{Math.round(settings.volume*100)}%</b>
</label>
<Slider aria-label="음량" value={[settings.volume]} min={0} max={1} step={.05} onValueChange={([v])=>saveSettings({...settings,volume:v})}/>
<label className="slider-label">입력 타이밍 보정 <b>{settings.offset>0?'+':''}{settings.offset}ms</b>
</label>
<Slider aria-label="입력 타이밍 보정" value={[settings.offset]} min={-200} max={200} step={5} onValueChange={([v])=>saveSettings({...settings,offset:v})}/>
<p className="setting-hint">소리가 늦게 들리면 + 방향으로 조절하세요. 유선 이어폰을 권장해요.</p>
<label className="field-label">개발 환경 테마</label>
<div className="theme-grid">{themes.map(value=><button key={value} className={theme===value?'selected':''} onClick={()=>{setTheme(value);localStorage.setItem('repro-theme',value);}}>{value==='intellij'?'IntelliJ':value==='claude'?'Claude Code':value==='codex'?'Codex':'Terminal'}</button>)}</div>
<Button variant="outline" onClick={()=>{saveSettings(defaults);setBinding(null);setHint('기본 설정으로 돌아왔어요.');}}>
<RotateCcw/>기본값으로</Button>
<Button onClick={()=>{setSettingsOpen(false);setBinding(null);}}>설정 완료</Button>
</DialogContent>
</Dialog>
 <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
<DialogContent className="profile-dialog">
<DialogTitle>홈 닉네임 변경</DialogTitle>
<DialogDescription>대기실과 결과표에 같은 이름으로 표시됩니다.</DialogDescription>
<label className="field-label" htmlFor="home-nickname">오늘의 공범명</label>
<Input id="home-nickname" maxLength={16} placeholder="예: 캐시 지운 개발자" value={nickname} onChange={e=>setNickname(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveHomeNickname();}} autoFocus/>
<p className="setting-hint">추천: 제 쪽은 정상인데요 · 마지막 커밋 · 재현하는 QA</p>
<Button disabled={!nickname.trim()} onClick={saveHomeNickname}><Check/>이 이름으로 활동하기</Button>
</DialogContent>
</Dialog>
 <Dialog open={roomOpen} onOpenChange={setRoomOpen}>
<DialogContent>
<DialogTitle>{room?'공동 조사 대기실':'공범을 초대하세요'}</DialogTitle>
<DialogDescription>{room?'모두 준비되면 방장이 합주를 시작할 수 있어요. 10분간 입력이 없으면 연결이 종료됩니다.':'같은 사이트에서 방 코드를 입력하면 합류할 수 있어요.'}</DialogDescription>{!room?<>
<label className="field-label" htmlFor="nickname">닉네임 <small>이 브라우저에 기억됩니다</small>
</label>
<Input id="nickname" maxLength={16} placeholder="예: 재현하는 QA" value={nickname} onChange={e=>{const value=e.target.value;setNickname(value);try{localStorage.setItem('repro-nickname',value);}catch{}}}/>
<Button disabled={busy} onClick={()=>roomAction('create')}>
<Users/>새 방 만들기 · {mode==='battle'?'대결':'협동'}</Button>
<div className="divider-label">또는 초대받은 방에 합류</div>
<Input aria-label="방 코드" placeholder="7자리 방 코드" maxLength={7} value={roomCode} onChange={e=>setRoomCode(e.target.value.toUpperCase())}/>
<Button variant="outline" disabled={busy||roomCode.trim().length!==7} onClick={()=>roomAction('join')}>방에 참여하기</Button>
</>:<>
<div className="room-code">
<b>{room.code}</b>
<Button variant="ghost" aria-label="방 코드 복사" onClick={async()=>{try{await navigator.clipboard.writeText(room.code);setToast('방 코드를 복사했어요.');}catch{setToast(`방 코드: ${room.code}`);}}}>
<Copy/>
</Button>
</div>
<p className="setting-hint">{tracks[room.track].title} · {room.level.toUpperCase()} · {room.mode==='coop'?'협동':'대결'}</p>
<div className="nickname-editor"><Input aria-label="닉네임 변경" maxLength={16} value={nickname} onChange={e=>setNickname(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void rename();}}/><Button variant="outline" disabled={busy||!nickname.trim()} onClick={rename}>변경</Button></div>
<p className="setting-hint">30콤보마다 공격권 +1 · 번호키 1–4로 상대에게 업무 전송 · 무작위 패널티 8초</p>
<div className="attack-rules">{penaltyTypes.map(type=>
<div key={type}>
<b>{penaltyInfo[type].title}</b>
<span>{penaltyInfo[type].detail}</span>
</div>)}</div>
<div className="players">{room.players.map(p=>
<div key={p.id}>
<span>
<kbd className="player-slot">{p.slot}</kbd>{p.name}{p.id===room.host?' · 방장':''}{p.id===room.me?' (나)':''}</span>
<span className={p.ready?'ready':''}>{Date.now()+serverOffset.current-p.seen>15000?<>{'연결 끊김'}{room.me===room.host&&p.id!==room.me&&<button className="kick-button" disabled={busy} onClick={()=>kick(p.id)}>강퇴</button>}</>:p.ready?'준비 완료':'준비 중'}</span>
</div>)}</div>
<Button disabled={busy||!!room.startedAt} onClick={()=>roomAction('ready')}>
<Check/>{room.players.find(p=>p.id===room.me)?.ready?'준비 취소':'소리 켜고 준비 완료'}</Button>{room.me===room.host&&<Button variant="outline" disabled={busy||room.players.length<2||!room.players.every(p=>p.ready)||!!room.startedAt} onClick={()=>roomAction('start')}>
<Play/>함께 재현 시작</Button>}<Button variant="ghost" onClick={leave}>방 나가기</Button>
</>}</DialogContent>
</Dialog>
 <Dialog open={!!result} onOpenChange={v=>{if(!v)setResult(null);}}>
<DialogContent className="result-dialog">
<DialogTitle>공동 조사 보고서</DialogTitle>
<DialogDescription>{tracks[selected].title} · {result&&result.accuracy>=90?'이 상태로 남겨두죠.':'확인차 한 번 더?'}</DialogDescription>{result&&<>
<div className="result-grade">{result.accuracy>=95?'S':result.accuracy>=85?'A':result.accuracy>=70?'B':'C'}<span>REPRODUCED</span>
</div>
<div className="result-stats">
<div>
<span>재현 정확도</span>
<b>{result.accuracy.toFixed(1)}%</b>
</div>
<div>
<span>최대 콤보</span>
<b>{result.maxCombo}</b>
</div>
<div>
<span>점수</span>
<b>{result.score.toLocaleString()}</b>
</div>
</div>
<p className="setting-hint">PERFECT {result.perfect} · GOOD {result.good} · MISS {result.miss}</p>{room&&<div className="team-result">
<b>{room.mode==='coop'?`팀 정확도 ${Math.round(room.players.reduce((sum,p)=>sum+(p.stats?.accuracy??0),0)/room.players.length)}% · 목표 80%`:'팀원별 결과'}</b>{room.players.slice().sort((a,b)=>(b.stats?.score??0)-(a.stats?.score??0)).map(p=>
<div key={p.id}>
<span>{p.name}</span>
<span>{p.finished?p.stats?.score.toLocaleString():'연주 중…'}</span>
</div>)}</div>}<Button onClick={()=>{setResult(null);if(room)setRoomOpen(true);else begin();}}>
<RotateCcw/>{room?'대기실로 돌아가기':'다시 열기 · 한 번 더'}</Button>
<Button variant="outline" onClick={()=>setResult(null)}>이슈 닫기</Button>
</>}</DialogContent>
</Dialog>{toast&&<div className="toast" role="status">{toast}</div>}
 </div>;
}
