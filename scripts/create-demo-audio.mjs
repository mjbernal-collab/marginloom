import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
const scenes=JSON.parse(await readFile('output/demo/scenes.json','utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();
try{
 await page.goto('http://127.0.0.1:4175');
 await page.exposeFunction('saveNarration',async(i,samples,rate)=>{await writeFile(`output/demo/voice-${i}.f32`,Buffer.from(new Float32Array(samples).buffer));await writeFile(`output/demo/voice-${i}.json`,JSON.stringify({rate}));console.log('Narrated scene',i+1);});
 const manifest=await page.evaluate(async()=>await(await fetch('/sw.js')).text());const speechWorker=manifest.match(/assets\/speaker\.worker-[\w-]+\.js/)?.[0];
 if(!process.argv.includes('--orb-only'))await page.evaluate(async({speechWorker,scenes})=>{const w=new Worker('/'+speechWorker,{type:'module'});for(const s of scenes){const chunks=[];let rate=24000;await new Promise((resolve,reject)=>{w.onmessage=async({data})=>{if(data.samples){chunks.push(data.samples);rate=data.rate;}if(data.error)reject(new Error(data.error));if(data.done){const a=new Float32Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const c of chunks){a.set(c,offset);offset+=c.length;}await window.saveNarration(s.id,Array.from(a),rate);resolve();}};w.onerror=()=>reject(new Error('Voiceover worker failed'));w.postMessage({id:'demo-'+s.id,text:s.narration,voice:'af_heart',cacheOnly:false});});}w.terminate();},{speechWorker,scenes});
 // Capture actual tutor playback and its orb, using the downloaded voice.
 await page.getByRole('button',{name:'Try a sample chapter',exact:true}).click();await page.locator('.document-row').waitFor();await page.getByRole('textbox',{name:'Ask a question about your notes'}).fill('Teach it back');await page.getByRole('button',{name:'Send question',exact:true}).click();await page.locator('.voice-options summary').click();await page.getByRole('combobox',{name:'Tutor voice',exact:true}).selectOption('af_heart');await page.getByRole('button',{name:'Set up natural voice',exact:true}).click();await page.locator('.voice-presence.speaking').waitFor({timeout:180000});await page.locator('.voice-options summary').click();await page.locator('.voice-presence').scrollIntoViewIfNeeded();await page.screenshot({path:'output/demo/11b.png'});console.log('Captured actual speaking orb');
}finally{await browser.close();}
