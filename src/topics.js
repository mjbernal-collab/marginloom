import { sourceSentences } from './core.js';
import { gameConcept } from './game-core.js';

export function topicMatches(text, term) {
  const escaped = term.trim().split(/\s+/).map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  return !!escaped && new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'iu').test(text);
}
export function checkTopic(doc, term) {
  const text = term.trim().replace(/\s+/g, ' ');
  if (text.length < 3 || text.length > 80 || !doc.chunks.some(c => topicMatches(c.text,text))) throw new Error('Choose a topic phrase that appears in this material (3–80 characters).');
  return text;
}
// A sentence's grammatical subject is not always its topic. References such as
// "All values here" describe the page, while the predicate names the concept.
const VAGUE_TOPIC = /^(?:all|some|these|those|this|that|each|both|other|the following|it|they|we|you)\b|\b(?:here|below|above)\b/iu;
const TOPIC_VERB = /\b(?:is|are|was|were|uses?|contains?|represents?|allows?|stores?|handles?|reads?|writes?)\b/iu;
export function sentenceTopics(sentence) {
  const subject = gameConcept(sentence);
  if (subject && !VAGUE_TOPIC.test(subject)) return [subject];
  if (!VAGUE_TOPIC.test(sentence) || sentence.includes('?')) return [];
  const predicate = sentence.match(/\b(?:is|are)\s+(?:(?:expressed|represented|written|stored)\s+(?:as|in)\s+)?([\p{L}\p{N}-]+(?:\s+[\p{L}\p{N}-]+){0,3})[.!]?$/iu)?.[1];
  if (!predicate || VAGUE_TOPIC.test(predicate) || TOPIC_VERB.test(predicate) || /^(?:a|an|the|not|very|important|different|same|shown|given)\b/iu.test(predicate)) return [];
  return [predicate];
}
export function suggestedTopics(doc, extra = []) {
  const terms = new Map();
  function add(term) {
    if (!term) return;
    try { const checked=checkTopic(doc,term);terms.set(checked.toLowerCase(),checked); } catch { /* Ignore incomplete labels. */ }
  }
  for (const chunk of doc.chunks) {
    for (const sentence of sourceSentences(chunk.text)) sentenceTopics(sentence).forEach(add);
    // Short standalone headings supplement factual subjects; they remain suggestions.
    for (const line of chunk.text.split('\n')) {
      const title=line.trim().replace(/^(?:\d+[.)]|(?:chapter|module)\s+\d+[:.-]?)\s*/i,'');
      if (title.length>=4 && title.length<=60 && title.split(/\s+/).length<=6 && !/[?.;=]/.test(title) && !VAGUE_TOPIC.test(title) && !TOPIC_VERB.test(title) && !/\b(?:reviewer|comprehensive|contents|page|quiz|exam|study guide)\b/i.test(title) && !/^(?:how|what|why|explain|describe|define)\b/i.test(title) && !/[.!:]$/.test(title)) add(title);
    }
  }
  extra.forEach(add);
  return [...terms.values()].sort((a,b)=>a.localeCompare(b)).slice(0,120).map(term=>({term,passages:doc.chunks.flatMap(chunk=>sourceSentences(chunk.text).filter(text=>topicMatches(text,term)).map(text=>({text,page:chunk.page,id:chunk.id})))}));
}
export function quizEvidenceIndex(source) {
  const sentences=sourceSentences(source.text);
  const eligible=sentences.map((text,index)=>({text,index})).filter(s=>!source.focusEvidence || source.focusEvidence.includes(s.text));
  if (!eligible.length) throw new Error('No complete sentences match the selected topics in this passage.');
  return (eligible.find(s=>gameConcept(s.text)) || eligible.find(s=>s.text.length>45&&s.text.length<280) || eligible[0]).index;
}
