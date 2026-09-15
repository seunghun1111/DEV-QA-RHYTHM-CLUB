export const youtubeKoreaTop20 = [
  ['LISA', 'SaWaDiKa', '7.6M'],
  ['ATEEZ', 'BAD', '3.6M'],
  ['RESCENE', 'LOVE ATTACK', '3.0M'],
  ['SOYEON', '퇴사할게여', '2.8M'],
  ['aespa', 'LEMONADE', '2.8M'],
  ['CORTIS', 'REDRED', '2.6M'],
  ['RESCENE', 'Pretty Girl', '2.6M'],
  ['BIGBANG', 'BiiiG', '2.6M'],
  ['JISOO', 'CLICK', '2.5M'],
  ['ILLIT', "It's Me", '2.1M'],
  ['RESCENE', 'Deja Vu', '2.1M'],
  ['Hearts2Hearts', 'RUDE!', '2.0M'],
  ['임영웅', '또또', '1.9M'],
  ['머무르', '꿈꾸던 어른이 되었나요?', '1.8M'],
  ['I.O.I', '갑자기', '1.8M'],
  ["Girls' Generation-HRS", 'Skibidi', '1.7M'],
  ['KiiiKiii', 'Pop Off Pop Off', '1.6M'],
  ['TAEYEON', 'Bansanka', '1.4M'],
  ['HWASA', 'Good Goodbye', '1.4M'],
  ['YENA', '캐치 캐치', '1.3M'],
] as const;

export const youtubeMusicSearchUrl = (artist:string, title:string) =>
  `https://music.youtube.com/search?q=${encodeURIComponent(`${artist} ${title}`)}`;
