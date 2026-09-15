export const tracks = [
  {id:0,title:'제 쪽에서는 소리 나요',subtitle:'Works on my machine',genre:'LO-FI / GARAGE',bpm:108,root:57,color:'#b9f36b',tag:'첫 번째 이슈',story:'QA가 들은 이상한 소리. 개발자가 베이스를 추가했다.',chords:[0,5,3,7],melody:[0,7,10,14,7,3,10,7]},
  {id:1,title:'확인차 한 번 더',subtitle:'Just one more test',genre:'ELECTRONIC / HOUSE',bpm:124,root:60,color:'#75dbff',tag:'재현 중독',story:'확인은 끝났다. 하지만 후렴은 다시 확인해야 한다.',chords:[0,8,5,7],melody:[0,3,7,12,10,7,3,7]},
  {id:2,title:'수정했더니 더 좋아짐',subtitle:'It’s a feature now',genre:'SYNTHWAVE',bpm:116,root:54,color:'#c4a1ff',tag:'의도된 동작',story:'버그를 고치려다 신시사이저를 만들었다.',chords:[0,3,8,5],melody:[12,7,3,0,7,10,14,10]},
  {id:3,title:'옆 팀에서도 재현됩니다',subtitle:'Cannot stop reproducing',genre:'BREAKBEAT',bpm:140,root:55,color:'#ffab70',tag:'영향 범위 확대',story:'옆 팀 QA도 들어왔다. 이제 공동 조사가 필요하다.',chords:[0,5,10,7],melody:[0,12,7,3,10,7,15,12]},
  {id:4,title:'이 상태로 남겨두죠',subtitle:'Close as intended',genre:'MELODIC / DOWNTEMPO',bpm:96,root:62,color:'#ff92b8',tag:'오늘의 마지막 이슈',story:'이슈는 닫았다. 앙코르는 다시 열면 된다.',chords:[0,8,3,10],melody:[7,3,0,10,7,14,12,7]},
] as const;
export type Track = typeof tracks[number];
export type Difficulty = 'easy'|'normal'|'hard';
export type Note = {t:number;lane:number;hit?:boolean;miss?:boolean;extra?:boolean};
export const duration = (t:Track) => 128 * 60 / t.bpm;
export const keyLabel = (s:string) => s === 'Space' ? 'SPACE' : s.replace('Key','').replace('Digit','').replace('Arrow','↗ ').replace('Numpad','NUM ');
export function chart(track:Track, level:Difficulty):Note[] {
  const notes:Note[]=[]; const beat=60/track.bpm;
  for(let step=8;step<252;step++) {
    if(level==='easy' && step%2)continue;
    if(level==='normal' && step%8===7)continue;
    const phrase=step%32;
    const lane=(track.melody[phrase%8]+Math.floor(phrase/8)+track.id)%4;
    notes.push({t:step*beat/2,lane});
    if(level==='hard' && step%8===0)notes.push({t:step*beat/2,lane:(lane+2)%4});
  }
  return notes;
}
