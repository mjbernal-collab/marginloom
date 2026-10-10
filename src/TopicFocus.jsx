import {useMemo,useState} from 'react';
import {suggestedTopics,checkTopic} from './topics.js';

export function TopicFocus({doc,focus,onChange,onError}) {
  const [term,setTerm]=useState('');
  const selected=focus.topics?.[doc.id]||[];
  const topics=useMemo(()=>suggestedTopics(doc,[...(focus.extraTopics?.[doc.id]||[]),...selected]),[doc,focus.extraTopics,focus.topics]);
  const label=t=>focus.topicLabels?.[doc.id]?.[t]||t;
  function update(next){onChange(next).catch(e=>onError(e.message));}
  function add(e){e.preventDefault();try{const value=checkTopic(doc,term);update({...focus,topics:{...focus.topics,[doc.id]:[...new Set([...selected,value])]},extraTopics:{...focus.extraTopics,[doc.id]:[...new Set([...(focus.extraTopics?.[doc.id]||[]),value])]}});setTerm('');}catch(e){onError(e.message);}}
  return <div className="topic-focus"><p className="muted">Choose topics from the material. Open a topic to check its passages or rename its label. No topics checked means the whole material.</p>
    <div className="topic-list">{topics.map(t=><div className="topic-option" key={t.term}><label className="check-label"><input type="checkbox" aria-label={`Topic ${t.term} in ${doc.name}`} checked={selected.includes(t.term)} onChange={e=>update({...focus,topics:{...focus.topics,[doc.id]:e.target.checked?[...selected,t.term]:selected.filter(term=>term!==t.term)}})}/>{label(t.term)}</label><details><summary>Check passages · {t.passages.length}</summary><label className="field-label">Topic label<input aria-label={`Label for topic ${t.term}`} defaultValue={label(t.term)} maxLength={80} onBlur={e=>{const value=e.target.value.trim()||t.term;update({...focus,topicLabels:{...focus.topicLabels,[doc.id]:{...focus.topicLabels?.[doc.id],[t.term]:value}}});}}/></label><small>Matches the source phrase “{t.term}”. Renaming changes the label only.</small>{t.passages.slice(0,4).map((p,i)=><blockquote key={i}>{p.text}<small>p. {p.page}</small></blockquote>)}{t.passages.length>4&&<small>And {t.passages.length-4} more passages.</small>}</details></div>)}</div>
    {!topics.length&&<p className="muted">No reliable topic suggestions found. Add a phrase from your notes below.</p>}
    <form className="topic-add" onSubmit={add}><label className="field-label">Add a topic from these notes<input aria-label={`Add topic in ${doc.name}`} value={term} maxLength={80} onChange={e=>setTerm(e.target.value)} placeholder="e.g. full adders"/></label><button className="button secondary" disabled={!term.trim()}>Add topic</button></form>
    <details className="page-filter"><summary>Optional page filter</summary><div className="focus-pages">{[...new Set(doc.chunks.map(c=>c.page))].map(page=><label key={page}><input type="checkbox" checked={focus.pages?.[doc.id]?.includes(page)||false} onChange={e=>{const pages=focus.pages?.[doc.id]||[];update({...focus,pages:{...focus.pages,[doc.id]:e.target.checked?[...pages,page]:pages.filter(p=>p!==page)}});}}/>p. {page}</label>)}</div><p className="muted">No pages checked means all pages.</p></details>
  </div>;
}
