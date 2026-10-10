import {QuizReminders} from './QuizReminders.jsx';
import { Component, lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { subjectGroups, scopedDocuments, documentScope } from './subjects.js';
import { useAppearance } from './theme.js';
import { registerSW } from 'virtual:pwa-register';
import { BookOpen, LayoutDashboard, Sparkles, ArrowUp, ArrowRight, Plus, FileText, Search, Upload, ChevronRight, X, Settings, ShieldCheck, Wifi, WifiOff, CircleCheck, CircleAlert, LoaderCircle, RotateCcw, GraduationCap, Trash2, Download, Leaf, Zap, Check, Target, HardDrive, Laptop, Smartphone, Square, ExternalLink, Moon, Sun, Monitor, Mic, Pencil } from 'lucide-react';
import { loadLibrary, saveDocument, removeDocument, saveSession, saveMistake, resolveMistake, getSetting, setSetting, recordActivity } from './store.js';
import { importFile, createDocument, samplePages } from './ingest.js';
import { retrieve, citationIds, selectQuizSources, buildQuizSet, EMBEDDING_VERSION } from './core.js';
import * as ai from './ai.js';
import { Gamepad2 } from 'lucide-react';
import { Games } from './Games.jsx';
import { StudyTools, BackupControls, MistakeHelp, PracticeFocus, ReviewerWorkspace } from './StudyTools.jsx';
import { reviewerRequest } from './actions.js';
import { learningRequest } from './learning-core.js';
import { focusDocuments, inferSubject } from './study-core.js';
const LearningWorkspace=lazy(()=>import('./LearningWorkspace.jsx'));
class LearningBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="alert error" role="alert"><span>Learning tools could not open. Reload the app while connected to finish caching this update. Your saved material is available.</span><button className="button secondary" onClick={this.props.onClose}>Dismiss</button></div>:this.props.children;}
}

const NAV = [{ id: 'study', label: 'Study desk', icon: LayoutDashboard }, { id: 'practice', label: 'Practice', icon: GraduationCap }, { id: 'games', label: 'Games', icon: Gamepad2 }, { id: 'review', label: 'Mistake review', icon: RotateCcw }];
const formatBytes = value => value ? `${(value / 1024 / 1024).toFixed(0)} MB` : 'Checking…';
const shortDate = value => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function Button({ children, icon: Icon, className = '', ...props }) {
  return <button className={`button ${className}`} {...props}>{Icon && <Icon size={17} />} {children}</button>;
}
function Empty({ icon: Icon = BookOpen, title, children, action }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={28} /></div><h3>{title}</h3><p>{children}</p>{action}</div>;
}
function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(), headingId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    ref.current.querySelector('button, input, textarea, select')?.focus();
    return () => previous?.focus();
  }, []);
  return <dialog ref={ref} aria-labelledby={headingId} className={`modal ${wide ? 'wide' : ''}`} onCancel={e => { e.preventDefault(); onClose(); }}><div className="modal-heading"><h2 id={headingId}>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}</dialog>;
}
function Sources({ sources, onOpen }) {
  return <div className="source-chips">{sources.map((s,i) => <button key={s.id} className="source-chip" onClick={() => onOpen(s)}><span>{i+1}</span><FileText size={13} /><span className="source-name">{s.docName}</span><small>p. {s.page}</small><ChevronRight size={13} /></button>)}</div>;
}

