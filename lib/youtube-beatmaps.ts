import {validateBeatmap} from './beatmap';
import type {Difficulty,Note,Track} from './tracks';

type AuthoredCharts=Partial<Record<Difficulty,readonly Note[]>>;

/**
 * Hand-reviewed charts can be added here without changing the player. Generated
 * charts remain deterministic for a videoId + chartVersion + key count.
 */
const authored:Record<string,AuthoredCharts>={};
const cache=new Map<string,Note[]>();
const clone=(notes:readonly Note[])=>notes.map(note=>({...note}));
const hash=(value:string)=>{let result=2166136261;for(const char of value){result^=char.charCodeAt(0);result=Math.imul(result,16777619);}return result>>>0;};
const scaleLane=(value:number,lanes:number)=>Math.max(0,Math.min(lanes-1,Math.round(value*(lanes-1)/7)));

const motifs=[
 [0,2,4,6,5,3,1,4], [0,4,2,6,3,7,5,1], [3,1,4,2,6,4,7,5],
 [0,1,3,2,5,4,7,6], [6,4,2,0,1,3,5,7], [1,5,3,7,6,2,4,0],
] as const;

export function youtubeBeatmap(track:Track,level:Difficulty,lanes:number):Note[]{
 if(!track.youtubeId)throw new Error('YouTube 채보에는 영상 ID가 필요해요.');
 const version=track.chartVersion??'unversioned',key=`${track.youtubeId}:${version}:${level}:${lanes}`,saved=cache.get(key);if(saved)return clone(saved);
 const reviewed=authored[track.youtubeId]?.[level];
 if(reviewed){const result=validateBeatmap(clone(reviewed),lanes,level);cache.set(key,result);return clone(result);}
 const seed=hash(`${track.youtubeId}:${version}`),beat=60/track.bpm,tick=beat/4,totalTicks=Math.floor((track.duration-track.beatOffset)/tick)-4;
 const notes:Note[]=[];let phrase=-1,pattern:readonly number[]=motifs[0];
 for(let step=0;step<totalTicks;step++){
  const nextPhrase=Math.floor(step/32),within=step%32,beatInPhrase=Math.floor(within/4),cycle=nextPhrase%8;
  if(nextPhrase!==phrase){phrase=nextPhrase;pattern=motifs[(seed+phrase*3+(cycle===4||cycle===5?1:0))%motifs.length];}
  const intro=phrase===0,build=cycle===3,chorus=cycle===4||cycle===5||cycle===7,breakdown=cycle===6;
  let include=false;
  if(level==='easy')include=within%4===0&&(!intro||within%8===0)&&(!breakdown||within%8===0);
  else if(level==='normal')include=within%2===0&&(chorus||build||within%4===0||((seed+step)%5===0));
  else include=within%2===0||((chorus||build)&&within%4===1&&((seed+step)%3!==0));
  if(!include)continue;
  const variation=(phrase+Math.floor(within/8))%pattern.length,lane=scaleLane(pattern[(beatInPhrase+variation)%pattern.length],lanes),t=track.beatOffset+step*tick;
  const holdStart=within===8&&(breakdown||(!intro&&(seed+phrase)%5===0)),holdBeats=level==='easy'?2:level==='normal'?1.5:1;
  const endT=holdStart?Math.min(t+beat*holdBeats,track.duration-.3):undefined;
  notes.push({t,lane,...(endT?{endT}:{})});
  const accent=within%16===0&&chorus&&level!=='easy'&&lanes>1;
  if(accent){const partner=(lane+Math.max(1,Math.floor(lanes/2)))%lanes;notes.push({t,lane:partner});}
 }
 const result=validateBeatmap(notes,lanes,level);cache.set(key,result);return clone(result);
}
