'use client';
import {useRef,useState} from 'react';
import {Music2,Play,Plus,Trash2,Upload} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {createCustomChart,normalizeCustomNotes,type CustomChart} from '@/lib/custom-chart';
import {unlockAudio} from '@/lib/audio';
import type {Difficulty} from '@/lib/tracks';

export default function CustomChartEditor({open,onOpenChange,onPlay}:{open:boolean;onOpenChange:(open:boolean)=>void;onPlay:(chart:CustomChart)=>void}){
 const [url,setUrl]=useState(''),[source,setSource]=useState(''),[sourceKind,setSourceKind]=useState<'file'|'url'>('url'),[title,setTitle]=useState(''),[level,setLevel]=useState<Difficulty>('normal'),[keyCount,setKeyCount]=useState<4|6|7|8>(4),[chart,setChart]=useState<CustomChart|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[holdBeats,setHoldBeats]=useState(0);const audio=useRef<HTMLAudioElement>(null);
 const chooseFile=(file?:File)=>{if(!file)return;if(!file.type.startsWith('audio/')&&!file.type.startsWith('video/'))return setError('재생 가능한 음원 파일을 선택해 주세요.');setSource(URL.createObjectURL(file));setSourceKind('file');setTitle(file.name.replace(/\.[^.]+$/,''));setChart(null);setError('');};
 const analyze=async()=>{const target=sourceKind==='url'?url.trim():source;if(!target)return setError('음원 파일 또는 직접 오디오 URL을 입력해 주세요.');if(sourceKind==='url'){try{const parsed=new URL(target);if(!['http:','https:'].includes(parsed.protocol))throw new Error();}catch{return setError('http 또는 https 오디오 URL을 입력해 주세요.');}}setBusy(true);setError('');try{const context=await unlockAudio();const next=await createCustomChart(target,sourceKind,title||'나만의 채보',level,keyCount,context);setSource(target);setChart(next);setTitle(next.title);requestAnimationFrame(()=>{if(audio.current)audio.current.currentTime=0;});}catch(reason){setError((reason as Error).message||'음원 분석에 실패했어요.');}finally{setBusy(false);}};
 const add=(lane:number)=>{if(!chart||!audio.current)return;const beat=60/chart.track.bpm,grid=beat/4,t=Math.max(0,Math.round(audio.current.currentTime/grid)*grid),endT=holdBeats?Math.min(chart.track.duration-.05,t+beat*holdBeats):undefined,notes=normalizeCustomNotes([...chart.notes,{t,lane,...(endT?{endT}:{})}],chart.keyCount,chart.level);setChart({...chart,notes});};
 const remove=(index:number)=>{if(!chart)return;setChart({...chart,notes:chart.notes.filter((_,i)=>i!==index)});};
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="custom-chart-dialog"><DialogTitle>커스텀 채보 제작소</DialogTitle><DialogDescription>내 음원은 브라우저 안에서 분석합니다. 직접 오디오 URL은 해당 서버가 CORS를 허용해야 해요.</DialogDescription>
 <div className="custom-source-tabs"><button className={sourceKind==='file'?'selected':''} onClick={()=>setSourceKind('file')}><Upload/>파일</button><button className={sourceKind==='url'?'selected':''} onClick={()=>setSourceKind('url')}><Music2/>오디오 URL</button></div>
 {sourceKind==='file'?<Input type="file" accept="audio/*,video/mp4" onChange={event=>chooseFile(event.target.files?.[0])}/>:<Input value={url} onChange={event=>{setUrl(event.target.value);setChart(null);}} placeholder="https://example.com/music.mp3"/>}
 <Input value={title} onChange={event=>setTitle(event.target.value)} placeholder="채보 이름"/>
 <div className="custom-options"><label>난이도<select value={level} onChange={event=>{setLevel(event.target.value as Difficulty);setChart(null);}}><option value="easy">EASY</option><option value="normal">NORMAL</option><option value="hard">HARD</option></select></label><label>키 수<select value={keyCount} onChange={event=>{setKeyCount(Number(event.target.value) as 4|6|7|8);setChart(null);}}>{[4,6,7,8].map(count=><option key={count} value={count}>{count}키</option>)}</select></label></div>
 <Button disabled={busy||!(sourceKind==='file'?source:url.trim())} onClick={analyze}><Music2/>{busy?'음원 분석 및 채보 생성 중…':'자동 채보 생성'}</Button>{error&&<p className="custom-error" role="alert">{error}</p>}
 {chart&&<><div className="custom-analysis"><b>{chart.track.bpm} BPM</b><span>첫 박자 {chart.track.beatOffset.toFixed(2)}초</span><span>{chart.notes.length} 노트</span></div><audio ref={audio} src={chart.source} controls preload="metadata"/>
 <div className="custom-author"><label>추가 노트<select value={holdBeats} onChange={event=>setHoldBeats(Number(event.target.value))}><option value={0}>탭 노트</option><option value={1}>1박 롱노트</option><option value={2}>2박 롱노트</option><option value={4}>4박 롱노트</option></select></label><p>음원을 원하는 위치에 멈춘 뒤 레인 버튼을 누르세요. 16분음표에 자동 정렬됩니다.</p><div style={{gridTemplateColumns:`repeat(${chart.keyCount},1fr)`}}>{Array.from({length:chart.keyCount},(_,lane)=><button key={lane} onClick={()=>add(lane)}><Plus/>{lane+1}</button>)}</div></div>
 <div className="custom-note-list">{chart.notes.slice(-24).map((note,index)=>{const actual=chart.notes.length-Math.min(24,chart.notes.length)+index;return <div key={`${note.t}-${note.lane}-${index}`}><span>{note.t.toFixed(3)}s · L{note.lane+1}{note.endT?` · HOLD ${(note.endT-note.t).toFixed(2)}s`:''}</span><button aria-label="노트 삭제" onClick={()=>remove(actual)}><Trash2/></button></div>;})}</div>
 <Button onClick={()=>onPlay(chart)}><Play/>이 커스텀 채보로 플레이</Button></>}
 </DialogContent></Dialog>;
}
