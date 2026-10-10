import test from 'node:test';
import assert from 'node:assert/strict';
import {examSchedule,reminderState,examStatus,examCalendar} from '../src/exam-core.js';
import {makeExamEvent,validateBackup} from '../src/study-core.js';
const doc={id:'bio',name:'Biology',subject:'Biology',subjectConfirmed:true,chunks:[{id:'c',page:1,text:'Source notes.'}]};
test('quiz timing binds to a confirmed subject and calculates an exact reminder',()=>{
  const event=makeExamEvent([doc],'bio','Exam','2030-05-20',{time:'14:30',reminderMinutes:60});
  assert.equal(new Date(event.startsAt).getHours(),14);assert.equal(new Date(event.startsAt).getMinutes(),30);
  assert.equal(event.startsAt-event.remindAt,3600000);
  assert.throws(()=>makeExamEvent([{...doc,subjectConfirmed:false}],'bio','Exam','2030-05-20',{time:'14:30',reminderMinutes:60}));
  for(const time of ['24:00','12:60','9:00',''])assert.throws(()=>examSchedule('2030-05-20',time));
  assert.throws(()=>examSchedule('2030-05-20','14:30',-15));
});
test('reminders fire at the threshold, catch up on return, and stay dismissed or completed',()=>{
  const event=examSchedule('2030-05-20','14:30',15);
  assert.equal(reminderState(event,event.remindAt-1),null);assert.equal(reminderState(event,event.remindAt),'due');
  assert.equal(reminderState(event,event.startsAt),'past');
  assert.equal(reminderState({...event,reminderDismissedAt:1},event.startsAt),null);
  assert.equal(reminderState({...event,completed:true},event.startsAt),null);
  assert.equal(reminderState(examSchedule('2030-05-20','14:30',null),event.startsAt),null);
  assert.equal(reminderState({date:'2030-05-20'},event.startsAt),null);
  assert.equal(examStatus(event,event.startsAt-60000),'In 1 min');
});
test('calendar export carries the exact instant and alarm, escapes text and folds UTF-8 lines',()=>{
  const event={id:'event',title:'Quiz, A; B\nChapter 2',...examSchedule('2030-05-20','14:30',1440)};
  const text=examCalendar(event,'Biology 🌱'.repeat(12),0);
  assert(text.includes('TRIGGER:-PT1440M'));assert(text.includes('BEGIN:VALARM'));assert(text.includes('Quiz\\, A\\; B\\nChapter 2'));
  assert(text.includes(new Date(event.startsAt).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')));
  for(const line of text.split('\r\n'))assert(Buffer.byteLength(line)<=75);
  assert(!examCalendar({...event,remindAt:null,reminderMinutes:null},'Biology').includes('VALARM'));
  assert.throws(()=>examCalendar({id:'old',date:'2030-05-20'},'Biology'));
});
test('backup retains legacy date-only quizzes and rejects corrupted timed reminders',()=>{
  const event=makeExamEvent([doc],'bio','Exam','2030-05-20',{time:'14:30',reminderMinutes:60});
  const backup={format:'marginloom',version:2,stores:{documents:[doc],events:[event]}};
  assert.equal(validateBackup(backup).stores.events[0].startsAt,event.startsAt);
  assert.throws(()=>validateBackup({...backup,stores:{documents:[doc],events:[{...event,remindAt:0}]}}));
  const old=makeExamEvent([doc],'bio','Old exam','2020-05-20');
  assert.equal(validateBackup({...backup,stores:{documents:[doc],events:[old]}}).stores.events[0].date,'2020-05-20');
});
