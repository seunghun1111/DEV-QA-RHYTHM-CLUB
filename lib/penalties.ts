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
export function extraNotes(track:Track,start:number,end:number,existing:Note[],seed:number):Note[]{
 const interval=30/track.bpm,added:Note[]=[];
 // Place additions halfway between the original eighth-note grid.
 for(let step=Math.ceil(start/interval);step*interval+interval/2<end;step++){
  const t=step*interval+interval/2,lane=(step+seed)%4;
  if(!existing.some(n=>n.lane===lane&&Math.abs(n.t-t)<.12))added.push({t,lane,extra:true});
 }
 return added;
}
