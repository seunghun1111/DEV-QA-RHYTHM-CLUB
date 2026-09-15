export type YoutubeChartTrack={artist:string;title:string;streams:string;videoId?:string};
export const youtubeKoreaTop20:readonly YoutubeChartTrack[] = [
  {artist:'LISA',title:'SaWaDiKa',streams:'7.6M',videoId:'FyS5dAywkEo'},
  {artist:'ATEEZ',title:'BAD',streams:'3.6M',videoId:'OHxYsZgq_6U'},
  {artist:'RESCENE',title:'LOVE ATTACK',streams:'3.0M',videoId:'9XttLI0oH0I'},
  {artist:'SOYEON',title:'퇴사할게여',streams:'2.8M'},
  {artist:'aespa',title:'LEMONADE',streams:'2.8M',videoId:'qlOqMiFWZr0'},
  {artist:'CORTIS',title:'REDRED',streams:'2.6M'},
  {artist:'RESCENE',title:'Pretty Girl',streams:'2.6M',videoId:'qZlu2j2SiBA'},
  {artist:'BIGBANG',title:'BiiiG',streams:'2.6M'},
  {artist:'JISOO',title:'CLICK',streams:'2.5M',videoId:'sf02ugzPFE4'},
  {artist:'ILLIT',title:"It's Me",streams:'2.1M',videoId:'bMhDJ0S0OBA'},
  {artist:'RESCENE',title:'Deja Vu',streams:'2.1M'},
  {artist:'Hearts2Hearts',title:'RUDE!',streams:'2.0M',videoId:'F7sGJVUrkjQ'},
  {artist:'임영웅',title:'또또',streams:'1.9M'},
  {artist:'머무르',title:'꿈꾸던 어른이 되었나요?',streams:'1.8M'},
  {artist:'I.O.I',title:'갑자기',streams:'1.8M'},
  {artist:"Girls' Generation-HRS",title:'Skibidi',streams:'1.7M'},
  {artist:'KiiiKiii',title:'Pop Off Pop Off',streams:'1.6M'},
  {artist:'TAEYEON',title:'Bansanka',streams:'1.4M'},
  {artist:'HWASA',title:'Good Goodbye',streams:'1.4M'},
  {artist:'YENA',title:'캐치 캐치',streams:'1.3M',videoId:'ItSKahBISg0'},
] as const;

export const youtubeMusicSearchUrl = (artist:string, title:string) =>
  `https://music.youtube.com/search?q=${encodeURIComponent(`${artist} ${title}`)}`;
export const youtubeCover=(videoId:string)=>`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
