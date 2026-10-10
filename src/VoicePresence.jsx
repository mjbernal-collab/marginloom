import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { observeSpeaker, speakerLevel } from './speaker.js';
export default function VoicePresence({recording,level,busy,voiceSaved,onRecord,onStop,seconds}){
  const [playback,setPlayback]=useState('idle'),orb=useRef();
  useEffect(()=>observeSpeaker(setPlayback),[]);
  const phase=recording?'listening':playback!=='idle'?playback:busy==='learning-feedback'?'thinking':busy==='learning-voice'?'transcribing':'idle';
  useEffect(()=>{
    if(phase!=='speaking'){orb.current?.style.setProperty('--voice-level',recording?level:0);return;}
    let frame;const update=()=>{orb.current?.style.setProperty('--voice-level',speakerLevel());frame=requestAnimationFrame(update);};update();return()=>cancelAnimationFrame(frame);
  },[phase,recording,level]);
  const labels={idle:'Ready when you are',listening:'Listening to you',speaking:'Marginloom is speaking',preparing:'Preparing your voice',thinking:'Thinking with your notes',transcribing:'Turning speech into words'};
  const shape=<><span/><span/><span/>{voiceSaved&&(recording?<Square size={21}/>:<Mic size={23}/>)}</>;
  return <div className={`voice-presence ${phase}`}>{voiceSaved?<button type="button" className="voice-orbit" ref={orb} disabled={!!busy&&!recording} aria-label={recording?`Stop recording · ${seconds}s`:'Record a voice turn'} onClick={recording?onStop:onRecord}>{shape}</button>:<div className="voice-orbit" ref={orb} aria-hidden="true">{shape}</div>}<div><span className="desk-label">YOUR LOCAL TUTOR</span><p role="status">{labels[phase]}{recording?` · ${seconds}s`:''}</p><small>{phase==='listening'?'Tap the orb to stop. Check your transcript before sending.':phase==='speaking'?'You can stop reading aloud in Voice options.':voiceSaved?'Tap the orb to talk, or type below.':'A conversation at your own pace.'}</small></div></div>;
}
