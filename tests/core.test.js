import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkPages, retrieve, dot, parseQuiz, buildMessages, citationIds, selectQuizSources, buildQuizSet, answerPhrases, sourceSentences, sourceClozeQuestion, EMBEDDING_VERSION } from '../src/core.js';

test('chunking preserves page identities and overlaps without duplicate trailing chunks', () => {
  const chunks = chunkPages([{ page: 7, text: Array.from({length:160},(_,i) => `word${i}`).join(' ') }]);
  assert.equal(chunks.length,2);
  assert.equal(chunks[1].text.split(' ')[0], 'word72');
  assert.ok(chunks.every(c => c.page === 7));
  assert.throws(() => chunkPages([],18,18));
});
const docs = [{ id:'biology',name:'Biology',chunks:[
  {id:'a',page:1,text:'Chlorophyll absorbs light during photosynthesis.'},
  {id:'b',page:2,text:'The Calvin cycle occurs in the stroma.'},
] }];
test('source search returns original passages, scoped documents, and no unrelated answer', () => {
  assert.equal(retrieve('Where does the Calvin cycle happen?',docs)[0].id,'b');
  assert.equal(retrieve('Explain black holes',docs).length,0);
  assert.equal(retrieve('Calvin',[]).length,0);
  assert.equal(retrieve('Calvin',docs)[0].docName,'Biology');
});
test('semantic retrieval ignores incompatible vectors and matches compatible ones', () => {
  const documents=[{ id:'d',name:'d',chunks:[
    {id:'a',page:1,text:'Carbon fixation',vector:[1,0],embeddingVersion:'old-model'},
    {id:'b',page:2,text:'RuBisCO',vector:[1,0],embeddingVersion:EMBEDDING_VERSION},
  ]}];
  assert.deepEqual(retrieve('enzymatic reaction',documents,[1,0]).map(c=>c.id),['b']);
  assert.equal(dot([1,0],[1]),0);
});
const source={ id:'s',docId:'d',docName:'Biology',page:1,text:'The Calvin cycle occurs in the stroma of the chloroplast.' };
const valid={ question:'Where does the Calvin cycle occur?',options:['Stroma','Nucleus','Cytoplasm','Cell membrane'],answer:0,explanation:'The source identifies the stroma.',evidence:'The Calvin cycle occurs in the stroma' };
test('quiz parser accepts sourced questions, rejects wrong answer indexes and fabricated evidence', () => {
  assert.equal(parseQuiz(JSON.stringify(valid),source).answer,0);
  assert.throws(()=>parseQuiz(JSON.stringify({...valid,answer:4}),source));
  assert.throws(()=>parseQuiz(JSON.stringify({...valid,answer:-1}),source));
  assert.throws(()=>parseQuiz(JSON.stringify({...valid,options:['Stroma','stroma','A','B']}),source));
  assert.throws(()=>parseQuiz(JSON.stringify({...valid,evidence:'The cycle occurs in the nucleus'}),source));
  assert.throws(()=>parseQuiz('not JSON',source));
  assert.equal(parseQuiz(JSON.stringify({...valid,evidence:undefined,evidence_index:1}),source).evidence,source.text);
  assert.throws(()=>parseQuiz(JSON.stringify({...valid,evidence_index:99}),source));
  assert.throws(()=>parseQuiz(JSON.stringify({...valid,evidence:source.text,options:['Stroma','chloroplast','Cytoplasm','Cell membrane']}),source));
  assert.throws(()=>parseQuiz(JSON.stringify({...valid,question:'Which option is NOT correct?'}),source));
});
test('citations map to valid source IDs without treating retrieval as proof', () => {
  assert.deepEqual(citationIds('This occurs in the stroma [1]. Wrong [9]. [1]',2),[1]);
  const messages=buildMessages('Where?', [source]);
  assert.match(messages[0].content,/reference data/);
  assert.match(messages[1].content,/\[1\] Biology, page 1/);
});
test('quiz source selection prioritizes unresolved mistakes and deduplicates sources', () => {
  const selected=selectQuizSources(docs,2,[{source:{id:'b'},resolved:false}]);
  assert.equal(selected[0].id,'b');
  assert.equal(new Set(selected.map(c=>c.id)).size,2);
});
test('constrained answer phrases are copied verbatim from the source sentence', () => {
  const sentence='The Calvin cycle takes place in the stroma of the chloroplast.';
  const phrases=answerPhrases(sentence);
  assert.ok(phrases.includes('stroma'));
  assert.ok(phrases.includes('Calvin cycle'));
  assert.ok(phrases.every(p=>sentence.includes(p)));
});

