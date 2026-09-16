import {chart,type Difficulty,type Note,type Track} from './tracks';

const cache=new Map<string,Note[]>();
const clone=(notes:Note[])=>notes.map(note=>({...note}));

/** 같은 레인의 홀드 몸통과 겹치는 탭/홀드를 제거한다. 다른 레인의 동시 입력은 유지한다. */
export function removeHoldConflicts(source:Note[]):Note[]{
 const result:Note[]=[];const laneEnds=new Map<number,number>();
 for(const note of [...source].sort((a,b)=>a.t-b.t||a.lane-b.lane)){
  const occupiedUntil=laneEnds.get(note.lane)??-Infinity;
  if(note.t<occupiedUntil-.045)continue;
  result.push(note);if(note.endT)laneEnds.set(note.lane,note.endT);
 }
 return result;
}

const levelConfig={
 easy:{gap:.30,quantize:2,threshold:.68,holdChance:.10,maxPerSecond:2.8,chordChance:0},
 normal:{gap:.19,quantize:4,threshold:.47,holdChance:.16,maxPerSecond:4.5,chordChance:.05},
 hard:{gap:.105,quantize:4,threshold:.28,holdChance:.23,maxPerSecond:7,chordChance:.16},
} as const;

type Band='low'|'mid'|'high';
type Peak={t:number;strength:number;section:number;band:Band;sustain:number};
const PATTERNS=[
 [0,1,2,3,2,1,0,2], [0,2,1,3,2,0,1,3],
 [1,0,2,1,3,2,1,0], [0,1,0,2,1,3,2,3],
 [3,2,1,0,1,2,3,1], [2,0,1,3,1,2,0,3],
] as const;
const scaledLane=(value:number,lanes:number)=>Math.max(0,Math.min(lanes-1,Math.round(value*(lanes-1)/3)));
function patternLane(peak:Peak,pulse:number,index:number,lanes:number,trackId:number){
 const family=peak.band==='low'?0:peak.band==='mid'?2:4,pattern=PATTERNS[(family+peak.section+trackId)%PATTERNS.length];
 let lane=scaledLane(pattern[(pulse+index)%pattern.length],lanes);
 if(peak.band==='low'&&index%2)lane=lanes-1-lane;
 return lane;
}
function occupied(notes:Note[],lane:number,t:number,margin=.055){return notes.some(n=>n.lane===lane&&(Math.abs(n.t-t)<margin||(n.endT!==undefined&&t>n.t-margin&&t<n.endT+margin)));}
/** Enforce hold safety, chord limits and short-jack ergonomics after generation. */
export function validateBeatmap(source:Note[],lanes:number,level:Difficulty):Note[]{
 const output:Note[]=[];const lastLaneTime=Array(lanes).fill(-Infinity);let lastLane=-1,run=0;const maxChord=level==='easy'?1:2;
 for(const original of [...source].sort((a,b)=>a.t-b.t||a.lane-b.lane)){
  if(output.filter(n=>Math.abs(n.t-original.t)<.025).length>=maxChord)continue;
  let lane=Math.max(0,Math.min(lanes-1,original.lane));const wouldJack=lane===lastLane&&original.t-lastLaneTime[lane]<.17&&run>=2;
  if(occupied(output,lane,original.t)||wouldJack){const alternative=Array.from({length:lanes},(_,offset)=>(lane+offset+1)%lanes).find(candidate=>!occupied(output,candidate,original.t)&&original.t-lastLaneTime[candidate]>=.1);if(alternative===undefined)continue;lane=alternative;}
  output.push({...original,lane});run=lane===lastLane?run+1:1;lastLane=lane;lastLaneTime[lane]=original.t;
 }
 return removeHoldConflicts(output);
}

