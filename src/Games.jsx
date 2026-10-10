import { useEffect, useMemo, useRef, useState } from 'react';
import { Gamepad2, Volume2, VolumeX, ArrowRight, RotateCcw, BookOpen, Check, Shuffle, Sparkles, LoaderCircle, Undo2, X } from 'lucide-react';
import { buildSourceGameDeck, gameDeckKey, memoryTiles, trailTiles, wordLetters, trailPoints, GAME_DECK_VERSION, usableSavedGameCard } from './game-core.js';
import { loadGameDeck, saveGameDeck, getSetting, setSetting, loadStudyData, saveStudyRecord, reviewCard } from './store.js';
import { applyCorrections, conceptId, editedCard, validStudyCard, scheduleReview } from './study-core.js';
import { writeGameClue } from './ai.js';
import { createGameSounds } from './game-sounds.js';
import './games.css';
import './game-improvements.css';

function GameOptions({children,onClose}){
  const ref=useRef();
  useEffect(()=>{const previous=document.activeElement;ref.current.showModal();return()=>previous?.focus();},[]);
  return <dialog ref={ref} className="modal wide game-options" onCancel={e=>{e.preventDefault();onClose();}}><div className="modal-heading"><h2>Customize your set</h2><button className="icon-button" aria-label="Close game options" onClick={onClose}><X size={20}/></button></div>{children}<div className="button-row"><button className="button" onClick={onClose}>Done</button></div></dialog>;
}

