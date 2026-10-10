import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');const {chromium}=require('playwright');
const story=JSON.parse(await readFile('output/promo-short/story.json','utf8'));await mkdir('output/promo-short',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
try{
 await page.goto('http://127.0.0.1:4175');await page.exposeFunction('saveVoice',async(i,samples,rate)=>{await writeFile(`output/promo-short/voice-${i}.f32`,Buffer.from(new Float32Array(samples).buffer));await writeFile(`output/promo-short/voice-${i}.json`,JSON.stringify({rate}));console.log('Pitch narration',i+1,'of',story.length);});
 const manifest=await page.evaluate(async()=>await(await fetch('/sw.js')).text()),worker=manifest.match(/assets\/speaker\.worker-[\w-]+\.js/)?.[0];
 await page.evaluate(async({worker,story})=>{const w=new Worker('/'+worker,{type:'module'});for(let i=0;i<story.length;i++){const chunks=[];let rate=24000;await new Promise((resolve,reject)=>{w.onmessage=async({data})=>{if(data.samples){chunks.push(data.samples);rate=data.rate;}if(data.error)reject(new Error(data.error));if(data.done){const a=new Float32Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const c of chunks){a.set(c,offset);offset+=c.length;}await window.saveVoice(i,Array.from(a),rate);resolve();}};w.onerror=()=>reject(new Error('Pitch narration failed'));w.postMessage({id:'promo-'+i,text:story[i].voice,voice:'af_heart',cacheOnly:false});});}w.terminate();},{worker,story});
}finally{await browser.close();}
