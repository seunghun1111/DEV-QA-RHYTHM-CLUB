import assert from 'node:assert/strict';
import {activePenalties,penaltyKeys,judgmentWindow,extraNotes} from '../lib/penalties.ts';
import {tracks,chart} from '../lib/tracks.ts';
const original=['KeyD','KeyF','KeyJ','KeyK'];
const event={id:'test',from:'dev',fromName:'DEV',target:'qa',type:'shuffle',startsAt:1000,endsAt:9000};
assert.equal(activePenalties([event],'qa',999).length,0);
assert.equal(activePenalties([event],'other',1500).length,0);
assert.deepEqual(penaltyKeys(original,activePenalties([event],'qa',1000)),['KeyK','KeyJ','KeyF','KeyD']);
assert.deepEqual(penaltyKeys(original,activePenalties([event],'qa',9000)),original);
assert.deepEqual(original,['KeyD','KeyF','KeyJ','KeyK']);
assert.deepEqual(judgmentWindow([{...event,type:'strict'}]),{perfect:.04,good:.1});
assert.deepEqual(judgmentWindow([]),{perfect:.065,good:.15});
for(const track of tracks){const base=chart(track,'hard'),extra=extraNotes(track,10,18,base,2);assert.ok(extra.length>0);assert.ok(extra.every(n=>n.t>=10&&n.t<18&&n.extra&&n.lane>=0&&n.lane<4));assert.ok(extra.every(n=>!base.some(b=>b.lane===n.lane&&Math.abs(b.t-n.t)<.12)));assert.equal(extraNotes(track,10,18,[...base,...extra],2).length,0);}
console.log('PASS: warning boundary, target isolation, temporary key shuffle and restoration, strict judgment restoration, bounded additional notes for all 5 tracks.');