function useRoundClock(round, running) {
  const [elapsed, setElapsed] = useState(0);
  const accumulated = useRef(0);
  const start = useRef(null);
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => { const update = () => setVisible(!document.hidden); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  useEffect(() => { accumulated.current = 0; start.current = null; setElapsed(0); }, [round]);
  useEffect(() => {
    if (!running || !visible) return;
    start.current = performance.now();
    const tick = () => setElapsed(accumulated.current + performance.now() - start.current);
    const timer = setInterval(tick, 250);
    return () => { accumulated.current += performance.now() - start.current; start.current = null; clearInterval(timer); setElapsed(accumulated.current); };
  }, [round, running, visible]);
  return { elapsed: elapsed / 1000, read: () => (accumulated.current + (start.current === null ? 0 : performance.now() - start.current)) / 1000 };
}

function WordTrail({ cards, active, sound, onSource }) {
  const [round, setRound] = useState(0);
  const stageRef=useRef();
  const typingRef=useRef();
  useEffect(()=>{if(active)stageRef.current?.focus({preventScroll:true});},[active,round]);
  const [selected, setSelected] = useState([]);
  const [typed, setTyped] = useState('');
  const [tiles, setTiles] = useState(() => trailTiles(cards[0].answer));
  const [result, setResult] = useState('');
  const [feedback, setFeedback] = useState('');
  const [stars, setStars] = useState(0);
  const [points, setPoints] = useState(0);
  const [hints, setHints] = useState(0);
  const clock = useRoundClock(round, active && !result);
  const card = cards[round];
  const tileLetter = id => tiles.find(t => t.id === id)?.letter || id.split(':').at(-1);
  const chosen = selected.map(tileLetter);
  const letters = wordLetters(card.answer);
  const groups = card.answer.toUpperCase().split(/(\s+|-)/).filter(Boolean);
  let slotIndex = 0;
  function formatted(ids) {
    const values = ids.map(tileLetter); let position = 0;
    return groups.map(group => /^(?:\s+|-)$/u.test(group) ? (position < values.length ? group : '') : wordLetters(group).map(() => values[position++] || '').join('')).join('');
  }
  function attempt(ids, text = formatted(ids)) { setSelected(ids); setTyped(text); setFeedback(''); }
  function typeAnswer(text) {
    const used = new Set();
    const ids = wordLetters(text).map((letter,i) => { const tile = tiles.find(t => t.letter === letter && !used.has(t.id)); if (tile) { used.add(tile.id); return tile.id; } return `keyboard:${i}:${letter}`; });
    attempt(ids, text);
    if (ids.length > letters.length) setFeedback(`This answer has ${letters.length} letters. Remove the extra letters to check it.`);
  }
  useEffect(()=>{
    function keyDown(e){
      if(!active||result||e.isComposing||e.ctrlKey||e.altKey||e.metaKey||document.querySelector('dialog[open]'))return;
      const target=e.target;
      if(target?.isContentEditable||target?.closest?.('input,textarea,select')||(target!==document.body&&!stageRef.current?.contains(target)))return;
      if(e.key==='Enter'){e.preventDefault();if(selected.length===letters.length)checkWord();}
      else if(e.key==='Backspace'){e.preventDefault();attempt(selected.slice(0,-1));}
      else if(e.key===' '||e.key==='-'){e.preventDefault();}
      else if(/^[\p{L}\p{N}]$/u.test(e.key)&&selected.length<letters.length){e.preventDefault();typeAnswer(chosen.join('')+e.key);}
    }
    window.addEventListener('keydown',keyDown);return()=>window.removeEventListener('keydown',keyDown);
  },[active,result,selected,tiles,round,hints]);
  const complete = round === cards.length - 1 && !!result;
  function checkWord() {
    if (result) return;
    if (chosen.join('') === letters.join('')) { const earned = trailPoints(clock.read(), hints); setStars(n => n + 1); setPoints(n => n + earned); setResult('won'); setFeedback(`You found it! +${earned} points`); sound(complete || round === cards.length - 1 ? 'finish' : 'win'); }
    else { setFeedback('Not this word yet. Swap a letter or try again.'); sound('miss'); }
  }
  function next() {
    setRound(n => n + 1); setSelected([]); setTyped(''); setResult(''); setHints(0); setFeedback(''); setTiles(trailTiles(cards[round + 1].answer)); sound('tap');
  }
  return <section ref={stageRef} tabIndex={-1} className="game-stage word-trail">
    <div className="game-topline"><span>WORD {round + 1} / {cards.length}</span><span>✦ {stars} {stars === 1 ? 'star' : 'stars'} · {points} points</span></div>
    <div className="trail-map" aria-label="Trail progress">{cards.map((c,i) => <span key={c.id} className={i < round || i === round && result ? 'done' : i === round ? 'current' : ''}>{i + 1}</span>)}</div>
    <h2>Find the missing word.</h2><p className="game-clue">{card.clue}</p><p className="game-instructions">Type or tap letters. Backspace removes a letter; Enter checks. Tap a filled tile to remove it.</p>
    <div className="trail-score"><span>{Math.floor(clock.elapsed)}s active time</span><span>{result ? 'Round finished' : `Solve now: ${trailPoints(clock.elapsed, hints)} points`}</span></div><p className="game-instructions">100 points + a speed bonus. Hints use 75 bonus points. Time pauses when you leave.</p>
    <div className="word-slots" aria-label={`Your word: ${chosen.join('') || 'empty'}, ${letters.length} letters`}>
      {groups.map((group,g) => /^(?:\s+|-)$/u.test(group) ? <span key={g} className={group === '-' ? 'word-hyphen' : 'word-gap'} aria-label={group === '-' ? 'Hyphen' : 'Word break'}>{group === '-' ? '−' : ''}</span> : <div key={g} className="word-group">{wordLetters(group).map(() => { const i = slotIndex++; return <button key={i} className={chosen[i] || result ? 'filled' : ''} disabled={!!result} aria-label={chosen[i] ? `Remove letter ${chosen[i]} at position ${i + 1}` : `Empty position ${i + 1}`} onClick={() => { if(chosen[i])attempt(selected.filter((_,index) => index !== i));else typingRef.current?.focus({preventScroll:true}); sound('tap'); }}>{result ? letters[i] : chosen[i] || '·'}</button>; })}</div>)}
    </div>
    <input ref={typingRef} className="tile-keyboard-input" aria-label="Type Word Trail answer" value={typed} onChange={e=>typeAnswer(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(!result&&selected.length===letters.length)checkWord();}}} disabled={!!result} autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={80}/>

    <div className="letter-bank" aria-label="Letter tiles">{tiles.map(tile => <button key={tile.id} aria-label={`Add letter ${tile.letter}`} disabled={!!result || selected.includes(tile.id) || selected.length >= letters.length} onClick={() => { attempt([...selected, tile.id]); sound('tap'); }}>{tile.letter}</button>)}</div>
    <div className="game-controls"><button className="button secondary" disabled={!!result || !selected.length} onClick={() => { attempt(selected.slice(0,-1)); sound('tap'); }}><Undo2 size={16} />Undo</button><button className="button" disabled={!!result || selected.length !== letters.length} onClick={checkWord}>Check word <Check size={16} /></button><button className="button secondary" disabled={!!result || hints >= letters.length - 1} onClick={() => { setHints(n => n + 1); sound('flip'); }}>Hint (−75 bonus)</button><button className="text-button" disabled={!!result} onClick={() => { setResult('revealed'); setFeedback('Here’s the word. Read the sentence, then keep going. No points for revealing.'); sound('flip'); }}>Show word</button></div>
    {hints > 0 && <p className="trail-hint" role="status">Starts with: <strong>{letters.slice(0, hints).join('')}</strong></p>}
    <div className="game-feedback" role="status">{feedback}</div>
    {result && <div className="game-evidence"><strong>{card.answer}</strong><p>{card.evidence}</p><button className="text-button" onClick={() => onSource(card.source)}><BookOpen size={15} />{card.source.docName} · p. {card.source.page}</button></div>}
    {result && (complete ? <div className="game-finish"><h3>Trail complete!</h3><p>{points} points · {stars} of {cards.length} words found. Every word came from your notes.</p></div> : <button className="button next-game-word" onClick={next}>Next word <ArrowRight size={16} /></button>)}
  </section>;
}

