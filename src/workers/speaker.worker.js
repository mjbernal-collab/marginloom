import { KokoroTTS } from 'kokoro-js';
import { env } from '@huggingface/transformers';
import { installCacheMode } from './cache-mode.js';
import { naturalVoices, speechChunks } from '../speaker-core.js';
const setCacheMode=installCacheMode(),guardedFetch=self.fetch.bind(self);
// Voice styles ship with the app. Rewrite before the remote cache guard so
// choosing another voice never requires a network connection.
self.fetch=(input,options)=>{
  const url=new URL(input instanceof Request?input.url:String(input),self.location.href);
  const voice=naturalVoices.find(v=>url.href===`https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/${v.id}.bin`);
  return guardedFetch(voice?new URL(`/voices/${voice.id}.bin`,self.location.href).href:input,options);
};
env.allowLocalModels=false;env.useBrowserCache=true;
env.backends.onnx.wasm.wasmPaths='/onnx/';env.backends.onnx.wasm.numThreads=1;
self.onmessage=async({data:{id,text,voice,cacheOnly}})=>{
  try{
    setCacheMode(cacheOnly);
    if(!naturalVoices.some(v=>v.id===voice))throw new Error('Choose an available natural voice.');
    const tts=await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{dtype:'q8',device:'wasm',progress_callback:progress=>self.postMessage({id,progress})});
    for(const chunk of speechChunks(text||'Ready.')){
      const audio=await tts.generate(chunk,{voice});
      if(text)self.postMessage({id,samples:audio.audio,rate:audio.sampling_rate},[audio.audio.buffer]);
    }
    self.postMessage({id,done:true});
  }catch(e){self.postMessage({id,error:e.message||String(e)});}
};
