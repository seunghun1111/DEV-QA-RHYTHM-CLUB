export const tracks = [
  {id:0,title:'Gilded Velocity',subtitle:'Golden speed',genre:'ELECTRONIC / DRIVE',bpm:100,beatOffset:.27,duration:179.183,audio:'/audio/gilded-velocity.mp4',color:'#b9f36b',tag:'FULL THROTTLE',story:'금빛 트랙 위를 일정한 속도로 질주하는 시간.',melody:[0,7,10,14,7,3,10,7]},
  {id:1,title:'Against the Great Mountain',subtitle:'Climb the impossible',genre:'CINEMATIC / ROCK',bpm:149,beatOffset:.26,duration:176.978,audio:'/audio/against-the-great-mountain.mp4',color:'#75dbff',tag:'UPHILL BUILD',story:'거대한 장벽 앞에서도 박자를 놓치지 않는다.',melody:[0,3,7,12,10,7,3,7]},
  {id:2,title:'하늘 끝까지 질주',subtitle:'Race beyond the sky',genre:'ANIME / SPEEDCORE',bpm:100,beatOffset:.18,duration:172.079,audio:'/audio/race-to-the-edge-of-the-sky.mp4',color:'#c4a1ff',tag:'SKY LIMIT',story:'끝없이 열리는 하늘과 리듬을 향해 전속력으로.',melody:[12,7,3,0,7,10,14,10]},
  {id:3,title:'Shatter the Skies',subtitle:'Break every limit',genre:'ORCHESTRAL / METAL',bpm:165,beatOffset:.22,duration:180.460,audio:'/audio/shatter-the-skies.mp4',color:'#ffab70',tag:'LIMIT BREAK',story:'한계를 부수는 순간, 모든 키가 하나의 폭풍이 된다.',melody:[0,12,7,3,10,7,15,12]},
  {id:4,title:'Apex Pursuit',subtitle:'Chase the summit',genre:'DRUM & BASS',bpm:170,beatOffset:.24,duration:181.527,audio:'/audio/apex-pursuit.mp4',color:'#ff92b8',tag:'FINAL PUSH',story:'정점을 향한 마지막 추격. 멈추면 박자가 먼저 도망간다.',melody:[7,3,0,10,7,14,12,7]},
] as const;
export type Track = typeof tracks[number];
export type Difficulty = 'easy'|'normal'|'hard';
export type Note = {t:number;lane:number;hit?:boolean;miss?:boolean;extra?:boolean};
export const duration = (t:Track) => t.duration;
export const keyLabel = (s:string) => s === 'Space' ? 'SPACE' : s.replace('Key','').replace('Digit','').replace('Arrow','↗ ').replace('Numpad','NUM ');
export function chart(track:Track, level:Difficulty, lanes=4):Note[] {
  const notes:Note[]=[]; const beat=60/track.bpm;
  const finalStep=Math.floor(track.duration/beat*2)-4;
  for(let step=8;step<finalStep;step++) {
    if(level==='easy' && step%2)continue;
    if(level==='normal' && step%8===7)continue;
    const phrase=step%32;
    const lane=(track.melody[phrase%8]+Math.floor(phrase/8)+track.id)%lanes;
    notes.push({t:track.beatOffset+step*beat/2,lane});
    if(level==='hard' && step%8===0)notes.push({t:track.beatOffset+step*beat/2,lane:(lane+Math.max(2,Math.floor(lanes/2)))%lanes});
  }
  return notes;
}