function MemoryMatch({ cards, active, sound, onSource }) {
  const [tiles] = useState(() => memoryTiles(cards));
  const [selected, setSelected] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lastMatch, setLastMatch] = useState(null);
  const [feedback, setFeedback] = useState('Pick a card. Find the word that completes its clue.');
  const timeout = useRef();
  useEffect(() => {
    if (!active) { clearTimeout(timeout.current); setSelected([]); setLocked(false); }
    return () => clearTimeout(timeout.current);
  }, [active]);
  function flip(tile) {
    if (locked || selected.includes(tile.id) || matched.includes(tile.pair)) return;
    sound('flip');
    if (!selected.length) { setSelected([tile.id]); return; }
    const first = tiles.find(t => t.id === selected[0]);
    setSelected([first.id, tile.id]); setMoves(n => n + 1);
    if (first.pair === tile.pair) {
      setMatched(previous => [...previous, tile.pair]); setSelected([]); setLastMatch(cards.find(c => c.id === tile.pair));
      setFeedback(matched.length + 1 === cards.length ? 'All pairs found! Nice work.' : 'A match! Find the next pair.');
      sound(matched.length + 1 === cards.length ? 'finish' : 'win');
    } else {
      setLocked(true); setFeedback('Different pair. Take a look, then try another card.'); sound('miss');
      timeout.current = setTimeout(() => { setSelected([]); setLocked(false); }, 1400);
    }
  }
  return <section className="game-stage memory-match">
    <div className="game-topline"><span>{matched.length} / {cards.length} PAIRS</span><span>{moves} {moves === 1 ? 'turn' : 'turns'}</span></div>
    <h2>A word. A clue. A match.</h2><p className="game-instructions">Pair each word with its matching clue. There’s no clock.</p>
    <div className="memory-board">{tiles.map((tile,i) => {
      const done = matched.includes(tile.pair); const faceUp = done || selected.includes(tile.id);
      return <button key={tile.id} className={`memory-card ${faceUp ? `face-up ${tile.kind}` : ''} ${done ? 'matched' : ''}`} aria-label={faceUp ? `${tile.kind === 'word' ? 'Word' : 'Clue'}: ${tile.text}${done ? ', matched' : ''}` : `Turn card ${i + 1}`} disabled={done || selected.includes(tile.id) || locked} onClick={() => flip(tile)}>
        <span className="memory-inner"><span className="memory-back" aria-hidden={faceUp}><span className="card-mark">m.</span><small>CARD {i + 1}</small></span><span className={`memory-front ${tile.kind}`} aria-hidden={!faceUp}><small>{tile.kind === 'word' ? 'WORD' : 'FROM YOUR NOTES'}{done && <Check size={14} />}</small><span>{tile.text}</span></span></span>
      </button>;
    })}</div>
    <div className="game-feedback" role="status">{feedback}</div>
    {lastMatch && <div className="game-evidence"><strong>{lastMatch.answer}</strong><p>{lastMatch.evidence}</p><button className="text-button" onClick={() => onSource(lastMatch.source)}><BookOpen size={15} />{lastMatch.source.docName} · p. {lastMatch.source.page}</button></div>}
    {matched.length === cards.length && <div className="game-finish"><h3>Notebook cleared!</h3><p>{cards.length} pairs in {moves} turns. Play again to practice recalling them.</p></div>}
  </section>;
}

