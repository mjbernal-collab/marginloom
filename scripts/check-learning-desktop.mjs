import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import path from 'node:path';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {_electron}=require('playwright');
const app=await _electron.launch({executablePath:path.resolve('release/win-unpacked/Marginloom.exe'),args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${path.resolve('.qa/voice-fixture.wav')}`],env:{...process.env,MARGINLOOM_TEST_PROFILE:path.resolve('.qa/learning-desktop-profile'),MARGINLOOM_TEST_OFFLINE:'1'}});
const page=await app.firstWindow(),errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
async function command(text){await page.getByRole('textbox',{name:'Ask a question about your notes'}).fill(text);await page.getByRole('button',{name:'Send question',exact:true}).click();}
try{
 await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();
 if(!await page.locator('.document-row').count()){await page.getByRole('button',{name:'Try a sample chapter',exact:true}).click();await page.getByRole('button',{name:/^Photosynthesis · sample chapter/}).waitFor();}
 await page.getByRole('combobox',{name:'Study subject'}).selectOption('subject:biology');
 await command('Explore this lesson');await page.getByRole('button',{name:'Build interactive lesson',exact:true}).click();await page.locator('.lesson-element[data-kind=read]').waitFor();await page.getByRole('button',{name:'Next activity',exact:false}).click();await page.locator('.lesson-element[data-kind=connect]').waitFor();await page.getByRole('button',{name:'Close learning window',exact:true}).click();
 await page.evaluate(async()=>{
  const r=indexedDB.open('offline-study-buddy'),db=await new Promise(resolve=>r.onsuccess=()=>resolve(r.result));const tx=db.transaction('settings','readwrite');tx.objectStore('settings').put(true,'voiceReady');await new Promise(resolve=>tx.oncomplete=resolve);db.close();
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window.__testTracks=[];navigator.mediaDevices.getUserMedia=async options=>{const stream=await original(options);window.__testTracks.push(...stream.getTracks());return stream;};
 });
 await command('Teach it back');await page.getByRole('button',{name:'Record a voice turn',exact:true}).click();await page.getByRole('button',{name:/Stop recording/}).waitFor();assert.ok(await page.evaluate(()=>window.__testTracks.some(t=>t.readyState==='live')));
 await page.getByRole('button',{name:'Close learning window',exact:true}).click();await page.waitForFunction(()=>window.__testTracks.every(t=>t.readyState==='ended'));
 // Missing cached voice cannot download while offline and offers repair.
 await command('Teach it back');await page.getByRole('button',{name:'Record a voice turn',exact:true}).click();await page.getByRole('button',{name:/Stop recording/}).waitFor();await page.waitForTimeout(1000);await page.getByRole('button',{name:/Stop recording/}).click();await page.getByRole('button',{name:'Set up offline voice',exact:true}).waitFor();assert.match(await page.locator('.teach-back').innerText(),/saved|missing|cache/i);assert.deepEqual(remote,[]);await page.waitForFunction(()=>window.__testTracks.every(t=>t.readyState==='ended'));await page.getByRole('button',{name:'Close learning window',exact:true}).click();
 await command('I have 15 minutes');await page.getByText('Opening your saved session…',{exact:true}).waitFor({state:'hidden'});const start=page.getByRole('button',{name:'Start study session',exact:true});if(await start.count())await start.click();await page.locator('.session-status').waitFor();assert.ok(await page.evaluate(()=>globalThis.isSecureContext&&window.marginloomDesktop.installed));assert.deepEqual(errors,[]);console.log('PASS: packaged offline source lesson/session, audio permission, microphone cleanup on close/stop, missing voice cache blocked offline and repair offered. Desktop speech-model inference was tested in Edge, not in this fresh desktop profile.');
}finally{await app.close();}
