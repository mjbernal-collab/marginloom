import { openDB } from 'idb';
import { STUDY_STORES, validateBackup, conceptId, scheduleReview } from './study-core.js';

const database = openDB('offline-study-buddy', 3, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
    db.createObjectStore('documents', { keyPath: 'id' });
    db.createObjectStore('sessions', { keyPath: 'id' });
    db.createObjectStore('mistakes', { keyPath: 'id' });
    db.createObjectStore('settings');
    }
    if (oldVersion < 2) db.createObjectStore('games', { keyPath: 'id' });
    if (oldVersion < 3) for (const name of ['overrides','reviews','events','activities']) db.createObjectStore(name,{keyPath:'id'});
  },
  blocking() { database.then(db => db.close()); },
});
export async function loadLibrary() {
  const db = await database;
  const [documents, sessions, mistakes] = await Promise.all(['documents', 'sessions', 'mistakes'].map(store => db.getAll(store)));
  return { documents: documents.sort((a,b) => b.createdAt - a.createdAt), sessions: sessions.sort((a,b) => b.createdAt - a.createdAt), mistakes };
}
export async function saveDocument(doc) { await (await database).put('documents', doc); }
export async function removeDocument(id) {
  const db = await database;
  const tx = db.transaction(['documents', 'mistakes', 'sessions', 'games','overrides','reviews','events','activities','settings'], 'readwrite');
  await tx.objectStore('documents').delete(id);
  const mistakes = await tx.objectStore('mistakes').getAll();
  for (const m of mistakes) if (m.source.docId === id) await tx.objectStore('mistakes').delete(m.id);
  const sessions = await tx.objectStore('sessions').getAll();
  for (const s of sessions) if (s.questions.some(q => q.source.docId === id)) await tx.objectStore('sessions').delete(s.id);
  const games = await tx.objectStore('games').getAll();
  for (const game of games) if (game.cards.some(card => card.source.docId === id)) await tx.objectStore('games').delete(game.id);
  for (const name of ['overrides','reviews','events']) for (const record of await tx.objectStore(name).getAll()) if(record.docId===id)await tx.objectStore(name).delete(record.id);
  for (const record of await tx.objectStore('activities').getAll()) if(record.docIds?.includes(id))await tx.objectStore('activities').delete(record.id);
  await tx.objectStore('settings').delete(`reviewer:${id}`);
  await tx.objectStore('settings').delete(`studySession:${id}`);
  const focus=await tx.objectStore('settings').get('examFocus');
  if(focus){const topics={...focus.topics},extraTopics={...focus.extraTopics},topicLabels={...focus.topicLabels};delete topics[id];delete extraTopics[id];delete topicLabels[id];const docIds=focus.docIds.filter(value=>value!==id),pages={...focus.pages};delete pages[id];await tx.objectStore('settings').put({...focus,docIds,pages,topics,extraTopics,topicLabels,enabled:focus.enabled&&!!docIds.length},'examFocus');}
  await tx.done;
}
export async function saveSession(session) { await (await database).put('sessions', session); }
export async function saveMistake(question,chosen) {
  const db = await database;
  const existing = await db.get('mistakes', question.id);
  await db.put('mistakes', { ...question, chosen, misses: (existing?.misses || 0) + 1, resolved: false, lastMissed: Date.now() });
}
export async function resolveMistake(id) {
  const db = await database;
  const m = await db.get('mistakes', id);
  if (m) await db.put('mistakes', { ...m, resolved: true });
}
export async function getSetting(key, fallback) { return (await (await database).get('settings', key)) ?? fallback; }
export async function setSetting(key, value) { await (await database).put('settings', value, key); }
export async function loadGameDeck(id) { return (await database).get('games', id); }
export async function saveGameDeck(deck) { await (await database).put('games', deck); }
export async function loadStudyData() { const db=await database;const names=['overrides','reviews','events','activities','games'];return Object.fromEntries(await Promise.all(names.map(async name=>[name,await db.getAll(name)]))); }
export async function loadStudyEvents() { return (await database).getAll('events'); }
export async function saveStudyRecord(name,record) { if(!['overrides','reviews','events','activities'].includes(name))throw new Error('Unknown study record.');await (await database).put(name,record); }
export async function deleteStudyRecord(name,id) { if(!['overrides','reviews','events'].includes(name))throw new Error('Unknown study record.');await (await database).delete(name,id); }
export async function recordActivity(kind,count,docIds,id=crypto.randomUUID()) { await saveStudyRecord('activities',{id,kind,count,docIds,createdAt:Date.now()}); }
export async function reviewCard(card,rating) {const db=await database,tx=db.transaction(['reviews','activities'],'readwrite'),id=conceptId(card);const previous=await tx.objectStore('reviews').get(id);const next={id,docId:card.source.docId,...scheduleReview(previous,rating)};await tx.objectStore('reviews').put(next);await tx.objectStore('activities').put({id:crypto.randomUUID(),kind:'flashcards',count:1,docIds:[card.source.docId],createdAt:Date.now()});await tx.done;return next;}
export async function createBackup() { const db=await database,tx=db.transaction([...STUDY_STORES,'settings']);const stores=Object.fromEntries(await Promise.all(STUDY_STORES.map(async name=>[name,await tx.objectStore(name).getAll()])));const settingsStore=tx.objectStore('settings'),keys=await settingsStore.getAllKeys(),values=await settingsStore.getAll();await tx.done;return {format:'marginloom',version:2,exportedAt:new Date().toISOString(),stores,settings:keys.map((key,i)=>[key,values[i]])}; }
export async function restoreBackup(raw) { const checked=validateBackup(raw),db=await database;const tx=db.transaction([...STUDY_STORES,'settings'],'readwrite'),settings=tx.objectStore('settings');const localVoice=await settings.get('voiceReady'),localSpeaker=await settings.get('speakerPreferences');for(const name of STUDY_STORES)for(const record of checked.stores[name])await tx.objectStore(name).put(record);for(const [key,value]of checked.settings)await settings.put(key==='voiceReady'?!!localVoice:key==='speakerPreferences'?{...value,ready:!!localSpeaker?.ready}:value,key);await tx.done;return checked; }
