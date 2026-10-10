import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, learningRequest, lessonElements, composeLesson, defaultComposition, planStudySession, validStudySession, teachCoverage } from '../src/learning-core.js';
import { validateBackup } from '../src/study-core.js';
import { resampleAudio } from '../src/speech.js';
const doc={id:'math',name:'Algebra',chunks:[{id:'first',page:1,text:'Slope is the change in y for a change in x. Intercept is the value of y when x is zero. The example formula is y = 2x + 3.'},{id:'second',page:2,text:'A claim is a statement supported by evidence. Evidence is information that supports a claim.'}]};
test('arithmetic graphs calculate precedence and refuse executable code, singularities and huge exponents',()=>{
  assert.equal(calculate('2x + 3',2),7);assert.equal(calculate('-x^2',3),-9);assert.equal(calculate('(x+2)/2',4),3);assert.equal(calculate('2^3^2',0),512);
  for(const input of ['alert(1)','globalThis.location','x; fetch(1)','x/0','2^100','(x+1','x=2','x.constructor','x +'])assert.throws(()=>calculate(input,1));
});
test('lesson composition can combine source elements but cannot add fabricated formulas, code or unknown IDs',()=>{
  const sources=doc.chunks.map(s=>({...s,docId:doc.id,docName:doc.name})),elements=lessonElements(sources);
  assert.ok(elements.some(b=>b.kind==='graph'));assert.ok(elements.some(b=>b.kind==='connect'));assert.ok(elements.some(b=>b.kind==='annotate'));
  assert.ok(defaultComposition(elements).length>=3);
  assert.equal(composeLesson({blocks:[elements[0].id,elements[1].id]},elements).length,2);
  assert.throws(()=>composeLesson({blocks:[elements[0].id,'graph:invented']},elements));assert.throws(()=>composeLesson({blocks:[elements[0].id,elements[0].id]},elements));
  const unsupported=lessonElements([{id:'medical',text:'Blood flow changes with pressure. y = fetch(1).',docId:'nursing',page:1}]);assert.ok(!unsupported.some(b=>b.kind==='graph'));
  const numbered=lessonElements([{id:'steps',text:'1. Read the question. 2. Identify the evidence. 3. Explain your conclusion.',page:1}]);assert.equal(numbered.find(b=>b.kind==='sequence').items.length,3);
});
test('short sessions bind to the selected subject and prioritize that material’s mistakes and exam',()=>{
  const mistakes=[{source:{docId:'math',id:'second'},resolved:false},{source:{docId:'nursing',id:'other'},resolved:false}];
  const session=planStudySession(doc,15,mistakes,[{docId:'nursing',title:'Wrong subject',date:'2026-10-11'},{docId:'math',title:'Algebra quiz',date:'2026-10-12'}],'2026-10-10');
  assert.equal(session.sourceIds[0],'second');assert.equal(session.exam.title,'Algebra quiz');assert.equal(session.weak,1);assert.equal(session.steps.reduce((n,s)=>n+s.seconds,0),900);assert.ok(validStudySession(session,doc));
  assert.ok(!validStudySession({...session,docId:'nursing'},doc));assert.ok(!validStudySession({...session,sourceIds:['invented']},doc));assert.ok(!validStudySession({...session,completed:true},doc));
});
test('session settings survive backups with validation; voice setup flag does not represent model files',()=>{
  const session=planStudySession(doc,15);
  const backup={format:'marginloom',version:2,stores:{documents:[doc]},settings:[['studySession:math',session],['voiceReady',true]]};assert.equal(validateBackup(backup).settings.length,2);
  assert.throws(()=>validateBackup({...backup,settings:[['studySession:math',{...session,sourceIds:['bad']}]]}));
});
test('learning commands route actions without hijacking informational questions',()=>{
  assert.deepEqual(learningRequest('I have 15 minutes to study'),{mode:'session',minutes:15});assert.equal(learningRequest('teach it back').mode,'teach');assert.equal(learningRequest('explore this lesson').mode,'explore');assert.equal(learningRequest('How do I create an interactive lesson?'),null);assert.equal(learningRequest('I have 100 minutes').minutes,45);
});
test('term coverage is a mention checklist, and audio is bounded and resampled for local speech',()=>{
  const result=teachCoverage('Slope describes changes.',doc.chunks);assert.equal(result[0].mentioned,true);assert.equal(result[1].mentioned,false);
  const audio=resampleAudio(new Float32Array(48000).fill(.5),48000);assert.equal(audio.length,16000);assert.equal(audio[500],.5);assert.throws(()=>resampleAudio([],48000));
});
