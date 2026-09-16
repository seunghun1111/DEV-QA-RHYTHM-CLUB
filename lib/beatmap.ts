import {chart,type Difficulty,type Note,type Track} from './tracks';

const cache=new Map<string,Note[]>();
const clone=(notes:Note[])=>notes.map(note=>({...note}));

export async function generateBeatmap(track:Track,level:Difficulty,lanes:number,context:AudioContext):Promise<Note[]>{
 const key=`${track.id}:${level}:${lanes}`;
 const saved=cache.get(key);if(saved)return clone(saved);
 if(!track.audio){const fallback=chart(track,level,lanes);cache.set(key,fallback);return clone(fallback);}
 const response=await fetch(track.audio);if(!response.ok)throw new Error('음원 분석 파일을 불러오지 못했어요.');
 const buffer=await context.decodeAudioData(await response.arrayBuffer());
 const sampleRate=buffer.sampleRate,windowSize=Math.max(512,Math.round(sampleRate*.02)),frames=Math.floor(buffer.length/windowSize),energy=new Float32Array(frames),channels=buffer.numberOfChannels;
 for(let frame=0;frame<frames;frame++){let sum=0;const start=frame*windowSize;for(let i=0;i<windowSize;i+=4){let value=0;for(let c=0;c<channels;c++)value+=buffer.getChannelData(c)[start+i]||0;value/=channels;sum+=value*value;}energy[frame]=Math.sqrt(sum/(windowSize/4));}
 const peaks:{t:number;strength:number}[]=[];
 for(let i=3;i<frames-3;i++){let mean=0;for(let j=Math.max(0,i-18);j<i;j++)mean+=energy[j];mean/=Math.min(18,i);const flux=energy[i]-energy[i-1];if(flux>Math.max(.008,mean*.22)&&energy[i]>=energy[i-1]&&energy[i]>=energy[i+1])peaks.push({t:i*windowSize/sampleRate,strength:flux+energy[i]*.2});}
 const minGap=level==='easy'?.34:level==='normal'?.22:.13,limit=level==='easy'?1:level==='normal'?1.35:1.8,notes:Note[]=[],beat=60/track.bpm;let last=-1;
 const strongest=[...peaks].sort((a,b)=>b.strength-a.strength)[Math.floor(peaks.length*.28)]?.strength||.02;
 for(const peak of peaks){if(peak.t<1||peak.t-last<minGap||peak.strength<strongest/limit)continue;const step=Math.round((peak.t-track.beatOffset)/(beat/4)),t=track.beatOffset+step*beat/4;if(t<=last+.08||t>buffer.duration-.4)continue;const lane=(step*7+Math.floor(t/beat)*3+track.id)%lanes;const sustained=energy[Math.min(frames-1,Math.floor((peak.t+.55)*sampleRate/windowSize))]>energy[Math.floor(peak.t*sampleRate/windowSize)]*.72;const endT=sustained&&step%8===0?Math.min(t+beat*(level==='hard'?1.5:1),buffer.duration-.25):undefined;notes.push({t,lane,...(endT?{endT}:{})});last=t;}
 if(notes.length<32){const fallback=chart(track,level,lanes);cache.set(key,fallback);return clone(fallback);}
 cache.set(key,notes);return clone(notes);
}