function Flashcards({ cards, sound, onSource, onReview }) {
  const [queue, setQueue] = useState(() => [...cards]);
  const [revealed, setRevealed] = useState(false);
  const [reviews, setReviews] = useState(0);
  const [saving,setSaving] = useState(false);
  const [nextReview,setNextReview] = useState('');
  const card = queue[0];
  async function rate(rating) { if(saving)return;setSaving(true);try{const scheduled=await onReview(card,rating);setNextReview(`Next review: ${new Date(scheduled.dueAt).toLocaleString()}`);setQueue(q => rating==='again' ? [...q.slice(1), q[0]] : q.slice(1)); setRevealed(false); setReviews(n => n + 1); sound(rating==='again' ? 'flip' : 'win');}catch{/* Parent reports storage errors; keep this card ready to retry. */}finally{setSaving(false);} }
  return <section className="game-stage flashcards-stage"><div className="game-topline"><span>{cards.length - queue.length} / {cards.length} REMEMBERED</span><span>{reviews} reviews</span></div>
    {card ? <><h2>Recall it before you reveal it.</h2><p className="game-instructions">Say the answer to yourself, then turn the card. Difficult cards return sooner; remembered cards get longer intervals.</p><button key={`${card.id}:${reviews}`} disabled={saving} className={`flashcard ${revealed ? 'revealed' : ''}`} aria-label={revealed ? 'Hide flashcard answer' : 'Reveal flashcard answer'} onClick={() => { setRevealed(v => !v); sound('flip'); }}><span className="flashcard-inner"><span className="flashcard-front" aria-hidden={revealed}><small>CLUE</small><span>{card.clue}</span><small>Tap to reveal</small></span><span className="flashcard-back" aria-hidden={!revealed}><small>ANSWER</small><strong>{card.answer}</strong><span>{card.evidence}</span><small>Tap to return to clue</small></span></span></button>{revealed && <><div className="game-controls"><button disabled={saving} className="button secondary" onClick={() => rate('again')}>Study again</button><button disabled={saving} className="button secondary" onClick={() => rate('hard')}>Hard</button><button disabled={saving} className="button" onClick={() => rate('good')}>I remembered it <Check size={16} /></button><button disabled={saving} className="button secondary" onClick={() => rate('easy')}>Easy</button></div><button className="text-button" onClick={() => onSource(card.source)}><BookOpen size={15} />{card.source.docName} · p. {card.source.page}</button></>}</> : <div className="game-finish"><h3>Deck complete!</h3><p>You marked {cards.length} cards remembered across {reviews} reviews. Your review schedule is saved on this device.</p></div>}
    {nextReview&&<p className="game-instructions" role="status">{nextReview}</p>}
  </section>;
}

function CardEditor({card,onSave,onDiscard,onSource}) {
  const [answer,setAnswer]=useState(card.answer),[clue,setClue]=useState(card.clue),[saving,setSaving]=useState(false);
  return <form className="card-editor" onSubmit={async e=>{e.preventDefault();setSaving(true);try{await onSave(card,answer,clue);}finally{setSaving(false);}}}><label>Answer from the passage<input aria-label={`Answer for ${card.answer}`} value={answer} onChange={e=>setAnswer(e.target.value)} maxLength={50}/></label><label>Clue<textarea aria-label={`Clue for ${card.answer}`} value={clue} onChange={e=>setClue(e.target.value)} maxLength={280}/></label><blockquote>{card.evidence}</blockquote><div className="button-row"><button disabled={saving} className="button secondary">Save correction</button><button disabled={saving} type="button" className="text-button" onClick={()=>onDiscard(card)}>Discard this card</button><button type="button" className="text-button" onClick={()=>onSource(card.source)}>Check source · p. {card.source.page}</button></div></form>;
}

