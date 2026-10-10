import { env, pipeline } from '@huggingface/transformers';
import { installCacheMode } from './cache-mode.js';
const setCacheMode=installCacheMode();
env.allowLocalModels=false;
env.useBrowserCache=true;
env.backends.onnx.wasm.wasmPaths='/onnx/';
env.backends.onnx.wasm.numThreads=1;
let transcriber;
self.onmessage=async({data:{id,audio,cacheOnly}})=>{
  try{
    setCacheMode(cacheOnly);
    transcriber??=await pipeline('automatic-speech-recognition','Xenova/whisper-tiny.en',{device:'wasm',dtype:'q8',progress_callback:progress=>self.postMessage({progress})});
    // A real inference ensures all runtime/model files are available offline.
    const result=await transcriber(audio||new Float32Array(16000),{chunk_length_s:30,stride_length_s:5,return_timestamps:false});
    self.postMessage({id,result:audio?result.text:''});
  }catch(e){self.postMessage({id,error:e.message||String(e)});}
};
