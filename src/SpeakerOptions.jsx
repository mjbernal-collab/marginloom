import { useEffect, useState, useRef } from 'react';
import { Volume2, Square } from 'lucide-react';
import { getSetting, setSetting } from './store.js';
import { localVoices } from './speech.js';
import { naturalVoices, validSpeaker } from './speaker-core.js';
import * as speaker from './speaker.js';
export const defaultSpeaker={voice:'device',deviceVoice:'',ready:false};
export default function SpeakerOptions({preferences,onPreferences,readAloud,onReadAloud,busy,setBusy}){
  const [voices,setVoices]=useState([]),[status,setStatus]=useState(''),[loaded,setLoaded]=useState(false),alive=useRef(true);
  useEffect(()=>{
    alive.current=true;
    getSetting('speakerPreferences',defaultSpeaker).then(value=>{if(alive.current){if(validSpeaker(value))onPreferences(value);setLoaded(true);}}).catch(()=>{if(alive.current)setLoaded(true);});
    const update=()=>setVoices(localVoices());update();globalThis.speechSynthesis?.addEventListener('voiceschanged',update);
    return()=>{alive.current=false;globalThis.speechSynthesis?.removeEventListener('voiceschanged',update);};
  },[]);
  async function save(value){onPreferences(value);await setSetting('speakerPreferences',value);}
  async function preview(setup=false){
    if(busy)return;setBusy('learning-speaker');setStatus(setup?'Downloading the optional natural voice pack…':'Opening your voice…');
    try{
      await speaker.primeSpeaker();
      if(setup){await speaker.naturalSpeech(null,preferences.voice,progress=>{if(alive.current)setStatus(`Saving natural voice${Number.isFinite(progress.progress)?` · ${Math.round(progress.progress)}%`:''}…`);},false);if(!alive.current)return;await save({...preferences,ready:true});}
      await speaker.readResponse('Hello. Take it one page at a time. We can work through your notes together.',{...preferences,ready:setup||preferences.ready});
      if(alive.current)setStatus('Voice ready. You can stop playback below.');
    }catch(e){if(alive.current){setStatus(e.message);if(/saved AI file is missing|not found|failed to fetch|networkerror/i.test(e.message)){onReadAloud(false);await save({...preferences,ready:false});}}}
    finally{if(alive.current)setBusy('');}
  }
  const natural=preferences.voice!=='device',available=natural?preferences.ready:voices.length>0;
  return <div className="speaker-settings">
    <label className="field-label">Tutor voice<select aria-label="Tutor voice" disabled={!!busy||!loaded} value={preferences.voice} onChange={e=>{speaker.stopSpeaker();onReadAloud(false);save({...preferences,voice:e.target.value}).catch(e=>setStatus(e.message));setStatus('');}}>
      <option value="device">Installed device voice</option>{naturalVoices.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
    </select></label>
    {!natural&&voices.length>0&&<label className="field-label">Device voice<select aria-label="Device voice" disabled={!!busy} value={preferences.deviceVoice||voices[0].voiceURI} onChange={e=>save({...preferences,deviceVoice:e.target.value}).catch(e=>setStatus(e.message))}>{voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}</select></label>}
    <p className="muted">{natural?'Natural English speech by Kokoro, generated on this device. One optional model download serves all four voices. It uses CPU while speaking and releases the model afterward.':'Device voices need no extra download. Only voices marked local by your device are used.'}</p>
    <label><input type="checkbox" checked={readAloud} disabled={!available||!!busy||!loaded} onChange={async e=>{const checked=e.target.checked;try{if(checked)await speaker.primeSpeaker();else speaker.stopSpeaker();onReadAloud(checked);}catch(error){setStatus(error.message);}}}/>Read tutor responses aloud</label>
    <div className="learning-actions">{natural&&!preferences.ready?<button type="button" className="button secondary" disabled={!!busy||!loaded||!navigator.onLine} onClick={()=>preview(true)}><Volume2 size={15}/>Set up natural voice</button>:<button type="button" className="button secondary" disabled={!!busy||!loaded||!available} onClick={()=>preview()}><Volume2 size={15}/>Preview voice</button>}<button type="button" className="text-button" onClick={()=>{speaker.stopSpeaker();setStatus('Reading stopped.');}}><Square size={13}/>Stop reading aloud</button></div>
    {!available&&!natural&&<p className="muted">No local English device voice found. Choose a natural voice to set one up.</p>}
    {natural&&!preferences.ready&&!navigator.onLine&&<p className="muted">Connect once to save the voice pack. Your notes and typed conversations still work offline.</p>}
    {status&&<p className="muted" role="status">{status}</p>}
  </div>;
}
