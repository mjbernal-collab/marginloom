// Speech is optional and runs on CPU in its own worker. Dispose after each
// turn so the tutor does not compete with a resident speech model.
let worker,request;
export function stopSpeech(){
  worker?.terminate();worker=undefined;
  if(request){request.reject(new Error('Voice processing cancelled.'));request=undefined;}
  globalThis.speechSynthesis?.cancel();
}
export function transcribeLocal(audio,onProgress=()=>{},cacheOnly=true){
  if(request)return Promise.reject(new Error('A voice turn is already processing.'));
  if(!cacheOnly&&!navigator.onLine)return Promise.reject(new Error('Connect once to download offline voice.'));
  worker=new Worker(new URL('./workers/speech.worker.js',import.meta.url),{type:'module'});
  return new Promise((resolve,reject)=>{
    const id=crypto.randomUUID();request={reject};
    const finish=()=>{worker?.terminate();worker=undefined;request=undefined;};
    worker.onmessage=({data})=>{
      if(data.progress){onProgress(data.progress);return;}
      if(data.id!==id)return;
      finish();data.error?reject(new Error(`Offline voice could not open: ${data.error}`)):resolve(data.result);
    };
    worker.onerror=event=>{finish();reject(new Error(`Local voice processing stopped. ${event.message||'Try a shorter recording or check the saved microphone files in Voice options.'}`));};
    worker.postMessage({id,audio,cacheOnly},audio?[audio.buffer]:[]);
  });
}
export function resampleAudio(input,rate){
  if(!input?.length||!Number.isFinite(rate)||rate<8000)throw new Error('No readable microphone audio.');
  const output=new Float32Array(Math.min(960000,Math.floor(input.length*16000/rate)));
  for(let i=0;i<output.length;i++){
    const start=Math.floor(i*rate/16000),end=Math.max(start+1,Math.floor((i+1)*rate/16000));
    let sum=0;for(let j=start;j<Math.min(end,input.length);j++)sum+=input[j];
    output[i]=sum/(Math.min(end,input.length)-start);
  }
  return output;
}
export async function startMicrophone(onLevel=()=>{}){
  if(!globalThis.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('The microphone needs HTTPS or this PC’s localhost address.');
  const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
  let context;
  try{
    context=new AudioContext();await context.resume();
    const source=context.createMediaStreamSource(stream),processor=context.createScriptProcessor(4096,1,1),silent=context.createGain();silent.gain.value=0;
    const buffers=[];let count=0,closed=false;
    processor.onaudioprocess=e=>{if(count>=context.sampleRate*60)return;const samples=new Float32Array(e.inputBuffer.getChannelData(0));buffers.push(samples);count+=samples.length;onLevel(Math.min(1,Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length)*6));};
    source.connect(processor);processor.connect(silent);silent.connect(context.destination);
    return async(discard=false)=>{
      if(closed)return null;closed=true;processor.onaudioprocess=null;source.disconnect();processor.disconnect();silent.disconnect();stream.getTracks().forEach(t=>t.stop());
      const rate=context.sampleRate;await context.close();
      if(discard)return null;
      if(count<rate*.35)throw new Error('Record at least a short sentence before stopping.');
      const samples=new Float32Array(count);let offset=0;for(const b of buffers){samples.set(b,offset);offset+=b.length;}
      return resampleAudio(samples,rate);
    };
  }catch(e){stream.getTracks().forEach(t=>t.stop());await context?.close();throw e;}
}
export function localVoices(){return globalThis.speechSynthesis?.getVoices().filter(v=>v.localService&&/^en\b/i.test(v.lang))||[];}
export function speakLocally(text){
  const voice=localVoices()[0];
  if(!voice)throw new Error('No local English voice is installed. You can read the response instead.');
  speechSynthesis.cancel();const message=new SpeechSynthesisUtterance(text.replace(/\[\d+\]/g,'').slice(0,1800));message.voice=voice;message.lang=voice.lang;speechSynthesis.speak(message);
}
