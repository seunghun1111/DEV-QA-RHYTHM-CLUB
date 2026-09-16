import type {Note,Track} from './tracks';
export const penaltyTypes=['strict','burst','speed','shuffle'] as const;
export type PenaltyType=typeof penaltyTypes[number];
export type Attack={id:string;from:string;fromName:string;target:string;type:PenaltyType;startsAt:number;endsAt:number};
export const penaltyInfo={
 strict:{title:'긴급 검증',description:'판정이 더 엄격해집니다',detail:'PERFECT ±40ms · GOOD ±100ms',icon:'!'},
 burst:{title:'추가 요구사항',description:'노트 업무량이 늘어납니다',detail:'박자 사이에 추가 노트',icon:'+'},
 speed:{title:'일정 당기기',description:'노트 속도가 빨라집니다',detail:'낙하 속도 1.45배',icon:'»'},
 shuffle:{title:'담당자 변경',description:'레인 키 배치가 바뀝니다',detail:'키 배치 반전 · 종료 후 자동 복구',icon:'⇄'},
} as const;
export const ATTACK_COMBO=30;
export function activePenalties(attacks:Attack[],me:string,now:number){return attacks.filter(a=>a.target===me&&a.startsAt<=now&&a.endsAt>now);}
export function penaltyKeys(keys:string[],active:Attack[]){return active.some(a=>a.type==='shuffle')?[...keys].reverse():keys;}
export function judgmentWindow(active:Attack[]){return active.some(a=>a.type==='strict')?{perfect:.04,good:.1}:{perfect:.065,good:.15};}
/** A tap must never ask the player to release a hold that is still occupying the lane. */
export function laneIsPlayableAt(notes:Note[],lane:number,t:number,margin=.12){
 return !notes.some(note=>note.lane===lane&&(
  Math.abs(note.t-t)<margin||
  (note.endT!==undefined&&t>note.t-margin&&t<note.endT+margin)
 ));
}
export function extraNotes(track:Track,start:number,end:number,existing:Note[],seed:number,lanes=4):Note[]{
 const interval=30/track.bpm,added:Note[]=[];
 // Place additions halfway between the original eighth-note grid.
 for(let step=Math.ceil(start/interval);step*interval+interval/2<end;step++){
  const t=step*interval+interval/2,preferred=(step+seed)%lanes;
  if(existing.some(n=>n.extra&&Math.abs(n.t-t)<.12))continue;
  // Try another lane instead of placing a tap through a hold body. Include notes
  // added in this pass so two penalty notes cannot overlap either.
  for(let offset=0;offset<lanes;offset++){
   const lane=(preferred+offset)%lanes;
   if(laneIsPlayableAt([...existing,...added],lane,t)){added.push({t,lane,extra:true});break;}
  }
 }
 return added;
}
