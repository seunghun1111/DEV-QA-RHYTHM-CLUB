import type {Attack} from './penalties';
export type Player={id:string;slot:number;name:string;ready:boolean;seen:number;finished:boolean;ammo:number;chargesEarned:number;lastAttackAt:number;stats?:{score:number;accuracy:number;maxCombo:number;hitCount:number}};
export type RoomView={code:string;me:string;host:string;track:number;level:'easy'|'normal'|'hard';mode:'coop'|'battle';playbackRate:number;speed:number;keys:string[];players:Player[];startedAt:number|null;round:string;serverTime:number;attacks:Attack[]};
