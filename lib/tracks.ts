export type Track={id:number;title:string;subtitle:string;genre:string;bpm:number;beatOffset:number;duration:number;audio:string;color:string;tag:string;story:string;melody:readonly number[];youtubeId?:string;artist?:string;chartVersion?:string;audioOffsetMs?:number};
export const tracks = [
  {id:0,title:'Gilded Velocity',subtitle:'Golden speed',genre:'ELECTRONIC / DRIVE',bpm:100,beatOffset:.27,duration:179.183,audio:'/audio/gilded-velocity.mp4',color:'#b9f36b',tag:'FULL THROTTLE',story:'금빛 트랙 위를 일정한 속도로 질주하는 시간.',melody:[0,7,10,14,7,3,10,7]},
  {id:1,title:'Against the Great Mountain',subtitle:'Climb the impossible',genre:'CINEMATIC / ROCK',bpm:149,beatOffset:.26,duration:176.978,audio:'/audio/against-the-great-mountain.mp4',color:'#75dbff',tag:'UPHILL BUILD',story:'거대한 장벽 앞에서도 박자를 놓치지 않는다.',melody:[0,3,7,12,10,7,3,7]},
  {id:2,title:'하늘 끝까지 질주',subtitle:'Race beyond the sky',genre:'ANIME / SPEEDCORE',bpm:100,beatOffset:.18,duration:172.079,audio:'/audio/race-to-the-edge-of-the-sky.mp4',color:'#c4a1ff',tag:'SKY LIMIT',story:'끝없이 열리는 하늘과 리듬을 향해 전속력으로.',melody:[12,7,3,0,7,10,14,10]},
  {id:3,title:'Shatter the Skies',subtitle:'Break every limit',genre:'ORCHESTRAL / METAL',bpm:165,beatOffset:.22,duration:180.460,audio:'/audio/shatter-the-skies.mp4',color:'#ffab70',tag:'LIMIT BREAK',story:'한계를 부수는 순간, 모든 키가 하나의 폭풍이 된다.',melody:[0,12,7,3,10,7,15,12]},
  {id:4,title:'Apex Pursuit',subtitle:'Chase the summit',genre:'DRUM & BASS',bpm:170,beatOffset:.24,duration:181.527,audio:'/audio/apex-pursuit.mp4',color:'#ff92b8',tag:'FINAL PUSH',story:'정점을 향한 마지막 추격. 멈추면 박자가 먼저 도망간다.',melody:[7,3,0,10,7,14,12,7]},
  {id:5,title:'심장이 뛰는 순간',subtitle:'The moment the heart races',genre:'K-POP / ANTHEM',bpm:130,beatOffset:.293,duration:171.781,audio:'/audio/heart-racing-moment.mp4',color:'#ff667f',tag:'HEARTBEAT RISE',story:'심장 소리와 함께 달려가는 찬란한 순간.',melody:[0,7,12,10,3,7,14,10]},
  {id:6,title:'Beyond The Design',subtitle:'Break past the blueprint',genre:'ELECTRONIC / ROCK',bpm:130,beatOffset:.294,duration:180.010,audio:'/audio/beyond-the-design.mp4',color:'#61d8ff',tag:'BREAK THE FRAME',story:'정해진 설계도렬를 넘어 새로운 리듬을 그린다.',melody:[0,10,3,14,7,12,3,10]},
  {id:7,title:'Champions Under The Sun',subtitle:'Rise where legends shine',genre:'STADIUM / POP ROCK',bpm:120,beatOffset:.046,duration:177.058,audio:'/audio/champions-under-the-sun.mp4',color:'#ffc857',tag:'CHAMPION LIGHT',story:'태양 아래서 모든 리듬이 하나로 빛나는 스테이지.',melody:[0,3,7,12,7,10,14,12]},
  {id:8,title:'Victory Beneath Our Feet',subtitle:'March into victory',genre:'ORCHESTRAL / MARCH',bpm:160,beatOffset:.093,duration:178.599,audio:'/audio/victory-beneath-our-feet.mp4',color:'#8ee08e',tag:'VICTORY MARCH',story:'발아래에 이겨낸 박자가 승리로 변해 모두의 승리가 된다.',melody:[0,7,3,12,10,14,7,15]},
] as const satisfies readonly Track[];
export type Difficulty = 'easy'|'normal'|'hard';
export type Note = {t:number;lane:number;endT?:number;hit?:boolean;miss?:boolean;extra?:boolean;holding?:boolean};
export const duration = (t:Track) => t.duration;
export const keyLabel = (s:string) => s === 'Space' ? 'SPACE' : s.replace('Key','').replace('Digit','').replace('Arrow','↗ ').replace('Numpad','NUM ');
export function chart(track:Track, level:Difficulty, lanes=4):Note[] {
  const notes:Note[]=[]; const beat=60/track.bpm;
  const finalStep=Math.floor(track.duration/beat*2)-4;
  for(let step=8;step<finalStep;step++) {
    if(level==='easy' && step%2)continue;
    if(level==='normal' && step%8===7)continue;
    const section=Math.floor(step/32),phrase=step%32;
    const lane=(track.melody[(phrase+section*3)%track.melody.length]+Math.floor(phrase/8)+section*2+track.id)%lanes;
    const t=track.beatOffset+step*beat/2;
    const hold=step>16&&phrase%16===4&&section%3===1;
    notes.push({t,lane,...(hold?{endT:t+beat*(level==='hard'?1.5:1)}:{})});
    if(level==='hard' && step%8===0)notes.push({t:track.beatOffset+step*beat/2,lane:(lane+Math.max(2,Math.floor(lanes/2)))%lanes});
  }
  return notes;
}
