import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestedTopics,topicMatches,checkTopic,quizEvidenceIndex} from '../src/topics.js';
import {focusDocuments,validateBackup} from '../src/study-core.js';
import {buildSourceGameDeck} from '../src/game-core.js';
const text='Assembly language uses mnemonic instructions. Full adders are circuits that add three binary inputs. A ripple carry adder is a circuit made by chaining full adders.';
const doc={id:'arch',name:'Architecture.txt',chunks:[{id:'p1',page:1,text}]};

test('page references are replaced by source concepts, not offered as topics',()=>{
 const material={...doc,chunks:[{id:'p12',page:12,text:'All values here are hexadecimal.\nThese values are represented in binary.\nThis is important.\nAssembly language uses mnemonic instructions.\nNumber systems'}]};
 const topics=suggestedTopics(material);
 assert.ok(topics.some(t=>t.term==='hexadecimal'&&t.passages[0].page===12));
 assert.ok(topics.some(t=>t.term==='binary'));
 assert.ok(topics.some(t=>t.term==='Number systems'));
 assert.ok(topics.some(t=>t.term==='Assembly language'));
 assert.ok(!topics.some(t=>/All values here|These values|This|important/.test(t.term)));
});
test('concept selection keeps the same source identity after corrections load',()=>{
 const repeated={...doc,chunks:[...doc.chunks,{id:'p2',page:2,text}]};
 const keys=()=>buildSourceGameDeck([repeated],64,false).map(c=>`${c.source.id}:${c.answer}`);
 const original=keys();for(let i=0;i<10;i++)assert.deepEqual(keys(),original);
 assert.ok(original.every(key=>key.startsWith('p1:')));
});
test('topic suggestions are factual source terms and exact matches avoid substrings',()=>{
 assert.ok(suggestedTopics(doc).some(t=>t.term==='Full adders'&&t.passages.length===2));
 assert.equal(topicMatches('ClassLoader','class'),false);
 assert.equal(topicMatches('FULL   ADDERS add inputs','full adders'),true);
 assert.throws(()=>checkTopic(doc,'Mobile computing'));
});
test('topics narrow evidence within the same page while preserving original citations',()=>{
 const focused=focusDocuments([doc],{enabled:true,docIds:['arch'],pages:{},topics:{arch:['Full adders']},weakOnly:false});
 const chunk=focused[0].chunks[0];assert.equal(chunk.text,text);assert.equal(chunk.focusEvidence.length,2);
 assert.equal(quizEvidenceIndex(chunk),1);
 assert.equal(focusDocuments([doc],{enabled:true,docIds:['arch'],pages:{arch:[2]},topics:{arch:['Full adders']},weakOnly:false}).length,0);
 assert.throws(()=>quizEvidenceIndex({...chunk,focusEvidence:[]}));
});
test('topic settings restore validates phrases and labels without breaking older backups',()=>{
 const focus={enabled:true,docIds:['arch'],pages:{},weakOnly:false,topics:{arch:['Full adders']},topicLabels:{arch:{'Full adders':'Binary addition'}}};
 const backup={format:'marginloom',version:2,stores:{documents:[doc]},settings:[['examFocus',focus]]};
 assert.equal(validateBackup(backup).settings[0][1].topicLabels.arch['Full adders'],'Binary addition');
 assert.throws(()=>validateBackup({...backup,settings:[['examFocus',{...focus,topics:{arch:['Mobile computing']}}]]}));
 assert.throws(()=>validateBackup({...backup,settings:[['examFocus',{...focus,topicLabels:{arch:{'Full adders':42}}}]]}));
});