export function App() {
  const {appearance, setAppearance, dark}=useAppearance();
  const [tab, setTab] = useState('study');
  const [studyRevision,setStudyRevision]=useState(0);
  const [restoreRevision,setRestoreRevision]=useState(0);
  const [examFocus,setExamFocus]=useState({enabled:false,docIds:[],pages:{},weakOnly:false});
  const [mistakeHelp,setMistakeHelp]=useState(null);
  const [reviewer,setReviewer]=useState(null);
  const [learning,setLearning]=useState(null);
  function openLearning(mode='',minutes=15,docId=activeDocuments.length===1?activeDocuments[0].id:''){setLearning({mode,minutes,docId,documents:docId?documents.filter(d=>d.id===docId):activeDocuments});}
  const [focusOpen,setFocusOpen]=useState(false);
  const [pendingFiles,setPendingFiles]=useState([]);
  const studyChanged=()=>setStudyRevision(n=>n+1);
  useEffect(()=>{getSetting('examFocus',{enabled:false,docIds:[],pages:{},weakOnly:false}).then(setExamFocus).catch(e=>setError(e.message));},[]);
  async function afterRestore(){await refresh();setExamFocus(await getSetting('examFocus',{enabled:false,docIds:[],pages:{},weakOnly:false}));setMessages([]);setQuiz(null);setRestoreRevision(n=>n+1);studyChanged();}
  const [documents, setDocuments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [mistakes, setMistakes] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const desktopInstalled = !!window.marginloomDesktop?.installed;
  const [shellReady, setShellReady] = useState(desktopInstalled);
  const [updateReady, setUpdateReady] = useState(false);
  const updateApp = useRef();
  const [installEvent, setInstallEvent] = useState(null);
  const [modelId, setModelId] = useState('Qwen2.5-1.5B-Instruct-q4f16_1-MLC');
  const [models, setModels] = useState([]);
  const [llmReady, setLlmReady] = useState(false);
  const [embedReady, setEmbedReady] = useState(false);
  const [modelCached, setModelCached] = useState(false);
  const [needsRepair, setNeedsRepair] = useState(false);
  const setupLock = useRef(false);
  const [setupProgress, setSetupProgress] = useState(0);
  const [storage, setStorage] = useState(null);
  const [persistent, setPersistent] = useState(false);
  const [gpu, setGpu] = useState(null);
  const [scope, setScope] = useState('all');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [source, setSource] = useState(null);
  const [importModal, setImportModal] = useState(false);
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedSubject,setPastedSubject]=useState('');
  const [editingMaterial,setEditingMaterial]=useState(null);
  const [pastedText, setPastedText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [quizCount, setQuizCount] = useState(5);
  const [quizCoverage,setQuizCoverage]=useState('breadth');
  const [quizProgress,setQuizProgress]=useState(0);
  const [quizStopping,setQuizStopping]=useState(false);
  const stopQuiz=useRef(false);
  const [quiz, setQuiz] = useState(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [choices, setChoices] = useState({});
  const [quizSaved, setQuizSaved] = useState(false);
  const [lastMetric, setLastMetric] = useState(null);
  const fileInput = useRef();
  const chatBottom = useRef();
  const groups=subjectGroups(documents);
  const activeDocuments=scopedDocuments(documents,scope);
  const selectedSubject=groups.find(g=>g.id===scope);
  const activeMistakes = mistakes.filter(m => !m.resolved);
  const attempted = sessions.reduce((sum,s) => sum + s.questions.length, 0);
  const correct = sessions.reduce((sum,s) => sum + s.correct, 0);

  async function refresh() {
    const library = await loadLibrary();
    setDocuments(library.documents); setSessions(library.sessions); setMistakes(library.mistakes);
    return library;
  }
  async function refreshStorage() {
    if (navigator.storage?.estimate) setStorage(await navigator.storage.estimate());
    if (navigator.storage?.persisted) setPersistent(await navigator.storage.persisted());
  }
  useEffect(() => {
    (async () => {
      try {
        const library = await refresh();
        const saved = await getSetting('modelId', 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC');
        setModelId(saved);
        const supported = await ai.listModels();
        setModels(supported);
        const selected = supported.some(m => m.id === saved) ? saved : supported[0]?.id;
        if (selected) setModelId(selected);
        setGpu(!!(navigator.gpu && await navigator.gpu.requestAdapter()));
        await refreshStorage();
        const cached = selected && await ai.isModelCached(selected);
        setModelCached(!!cached);
        setInitialized(true);
        if (cached) await setupAI({ restore: true, automatic: true, targetId: selected, library: library.documents });
      } catch (e) { setError(`Could not initialize local storage: ${e.message}`); }
      finally { setInitialized(true); }
    })();
    const connectivity = () => setOnline(navigator.onLine);
    const install = e => { e.preventDefault(); setInstallEvent(e); };
    window.addEventListener('online', connectivity); window.addEventListener('offline', connectivity); window.addEventListener('beforeinstallprompt', install);
    if (!desktopInstalled) updateApp.current = registerSW({ onOfflineReady: () => setShellReady(true), onNeedRefresh: () => setUpdateReady(true), onRegisteredSW: async (_url, registration) => { if (registration?.active) setShellReady(true); }, onRegisterError: e => setError(`Offline app caching failed: ${e.message}`) });
    return () => { window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); window.removeEventListener('beforeinstallprompt', install); };
  }, []);
  useEffect(() => { if (scope !== 'all' && !scopedDocuments(documents,scope).length) setScope('all'); }, [documents, scope]);
  useEffect(() => { chatBottom.current?.scrollIntoView({ behavior: busy === 'answer' ? 'instant' : 'smooth', block: 'nearest' }); }, [messages]);
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(timeout); }, [notice]);

  async function storeNewDocument(doc) {
    if (embedReady) {
      setStatus(`Indexing ${doc.name}…`);
      try { doc.chunks = await ai.indexChunks(doc.chunks); }
      catch { setEmbedReady(false); setError('Semantic indexing failed. Your material is saved and source search is available. Reload local AI to retry.'); }
    }
    await saveDocument(doc); await refresh(); setScope(documentScope(doc)); setNotice(`${doc.name} added to your library.`);
  }
  function closeImport(){if(busy)return;setImportModal(false);setPendingFiles([]);setPastedTitle('');setPastedSubject('');setPastedText('');}
  function addFiles(files) {
    if(busy||!files?.length)return;
    const entries=Array.from(files).map(file=>({id:crypto.randomUUID(),file,name:file.name,subject:inferSubject(file.name)}));
    setError('');setPendingFiles(previous=>[...previous,...entries]);setImportModal(true);
    if(fileInput.current)fileInput.current.value='';
  }
  async function confirmFiles(e){
    e.preventDefault();if(busy||!pendingFiles.length)return;
    setBusy('import');setError('');
    try{
      for(const entry of pendingFiles){
        if(!entry.name.trim()||entry.name.trim().length>120||entry.subject.trim().length>80)throw new Error('Give each material a name (up to 120 characters) and an optional subject (up to 80).');
        setStatus(`Reading ${entry.file.name}…`);
        const doc=await importFile(entry.file,setStatus);
        await storeNewDocument({...doc,name:entry.name.trim(),originalName:entry.file.name,subject:entry.subject.trim(),subjectConfirmed:!!entry.subject.trim()});
        setPendingFiles(current=>current.filter(item=>item.id!==entry.id));
      }
      setImportModal(false);setPastedTitle('');setPastedText('');studyChanged();
    }catch(e){setError(e.message);}finally{setBusy('');setStatus('');}
  }
  function openReviewer(docId=activeDocuments.length===1?activeDocuments[0].id:''){setReviewer({docId,autoPrepare:!!docId,documents:docId?documents.filter(d=>d.id===docId):activeDocuments});}
  async function addPaste(e) {
    e.preventDefault(); if (busy) return;
    setError(''); setBusy('import');
    try {
      await storeNewDocument({...createDocument(pastedTitle.trim() || 'My study notes', [{ page: 1, text: pastedText }]),subject:pastedSubject.trim(),subjectConfirmed:!!pastedSubject.trim()});
      setImportModal(false); setPastedTitle(''); setPastedText('');
    } catch (e) { setError(e.message); }
    finally { setBusy(''); setStatus(''); }
  }
  async function addSample() {
    if (busy) return;
    const existing = documents.find(d => d.sample);
    if (existing) { setScope(documentScope(existing)); setNotice('Sample chapter selected.'); return; }
    setBusy('import'); setError('');
    try { await storeNewDocument({ ...createDocument('Photosynthesis · sample chapter', samplePages), sample: true, subject:'Biology', subjectConfirmed:true }); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); setStatus(''); }
  }
  async function setupAI({ restore = modelCached && !needsRepair, automatic = false, targetId = modelId, library = documents } = {}) {
    if (setupLock.current || (busy && busy !== 'quiz')) return false;
    if (!restore && !navigator.onLine) {
      setError('This AI model is not fully saved on this device. Connect to the internet once to finish setup.');
      return false;
    }
    setupLock.current = true;
    if (!automatic) setTab('settings');
    setBusy('setup'); setError(''); setLlmReady(false); setSetupProgress(0);
    ai.setEmbeddingProgress(event => {
      if (event.type === 'indexProgress') setStatus(`Indexing passages ${event.done}/${event.total}…`);
      else setStatus(restore ? 'Opening saved search model…' : `Preparing local search${event.progress.file ? ` · ${event.progress.file}` : ''}…`);
    });
    try {
      setStatus(restore ? 'Opening saved search model…' : 'Preparing local semantic search…');
      await ai.loadEmbedder(restore); setEmbedReady(true);
      for (const doc of library) {
        if (doc.chunks.every(c => c.embeddingVersion === EMBEDDING_VERSION && c.vector)) continue;
        setStatus(`Indexing ${doc.name}…`);
        await saveDocument({ ...doc, chunks: await ai.indexChunks(doc.chunks) });
      }
      await refresh(); setSetupProgress(0.15); setStatus('Loading your local tutor…');
      await ai.loadLanguageModel(targetId, progress => { setSetupProgress(0.15 + progress.progress * 0.85); setStatus(restore ? 'Loading saved AI into memory — no download…' : progress.text); }, restore);
      setLlmReady(true); setModelCached(true); setNeedsRepair(false); setSetupProgress(1); await setSetting('modelId', targetId);
      await refreshStorage(); if (!automatic) setNotice('Local AI is ready.');
      return true;
    } catch (e) {
      setNeedsRepair(restore);
      setError(restore ? `Could not open saved AI. Your notes and saved quizzes are available. Reconnect to repair setup if files are missing. ${e.message}` : `Local AI setup: ${e.message}`);
      return false;
    }
    finally { setupLock.current = false; setBusy(''); setStatus(''); ai.setEmbeddingProgress(null); }
  }
  async function changeModel(value) {
    if (busy) return;
    setBusy('model');
    try { await ai.unloadLanguageModel(); setLlmReady(false); setModelId(value); setNeedsRepair(false); setModelCached(await ai.isModelCached(value)); await setSetting('modelId', value); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }
  async function ask(e, suggested) {
    e?.preventDefault(); const text = (suggested || question).trim();
    if (!text || busy) return;
    if (!activeDocuments.length) { setImportModal(true); return; }
    const learningAction=learningRequest(text);
    if(learningAction){
      const named=documents.filter(d=>text.toLowerCase().includes(d.name.toLowerCase())||(d.subject&&text.toLowerCase().includes(d.subject.toLowerCase())));
      setQuestion('');openLearning(learningAction.mode,learningAction.minutes||15,named.length===1?named[0].id:activeDocuments.length===1?activeDocuments[0].id:'');return;
    }
    if(reviewerRequest(text)){
      const named=documents.filter(d=>text.toLowerCase().includes(d.name.toLowerCase())||(d.subject&&text.toLowerCase().includes(d.subject.toLowerCase())));
      const docId=named.length===1?named[0].id:activeDocuments.length===1?activeDocuments[0].id:'';
      setQuestion('');setMessages(previous=>[...previous,{id:crypto.randomUUID(),question:text,answer:docId?'Your reviewer is ready to prepare and edit. It includes source passages you can check and export.':'Choose the material for your reviewer in the window. You can edit the draft and save it as a PDF.',sources:[],mode:'action',reviewerDocId:docId}]);openReviewer(docId);return;
    }
    const id = crypto.randomUUID(); setQuestion(''); setBusy('answer'); setError('');
    setMessages(previous => [...previous, { id, question: text, answer: '', sources: [], loading: true }]);
    const update = patch => setMessages(previous => previous.map(m => m.id === id ? { ...m, ...patch } : m));
    try {
      let vector = null;
      if (embedReady) {
        try { vector = await ai.embedQuestion(text); }
        catch { setEmbedReady(false); setNotice('Semantic search stopped. Using keyword source search; reload local AI to retry.'); }
      }
      const sources = retrieve(text, activeDocuments, vector, llmReady ? 3 : 4);
      update({ sources, mode: llmReady ? 'ai' : 'search' });
      if (!sources.length) update({ answer: 'I could not find a relevant passage in these notes. Try naming a concept from your chapter, or choose another document.', loading: false });
      else if (!llmReady) update({ answer: 'Here are matching passages from your notes. Open a source to read it. Set up local AI for an explanation or a new quiz.', loading: false });
      else {
        const result = await ai.answerQuestion(text, sources, answer => update({ answer }));
        const validIds = citationIds(result.answer, sources.length);
        const invalid = [...result.answer.matchAll(/\[(\d+)\]/g)].some(m => !validIds.includes(Number(m[1])));
        update({ ...result, loading: false, citationWarning: invalid || (!validIds.length && !result.answer.includes('could not find')) });
        setLastMetric(result);
      }
    } catch (e) { update({ loading: false, failed: true, answer: `Could not complete this question: ${e.message}` }); }
    finally { setBusy(''); }
  }
  function startQuiz(questions, review = false) {
    setQuiz({ id: crypto.randomUUID(), questions, review, createdAt: Date.now() });
    setQuizIndex(0); setChoices({}); setQuizSaved(false); setTab('practice');
  }
  async function makeQuiz() {
    if (busy) return;
    if (!llmReady) {
      if (modelCached && !needsRepair) {
        const ready = await setupAI({ restore: true, automatic: true });
        if (!ready) return;
      } else { setTab('settings'); setNotice('Finish AI setup to generate new questions. Saved sessions are available below.'); return; }
    }
    if (!activeDocuments.length) { setImportModal(true); return; }
    setBusy('quiz'); setError(''); setNotice(''); stopQuiz.current=false; setQuizStopping(false); setQuizProgress(0);
    try {
      const focused = focusDocuments(activeDocuments,examFocus,activeMistakes);
      if(!focused.length)throw new Error('Your exam focus has no matching passages. Choose materials/topics/pages in Practice, or disable weak-topic focus.');
      const sources = selectQuizSources(focused, quizCount * 2, activeMistakes, quizCoverage==='weak');
      const {questions:generated,skipped,lastFailure}=await buildQuizSet(sources,quizCount,ai.generateQuestion,{
        shouldStop:()=>stopQuiz.current,
        onProgress:setQuizProgress,
        onAttempt:index=>setStatus(`Writing question ${index} of ${quizCount}…`),
      });
      if(!generated.length && stopQuiz.current){setNotice('Generation stopped. No completed questions yet.');return;}
      if (!generated.length) throw new Error(`The model could not create a valid question. ${lastFailure || 'Try another document or the Balanced model.'}`);
      startQuiz(generated);
      if (generated.length < quizCount || skipped || stopQuiz.current) setNotice(`${generated.length} ${generated.length === 1 ? 'question' : 'questions'} ready.${stopQuiz.current ? ' Generation stopped at your request.' : generated.length < quizCount ? ' Fewer usable questions were available than requested.' : ''}${skipped ? ` ${skipped} failed or duplicate attempts were skipped.` : ''}`);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); setStatus(''); }
  }
  async function chooseAnswer(index) {
    const current = quiz.questions[quizIndex];
    if (Object.hasOwn(choices, current.id) || busy) return;
    setBusy('save'); setError('');
    try {
      if (index === current.answer) await resolveMistake(current.id);
      else await saveMistake(current,index);
      setChoices(previous => ({ ...previous, [current.id]: index }));
      await refresh();
    } catch (e) { setError(`Could not save your answer: ${e.message}`); }
    finally { setBusy(''); }
  }
  async function finishQuiz() {
    if (busy || quizSaved) return;
    setBusy('save');
    try {
      const score = quiz.questions.filter(q => choices[q.id] === q.answer).length;
      await saveSession({ ...quiz, choices, correct: score }); await recordActivity('quiz',quiz.questions.length,[...new Set(quiz.questions.map(q=>q.source.docId))],`quiz:${quiz.id}`); studyChanged(); await refresh(); setQuizSaved(true); setQuizIndex(quiz.questions.length);
    } catch (e) { setError(`Could not save this session: ${e.message}`); }
    finally { setBusy(''); }
  }
  async function deleteDocument() {
    if (!deleteTarget || busy) return;
    setBusy('delete');
    try { await removeDocument(deleteTarget.id); setMessages([]); setQuiz(null); await refresh(); setExamFocus(await getSetting('examFocus', {enabled:false,docIds:[],pages:{},weakOnly:false})); studyChanged(); setDeleteTarget(null); setNotice('Document and its practice records removed.'); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }
  async function saveMaterialDetails(e){
    e.preventDefault();if(busy||!editingMaterial)return;setBusy('save');setError('');
    try{const updated={...editingMaterial,name:editingMaterial.name.trim(),subject:editingMaterial.subject.trim(),subjectConfirmed:true};await saveDocument(updated);await refresh();setScope(documentScope(updated));studyChanged();setEditingMaterial(null);setNotice(`Material saved in ${updated.subject}. All notes with this subject are studied together.`);}
    catch(e){setError(e.message);}finally{setBusy('');}
  }
  const scopePicker = <label className="scope-picker"><BookOpen size={15}/><select aria-label="Study subject" title={selectedSubject?`${selectedSubject.label} · ${activeDocuments.length} materials`:scope==='all'?'All subjects':activeDocuments[0]?.name} value={scope} onChange={e=>setScope(e.target.value)} disabled={!!busy}><option value="all">All subjects</option>{groups.filter(g=>g.confirmed).map(g=><option key={g.id} value={g.id}>{g.label} · {g.documents.length} {g.documents.length===1?'material':'materials'}</option>)}{groups.some(g=>!g.confirmed)&&<optgroup label="Unassigned — add a subject">{documents.filter(d=>!d.subjectConfirmed||!d.subject?.trim()).map(d=><option key={d.id} value={`document:${d.id}`}>{d.name}</option>)}</optgroup>}</select></label>;
  const model = models.find(m => m.id === modelId);
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('study'); }}><span className="brand-icon"><svg viewBox="0 0 32 36" width="25" height="29" aria-hidden="true"><path d="M7 3h19v29H7zM11 3v29M15 11h7M15 17h7M15 23h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></span><span>Marginloom<span className="brand-caption">Your offline notebook</span></span></a>
      <div className="nav-label">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">{NAV.map(({ id,label,icon: Icon }) => <button key={id} aria-current={tab===id?'page':undefined} className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}><Icon size={19} /><span>{label}</span>{id === 'review' && activeMistakes.length > 0 && <small>{activeMistakes.length}</small>}</button>)}</nav>
      <div className="sidebar-reflection"><Leaf size={34} strokeWidth={1.15} aria-hidden="true"/><blockquote>A little progress today.<br/>A little more tomorrow.</blockquote><span>Take it one page at a time.</span>{!documents.length&&<button className="text-button" onClick={addSample} disabled={!!busy}>Try a sample chapter <ArrowRight size={15}/></button>}</div>
      <div className="sidebar-bottom"><button className={`nav-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}><Settings size={19} />Settings & offline setup</button><div className="privacy-note"><ShieldCheck size={15} /><span>Your notes stay on this device</span></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb">Marginloom <ChevronRight size={14} /><span>{tab === 'settings' ? 'Settings' : NAV.find(n => n.id === tab)?.label}</span></div><div className="topbar-actions"><button className="theme-toggle" onClick={()=>setAppearance(dark?'light':'dark')} aria-label={dark?'Switch to light mode':'Switch to dark mode'} title={dark?'Switch to light mode':'Switch to dark mode'}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><span className={`connectivity ${online ? '' : 'offline'}`}>{online ? <Wifi size={14} /> : <WifiOff size={14} />}{online ? 'Connected' : 'Offline'}</span><button className={`ai-badge ${llmReady ? 'ready' : ''}`} onClick={() => setTab('settings')}><span className="status-dot" />{busy === 'setup' ? (modelCached && !needsRepair ? 'Loading saved AI…' : 'Downloading AI…') : llmReady ? 'Local AI ready' : modelCached ? 'AI saved on device' : 'Set up local AI'}<ChevronRight size={13} /></button></div></header>
      <main>
        {initialized&&<QuizReminders documents={documents} revision={studyRevision} onActivity={studyChanged} onError={setError}/>}
        {error && <div className="alert error" role="alert"><CircleAlert size={18} /><span>{error}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}
        {notice && <div className="alert success" role="status"><CircleCheck size={18} /><span>{notice}</span><button className="icon-button" aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={16} /></button></div>}
        {updateReady && <div className="alert"><Sparkles size={18} /><span>An app update is ready.</span><Button disabled={!!busy} onClick={() => updateApp.current?.(true)}>Update</Button></div>}
        {busy === 'setup' && tab !== 'settings' && <div className="alert" role="status"><LoaderCircle size={18} className="spin" /><div><strong>{modelCached && !needsRepair ? 'Opening your saved AI' : 'Preparing local AI'}</strong><p>{status}</p><small>{modelCached && !needsRepair ? 'Files are being loaded from this device into memory. No model download.' : 'You can keep this page open while setup finishes.'}</small></div></div>}
        {!initialized ? <div className="loading-page"><LoaderCircle className="spin" />Opening your study space…</div> : <>
          <Games revision={studyRevision} resetKey={restoreRevision} onActivity={studyChanged} active={tab === 'games'} documents={activeDocuments} allDocuments={documents} scopePicker={scopePicker} busy={busy} setBusy={setBusy} aiReady={llmReady} onSource={setSource} onError={setError} onAddMaterial={() => setImportModal(true)} onSetup={() => { setTab('settings'); setNotice('Set up local AI for AI-written clues, or use source mode in Games straight away.'); }} />
          {tab === 'study' && <>
            <div className="page-heading desk-heading"><div><span className="desk-label">NOTEBOOK / 01</span><h1>Study desk</h1><p>{documents.length ? `${documents.length} ${documents.length === 1 ? 'document' : 'documents'} on your desk. Choose a subject and ask across its notes.` : 'Put a chapter on your desk. We’ll help you work through it.'}</p></div><Button icon={Plus} onClick={() => setImportModal(true)} disabled={!!busy}>Add study material</Button></div>
            <nav className="study-shortcuts" aria-label="Study tools">{[{label:'15-minute session',detail:'A guided study plan',icon:Zap,action:()=>openLearning('session')},{label:'Interactive lesson',detail:'Explore your material',icon:Sparkles,action:()=>openLearning('explore')},{label:'Teach it back',detail:'Explain by text or voice',icon:Mic,action:()=>openLearning('teach')},{label:'Create a reviewer',detail:'Notes to print or save',icon:FileText,action:()=>openReviewer()}].map(({label,detail,icon:Icon,action})=><button key={label} onClick={action} disabled={!documents.length||!!busy}><Icon size={19}/><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={14}/></button>)}</nav><div className="study-grid">
              <section className="panel tutor-panel"><div className="panel-header"><div className="panel-title"><span className="tutor-icon"><Search size={19} /></span><div><h2>Ask your notes</h2><p>{llmReady ? 'Answers with passages you can check.' : 'Search your material, or load AI for an explanation.'}</p></div></div>{scopePicker}</div>
                <div className={`conversation ${messages.length ? 'has-messages' : ''}`} aria-live="polite" aria-relevant="additions">
                  {!messages.length ? <div className="chat-welcome"><span className="notebook-tab">{documents.length ? 'WORKING NOTES' : 'A NEW NOTEBOOK'}</span><h3>{documents.length ? 'What are you working on?' : 'Start with your material.'}</h3><p>{documents.length ? 'Ask about something you don’t understand. Each answer links back to your notes.' : 'A lecture PDF, a reviewer, or notes from class. Add them to the material list, then ask your first question.'}</p><div className="suggestions">{(activeDocuments.some(d => d.sample) ? ['What is photosynthesis?', 'Where does the Calvin cycle happen?', 'What affects photosynthesis?'] : []).map(text => <button key={text} onClick={() => ask(null,text)} disabled={!!busy}>{text}<ArrowUp size={14} /></button>)}</div>{!documents.length && <button className="text-button" onClick={addSample} disabled={!!busy}>Start with a sample chapter <ArrowRight size={15} /></button>}</div> : messages.map(m => <div className="chat-turn" key={m.id}><div className="user-message">{m.question}</div><div className="assistant-message"><span className="assistant-avatar"><BookOpen size={16} /></span><div><div className="answer-label">{m.mode === 'search' ? 'SOURCE SEARCH' : 'MARGINLOOM'}{m.loading && <LoaderCircle size={13} className="spin" />}</div><p className={m.failed ? 'answer-error' : ''}>{m.answer || 'Looking through your notes…'}</p>{m.citationWarning && <small className="citation-warning">Citation checks were incomplete. Compare this answer with the passages below.</small>}{m.sources.length > 0 && <Sources sources={m.sources} onOpen={setSource} />}{m.mode==='action'&&<button className="button secondary chat-reviewer-action" onClick={()=>openReviewer(m.reviewerDocId)}>Open reviewer</button>}{m.elapsedMs && <small className="answer-time">Generated on your device · {(m.elapsedMs/1000).toFixed(1)}s</small>}</div></div></div>)}<div ref={chatBottom} />
                </div>
                <form className="composer" onSubmit={ask}><textarea aria-label="Ask a question about your notes" placeholder={documents.length ? 'Ask a question, or try “I have 15 minutes”…' : 'Add your notes to start asking questions…'} maxLength={600} rows={2} value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(e); } }} disabled={!!busy} />{busy === 'answer' ? <button type="button" className="send-button" aria-label="Stop generating" onClick={ai.stopGeneration}><Square size={17} /></button> : <button className="send-button" aria-label="Send question" disabled={!question.trim() || !!busy}><ArrowUp size={21} /></button>}</form><div className="composer-footnote"><ShieldCheck size={12} />{llmReady ? 'AI can make mistakes. Your sources help you check.' : 'Source search is available now. Set up local AI for explanations.'}</div>
              </section>
              <div className="study-rail"><section className="panel library-panel"><div className="panel-header"><h2>Material <span className="count-pill">{documents.length}</span></h2><button className="icon-button" aria-label="Add a document" onClick={() => setImportModal(true)} disabled={!!busy}><Plus size={19} /></button></div>{documents.length ? <div className="document-list">{groups.map(group=><section className="subject-shelf" key={group.id}><div className="subject-shelf-heading">{group.confirmed?<button aria-pressed={scope===group.id} onClick={()=>setScope(group.id)} disabled={!!busy}>{group.label}<small>{group.documents.length}</small></button>:<span>Unassigned<small>{group.documents.length}</small></span>}</div>{group.documents.map(d=><div className={`document-row ${scope!=='all'&&activeDocuments.some(a=>a.id===d.id)?'selected':''}`} key={d.id}><button className="document-main" title={`${d.name} · ${group.label}`} aria-pressed={scope===documentScope(d)} onClick={()=>setScope(documentScope(d))} disabled={!!busy}><span className="file-icon"><FileText size={21}/></span><span><strong>{d.name}</strong><small>{d.pages} {d.pages===1?'page':'pages'} · {d.chunks.length} passages</small><small className="index-status">{d.chunks.every(c=>c.vector)?'Semantic search indexed':'Ready for source search'}</small></span></button><button className="icon-button" aria-label={`Edit subject for ${d.name}`} disabled={!!busy} onClick={()=>setEditingMaterial({...d,subject:d.subject||inferSubject(d.name)})}><Pencil size={14}/></button><button className="icon-button delete-button" aria-label={`Delete ${d.name}`} disabled={!!busy} onClick={()=>setDeleteTarget(d)}><Trash2 size={15}/></button></div>)}</section>)}</div> : <div className="library-empty"><FileText size={29} strokeWidth={1.3} /><h3>No material yet</h3><p>PDFs and notes you add<br />will be listed here.</p><button className="text-button" onClick={addSample} disabled={!!busy}>Try sample material <ArrowRight size={14} /></button></div>}<button className="upload-zone" onClick={() => setImportModal(true)} disabled={!!busy} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}><Upload size={18} /><span>Add or drop study material<small>PDF, TXT, Markdown · up to 20 MB</small></span></button></section>
                <section className="desk-review"><span className="desk-label">NEXT UP</span><h2>{activeMistakes.length ? `${activeMistakes.length} questions to revisit` : 'Check what you remember'}</h2><p>{activeMistakes.length ? 'Your missed questions are ready for another try.' : 'Make a short quiz from the chapter you’re studying.'}</p><button className="text-button" onClick={() => setTab(activeMistakes.length ? 'review' : 'practice')}>{activeMistakes.length ? 'Open mistake review' : 'Go to practice'} <ArrowRight size={16} /></button></section>
                <div className="local-note"><ShieldCheck size={16} /><p>Saved on this device.<br />No account needed.</p></div>
              </div>
            </div>
            <StudyTools busy={busy} documents={documents} mistakes={mistakes} revision={studyRevision} onDocumentsChange={refresh} onActivity={studyChanged} onFocusChange={setExamFocus} aiReady={llmReady&&!busy} onError={setError} onGames={()=>setTab('games')} />
          </>}
          {tab === 'practice' && <>
            <div className="page-heading"><div><span className="desk-label">NOTEBOOK / 02</span><h1>Practice</h1><p>A quick check or a longer review, with sources beside every answer.</p></div>{quiz && <Button className="secondary" disabled={!!busy} onClick={() => { setQuiz(null); setQuizSaved(false); }}>Back to practice</Button>}</div>
            
            {!quiz && <div className="practice-summary"><span><strong>{attempted}</strong> questions practiced</span><span>{attempted ? `${Math.round(correct / attempted * 100)}% correct` : 'No sessions yet'}</span><span>{sessions.length} saved {sessions.length === 1 ? 'session' : 'sessions'}</span></div>}
            {!quiz ? <div className="practice-layout"><section className="panel practice-builder"><div className="section-icon violet"><GraduationCap size={28} /></div><h2>Your next practice session</h2><p>Choose a subject. Questions draw from all its uploaded material, with source evidence.</p><label className="field-label">Study subject{scopePicker}</label><div className="field-label">Quiz length<div className="segmented quiz-length" role="group" aria-label="Quiz length">{[5,10,20,30,50].map(count=><button key={count} aria-pressed={quizCount===count} className={quizCount===count?'selected':''} onClick={()=>setQuizCount(count)} disabled={!!busy}>{count}</button>)}</div><label className="custom-quiz-count">Questions<input aria-label="Number of questions" type="number" min="1" max="50" value={quizCount} disabled={!!busy} onChange={e=>setQuizCount(e.target.value===''?'':Math.min(50,Math.max(1,Math.floor(Number(e.target.value)))))}/></label></div><label className="field-label">Question selection<select aria-label="Question selection" value={quizCoverage} disabled={!!busy} onChange={e=>setQuizCoverage(e.target.value)}><option value="breadth">Cover the selected material</option><option value="weak">Prioritize my mistakes</option></select></label><p className="muted">Questions span documents and pages. Short material may yield fewer questions; every concept is not guaranteed to be tested. Longer quizzes take more time on your device.</p><PracticeFocus documents={activeDocuments} mistakes={mistakes} focus={examFocus} onFocusChange={setExamFocus} onError={setError} open={focusOpen} onToggle={setFocusOpen} busy={!!busy}/><div className="hint"><Target size={17} />{quizCoverage==='weak' && activeMistakes.length ? 'We’ll prioritize passages from your recent mistakes.' : 'Answers include explanations and the original source.'}</div><Button icon={busy === 'quiz' ? LoaderCircle : BookOpen} className={busy === 'quiz' ? 'loading-button' : ''} onClick={makeQuiz} disabled={!!busy || !documents.length || !quizCount}>{busy === 'quiz' ? 'Writing your questions…' : llmReady ? 'Generate practice questions' : 'Set up AI to generate questions'}</Button>{busy === 'quiz' && <div className="quiz-generation" role="status"><progress max={quizCount} value={quizProgress}/><p>{quizProgress} of {quizCount} questions ready · {status}</p><button className="button secondary" disabled={quizStopping} onClick={()=>{stopQuiz.current=true;setQuizStopping(true);setStatus('Finishing the current question…');}}>Stop and use completed questions</button></div>}{!documents.length && <button className="text-button" onClick={addSample} disabled={!!busy}>Add the sample chapter <ArrowRight size={15} /></button>}</section><section className="panel recent-sessions"><div className="panel-header"><h2>Recent sessions</h2></div>{sessions.length ? sessions.slice(0,8).map(s => <div className="session-row" key={s.id}><span className="section-icon green"><CircleCheck size={19} /></span><div><strong>{s.review ? 'Mistake review' : 'Practice session'}</strong><small>{shortDate(s.createdAt)} · {s.questions.length} questions</small></div><span className="score-pill">{s.correct}/{s.questions.length}</span><button className="icon-button" aria-label="Practice this session again" onClick={() => startQuiz(s.questions)} disabled={!!busy}><RotateCcw size={17} /></button></div>) : <Empty icon={Target} title="Your progress starts here">Finish your first quiz to see your sessions.</Empty>}</section></div> : quizIndex >= quiz.questions.length ? <section className="panel quiz-result"><div className="result-art"><GraduationCap size={42} /></div><div className="desk-label">PRACTICE RESULT</div><h2>Session complete</h2><div className="big-score">{quiz.questions.filter(q => choices[q.id] === q.answer).length}<span> / {quiz.questions.length}</span></div><p>{quiz.questions.every(q => choices[q.id] === q.answer) ? 'All answers correct. You can practice again or choose another chapter.' : 'Your missed questions are saved. Come back to them when you’re ready.'}</p><div className="button-row"><Button onClick={() => setTab('review')} icon={RotateCcw}>Review mistakes</Button><Button className="secondary" onClick={() => setQuiz(null)}>Another session</Button></div></section> : <section className="panel quiz-panel"><div className="quiz-top"><span>QUESTION {quizIndex+1} OF {quiz.questions.length}</span><span>{quiz.review ? 'Mistake review' : 'From your notes'}</span></div><div className="quiz-progress"><span style={{ width: `${(quizIndex+1)/quiz.questions.length*100}%` }} /></div><h2>{quiz.questions[quizIndex].question}</h2><div className="quiz-options">{quiz.questions[quizIndex].options.map((option,index) => {
              const current = quiz.questions[quizIndex]; const answered = Object.hasOwn(choices,current.id); const selected = choices[current.id] === index;
              return <button key={index} className={`quiz-option ${answered && index === current.answer ? 'correct' : answered && selected ? 'incorrect' : ''}`} onClick={() => chooseAnswer(index)} disabled={answered || !!busy}><span className="option-letter">{'ABCD'[index]}</span><span>{option}</span>{answered && index === current.answer && <Check size={20} />}{answered && selected && index !== current.answer && <X size={20} />}</button>;
            })}</div>{Object.hasOwn(choices,quiz.questions[quizIndex].id) && <div className="quiz-explanation"><strong>{choices[quiz.questions[quizIndex].id] === quiz.questions[quizIndex].answer ? 'That’s right.' : 'Not quite. Here’s the source.'}</strong><p>{quiz.questions[quizIndex].explanation}</p><blockquote>{quiz.questions[quizIndex].evidence}</blockquote><Sources sources={[quiz.questions[quizIndex].source]} onOpen={setSource} />{choices[quiz.questions[quizIndex].id] !== quiz.questions[quizIndex].answer && <button className="button secondary" onClick={()=>setMistakeHelp({question:quiz.questions[quizIndex],chosen:choices[quiz.questions[quizIndex].id]})}>Explain my mistake</button>}</div>}<div className="quiz-footer"><span>Take your time. This is practice.</span><Button icon={ArrowRight} disabled={!Object.hasOwn(choices,quiz.questions[quizIndex].id) || !!busy} onClick={() => quizIndex+1 === quiz.questions.length ? finishQuiz() : setQuizIndex(i => i+1)}>{quizIndex+1 === quiz.questions.length ? 'Finish session' : 'Next question'}</Button></div></section>}
          </>}
          {tab === 'review' && <>
            <div className="page-heading"><div><span className="desk-label">NOTEBOOK / 03</span><h1>Questions to revisit</h1><p>Try a missed question again, or read its source first.</p></div>{activeMistakes.length > 0 && <Button icon={RotateCcw} disabled={!!busy} onClick={() => startQuiz(activeMistakes,true)}>Practice missed questions</Button>}</div>
            <div className="review-summary"><span className="section-icon amber"><Target size={25} /></span><div><strong>{activeMistakes.length} questions to revisit</strong><p>{mistakes.filter(m => m.resolved).length} questions answered correctly on a later attempt</p></div></div>
            <section className="panel">{activeMistakes.length ? activeMistakes.map(m => <div className="review-row" key={m.id}><span className="review-marker"><RotateCcw size={18} /></span><div><h3>{m.question}</h3><p>{m.source.docName} · p. {m.source.page} · {m.misses} {m.misses === 1 ? 'miss' : 'misses'}</p><button className="text-button" onClick={() => setSource(m.source)}>Revisit source <ExternalLink size={13} /></button></div><Button className="secondary" disabled={!!busy} onClick={() => startQuiz([m],true)}>Try again</Button></div>) : <Empty icon={CircleCheck} title="A fresh page">Missed questions will appear here after a quiz. Answer them correctly on a later attempt to clear them.</Empty>}</section>
          </>}
          {tab === 'settings' && <>
            <div className="page-heading"><div><span className="desk-label">PREFERENCES</span><h1>Offline setup</h1><p>Download once, then study with AI running on your device.</p></div></div>
            <section className="panel appearance-panel" aria-labelledby="appearance-heading"><div><h2 id="appearance-heading">Appearance</h2><p>A comfortable space, day or night.</p></div><div className="appearance-options" role="group" aria-label="Color theme">{[{id:'light',label:'Light',icon:Sun},{id:'dark',label:'Dark',icon:Moon},{id:'system',label:'System',icon:Monitor}].map(({id,label,icon:Icon})=><button key={id} className={appearance===id?'selected':''} aria-pressed={appearance===id} onClick={()=>setAppearance(id)}><Icon size={16}/>{label}</button>)}</div></section><div className="settings-grid"><section className="panel setup-panel"><div className="panel-header"><div className="panel-title"><span className="tutor-icon"><Sparkles size={20} /></span><h2>Set up local AI</h2></div><span className={`small-badge ${llmReady ? 'green' : ''}`}>{llmReady ? 'Ready' : modelCached ? 'Saved · not loaded' : 'Not set up'}</span></div><p className="settings-intro">Choose a model that fits your device. First setup saves the tutor and search model. On future visits, saved AI opens automatically from this device. Model sizes below are estimates; performance depends on your hardware.</p><div className="model-options">{models.map(m => <label className={`model-option ${modelId === m.id ? 'selected' : ''}`} key={m.id}><input type="radio" name="model" value={m.id} checked={modelId === m.id} onChange={() => changeModel(m.id)} disabled={!!busy} /><span className="model-icon">{m.label === 'Compact' ? <Smartphone size={23} /> : <Laptop size={23} />}</span><span><strong>{m.label}</strong><small>{m.detail}</small><small>{m.estimated}{m.memory ? ` · ~${Math.round(m.memory)} MB listed GPU memory` : ''}</small></span></label>)}</div><Button icon={busy === 'setup' ? LoaderCircle : Download} className={busy === 'setup' ? 'loading-button' : ''} disabled={!!busy || !models.length || (llmReady && embedReady)} onClick={setupAI}>{busy === 'setup' ? (modelCached && !needsRepair ? 'Opening saved AI…' : 'Downloading AI…') : llmReady && embedReady ? 'Local tutor is ready' : needsRepair ? 'Repair AI download' : modelCached ? 'Load saved AI' : 'Download AI for offline use'}</Button>{busy === 'setup' && <div className="setup-progress" role="status"><progress value={setupProgress} max="1" /><p>{status}</p><small>{modelCached && !needsRepair ? 'Reading saved files and preparing your GPU. No model download.' : 'Keep this tab open. The first download may take several minutes.'}</small></div>}<div className="setup-checks"><span><span className={`status-dot ${gpu ? 'ready' : ''}`} />{gpu === null ? 'Checking WebGPU…' : gpu ? 'WebGPU available' : 'WebGPU unavailable on this browser'}</span><span><span className={`status-dot ${embedReady ? 'ready' : ''}`} />{embedReady ? 'Local semantic search loaded' : 'Search model not loaded'}</span><span><span className={`status-dot ${shellReady ? 'ready' : ''}`} />{shellReady ? (desktopInstalled ? 'App files installed' : 'App files cached') : import.meta.env.DEV ? 'Offline caching runs in production preview' : 'App cache preparing'}</span></div>{lastMetric && <div className="performance-note"><Zap size={16} /><span>Last answer: {(lastMetric.elapsedMs/1000).toFixed(1)}s total{lastMetric.firstTokenMs !== null ? ` · ${(lastMetric.firstTokenMs/1000).toFixed(1)}s to first text` : ''}</span></div>}</section>
              <div className="settings-rail"><section className="panel settings-card"><ShieldCheck size={25} /><h2>Keep your study space</h2><p>Your notes and quizzes are stored in this browser. Private browsing or clearing site data can remove them.</p><div className="storage-line"><HardDrive size={15} /><span>{formatBytes(storage?.usage)} used{storage?.quota ? ` of ${(storage.quota/1024**3).toFixed(1)} GB allowed` : ''}</span></div><Button className="secondary" disabled={!!busy} onClick={async () => { try { const accepted = await navigator.storage?.persist?.(); await refreshStorage(); setNotice(accepted ? 'Persistent storage enabled.' : 'This browser did not grant persistent storage. Export a backup of your notes.'); } catch(e) { setError(e.message); } }}>{persistent ? 'Storage persistence enabled' : 'Request persistent storage'}</Button><BackupControls busy={busy} onRestored={afterRestore} onError={setError} onNotice={setNotice} /></section>
                <section className="panel settings-card"><WifiOff size={25} /><h2>Before you go offline</h2><ol><li>{desktopInstalled ? 'Finish AI setup in this app.' : 'Install the web app from its HTTPS address.'}</li><li>Load your AI model and add your study material.</li><li>Disconnect and reopen the app. Saved AI loads automatically; wait for Local AI ready.</li><li>Ask a new question and generate a new quiz.</li></ol><p className="muted">The cache indicators show setup state. A disconnected restart is the real test. Browser storage can be cleared, requiring another download.</p>{!desktopInstalled && !installEvent && <p className="muted">To add the app to your phone: on Android, use Chrome’s menu → Install app. On iPhone, use Safari → Share → Add to Home Screen.</p>}{!desktopInstalled && installEvent && <Button className="secondary" icon={Download} onClick={async () => { await installEvent.prompt(); setInstallEvent(null); }}>Install Marginloom</Button>}</section></div>
            </div>
            <section className="disclosure"><h3>Hackathon disclosure</h3><p>Tutor: {model?.id || modelId}. Embeddings: Xenova/all-MiniLM-L6-v2. Built with React, Vite, WebLLM, Transformers.js, ONNX Runtime Web, PDF.js, IndexedDB/idb, Lucide, and vite-plugin-pwa. Development assisted by OpenAI Codex. Model and library downloads require internet; document processing and inference run locally. This prototype supports text PDFs, English retrieval, and browser-local progress. Phone generation requires a compatible WebGPU browser and sufficient memory.</p></section>
          </>}
        </>}
        <footer className="page-footer"><span>Marginloom · Personal study notebook</span><span>Notes and progress saved locally</span></footer>
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{[...NAV,{ id:'settings',label:'Settings',icon:Settings }].map(({id,label,icon:Icon}) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>
    {busy && busy !== 'answer' && busy !== 'quiz' && busy !== 'setup' && !busy.startsWith('learning-') && <div className="busy-toast" role="status"><LoaderCircle className="spin" size={17} />{status || 'Saving locally…'}</div>}
    <input ref={fileInput} type="file" accept=".pdf,.txt,.md" multiple hidden onChange={e => addFiles(e.target.files)} />
    <datalist id="known-subjects">{groups.filter(g=>g.confirmed).map(g=><option value={g.label} key={g.id}/>)}</datalist>
    {editingMaterial&&<Modal title="Organize your material" onClose={()=>{if(!busy)setEditingMaterial(null);}}><form onSubmit={saveMaterialDetails}><p className="modal-intro">Use the same subject name for notes you want to study together. Files and page references stay separate.</p><label className="field-label">Material name<input aria-label="Edit material name" required maxLength={120} value={editingMaterial.name} disabled={!!busy} onChange={e=>setEditingMaterial(d=>({...d,name:e.target.value}))}/></label><label className="field-label">Subject<input aria-label="Edit material subject" required maxLength={80} list="known-subjects" value={editingMaterial.subject} disabled={!!busy} onChange={e=>setEditingMaterial(d=>({...d,subject:e.target.value}))}/></label><div className="button-row"><Button disabled={!!busy||!editingMaterial.name.trim()||!editingMaterial.subject.trim()}>Save material details</Button><Button type="button" className="secondary" disabled={!!busy} onClick={()=>setEditingMaterial(null)}>Cancel</Button></div></form></Modal>}
    {importModal && <Modal title={pendingFiles.length?'Name your study material':'Bring your study material'} onClose={closeImport}>{error&&<div className="dialog-error" role="alert"><CircleAlert size={17}/><span>{error}</span></div>}{pendingFiles.length?<form onSubmit={confirmFiles}><p className="modal-intro">Check the name and subject before adding it. Your original file stays unchanged.</p>{pendingFiles.map((entry,i)=><section className="import-file-draft" key={entry.id}><p><FileText size={16}/><span>{entry.file.name}</span><button type="button" className="icon-button" aria-label={`Remove pending file ${entry.file.name}`} disabled={!!busy} onClick={()=>setPendingFiles(items=>items.filter(item=>item.id!==entry.id))}><X size={15}/></button></p><label className="field-label">Material name<input aria-label={`Material name ${i+1}`} value={entry.name} maxLength={120} required disabled={!!busy} onChange={e=>setPendingFiles(items=>items.map(item=>item.id===entry.id?{...item,name:e.target.value}:item))}/></label><label className="field-label">Subject<input aria-label={`Material subject ${i+1}`} value={entry.subject} list="known-subjects" maxLength={80} disabled={!!busy} onChange={e=>setPendingFiles(items=>items.map(item=>item.id===entry.id?{...item,subject:e.target.value}:item))}/></label></section>)}<p className="muted">Subject suggestions come from the file name. Correct them here; quiz reminders will use this subject.</p><div className="button-row"><Button icon={Plus} disabled={!!busy||pendingFiles.some(item=>!item.name.trim())}>Add material</Button><Button type="button" className="secondary" disabled={!!busy} onClick={closeImport}>Cancel</Button></div></form>:<><p className="modal-intro">A chapter, a reviewer, or your own notes. It stays on this device.</p><button className="modal-upload" onClick={()=>fileInput.current.click()} disabled={!!busy} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files);}}><Upload size={27}/><strong>Choose a file or drop it here</strong><span>Text PDF, TXT, or Markdown · up to 20 MB</span></button><div className="or-divider"><span>or paste your notes</span></div><form onSubmit={addPaste}><label className="field-label">A name for these notes<input value={pastedTitle} onChange={e=>setPastedTitle(e.target.value)} maxLength={120} placeholder="e.g. Biology — Chapter 3" disabled={!!busy}/></label><label className="field-label">Subject<input aria-label="Subject for pasted notes" list="known-subjects" value={pastedSubject} maxLength={80} placeholder="e.g. Biology" disabled={!!busy} onChange={e=>setPastedSubject(e.target.value)}/></label><label className="field-label">Your notes<textarea value={pastedText} onChange={e=>setPastedText(e.target.value)} placeholder="Paste a section of your notes here…" rows={6} maxLength={200000} disabled={!!busy}/></label><div className="button-row"><Button icon={Plus} disabled={!!busy||pastedText.trim().length<40}>Add notes</Button><Button type="button" className="secondary" onClick={()=>{closeImport();addSample();}} disabled={!!busy}>Use sample chapter</Button></div></form></>}{busy==='import'&&<p role="status" className="muted">{status}</p>}</Modal>}
    {reviewer&&<ReviewerWorkspace documents={reviewer.documents||activeDocuments} initialDocId={reviewer.docId} autoPrepare={reviewer.autoPrepare} aiReady={llmReady&&!busy} onError={setError} onActivity={studyChanged} onClose={()=>setReviewer(null)}/>}
    {learning&&<LearningBoundary onClose={()=>setLearning(null)}><Suspense fallback={<div className="alert" role="status">Opening learning tools…</div>}><LearningWorkspace documents={learning.documents||activeDocuments} initialDocId={learning.docId} initialMode={learning.mode} initialMinutes={learning.minutes} mistakes={mistakes} busy={busy} setBusy={setBusy} aiReady={llmReady} onSource={setSource} onError={setError} onClose={()=>{if(busy.startsWith('learning-')){ai.stopGeneration();setBusy('');}setLearning(null);}}/></Suspense></LearningBoundary>}
    {mistakeHelp&&<MistakeHelp question={mistakeHelp.question} chosen={mistakeHelp.chosen} aiReady={llmReady&&!busy} onError={setError} onClose={()=>setMistakeHelp(null)}/>}
    {source && <Modal title="Back to the source" onClose={() => setSource(null)} wide><div className="source-meta"><FileText size={19} /><strong>{source.docName || 'Study material'}</strong><span>Page {source.page}</span></div><blockquote className="source-passage">{source.text}</blockquote><p className="muted">This passage comes directly from your imported material. Compare the tutor’s answer with the original text.</p></Modal>}
    {deleteTarget && <Modal title="Remove this material?" onClose={() => setDeleteTarget(null)}><p className="modal-intro">“{deleteTarget.name}” and its saved practice records will be removed from this browser.</p><div className="button-row"><Button className="danger" icon={Trash2} onClick={deleteDocument} disabled={!!busy}>Remove material</Button><Button className="secondary" onClick={() => setDeleteTarget(null)} disabled={!!busy}>Keep it</Button></div></Modal>}
  </div>;
}

