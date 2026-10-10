import { sourceSentences, terms } from './core.js';
import { gameConcept, blankEvidence } from './game-core.js';
import { topicMatches } from './topics.js';
const daysUntil=(value,today)=>{const date=new Date(),key=today||`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;return Math.round((Date.parse(`${value}T12:00:00`)-Date.parse(`${key}T12:00:00`))/86400000);};

// Expressions are parsed, never executed as JavaScript. Only x and arithmetic
// are supported; unsupported formulas remain readable source material.
export function calculate(expression, x) {
  if (typeof expression !== 'string' || expression.length > 100 || !Number.isFinite(x)) throw new Error('Unsupported expression.');
  const normalized=expression.replace(/\s/g,'').replace(/(\d|\))(?=x|\()/g,'$1*').replace(/x(?=\()/g,'x*');
  const tokens = normalized.match(/(?:\d+(?:\.\d+)?|\.\d+)|x|[()+*/^\-]/g) || [];
  if (tokens.join('') !== normalized || tokens.length > 70) throw new Error('Use numbers, x, parentheses and arithmetic only.');
  let i = 0;
  function atom() {
    const t = tokens[i++];
    if (t === '(') { const n = sum(); if (tokens[i++] !== ')') throw new Error('Unbalanced expression.'); return n; }
    if (t === 'x') return x;
    if (!t || !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(t)) throw new Error('Unsupported expression.');
    return Number(t);
  }
  function power() { const n = atom(); if (tokens[i] !== '^') return n; i++; const exponent = unary(); if (Math.abs(exponent) > 12) throw new Error('Exponent too large.'); return n ** exponent; }
  function unary() { if (tokens[i] === '-') { i++; return -unary(); } if (tokens[i] === '+') { i++; return unary(); } return power(); }
  function product() { let n = unary(); while (['*','/'].includes(tokens[i])) { const op=tokens[i++], right=unary(); n = op === '*' ? n*right : n/right; } return n; }
  function sum() { let n=product(); while (['+','-'].includes(tokens[i])) { const op=tokens[i++],right=product(); n=op==='+'?n+right:n-right; } return n; }
  const result = sum();
  if (i !== tokens.length || !Number.isFinite(result) || Math.abs(result) > 1e8) throw new Error('The result is outside the supported range.');
  return result;
}

export function learningRequest(text) {
  const value=String(text).trim();
  if (/^(?:how|why|what|where|when)\b/i.test(value)) return null;
  const time=value.match(/\b(?:have|got|study for|spend|start)\s+(\d{1,3})\s*(?:minutes?|mins?)\b/i);
  if(time)return {mode:'session',minutes:Math.max(5,Math.min(45,Number(time[1])))};
  if(/\b(?:teach (?:it|this) back|teach.?back|let me explain|listen to my explanation)\b/i.test(value))return {mode:'teach'};
  if(/\b(?:explore (?:this|the|my) lesson|interactive lesson|build (?:a |an )?lesson|demonstrate (?:this|the) lesson)\b/i.test(value))return {mode:'explore'};
  return null;
}

export function lessonSources(doc, topic='', mistakes=[]) {
  const weak=new Set(mistakes.filter(m=>!m.resolved&&m.source.docId===doc.id).map(m=>m.source.id));
  return doc.chunks.map(chunk=>({...chunk,docId:doc.id,docName:doc.name}))
    .filter(s=>!topic.trim()||topicMatches(s.text,topic.trim()))
    .sort((a,b)=>Number(weak.has(b.id))-Number(weak.has(a.id))||a.page-b.page).slice(0,4);
}

export function lessonElements(sources) {
  const blocks=[];
  for(const source of sources){
    blocks.push({id:`read:${source.id}`,kind:'read',source,text:source.text});
    blocks.push({id:`annotate:${source.id}`,kind:'annotate',source,text:source.text});
    const pairs=sourceSentences(source.text).flatMap(text=>{
      const answer=gameConcept(text);
      return answer?[{answer,text,clue:blankEvidence(text,answer)}]:[];
    }).slice(0,4);
    if(pairs.length)blocks.push({id:`connect:${source.id}`,kind:'connect',source,pairs});
    const numbered=[...source.text.matchAll(/(?:^|\s)(\d+)[.)]\s+(.+?)(?=\s+\d+[.)]\s+|$)/g)];
    if(numbered.length>=3&&numbered.length<=7&&numbered.every((m,i)=>Number(m[1])===i+1&&m[2].length>=8))
      blocks.push({id:`sequence:${source.id}`,kind:'sequence',source,items:numbered.map(m=>m[2].trim())});
    // Accept only an explicit y = expression in a source sentence. Never infer
    // a medical model, missing coefficients, units, or relationships from prose.
    for(const match of source.text.matchAll(/\by\s*=\s*([x\d\s()+*/^.-]+)(?=[,;.!?]|$)/g)){
      const expression=match[1].trim().replace(/[.]$/,'');
      if(!expression.includes('x'))continue;
      try{calculate(expression,1);blocks.push({id:`graph:${source.id}:${blocks.length}`,kind:'graph',source,expression});}catch{}
    }
  }
  return blocks;
}
export function composeLesson(selection,elements){
  if(!selection||!Array.isArray(selection.blocks)||selection.blocks.length<2||selection.blocks.length>6||new Set(selection.blocks).size!==selection.blocks.length)throw new Error('The lesson needs 2–6 distinct elements.');
  const blocks=selection.blocks.map(id=>elements.find(b=>b.id===id));
  if(blocks.some(b=>!b)||!blocks.some(b=>b.kind!=='read'))throw new Error('The lesson referenced an unsupported activity.');
  return blocks;
}
export function defaultComposition(elements){
  const first=elements.find(b=>b.kind==='read');
  const interactive=['graph','sequence','connect'].flatMap(kind=>elements.filter(b=>b.kind===kind).slice(0,1)).slice(0,3);
  const annotate=elements.find(b=>b.kind==='annotate');
  return [...(first?[first]:[]),...interactive,...(annotate?[annotate]:[])].slice(0,5);
}
export function planStudySession(doc,minutes,mistakes=[],events=[],now){
  const budget=Math.max(5,Math.min(45,Math.round(minutes)));
  if(!Number.isFinite(budget))throw new Error('Choose a session length.');
  const sources=lessonSources(doc,'',mistakes);
  if(!sources.length)throw new Error('Add readable material before starting a session.');
  const upcoming=events.filter(e=>e.docId===doc.id&&daysUntil(e.date,now)>=0).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const weak=mistakes.filter(m=>!m.resolved&&m.source.docId===doc.id).length;
  return {docId:doc.id,minutes:budget,phase:0,elapsed:0,createdAt:Date.now(),completed:false,
    sourceIds:sources.map(s=>s.id),exam:upcoming?{title:upcoming.title,date:upcoming.date}:null,weak,
    steps:[{kind:'read',label:'Understand',seconds:Math.round(budget*60*.3)},{kind:'recall',label:'Recall',seconds:Math.round(budget*60*.3)},{kind:'teach',label:'Explain it',seconds:Math.round(budget*60*.3)},{kind:'recap',label:'Wrap up',seconds:budget*60-Math.round(budget*60*.3)*3}]};
}
export function validStudySession(value,doc){
  return !!value&&value.docId===doc.id&&Number.isInteger(value.minutes)&&value.minutes>=5&&value.minutes<=45&&Number.isInteger(value.phase)&&value.phase>=0&&value.phase<=3&&Number.isFinite(value.elapsed)&&value.elapsed>=0&&value.elapsed<=value.minutes*60&&Array.isArray(value.sourceIds)&&value.sourceIds.length>0&&value.sourceIds.length<=4&&value.sourceIds.every(id=>doc.chunks.some(s=>s.id===id))&&typeof value.completed==='boolean'&&(!value.completed||value.phase===3)&&Array.isArray(value.steps)&&value.steps.length===4&&value.steps.reduce((n,s)=>n+s.seconds,0)===value.minutes*60&&value.steps.every((s,i)=>s.kind===['read','recall','teach','recap'][i]&&typeof s.label==='string'&&s.label.length<=60&&Number.isInteger(s.seconds)&&s.seconds>0)&&(value.takeaway===undefined||typeof value.takeaway==='string'&&value.takeaway.length<=800)&&(value.exam===null||typeof value.exam?.title==='string'&&typeof value.exam?.date==='string')&&Number.isInteger(value.weak)&&value.weak>=0;
}
export function teachCoverage(explanation,sources){
  const spoken=new Set(terms(explanation));
  const concepts=sources.flatMap(s=>sourceSentences(s.text).map(text=>({text,answer:gameConcept(text),source:s}))).filter(c=>c.answer).slice(0,8);
  return concepts.map(c=>({...c,mentioned:terms(c.answer).every(t=>spoken.has(t))}));
}
