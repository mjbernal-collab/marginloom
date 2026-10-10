import { sourceSentences } from './core.js';

const COMMON = new Set('the this that these those some each both other their there which where when what into from with without through during because while using used uses use takes place occurs occur makes make states state provides provide example method class object process overall main first second third directly require requires supports useful carry form produce produced stored energy information following chapter module input output increasing decreases raises affected involved converting complementary compare remember excessively released released releases resource condition restricts remains another'.split(' '));
export const gameDeckKey = documents => documents.map(d => d.id).sort().join(':');
export const GAME_DECK_VERSION = 3;
const QUESTION_START = /^(?:(?:\d+[.)]|Q\d*[:.)])\s*)?(?:how|why|what|which|when|where|who|whom|whose|can|could|should|would|does|do|did|is|are|describe|explain|discuss|compare|list|define)\b/iu;
const FACT_PATTERN = /^(?:(?:The|A|An)\s+)?([\p{L}\p{N}-]+(?:\s+[\p{L}\p{N}-]+){0,2}?)\s+(is|are|occurs?|takes?|uses?|absorbs?|converts?|donates?|accepts?|states?|supports?|provides?|reads?|writes?|handles?|contains?|represents?|allows?|stores?|releases?|creates?|attaches?|affects?)\s+(.+)$/iu;
export function gameConcept(evidence) {
  const text = String(evidence || '').trim();
  if (text.length > 280 || text.includes('?') || QUESTION_START.test(text) || /\b(?:comprehensive|reviewer|(?:module|chapter|group)\s+\d|table of contents)\b/iu.test(text)) return null;
  const fact = text.match(FACT_PATTERN);
  if (!fact || fact[3].replace(/[.!]$/u, '').trim().length < 4) return null;
  // Reject cut-off clauses and generic subjects, even when the word occurs
  // verbatim in the PDF. Source presence alone does not make a useful answer.
  if (/\b(?:and|or|of|to|with|from|using|by|in|the|a|an|is|are|produces?|uses?|includes?)\s*[.!]?$/iu.test(text)) return null;
  const answer = fact[1];
  const generic = new Set(['how','why','what','which','when','where','who','and','or','but','it','its','they','them','you','we','he','she','equation','comprehensive','reviewer','module','chapter']);
  if (answer.toLowerCase().split(/\s+/).every(word => COMMON.has(word) || generic.has(word))) return null;
  if (/^(?:how|why|what|which|when|where|who|it|they|you|we|this|that|these|those)\b/iu.test(answer)) return null;
  return answer;
}
export function trailPoints(seconds, hints = 0) {
  return 100 + Math.max(0, 300 - Math.floor(Math.max(0, seconds)) * 5 - Math.max(0, hints) * 75);
}
export const wordLetters = answer => [...answer.toLocaleUpperCase()].filter(c => /[\p{L}\p{N}]/u.test(c));
export function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function blankEvidence(evidence, answer) {
  const escaped = answer.trim().split(/\s+/).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'iu');
  if (!pattern.test(evidence)) throw new Error('The game word must be copied from its source.');
  return evidence.replace(pattern, '_____');
}
export function makeGameCard(answer, evidence, source) {
  if (gameConcept(evidence)?.toLowerCase() !== answer.trim().toLowerCase()) throw new Error('Game answers must be concepts from complete factual statements, not question words or headings.');
  const letters = wordLetters(answer);
  if (letters.length < 3 || letters.length > 20 || !/^[\p{L}\p{N}\s-]+$/u.test(answer)) throw new Error('Choose a short word or phrase for this game.');
  if (!source.text.toLowerCase().replace(/\s+/g, ' ').includes(evidence.toLowerCase().replace(/\s+/g, ' '))) throw new Error('Game clues must come from the original source.');
  return { id: crypto.randomUUID(), answer, evidence, clue: blankEvidence(evidence, answer), source };
}
export function validateGameClue(clue, card) {
  makeGameCard(card.answer, card.evidence, card.source);
  const text = String(clue || '').trim();
  if (text.length < 12 || text.length > 240) throw new Error('The game clue must be a short question.');
  if (!text.endsWith('?') || !/^[\p{L}\p{N}]/u.test(text) || (text.match(/\?/g) || []).length !== 1) throw new Error('The game clue must ask one complete question.');
  try { blankEvidence(text, card.answer); } catch { return text; }
  throw new Error('The game clue gives away its answer.');
}
export function usableSavedGameCard(card, kind) {
  try {
    const checked = makeGameCard(card.answer, card.evidence, card.source);
    return kind === 'ai' ? !!validateGameClue(card.clue, checked) : card.clue === checked.clue;
  } catch { return false; }
}
export function buildSourceGameDeck(documents, count = 4, randomize = true) {
  const cards = []; const seen = new Set();
  const passages = documents.flatMap(doc => doc.chunks.map(chunk => ({ ...chunk, docId: doc.id, docName: doc.name })));
  const chunks = randomize ? shuffle(passages) : passages;
  for (const source of chunks) {
    for (const evidence of sourceSentences(source.text)) {
      // PDF headers can be merged into the first sentence. They are labels,
      // not concepts to recall. Avoid guessing an answer from word length.
      const subject = gameConcept(evidence);
      const candidates = [subject].filter(Boolean);
      for (const answer of candidates) {
        if (answer.toLowerCase().split(/\s+/).every(word => COMMON.has(word) || ['and','or','but','it','its','they','them','you','we','he','she','equation','comprehensive','reviewer','module','chapter'].includes(word)) || seen.has(answer.toLowerCase())) continue;
        try {
          const card = makeGameCard(answer, evidence, source);
          cards.push(card); seen.add(answer.toLowerCase()); break;
        } catch { /* Try another exact phrase from this sentence. */ }
      }
      if (cards.length >= count) return cards;
    }
  }
  return cards;
}
export function trailTiles(answer) {
  const letters = wordLetters(answer);
  const extras = shuffle('ABCDEFGHIKLMNOPRSTUVW'.split('')).filter(c => !letters.includes(c)).slice(0, 3);
  return shuffle([...letters, ...extras].map((letter, i) => ({ id: `${i}`, letter })));
}
export function memoryTiles(cards) {
  return shuffle(cards.flatMap(card => [
    { id: `${card.id}:word`, pair: card.id, kind: 'word', text: card.answer },
    { id: `${card.id}:clue`, pair: card.id, kind: 'clue', text: card.clue },
  ]));
}
