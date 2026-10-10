import {test} from 'node:test';
import assert from 'node:assert/strict';
import {speechChunks,validSpeaker,naturalVoices} from '../src/speaker-core.js';
test('speech chunks preserve long responses without citation/markdown speech or truncation',()=>{
 const text='**Slope** changes with input. [1] '+('A long factual sentence without a full stop '.repeat(70));
 const chunks=speechChunks(text);assert.ok(chunks.length>10);assert.ok(chunks.every(c=>c.length<=180));assert.equal(chunks.join(' '),text.replace(/\[\d+\]/g,'').replace(/[*#`]/g,'').trim().replace(/\s+/g,' '));
 assert.equal(speechChunks('x'.repeat(400)).join(' ').replaceAll(' ',''),'x'.repeat(400));
});
test('voice preferences only accept known offline voice ids',()=>{
 for(const {id}of naturalVoices)assert.ok(validSpeaker({voice:id,deviceVoice:'',ready:true}));
 assert.ok(!validSpeaker({voice:'remote',deviceVoice:'',ready:true}));assert.ok(!validSpeaker({voice:'af_heart',ready:true}));
});
