import assert from 'node:assert/strict';
import {removeHoldConflicts,validateBeatmap} from '../lib/beatmap.ts';

const conflict=[{t:1,lane:0,endT:3},{t:2,lane:0},{t:2,lane:1}];
const cleaned=removeHoldConflicts(conflict);
assert.ok(!cleaned.some(note=>note.lane===0&&note.t===2));
assert.ok(cleaned.some(note=>note.lane===1&&note.t===2));

const generated=validateBeatmap([
 {t:1,lane:0,endT:3},{t:1.5,lane:0},{t:2,lane:0},
 {t:2,lane:1},{t:2,lane:2},{t:2,lane:3},
],4,'hard');
for(const hold of generated.filter(note=>note.endT)){
 assert.ok(!generated.some(note=>note!==hold&&note.lane===hold.lane&&note.t>hold.t&&note.t<hold.endT));
}
const timeGroups=Map.groupBy(generated,note=>note.t);
assert.ok([...timeGroups.values()].every(group=>group.length<=2));
assert.ok(generated.every(note=>note.lane>=0&&note.lane<4));
console.log('PASS: beatmap validation prevents hold-body taps, invalid lanes and oversized chords.');
