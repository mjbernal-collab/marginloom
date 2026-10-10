import {useEffect,useRef,useState} from 'react';
import {Bell,X} from 'lucide-react';
import {loadStudyEvents,saveStudyRecord} from './store.js';
import {reminderState} from './exam-core.js';

export function QuizReminders({documents,revision,onActivity,onError}) {
  const [due,setDue]=useState([]),checking=useRef(false);
  useEffect(()=>{
    let active=true;
    async function check(){
      if(checking.current)return;checking.current=true;
      try{
        const events=await loadStudyEvents(),now=Date.now();
        const current=events.filter(e=>documents.some(d=>d.id===e.docId)&&reminderState(e,now));
        if(!active)return;
        setDue(current);
        if(typeof Notification!=='undefined'&&Notification.permission==='granted')for(const event of current){
          if(event.notifiedAt||reminderState(event,now)==='past')continue;
          const doc=documents.find(d=>d.id===event.docId);
          try{
            new Notification(`${doc.subject} · ${event.title}`,{body:`Quiz: ${new Date(event.startsAt).toLocaleString()}`,tag:`marginloom-quiz-${event.id}`});
            await saveStudyRecord('events',{...event,notifiedAt:now});
          }catch{/* In-app reminder remains available when the OS blocks notifications. */}
        }
      }catch(e){if(active)onError(e.message);}finally{checking.current=false;}
    }
    check();const timer=setInterval(check,30000);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};
  },[documents,revision]);
  async function dismiss(event){try{await saveStudyRecord('events',{...event,reminderDismissedAt:Date.now()});setDue(items=>items.filter(e=>e.id!==event.id));onActivity();}catch(e){onError(e.message);}}
  return due.length>0&&<aside className="quiz-reminders" aria-label="Quiz reminders">{due.map(event=><div className="quiz-reminder" role="status" key={event.id}><Bell size={18}/><div><strong>{reminderState(event)==='past'?'Missed reminder':'Quiz coming up'} · {event.title}</strong><p>{documents.find(d=>d.id===event.docId)?.subject} · {new Date(event.startsAt).toLocaleString()}</p>{reminderState(event)==='past'&&<small>Quiz time has passed. This reminder was waiting when you returned.</small>}</div><button className="icon-button" aria-label={`Dismiss reminder ${event.title}`} onClick={()=>dismiss(event)}><X size={17}/></button></div>)}</aside>;
}
