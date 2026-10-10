import {examSchedule} from './exam-core.js';
import { wordLetters, blankEvidence, makeGameCard, usableSavedGameCard } from './game-core.js';

import { sourceSentences } from './core.js';
import { topicMatches,checkTopic } from './topics.js';
import { validStudySession } from './learning-core.js';

export const STUDY_STORES = ['documents','sessions','mistakes','games','overrides','reviews','events','activities'];
export function conceptId(card) { return card.conceptKey || `${card.source.docId}:${card.source.id}:${card.answer.trim().toLowerCase()}`; }
export function applyCorrections(cards, overrides) {
  const saved = new Map(overrides.map(o => [o.id,o]));
  return cards.flatMap(card => {
    const id = conceptId(card), correction = saved.get(id);
    if (correction?.discarded) return [];
    return [{ ...(correction?.card || card), conceptKey:id, corrected:!!correction?.card }];
  });
}
export function editedCard(card, answer, clue) {
  const term = answer.trim(), question = clue.trim();
  if (wordLetters(term).length < 3 || wordLetters(term).length > 20 || !/^[\p{L}\p{N}\s-]+$/u.test(term) || /^(?:how|what|why|where|when|which|who)$/iu.test(term)) throw new Error('Choose a meaningful source term with 3–20 letters.');
  blankEvidence(card.evidence,term);
  if (question.length < 12 || question.length > 280 || question.toLowerCase().includes(term.toLowerCase())) throw new Error('Write a clear clue without giving away the answer (12–280 characters).');
  return { ...card, answer:term, clue:question, conceptKey:conceptId(card), corrected:true };
}
export function validStudyCard(card, kind='source') {
  if (!card?.corrected) return usableSavedGameCard(card,kind);
  try {
    if (!card.source.text.toLowerCase().replace(/\s+/g,' ').includes(card.evidence.toLowerCase().replace(/\s+/g,' '))) return false;
    editedCard(card,card.answer,card.clue); return true;
  } catch { return false; }
}
export function scheduleReview(previous, rating, now=Date.now()) {
  if (!['again','hard','good','easy'].includes(rating)) throw new Error('Unknown review rating.');
  const streak = rating === 'again' ? 0 : (previous?.streak || 0) + 1;
  const days = rating === 'again' ? 0 : rating === 'hard' ? 1 : rating === 'easy' ? Math.max(4,(previous?.intervalDays || 1)*2) : [1,3,7,14][Math.min(streak-1,3)] * Math.max(1,Math.pow(2,streak-4));
  return { streak, intervalDays:days, dueAt:now+(days ? days*86400000 : 600000), reviewedAt:now, reviews:(previous?.reviews || 0)+1, rating };
}
export function inferSubject(name) {
  const title = name.replace(/\.[^.]+$/,'').replace(/[_–—-]+/g,' ');
  for (const [pattern,label] of [[/computer\s+architecture/i,'Computer Architecture'],[/mobile\s+computing/i,'Mobile Computing'],[/\bjava\b/i,'Java'],[/\bbiology|photosynthesis/i,'Biology'],[/\bchemistry/i,'Chemistry'],[/\bphysics/i,'Physics']]) if(pattern.test(title))return label;
  return title.replace(/\b(?:expanded|comprehensive|exam|study|guide|reviewer|notes|sample|chapter|module)\b|\d+/gi,' ').replace(/\s+/g,' ').trim().slice(0,80) || 'My subject';
}
export function dateKey(date=new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function daysUntil(value, today=dateKey()) { return Math.round((Date.parse(`${value}T12:00:00Z`)-Date.parse(`${today}T12:00:00Z`))/86400000); }
export function makeExamEvent(documents, docId, title, date, timing=null) {
  const doc = documents.find(d=>d.id===docId);
  if (!doc?.subjectConfirmed || !doc.subject?.trim()) throw new Error('Confirm the subject for this material before adding a quiz.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || dateKey(new Date(`${date}T12:00:00`)) !== date) throw new Error('Choose a valid quiz date.');
  if (!title.trim() || title.trim().length>120) throw new Error('Add a quiz name (up to 120 characters).');
  return { id:crypto.randomUUID(), docId, title:title.trim(), date, ...(timing?examSchedule(date,timing.time,timing.reminderMinutes):{}), createdAt:Date.now() };
}
export function focusDocuments(documents, focus, mistakes=[]) {
  if (!focus?.enabled) return documents;
  const weak = new Set(mistakes.filter(m=>!m.resolved).map(m=>`${m.source.docId}:${m.source.id}`));
  return documents.filter(d=>focus.docIds.includes(d.id)).map(d=>{
    const terms=focus.topics?.[d.id]||[];
    const chunks=d.chunks.filter(c=>(!focus.pages?.[d.id]?.length||focus.pages[d.id].includes(c.page))&&(!focus.weakOnly||weak.has(`${d.id}:${c.id}`))).map(c=>{
      const focusEvidence=terms.length?sourceSentences(c.text).filter(text=>terms.some(term=>topicMatches(text,term))):null;
      return focusEvidence ? {...c,focusEvidence} : c;
    }).filter(c=>!c.focusEvidence||c.focusEvidence.length);
    return {...d,chunks};
  }).filter(d=>d.chunks.length);
}
export function goalProgress(goal, activities) { return !goal ? 0 : activities.filter(a=>a.kind===goal.kind&&a.createdAt>=goal.startedAt).reduce((n,a)=>n+a.count,0); }
export function validateBackup(raw) {
  if (!raw || typeof raw!=='object') throw new Error('This is not a Marginloom backup.');
  const stores = raw.version===1 ? {documents:raw.documents,sessions:raw.sessions,mistakes:raw.mistakes} : raw.format==='marginloom'&&raw.version===2 ? raw.stores : null;
  if (!stores) throw new Error('Unsupported backup format.');
  const result={};
  for(const name of STUDY_STORES){const rows=stores[name]||[];if(!Array.isArray(rows)||rows.length>20000)throw new Error(`Invalid ${name} records.`);const ids=new Set();for(const row of rows){if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id))throw new Error(`Invalid or duplicate ${name} ID.`);ids.add(row.id);}result[name]=rows;}
  const docs=new Map(result.documents.map(d=>[d.id,d]));
  for(const d of result.documents)if(typeof d.name!=='string'||!Array.isArray(d.chunks)||!d.chunks.length||d.chunks.some(c=>typeof c.text!=='string'||typeof c.id!=='string'||!Number.isInteger(c.page)||c.page<1))throw new Error('A document is missing valid source passages.');
  function source(s){const d=docs.get(s?.docId);return d&&typeof s.text==='string'&&d.chunks.some(c=>c.id===s.id&&c.page===s.page&&c.text===s.text);}
  function question(q){return typeof q.question==='string'&&Array.isArray(q.options)&&q.options.length===4&&q.options.every(o=>typeof o==='string')&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4&&source(q.source);}
  for(const s of result.sessions)if(!Array.isArray(s.questions)||s.questions.some(q=>!question(q))||!Number.isInteger(s.correct)||s.correct<0||s.correct>s.questions.length)throw new Error('Invalid practice session.');
  for(const m of result.mistakes)if(!question(m))throw new Error('Invalid mistake record.');
  // Old generated decks are disposable; import only validated current cards.
  result.games=result.games.filter(g=>Array.isArray(g.cards)&&g.cards.length&&g.cards.every(c=>source(c.source)&&validStudyCard(c,g.kind)));
  for(const o of result.overrides)if(!docs.has(o.docId)||(!o.discarded&&(!source(o.card?.source)||!validStudyCard(o.card))))throw new Error('Invalid card correction.');
  for(const r of result.reviews)if(!docs.has(r.docId)||!Number.isFinite(r.dueAt)||!Number.isFinite(r.reviewedAt))throw new Error('Invalid flashcard schedule.');
  for(const e of result.events){const d=docs.get(e.docId);if(!d?.subjectConfirmed||typeof e.title!=='string')throw new Error('A calendar event is not linked to a confirmed subject.');makeExamEvent(result.documents,e.docId,e.title,e.date,e.time!==undefined?{time:e.time,reminderMinutes:e.reminderMinutes}:null);if(e.time!==undefined&&(!Number.isFinite(e.startsAt)||(e.remindAt!==null&&!Number.isFinite(e.remindAt))||e.remindAt!==(e.reminderMinutes===null?null:e.startsAt-e.reminderMinutes*60000)))throw new Error('Invalid calendar reminder.');}
  for(const a of result.activities)if(!['flashcards','quiz'].includes(a.kind)||!Number.isInteger(a.count)||a.count<1||!Number.isFinite(a.createdAt))throw new Error('Invalid study activity.');
  const settings=raw.version===1?[]:raw.settings||[];
  if(!Array.isArray(settings)||settings.some(s=>!Array.isArray(s)||s.length!==2||typeof s[0]!=='string'||s[0].length>200))throw new Error('Invalid backup settings.');
  const settingKeys=new Set();
  for(const [key,value]of settings){
    if(settingKeys.has(key))throw new Error('Duplicate backup setting.');settingKeys.add(key);
    if(key==='examFocus'&&(!value||typeof value.enabled!=='boolean'||!Array.isArray(value.docIds)||value.docIds.some(id=>typeof id!=='string'||!docs.has(id))||typeof value.weakOnly!=='boolean'||!value.pages||typeof value.pages!=='object'||Object.entries(value.pages).some(([id,pages])=>!docs.has(id)||!Array.isArray(pages)||pages.some(p=>!Number.isInteger(p)||p<1))))throw new Error('Invalid exam focus settings.');
    if(key==='examFocus'){
      for(const field of ['topics','extraTopics']) if(value[field]!==undefined){
        if(!value[field]||typeof value[field]!=='object'||Array.isArray(value[field]))throw new Error('Invalid topic focus settings.');
        for(const [id,terms]of Object.entries(value[field])){
          if(!docs.has(id)||!Array.isArray(terms)||terms.length>120||terms.some(t=>typeof t!=='string'))throw new Error('Invalid topic focus settings.');
          for(const term of terms)checkTopic(docs.get(id),term);
        }
      }
      if(value.topicLabels!==undefined){
        if(!value.topicLabels||typeof value.topicLabels!=='object'||Array.isArray(value.topicLabels))throw new Error('Invalid topic labels.');
        for(const [id,labels]of Object.entries(value.topicLabels)){
          if(!docs.has(id)||!labels||typeof labels!=='object'||Array.isArray(labels))throw new Error('Invalid topic labels.');
          for(const [term,label]of Object.entries(labels)){checkTopic(docs.get(id),term);if(typeof label!=='string'||!label.trim()||label.length>80)throw new Error('Invalid topic label.');}
        }
      }
    }
    if(key==='studyGoal'&&value!==null&&(!value||!['flashcards','quiz'].includes(value.kind)||!Number.isInteger(value.target)||value.target<1||value.target>50||!Number.isFinite(value.startedAt)))throw new Error('Invalid study goal settings.');
    if(key==='modelId'&&typeof value!=='string')throw new Error('Invalid model preference.');
    if(key==='gameSound'&&typeof value!=='boolean')throw new Error('Invalid sound preference.');
    if(key==='voiceReady'&&typeof value!=='boolean')throw new Error('Invalid voice preference.');
    if(key==='speakerPreferences'&&(!value||typeof value!=='object'||!['device','af_heart','af_bella','am_puck','bf_emma'].includes(value.voice)||typeof value.deviceVoice!=='string'||value.deviceVoice.length>=500||typeof value.ready!=='boolean'))throw new Error('Invalid tutor voice preference.');
    if(key.startsWith('studySession:')&&value!==null&&(!docs.has(key.slice(13))||!validStudySession(value,docs.get(key.slice(13)))))throw new Error('Invalid guided study session.');
    if(key.startsWith('reviewer:')&&(!value||typeof value.title!=='string'||typeof value.subject!=='string'||typeof value.overview!=='string'||!docs.has(value.docId)||!Array.isArray(value.cards)||value.cards.some(c=>typeof c.answer!=='string'||typeof c.clue!=='string'||!source(c.source))))throw new Error('Invalid reviewer draft.');
  }
  return {stores:result,settings};
}
