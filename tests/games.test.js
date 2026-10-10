import test from 'node:test';
import assert from 'node:assert/strict';
import { blankEvidence, makeGameCard, buildSourceGameDeck, trailTiles, memoryTiles, wordLetters, gameDeckKey, validateGameClue, trailPoints, gameConcept, usableSavedGameCard } from '../src/game-core.js';
const source={id:'s',docId:'bio',docName:'Biology',page:3,text:'Chlorophyll absorbs light during photosynthesis. The Calvin cycle occurs in the stroma. Mitochondria are organelles that perform respiration. Enzymes are catalysts that accelerate reactions.'};
test('question headings cannot become flashcard answers, including mixed question/answer paragraphs',()=>{
  const text='How are full adders combined? What is a ripple carry adder? A ripple carry adder is a circuit made by chaining full adders. Full adders are circuits that add three binary inputs. Why are carry bits important? Explain how adders are connected.';
  const docs=[{id:'arch',name:'Computer architecture',chunks:[{id:'arch1',page:11,text}]}];
  const cards=buildSourceGameDeck(docs);
  assert.deepEqual(cards.map(c=>c.answer),['ripple carry adder','Full adders']);
  assert.equal(gameConcept('How are full adders combined?'),null);
  assert.equal(gameConcept('What is a ripple carry adder'),null);
  assert.equal(gameConcept('The Calvin cycle occurs in the stroma and produces'),null);
  assert.equal(gameConcept('Full adders are'),null);
  const bad={answer:'How',evidence:'How are full adders combined?',clue:'_____ are full adders combined?',source:{text}};
  assert.throws(()=>makeGameCard(bad.answer,bad.evidence,bad.source));
  assert.equal(usableSavedGameCard(bad,'source'),false);
  assert.ok(cards.every(c=>usableSavedGameCard(c,'source')));
});
test('PDF titles never become answers; definitions choose concepts rather than long adjectives',()=>{
  const text='📚 Comprehensive Java Reviewer Module 1: Java I/O and Data Streams Input reads raw data from a source into a program, while output writes raw data from a program to a destination. A stream is a conceptually endless flow of this data. Byte streams handle binary data. Character streams handle text data.';
  const cards=buildSourceGameDeck([{id:'java',name:'Java reviewer',chunks:[{id:'java1',page:1,text}]}]);
  assert.deepEqual(cards.map(c=>c.answer),['stream','Byte streams','Character streams']);
  assert.ok(cards.every(c=>!c.evidence.includes('Comprehensive')));
});
test('speed points reward faster solves, reduce only the bonus for hints, and never remove base points',()=>{
  assert.equal(trailPoints(0),400);
  assert.equal(trailPoints(10,1),275);
  assert.equal(trailPoints(90,10),100);
  assert.ok(trailPoints(5)>trailPoints(20));
});
test('game clues require exact original evidence and whole-word answers',()=>{
  assert.equal(blankEvidence('The Calvin cycle occurs in the stroma.','Calvin cycle'),'The _____ occurs in the stroma.');
  assert.throws(()=>blankEvidence('A classification system','class'));
  assert.throws(()=>makeGameCard('Chlorophyll','Chlorophyll makes glucose.',source));
  assert.equal(makeGameCard('Chlorophyll','Chlorophyll absorbs light during photosynthesis.',source).source.page,3);
});
test('source decks retain citations, scope and unique answers without AI',()=>{
  const cards=buildSourceGameDeck([{id:'bio',name:'Biology',chunks:[source]}]);
  assert.equal(cards.length,4);
  assert.equal(new Set(cards.map(c=>c.answer.toLowerCase())).size,4);
  assert.ok(cards.every(c=>c.source.docId==='bio'&&source.text.includes(c.evidence)&&c.clue.includes('_____')));
  assert.deepEqual(buildSourceGameDeck([]),[]);
  assert.equal(gameDeckKey([{id:'b'},{id:'a'}]),gameDeckKey([{id:'a'},{id:'b'}]));
});
test('letter tiles preserve repeated letters; memory cards contain one complete pair each',()=>{
  const tiles=trailTiles('Calvin cycle');
  assert.equal(new Set(tiles.map(t=>t.id)).size,tiles.length);
  for(const letter of wordLetters('Calvin cycle')) assert.equal(tiles.filter(t=>t.letter===letter).length,wordLetters('Calvin cycle').filter(c=>c===letter).length);
  const cards=buildSourceGameDeck([{id:'bio',name:'Biology',chunks:[source]}]);
  const memory=memoryTiles(cards);
  assert.equal(memory.length,cards.length*2);
  for(const card of cards) assert.deepEqual(memory.filter(t=>t.pair===card.id).map(t=>t.kind).sort(),['clue','word']);
});
test('AI game clues cannot give away the answer or contain oversized output',()=>{
  const card=makeGameCard('Chlorophyll','Chlorophyll absorbs light during photosynthesis.',source);
  assert.equal(validateGameClue('Which pigment absorbs light?',card),'Which pigment absorbs light?');
  assert.throws(()=>validateGameClue('What does Chlorophyll absorb?',card));
  assert.throws(()=>validateGameClue('x'.repeat(250)+'?',card));
  assert.throws(()=>validateGameClue('? is the missing pigment?',card));
});
