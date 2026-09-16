import {generateBeatmap,validateBeatmap} from './beatmap';
import type {Difficulty,Note,Track} from './tracks';

export type CustomChart={id:string;title:string;sourceKind:'file'|'url';source:string;track:Track;level:Difficulty;keyCount:4|6|7|8;notes:Note[]};

function estimateTempo(buffer:AudioBuffer){
 const rate=100,hop=Math.max(1,Math.round(buffer.sampleRate/rate)),frames=Math.floor(buffer.length/hop),energy=new Float32Array(frames),onset=new Float32Array(frames);
 for(let frame=0;frame<frames;frame++){let sum=0,count=0;const start=frame*hop;for(let i=0;i<hop;i+=8){let value=0;for(let channel=0;channel<buffer.numberOfChannels;channel++)value+=buffer.getChannelData(channel)[start+i]||0;value/=buffer.numberOfChannels;sum+=value*value;count++;}energy[frame]=Math.sqrt(sum/Math.max(1,count));if(frame)onset[frame]=Math.max(0,energy[frame]-energy[frame-1]);}
 let bpm=120,best=-Infinity;
 for(let candidate=70;candidate<=180;candidate++){const lag=Math.round(60*rate/candidate);let score=0;for(let i=lag;i<frames;i++)score+=onset[i]*onset[i-lag];if(score>best){best=score;bpm=candidate;}}
 const period=Math.max(1,Math.round(60*rate/bpm));let phase=0,phaseScore=-Infinity;
 for(let candidate=0;candidate<period;candidate++){let score=0;for(let i=candidate;i<frames;i+=period)score+=onset[i];if(score>phaseScore){phaseScore=score;phase=candidate;}}
 return{bpm,beatOffset:phase/rate};
}

const stableId=(value:string)=>{let hash=2166136261;for(const char of value){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;};

export async function createCustomChart(source:string,sourceKind:'file'|'url',title:string,level:Difficulty,keyCount:4|6|7|8,context:AudioContext):Promise<CustomChart>{
 let response:Response;try{response=await fetch(source);}catch{throw new Error('음원을 불러오지 못했어요. URL 음원은 CORS 접근을 허용해야 합니다.');}
 if(!response.ok)throw new Error(`음원을 불러오지 못했어요. HTTP ${response.status}`);
 const contentLength=Number(response.headers.get('content-length')||0);if(contentLength>80*1024*1024)throw new Error('80MB 이하 음원만 분석할 수 있어요.');
 const data=await response.arrayBuffer();if(data.byteLength>80*1024*1024)throw new Error('80MB 이하 음원만 분석할 수 있어요.');
 const buffer=await context.decodeAudioData(data);if(buffer.duration<5||buffer.duration>900)throw new Error('5초 이상 15분 이하 음원을 사용해 주세요.');
 const {bpm,beatOffset}=estimateTempo(buffer),id=`custom-${stableId(`${title}:${buffer.duration}:${bpm}:${sourceKind==='url'?source:''}`)}`;
 const track:Track={id:10000+stableId(id)%100000,title:title.trim()||'나만의 채보',subtitle:'CUSTOM CHART',genre:'USER AUTHORED',bpm,beatOffset,duration:buffer.duration,audio:source,color:'#ffd166',tag:'CUSTOM',story:'직접 분석하고 편집한 커스텀 채보입니다.',melody:[0,3,7,10,14,7,3,12]};
 const notes=await generateBeatmap(track,level,keyCount,context);
 return{id,title:track.title,sourceKind,source,track,level,keyCount,notes:validateBeatmap(notes,keyCount,level)};
}

export function normalizeCustomNotes(notes:Note[],keyCount:number,level:Difficulty){return validateBeatmap(notes.map(note=>({t:Number(note.t),lane:Number(note.lane),...(Number(note.endT)>Number(note.t)?{endT:Number(note.endT)}:{})})).filter(note=>Number.isFinite(note.t)&&note.t>=0&&Number.isInteger(note.lane)),keyCount,level);}
