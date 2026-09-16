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
 easy:{gap:.32,quantize:2,threshold:.68,holdChance:.09,maxPerSecond:2.8},
 normal:{gap:.21,quantize:4,threshold:.48,holdChance:.14,maxPerSecond:4.3},
 hard:{gap:.125,quantize:4,threshold:.31,holdChance:.18,maxPerSecond:6.2},
} as const;

export async function generateBeatmap(track:Track,level:Difficulty,lanes:number,context:AudioContext):Promise<Note[]>{
 const key=`v3:${track.id}:${level}:${lanes}`;const saved=cache.get(key);if(saved)return clone(saved);
 if(!track.audio){const fallback=removeHoldConflicts(chart(track,level,lanes));cache.set(key,fallback);return clone(fallback);}
 const response=await fetch(track.audio);if(!response.ok)throw new Error('음원 분석 파일을 불러오지 못했어요.');
 const buffer=await context.decodeAudioData(await response.arrayBuffer());
 const sampleRate=buffer.sampleRate,hop=Math.max(512,Math.round(sampleRate*.016)),frames=Math.floor(buffer.length/hop),channels=buffer.numberOfChannels;
 const energy=new Float32Array(frames),low=new Float32Array(frames),novelty=new Float32Array(frames);let previous=0;
 for(let frame=0;frame<frames;frame++){
  let sum=0,lowSum=0,lowPass=previous;const start=frame*hop;
  for(let i=0;i<hop;i+=4){let value=0;for(let c=0;c<channels;c++)value+=buffer.getChannelData(c)[start+i]||0;value/=channels;lowPass+=.12*(value-lowPass);sum+=value*value;lowSum+=lowPass*lowPass;}
  previous=lowPass;energy[frame]=Math.sqrt(sum/(hop/4));low[frame]=Math.sqrt(lowSum/(hop/4));
  if(frame){const fullRise=Math.max(0,energy[frame]-energy[frame-1]),bassRise=Math.max(0,low[frame]-low[frame-1]);novelty[frame]=fullRise+bassRise*.85;}
 }
 const candidates:{t:number;strength:number;section:number}[]=[];const sectionFrames=Math.max(1,Math.round(8*sampleRate/hop));
 for(let i=24;i<frames-4;i++){let local=0;for(let j=i-24;j<i;j++)local+=novelty[j];local/=24;const threshold=Math.max(.0028,local*1.55);if(novelty[i]>threshold&&novelty[i]>=novelty[i-1]&&novelty[i]>=novelty[i+1])candidates.push({t:i*hop/sampleRate,strength:novelty[i],section:Math.floor(i/sectionFrames)});}
 const cfg=levelConfig[level],bySection=new Map<number,number[]>();for(const peak of candidates){const values=bySection.get(peak.section)??[];values.push(peak.strength);bySection.set(peak.section,values);}for(const values of bySection.values())values.sort((a,b)=>a-b);
 const beat=60/track.bpm,grid=beat/cfg.quantize,selected:{t:number;strength:number;section:number}[]=[];let last=-10;
 for(const peak of candidates){const values=bySection.get(peak.section)!;const cutoff=values[Math.floor((values.length-1)*cfg.threshold)]??0;const t=track.beatOffset+Math.round((peak.t-track.beatOffset)/grid)*grid;if(peak.strength<cutoff||t<.8||t-last<cfg.gap||t>buffer.duration-.45)continue;selected.push({...peak,t});last=t;}
 const notes:Note[]=[];let previousLane=track.id%lanes,run=0;
 for(let i=0;i<selected.length;i++){
  const peak=selected[i];let nearby=0;for(const other of selected)if(Math.abs(other.t-peak.t)<.5)nearby++;if(nearby>cfg.maxPerSecond&&i%2)continue;
  const pulse=Math.round((peak.t-track.beatOffset)/grid),jump=1+((pulse+peak.section+track.id)%Math.max(1,lanes-1));let lane=(previousLane+jump)%lanes;if(lane===previousLane&&lanes>1)lane=(lane+1)%lanes;run=lane===previousLane?run+1:0;if(run>1)lane=(lane+1)%lanes;previousLane=lane;
  const startFrame=Math.min(frames-1,Math.floor(peak.t*sampleRate/hop)),tailFrame=Math.min(frames-1,startFrame+Math.round(beat*1.2*sampleRate/hop));let tail=0,count=0;for(let f=startFrame+3;f<=tailFrame;f+=3){tail+=energy[f];count++;}
  const sustained=count>0&&tail/count>energy[startFrame]*.48,holdRoll=((pulse*17+peak.section*13+track.id*7)%100)/100,holdLength=level==='hard'?beat*1.25:beat;const endT=sustained&&holdRoll<cfg.holdChance?Math.min(peak.t+holdLength,buffer.duration-.25):undefined;
  notes.push({t:peak.t,lane,...(endT?{endT}:{})});
 }
 const safe=removeHoldConflicts(notes),result=safe.length>=32?safe:removeHoldConflicts(chart(track,level,lanes));cache.set(key,result);return clone(result);
}
