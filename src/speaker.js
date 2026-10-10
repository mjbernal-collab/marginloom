import { localVoices } from './speech.js';
let worker,pending,context,analyser,nextTime=0;const playing=new Set(),listeners=new Set();
const emit=state=>listeners.forEach(listener=>listener(state));
export function observeSpeaker(listener){listeners.add(listener);return()=>listeners.delete(listener);}
export function speakerLevel(){if(!analyser||!playing.size)return 0;const samples=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(samples);return Math.min(1,Math.sqrt(samples.reduce((sum,n)=>sum+((n-128)/128)**2,0)/samples.length)*5);}
export function stopSpeaker(){
  worker?.terminate();worker=undefined;
  if(pending){pending.reject(new Error('Reading stopped.'));pending=undefined;}
  for(const node of playing){try{node.stop();}catch{}}playing.clear();nextTime=0;
  globalThis.speechSynthesis?.cancel();
  emit('idle');
}
export async function primeSpeaker(){if(!context){context=new AudioContext();analyser=context.createAnalyser();analyser.fftSize=256;analyser.connect(context.destination);}await context.resume();}
export async function disposeSpeaker(){stopSpeaker();const old=context;context=undefined;analyser=undefined;await old?.close();}
function play(samples,rate){
  if(!context||context.state!=='running')throw new Error('Press Preview voice to enable sound on this device.');
  const buffer=context.createBuffer(1,samples.length,rate);buffer.copyToChannel(samples,0);
  const source=context.createBufferSource();source.buffer=buffer;source.connect(analyser);playing.add(source);emit('speaking');
  source.onended=()=>{playing.delete(source);source.disconnect();if(!playing.size)emit(pending?'preparing':'idle');};
  nextTime=Math.max(context.currentTime+.03,nextTime);source.start(nextTime);nextTime+=buffer.duration;
}
export function naturalSpeech(text,voice,onProgress=()=>{},cacheOnly=true){
  stopSpeaker();
  if(!cacheOnly&&!navigator.onLine)return Promise.reject(new Error('Connect once to download the natural voice pack.'));
  worker=new Worker(new URL('./workers/speaker.worker.js',import.meta.url),{type:'module'});
  emit('preparing');
  return new Promise((resolve,reject)=>{
    const id=crypto.randomUUID();pending={reject};
    const finish=()=>{worker?.terminate();worker=undefined;pending=undefined;};
    worker.onmessage=({data})=>{
      if(data.id!==id)return;
      if(data.progress){onProgress(data.progress);return;}
      if(data.samples){try{play(data.samples,data.rate);}catch(e){finish();stopSpeaker();reject(e);}return;}
      if(data.error){finish();stopSpeaker();reject(new Error(`Natural voice could not open: ${data.error}`));return;}
      if(data.done){finish();if(!playing.size)emit('idle');resolve();}
    };
    worker.onerror=()=>{finish();stopSpeaker();reject(new Error('Natural voice processing stopped. Try a device voice instead.'));};
    worker.postMessage({id,text,voice,cacheOnly});
  });
}
export async function readResponse(text,preferences,onProgress){
  if(preferences.voice!=='device')return naturalSpeech(text,preferences.voice,onProgress,true);
  stopSpeaker();const voices=localVoices(),voice=voices.find(v=>v.voiceURI===preferences.deviceVoice)||voices.find(v=>/natural|neural|premium|enhanced/i.test(v.name))||voices[0];
  if(!voice)throw new Error('No installed local English voice was found. Set up a natural voice or read the response.');
  const utterance=new SpeechSynthesisUtterance(text.replace(/\[\d+\]/g,'').replace(/[*#`]/g,''));utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=.98;
  utterance.onstart=()=>emit('speaking');utterance.onend=utterance.onerror=()=>emit('idle');
  globalThis.speechSynthesis.speak(utterance);
}