export async function generateBeatmap(track:Track,level:Difficulty,lanes:number,context:AudioContext):Promise<Note[]>{
 const key=`v4:${track.id}:${level}:${lanes}`;const saved=cache.get(key);if(saved)return clone(saved);
 if(!track.audio){const fallback=validateBeatmap(chart(track,level,lanes),lanes,level);cache.set(key,fallback);return clone(fallback);}
 const response=await fetch(track.audio);if(!response.ok)throw new Error('음원 분석 파일을 불러오지 못했어요.');
 const buffer=await context.decodeAudioData(await response.arrayBuffer());
 const sampleRate=buffer.sampleRate,hop=Math.max(512,Math.round(sampleRate*.014)),frames=Math.floor(buffer.length/hop),channels=buffer.numberOfChannels;
 const low=new Float32Array(frames),mid=new Float32Array(frames),high=new Float32Array(frames);
 const lowFlux=new Float32Array(frames),midFlux=new Float32Array(frames),highFlux=new Float32Array(frames),novelty=new Float32Array(frames);let lpLow=0,lpMid=0;
 for(let frame=0;frame<frames;frame++){
  let lowSq=0,midSq=0,highSq=0;const start=frame*hop;
  for(let i=0;i<hop;i+=4){let value=0;for(let c=0;c<channels;c++)value+=buffer.getChannelData(c)[start+i]||0;value/=channels;lpLow+=.025*(value-lpLow);lpMid+=.16*(value-lpMid);const lo=lpLow,mi=lpMid-lpLow,hi=value-lpMid;lowSq+=lo*lo;midSq+=mi*mi;highSq+=hi*hi;}
  const count=hop/4;low[frame]=Math.sqrt(lowSq/count);mid[frame]=Math.sqrt(midSq/count);high[frame]=Math.sqrt(highSq/count);
  if(frame){lowFlux[frame]=Math.max(0,low[frame]-low[frame-1]);midFlux[frame]=Math.max(0,mid[frame]-mid[frame-1]);highFlux[frame]=Math.max(0,high[frame]-high[frame-1]);novelty[frame]=lowFlux[frame]*1.15+midFlux[frame]+highFlux[frame]*.72;}
 }
 const beat=60/track.bpm,candidates:{frame:number;t:number;strength:number;section:number;band:Band}[]=[],sectionFrames=Math.max(1,Math.round(beat*8*sampleRate/hop));
 for(let i=28;i<frames-4;i++){let local=0;for(let j=i-28;j<i;j++)local+=novelty[j];local/=28;const threshold=Math.max(.0024,local*1.42);if(novelty[i]>threshold&&novelty[i]>=novelty[i-1]&&novelty[i]>=novelty[i+1]){const band:Band=lowFlux[i]>=midFlux[i]&&lowFlux[i]>=highFlux[i]*.8?'low':highFlux[i]>midFlux[i]*1.15?'high':'mid';candidates.push({frame:i,t:i*hop/sampleRate,strength:novelty[i],section:Math.floor(i/sectionFrames),band});}}
 const cfg=levelConfig[level],bySection=new Map<number,number[]>();for(const peak of candidates){const values=bySection.get(peak.section)??[];values.push(peak.strength);bySection.set(peak.section,values);}for(const values of bySection.values())values.sort((a,b)=>a-b);
 const grid=beat/cfg.quantize,selected:Peak[]=[];let last=-10;
 for(const peak of candidates){const values=bySection.get(peak.section)!;const cutoff=values[Math.floor((values.length-1)*cfg.threshold)]??0,t=track.beatOffset+Math.round((peak.t-track.beatOffset)/grid)*grid;if(peak.strength<cutoff||t<.8||t-last<cfg.gap||t>buffer.duration-.45)continue;const bandEnergy=peak.band==='low'?low:peak.band==='mid'?mid:high,tailFrame=Math.min(frames-1,peak.frame+Math.round(beat*1.5*sampleRate/hop));let tail=0,count=0;for(let f=peak.frame+3;f<=tailFrame;f+=3){tail+=bandEnergy[f];count++;}selected.push({t,strength:peak.strength,section:peak.section,band:peak.band,sustain:count?tail/count/(bandEnergy[peak.frame]+.0001):0});last=t;}
 const notes:Note[]=[];
 for(let i=0;i<selected.length;i++){
  const peak=selected[i];let nearby=0;for(const other of selected)if(Math.abs(other.t-peak.t)<.5)nearby++;if(nearby>cfg.maxPerSecond&&i%2)continue;
  const pulse=Math.round((peak.t-track.beatOffset)/grid),lane=patternLane(peak,pulse,i,lanes,track.id),holdRoll=((pulse*17+peak.section*13+track.id*7)%100)/100,holdBeats=peak.sustain>1.05?(level==='hard'?1.5:1):0,endT=holdBeats&&holdRoll<cfg.holdChance?Math.min(peak.t+beat*holdBeats,buffer.duration-.25):undefined;
  notes.push({t:peak.t,lane,...(endT?{endT}:{})});
  const sectionValues=bySection.get(peak.section)??[],strong=sectionValues[Math.floor(sectionValues.length*.84)]??Infinity,chordRoll=((pulse*11+peak.section*7+track.id)%100)/100;
  if(!endT&&lanes>1&&peak.strength>=strong&&chordRoll<cfg.chordChance)notes.push({t:peak.t,lane:(lane+Math.max(1,Math.floor(lanes/2)))%lanes});
 }
 const safe=validateBeatmap(notes,lanes,level),result=safe.length>=32?safe:validateBeatmap(chart(track,level,lanes),lanes,level);cache.set(key,result);return clone(result);
}