test('Java package names and decimals survive sentence extraction', () => {
  assert.deepEqual(sourceSentences('The java.io package provides streams. Version 2.5 supports these features.'), [
    'The java.io package provides streams.', 'Version 2.5 supports these features.',
  ]);
});

test('quiz answers must match whole words rather than a substring', () => {
  assert.throws(() => parseQuiz(JSON.stringify({ ...valid, options: ['roma', 'Nucleus', 'Cytoplasm', 'Cell membrane'] }), source));
  assert.equal(parseQuiz(JSON.stringify(valid), source).answer, 0);
});

test('rejects the observed AI question that marks Calvin cycle as its own location',()=>{
  assert.throws(()=>parseQuiz(JSON.stringify({...valid,options:['Calvin cycle','Nucleus','Cytoplasm','Cell membrane'],answer:0}),source),/question must not/);
});
test('long quizzes use multiple distinct facts per passage without losing source identity or focus',()=>{
  const text='Chlorophyll absorbs light energy. Stomata allow gas exchange. Guard cells control stomata.';
  const documents=[{id:'bio',name:'Biology',chunks:[{id:'original',page:4,text},{id:'overlap',page:4,text}]}];
  const sources=selectQuizSources(documents,10,[],false);
  assert.equal(sources.length,3);assert.equal(new Set(sources.map(s=>s.focusEvidence[0])).size,3);
  assert(sources.every(s=>s.id==='original'&&s.docId==='bio'&&s.page===4&&s.text===text));
  assert.deepEqual(selectQuizSources([{...documents[0],chunks:[{...documents[0].chunks[0],focusEvidence:['Stomata allow gas exchange.']}]}],10)[0].focusEvidence,['Stomata allow gas exchange.']);
});

test('long quizzes cover documents and pages without the old seven-passage limit',()=>{
  const docs=['a','b'].map(id=>({id,name:id,chunks:Array.from({length:30},(_,i)=>({id:`${id}${i}`,page:i%10+1,text:`Concept ${i} is an example fact.`}))}));
  for(let i=0;i<20;i++){
    const sources=selectQuizSources(docs,50,[],false);
    assert.equal(sources.length,50);
    assert.equal(new Set(sources.map(s=>`${s.docId}:${s.id}`)).size,50);
    assert.equal(new Set(sources.slice(0,20).map(s=>`${s.docId}:${s.page}`)).size,20);
    assert.deepEqual(new Set(sources.slice(0,2).map(s=>s.docId)),new Set(['a','b']));
  }
  assert.equal(selectQuizSources(docs,100).length,60);
});
test('quiz building reaches 50, skips failures/duplicates, and stops with completed questions',async()=>{
  const sources=Array.from({length:100},(_,i)=>({id:String(i)}));
  const full=await buildQuizSet(sources,50,async s=>({question:`Question ${s.id}`}));
  assert.equal(full.questions.length,50);
  const checked=await buildQuizSet(sources.slice(0,4),5,async s=>{if(s.id==='0')throw Error('Invalid evidence');return {question:s.id==='3'?'Unique':'Duplicate'};});
  assert.equal(checked.questions.length,2);assert.equal(checked.skipped,2);
  let stop=false;
  const stopped=await buildQuizSet(sources,50,async s=>({question:s.id}),{shouldStop:()=>stop,onProgress:n=>{if(n===3)stop=true;}});
  assert.equal(stopped.questions.length,3);
  const empty=await buildQuizSet(sources,5,async()=>{throw Error('Should not run');},{shouldStop:()=>true});
  assert.equal(empty.questions.length,0);
});

test('invalid AI wording can fall back to an exact source statement with one verified answer',()=>{
 const q=sourceClozeQuestion(source,0,'Calvin cycle',['Krebs cycle','Fermentation','Glycolysis']);
 assert(q.question.includes('____ occurs in the stroma'));assert(!q.question.includes('Calvin cycle'));assert.equal(q.options[q.answer],'Calvin cycle');assert.equal(q.source.text,source.text);
 assert.throws(()=>sourceClozeQuestion(source,0,'Calvin cycle',['Stroma','Fermentation','Glycolysis']));
});
