import { useEffect, useState } from 'react';

const key='marginloom-appearance';
const choices=['light','dark','system'];
function readAppearance(){
  try { const saved=localStorage.getItem(key); return choices.includes(saved)?saved:'system'; }
  catch { return 'system'; }
}
export function useAppearance(){
  const [appearance,setChoice]=useState(readAppearance);
  const [systemDark,setSystemDark]=useState(()=>matchMedia('(prefers-color-scheme: dark)').matches);
  const dark=appearance==='dark'||(appearance==='system'&&systemDark);
  useEffect(()=>{
    const media=matchMedia('(prefers-color-scheme: dark)');
    const changed=()=>setSystemDark(media.matches);
    media.addEventListener('change',changed);
    const storageChanged=event=>{if(event.key===key||event.key===null)setChoice(readAppearance());};
    window.addEventListener('storage',storageChanged);
    return ()=>{media.removeEventListener('change',changed);window.removeEventListener('storage',storageChanged);};
  },[]);
  useEffect(()=>{
    const root=document.documentElement;
    root.dataset.theme=dark?'dark':'light';
    root.dataset.appearance=appearance;
    root.style.colorScheme=dark?'dark':'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#17181d':'#194d3d');
  },[appearance,dark]);
  function setAppearance(value){
    if(!choices.includes(value))return;
    setChoice(value);
    try { localStorage.setItem(key,value); } catch { /* The current tab still changes if storage is unavailable. */ }
  }
  return {appearance,setAppearance,dark};
}
