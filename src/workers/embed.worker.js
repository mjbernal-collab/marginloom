import { env, pipeline } from '@huggingface/transformers';
import { installCacheMode } from './cache-mode.js';
const setCacheMode = installCacheMode();
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = '/onnx/';
env.backends.onnx.wasm.numThreads = 1;
let extractor;
async function load() {
  extractor ??= await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8', progress_callback: progress => self.postMessage({ type: 'progress', progress }) });
  return extractor;
}
async function splitToFit(pipe, chunk) {
  const encoded = await pipe.tokenizer(chunk.text, { truncation: false, padding: false });
  if (encoded.input_ids.size <= 240) return [chunk];
  const words = chunk.text.split(/\s+/);
  // Preserve the source even when one long token cannot be split further.
  if (words.length <= 1) return [chunk];
  const middle = Math.ceil(words.length / 2);
  return [...await splitToFit(pipe, { ...chunk, id: crypto.randomUUID(), text: words.slice(0, middle).join(' ') }), ...await splitToFit(pipe, { ...chunk, id: crypto.randomUUID(), text: words.slice(middle).join(' ') })];
}
self.onmessage = async ({ data: { id, action, text, chunks, cacheOnly } }) => {
  try {
    if (action === 'load') setCacheMode(cacheOnly);
    const pipe = await load();
    if (action === 'load') await pipe('offline study', { pooling: 'mean', normalize: true });
    let result = true;
    if (action === 'query') result = Array.from((await pipe(text, { pooling: 'mean', normalize: true })).data);
    if (action === 'index') {
      result = [];
      for (let i = 0; i < chunks.length; i++) {
        const safeChunks = await splitToFit(pipe, chunks[i]);
        for (const chunk of safeChunks) result.push({ ...chunk, vector: Array.from((await pipe(chunk.text, { pooling: 'mean', normalize: true })).data), embeddingVersion: 'Xenova/all-MiniLM-L6-v2:mean:normalized:v1' });
        self.postMessage({ type: 'indexProgress', done: i + 1, total: chunks.length });
      }
    }
    self.postMessage({ id, result });
  } catch (error) { extractor = undefined; self.postMessage({ id, error: error.message || String(error) }); }
};
