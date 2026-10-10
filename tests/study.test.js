import test from 'node:test';
import assert from 'node:assert/strict';
import {inferSubject,makeExamEvent,daysUntil,scheduleReview,goalProgress,focusDocuments,editedCard,applyCorrections,conceptId,validateBackup} from '../src/study-core.js';
import {makeGameCard} from '../src/game-core.js';
const text='Chlorophyll absorbs light during photosynthesis.';
const doc={id:'bio',name:'Biology.pdf',subject:'Biology',subjectConfirmed:true,chunks:[{id:'c',page:1,text},{id:'c2',page:2,text:'The Calvin cycle occurs in the stroma.'}]};
const card=makeGameCard('Chlorophyll',text,{...doc.chunks[0],docId:doc.id,docName:doc.name});
test('calendar subjects come from the confirmed document, never a separate subject field',()=>{
  assert.equal(inferSubject('Computer_Architecture_Exam_Study_Guide.pdf'),'Computer Architecture');
  assert.equal(inferSubject('Mobile Computing Notes.txt'),'Mobile Computing');
  assert.throws(()=>makeExamEvent([{...doc,subjectConfirmed:false}],'bio','Quiz','2026-10-12'));
  assert.throws(()=>makeExamEvent([doc],'mobile','Quiz','2026-10-12'));
  assert.throws(()=>makeExamEvent([doc],'bio','Quiz','2026-02-30'));
  assert.deepEqual(Object.keys(makeExamEvent([doc],'bio','Quiz','2026-10-12')).sort(),['createdAt','date','docId','id','title']);
  assert.equal(daysUntil('2026-10-11','2026-10-10'),1);
});
test('remembered cards gain longer intervals; hard and missed cards return sooner',()=>{
  const first=scheduleReview(null,'good',1000),second=scheduleReview(first,'good',2000),miss=scheduleReview(second,'again',3000);
  assert.equal(first.intervalDays,1);assert.equal(second.intervalDays,3);assert.equal(miss.dueAt,603000);assert.equal(miss.streak,0);
  assert.equal(scheduleReview(second,'hard',2000).intervalDays,1);
  assert.equal(scheduleReview(second,'easy',2000).intervalDays,6);
});
test('corrections keep stable identities and discarded concepts do not return',()=>{
  const corrected=editedCard(card,'Chlorophyll','Which pigment absorbs light?');
  const id=conceptId(card);
  assert.equal(conceptId(corrected),id);
  assert.equal(applyCorrections([card],[{id,card:corrected}])[0].clue,'Which pigment absorbs light?');
  assert.deepEqual(applyCorrections([card],[{id,discarded:true}]),[]);
  assert.throws(()=>editedCard(card,'Melanin','Which pigment absorbs light?'));
});
test('exam focus scopes documents, pages and unresolved mistake passages',()=>{
  const focus={enabled:true,docIds:['bio'],pages:{bio:[2]},weakOnly:false};
  assert.deepEqual(focusDocuments([doc],focus)[0].chunks.map(c=>c.id),['c2']);
  assert.deepEqual(focusDocuments([doc],{...focus,weakOnly:true},[]),[]);
  assert.equal(focusDocuments([doc],{...focus,weakOnly:true},[{source:{docId:'bio',id:'c2'},resolved:false}])[0].chunks.length,1);
  assert.equal(goalProgress({kind:'flashcards',startedAt:10,target:2},[{kind:'flashcards',createdAt:20,count:2},{kind:'quiz',createdAt:20,count:5},{kind:'flashcards',createdAt:1,count:5}]),2);
});
test('backup validates source references and rejects corrupted schedules before any write',()=>{
  const backup={format:'marginloom',version:2,stores:{documents:[doc],games:[{id:'bio',kind:'source',cards:[card]}],reviews:[{id:conceptId(card),docId:'bio',dueAt:2000,reviewedAt:1000}]},settings:[['gameSound',false]]};
  const result=validateBackup(backup);assert.equal(result.stores.documents.length,1);assert.equal(result.stores.games.length,1);
  assert.throws(()=>validateBackup({...backup,stores:{...backup.stores,reviews:[{id:'r',docId:'other',dueAt:2000,reviewedAt:1000}]}}));
  assert.throws(()=>validateBackup({...backup,stores:{documents:[{...doc,chunks:[{id:'a',page:0,text}]}]}}));
  assert.throws(()=>validateBackup({format:'other',version:2}));
  assert.equal(validateBackup({version:1,documents:[doc],sessions:[],mistakes:[]}).stores.documents.length,1);
});
