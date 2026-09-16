import assert from 'node:assert/strict';
import {youtubeBeatmap} from '../lib/youtube-beatmaps.ts';

const makeTrack=(id,videoId,bpm=128)=>({id,title:videoId,subtitle:'test',genre:'test',bpm,beatOffset:.2,duration:120,audio:'',color:'#fff',tag:'test',story:'test',melody:[0],youtubeId:videoId,chartVersion:'test-v1'});
const tracks=[makeTrack(100,'aaaaaaaaaaa'),makeTrack(101,'bbbbbbbbbbb',174)];
for(const track of tracks)for(const level of ['easy','normal','hard'])for(const lanes of [4,6,7,8]){
 const first=youtubeBeatmap(track,level,lanes),second=youtubeBeatmap(track,level,lanes);
 assert.deepEqual(first,second,'same chart identity must be deterministic');
 assert.ok(first.length>20);
 assert.ok(first.every(note=>note.lane>=0&&note.lane<lanes));
 assert.ok(first.every(note=>!note.endT||!first.some(other=>other!==note&&other.lane===note.lane&&other.t>note.t&&other.t<note.endT)));
 const groups=Map.groupBy(first,note=>note.t);assert.ok([...groups.values()].every(group=>group.length<=(level==='easy'?1:2)));
}
const easy=youtubeBeatmap(tracks[0],'easy',4),hard=youtubeBeatmap(tracks[0],'hard',4);
assert.ok(hard.length>easy.length*1.4,'difficulty must change more than labels');
assert.notDeepEqual(youtubeBeatmap(tracks[0],'hard',4).slice(0,40).map(n=>n.lane),youtubeBeatmap(tracks[1],'hard',4).slice(0,40).map(n=>n.lane),'songs need distinct lane phrases');
console.log('PASS: versioned YouTube charts are deterministic, difficulty-scaled, song-specific and hold-safe.');