export function Games({ active, documents, allDocuments, scopePicker, busy, setBusy, aiReady, onSource, onError, onAddMaterial, onSetup, revision=0, resetKey=0, onActivity=()=>{} }) {
  const [deck, setDeck] = useState(null);
  const [mode, setMode] = useState('');
  const [soundOn, setSoundOn] = useState(false);
  const [progress, setProgress] = useState('');
  const [message, setMessage] = useState('');
  const [playId, setPlayId] = useState(0);
  const [checking, setChecking] = useState(false);
  const [optionsOpen,setOptionsOpen]=useState(false);
  const [preferAI, setPreferAI] = useState(false);
  const [overrides,setOverrides]=useState([]),[reviewRecords,setReviewRecords]=useState([]),[selectedConcepts,setSelectedConcepts]=useState([]),[flashCards,setFlashCards]=useState([]);
  const gameHeading = useRef(null);
  const audio = useRef(null);
  if (!audio.current) audio.current = createGameSounds();
  const key = gameDeckKey(documents);
  const candidates=useMemo(()=>applyCorrections(buildSourceGameDeck(documents,64,false),overrides),[key,overrides]);
  useEffect(()=>{setSelectedConcepts(previous=>{const remaining=previous.filter(id=>candidates.some(c=>conceptId(c)===id));return remaining.length?remaining:candidates.slice(0,4).map(conceptId);});},[candidates]);
  useEffect(()=>{loadStudyData().then(data=>{setOverrides(data.overrides);setReviewRecords(data.reviews);}).catch(e=>onError(e.message));},[key,revision]);
  useEffect(() => {
    let cancelled = false;
    setDeck(null); setMode(''); setMessage(''); setChecking(true);
    loadGameDeck(key).then(saved => {
      if (!cancelled && saved && saved.version === GAME_DECK_VERSION && saved.cards?.length && saved.cards.every(card => documents.some(d => d.id === card.source.docId) && validStudyCard(card, saved.kind))) setDeck(saved);
      else if (!cancelled && saved) setMessage('Clue selection has improved. Build a new set to replace your older clues.');
    }).catch(e => { if (!cancelled) onError(`Could not read saved games: ${e.message}`); }).finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [key,resetKey]);
  useEffect(() => { getSetting('gameSound', true).then(setSoundOn).catch(() => {}); }, []);
  useEffect(() => { if (!active) audio.current.stop(); return () => audio.current.stop(); }, [active]);
  useEffect(() => {
    if (mode) gameHeading.current?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [mode, playId]);
  // Remove a running game immediately if its material is deleted elsewhere.
  const validDeck = deck && deck.id === key && deck.cards.length && deck.cards.every(card => allDocuments.some(d => d.id === card.source.docId));
  const sound = kind => { if (active) audio.current.play(kind, soundOn); };
  async function build() {
    if (busy || checking) return;
    if (!documents.length) { onAddMaterial(); return; }
    if (preferAI && !aiReady) { onSetup(); return; }
    setBusy('games'); onError(''); setMessage(''); setProgress('Opening your passages…');
    try {
      let cards = [];
      const chosen=candidates.filter(card=>selectedConcepts.includes(conceptId(card)));
      if(!chosen.length)throw new Error('Select at least one concept below.');
      if (preferAI) {
        for (const candidate of chosen) {
          setProgress(`Writing game clue ${cards.length + 1} of ${chosen.length}…`);
          try {
            const card = candidate.corrected ? candidate : await writeGameClue(candidate);
            if (!cards.some(c => c.answer.toLowerCase() === card.answer.toLowerCase())) cards.push(card);
          } catch { /* Skip clues that do not meet source and game checks. */ }
        }
      } else cards = chosen;
      if (!cards.length) throw new Error(preferAI ? 'The AI could not make usable game clues. Switch to source passages or try another chapter.' : 'These notes need a few readable sentences with words to practice. Try another section.');
      const next = { id: key, version: GAME_DECK_VERSION, cards, kind: preferAI ? 'ai' : 'source', createdAt: Date.now() };
      await saveGameDeck(next); setDeck(next); setMode('');

      sound('win');
    } catch (e) { onError(e.message); }
    finally { setBusy(''); setProgress(''); }
  }
  function play(value) { if(value==='flashcards')setFlashCards(deck.cards);setMode(value); setPlayId(n => n + 1); sound('flip'); }
  async function correct(card,answer,clue,discarded=false) {
    if(busy)return;
    try{const changed=discarded?null:editedCard(card,answer,clue);const correction={id:conceptId(card),docId:card.source.docId,sourceId:card.source.id,discarded,card:changed,updatedAt:Date.now()};await saveStudyRecord('overrides',correction);const nextOverrides=[...overrides.filter(o=>o.id!==correction.id),correction];setOverrides(nextOverrides);const next={...deck,cards:applyCorrections(deck.cards,nextOverrides)};await saveGameDeck(next);setDeck(next);setMode('');setMessage(discarded?'Card discarded. Future sets will skip it.':'Correction saved. Future sets will keep your wording.');onActivity();}catch(e){onError(e.message);}
  }
  async function rateCard(card,rating) {
    const id=conceptId(card);
    try{const next=await reviewCard(card,rating);setReviewRecords(records=>[...records.filter(r=>r.id!==id),next]);onActivity();return next;}catch(e){onError(e.message);throw e;}
  }
  return <div hidden={!active} className={`games-page ${mode?'is-playing':''}`}>
    <div className="page-heading"><div><span className="desk-label">PLAY ROOM</span><h1>Learn by playing.</h1><p>A different way to work through the same notes. Play, recall, and try again.</p></div><button className="button secondary sound-toggle" aria-pressed={soundOn} onClick={() => { const value = !soundOn; setSoundOn(value); if (!value) audio.current.stop(); else audio.current.play('tap', true); setSetting('gameSound', value).catch(e => onError(e.message)); }}>{soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}Sound {soundOn ? 'on' : 'off'}</button></div>
    <div className="game-builder"><div className="game-material"><span>Play from</span>{scopePicker}</div><button className="button" disabled={!!busy || checking} onClick={build}>{busy === 'games' ? <LoaderCircle size={16} className="spin" /> : preferAI ? <Sparkles size={16} /> : <Shuffle size={16} />}{busy === 'games' ? 'Preparing your game…' : validDeck ? 'Build a new set' : 'Build games from notes'}</button><button className="button secondary" disabled={!!busy} onClick={()=>setOptionsOpen(true)}>Customize set</button></div>

    {progress && <p className="game-generation" role="status">{progress}</p>}{message && <p className="game-generation" role="status">{message}</p>}
    {validDeck && <div className="game-set-info"><BookOpen size={15} /><span>{deck.cards.length} saved clues · {deck.kind === 'ai' ? 'Local AI + checked source passages' : 'Copied source passages'} · Ready to replay offline</span></div>}
    {optionsOpen&&<GameOptions onClose={()=>setOptionsOpen(false)}><label className="game-ai-option"><input type="checkbox" checked={preferAI} disabled={!!busy} onChange={e => setPreferAI(e.target.checked)} />Let local AI write the clues</label>    <p className="game-builder-note">{preferAI ? 'The local tutor writes questions. Answers and supporting passages come from your material.' : 'Source mode lifts sentences directly from your notes. It works offline without loading AI.'}</p>
    <section className="concept-picker"><h3>Choose key concepts · {selectedConcepts.length} selected</h3><p>Choose what to study before building a set. Up to 12 concepts; Memory Match uses the first six pairs.</p><div className="concept-options">{candidates.map(card=><label key={conceptId(card)}><input type="checkbox" checked={selectedConcepts.includes(conceptId(card))} disabled={!!busy||(!selectedConcepts.includes(conceptId(card))&&selectedConcepts.length>=12)} onChange={e=>setSelectedConcepts(ids=>e.target.checked?[...ids,conceptId(card)]:ids.filter(id=>id!==conceptId(card)))}/><span><strong>{card.answer}</strong><small>{card.source.docName} · p. {card.source.page}</small></span></label>)}</div>{!candidates.length&&<p>No complete factual statements found. Try material with definitions or explanations; questions and headings are skipped.</p>}</section>{validDeck&&<><section className="deck-editors"><h3>Review, correct or discard cards</h3><p>Corrections stay saved for future sets. Answers must still come from the original passage.</p>{deck.cards.map(card=><CardEditor key={`${card.id}:${card.answer}:${card.clue}`} card={card} onSave={correct} onDiscard={c=>correct(c,'','',true)} onSource={onSource}/>)}</section></>}</GameOptions>}
    <div className="game-mode-grid">
      <button className={`game-mode-card trail ${mode === 'trail' ? 'selected' : ''}`} disabled={!validDeck || !!busy} onClick={() => play('trail')}><div className="mode-art trail-art" aria-hidden="true"><span>A</span><span>B</span><span>C</span><span>✦</span></div><div><span className="desk-label">WORD TRAIL</span><h2>Build it, letter by letter.</h2><p>Find the missing word in a sentence. Collect a star for each word you solve.</p><strong>{validDeck ? 'Play Word Trail' : 'Build a set to unlock'} <ArrowRight size={16} /></strong></div></button>
      <button className={`game-mode-card match ${mode === 'memory' ? 'selected' : ''}`} disabled={!validDeck || deck.cards.length < 2 || !!busy} onClick={() => play('memory')}><div className="mode-art match-art" aria-hidden="true"><span>m.</span><span>m.</span><span>m.</span></div><div><span className="desk-label">MEMORY MATCH</span><h2>Turn over a new idea.</h2><p>Remember where the cards are, then match each word to its clue.</p><strong>{validDeck && deck.cards.length >= 2 ? 'Play Memory Match' : 'Needs two or more clues'} <ArrowRight size={16} /></strong></div></button>
      <button className={`game-mode-card flash ${mode === 'flashcards' ? 'selected' : ''}`} disabled={!validDeck || !!busy} onClick={() => play('flashcards')}><div className="mode-art match-art" aria-hidden="true"><span>?</span><span>↻</span><span>✓</span></div><div><span className="desk-label">FLASHCARDS</span><h2>Recall. Reveal. Repeat.</h2><p>Turn a clue over, check the source, and revisit the cards you need.</p><strong>{validDeck ? 'Study Flashcards' : 'Build a set to unlock'} <ArrowRight size={16} /></strong></div></button>
    </div>
    {validDeck && mode && <><div ref={gameHeading} className="game-session-heading"><h2>{mode === 'trail' ? 'Word Trail' : mode === 'memory' ? 'Memory Match' : 'Flashcards'}</h2><button className="text-button" disabled={!!busy} onClick={() => play(mode)}><RotateCcw size={16} />Restart {mode === 'flashcards' ? 'deck' : 'game'}</button></div>{mode === 'trail' ? <WordTrail key={`${key}:${playId}`} cards={deck.cards} active={active} sound={sound} onSource={onSource} /> : mode === 'memory' ? <MemoryMatch key={`${key}:${playId}`} cards={deck.cards.slice(0,6)} active={active} sound={sound} onSource={onSource} /> : <Flashcards key={`${key}:${playId}`} cards={flashCards} sound={sound} onSource={onSource} onReview={rateCard} />}</>}
    {!validDeck && !progress && <div className="game-empty"><Gamepad2 size={30} /><h2>{documents.length ? 'Your chapter, turned into a game.' : 'Bring something to play with.'}</h2><p>{documents.length ? 'Build a set above, then choose a game. Saved sets stay on this device.' : 'Add a PDF or some notes first. The games will use that material.'}</p>{!documents.length && <button className="button secondary" onClick={onAddMaterial}>Add study material</button>}</div>}
    <p className="game-footer-note">Game stars and turns are separate from Practice scores. Check the original source whenever you need it.</p>
  </div>;
}
