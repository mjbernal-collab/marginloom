import { readdir, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const transformersEntry = require.resolve('@huggingface/transformers');
const fromTransformers = createRequire(transformersEntry);
const ortEntry = fromTransformers.resolve('onnxruntime-web');
const dist = path.dirname(ortEntry);
const target = path.join(root,'public','onnx');
await mkdir(target, { recursive: true });
const assets = (await readdir(dist)).filter(name => name.startsWith('ort-wasm') && /\.(wasm|mjs)$/.test(name) && !name.includes('asyncify'));
if (!assets.length) throw new Error(`No offline ONNX assets found in ${dist}`);
for (const asset of assets) await copyFile(path.join(dist,asset), path.join(target,asset));
console.log(`Prepared ${assets.length} local ONNX runtime assets.`);
const voiceDir = path.resolve(path.dirname(require.resolve('kokoro-js')), '../voices');
const voiceTarget = path.join(root, 'public', 'voices');
await mkdir(voiceTarget, { recursive: true });
for (const voice of ['af_heart','af_bella','am_puck','bf_emma']) {
  await copyFile(path.join(voiceDir, `${voice}.bin`), path.join(voiceTarget, `${voice}.bin`));
}
