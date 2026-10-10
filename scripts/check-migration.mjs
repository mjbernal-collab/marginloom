import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const context=await browser.newContext();const page=await context.newPage();
  await page.route('http://localhost:4173/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Migration fixture</title>'}));
  await page.goto('http://localhost:4173/');
  await page.evaluate(async()=>{
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('offline-study-buddy',1);r.onupgradeneeded=()=>{for(const name of ['documents','sessions','mistakes'])r.result.createObjectStore(name,{keyPath:'id'});r.result.createObjectStore('settings');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    const tx=db.transaction(['documents','sessions','mistakes','settings'],'readwrite');
    tx.objectStore('documents').put({id:'old-notes',name:'Existing biology notes',pages:1,chars:180,createdAt:1,chunks:[{id:'old-source',page:1,text:'Chlorophyll absorbs light during photosynthesis. Mitochondria are organelles that perform respiration. Enzymes are catalysts that accelerate reactions. The Calvin cycle occurs in the stroma.'}]});
    tx.objectStore('sessions').put({id:'old-session',createdAt:1,questions:[],correct:0});
    tx.objectStore('mistakes').put({id:'old-mistake',resolved:true});
    tx.objectStore('settings').put(false,'gameSound');
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
  });
  await page.unroute('http://localhost:4173/');await page.reload();
  await page.getByRole('button',{name:/^Existing biology notes/}).waitFor();
  await page.locator('.sidebar').getByRole('button',{name:'Games',exact:true}).click();
  await page.getByRole('button',{name:'Sound off',exact:true}).waitFor();
  await page.getByRole('button',{name:'Build games from notes',exact:true}).click();
  await page.getByText('Ready to replay offline',{exact:false}).waitFor();
  const data=await page.evaluate(async()=>{
    const db=await new Promise(resolve=>{const r=indexedDB.open('offline-study-buddy');r.onsuccess=()=>resolve(r.result);});
    const counts=await Promise.all(['documents','sessions','mistakes','games'].map(name=>new Promise(resolve=>{const r=db.transaction(name).objectStore(name).count();r.onsuccess=()=>resolve(r.result);})));const version=db.version;db.close();return {version,counts};
  });
  assert.deepEqual(data,{version:3,counts:[1,1,1,1]});
  console.log('PASS: v1 to v3 migration retains existing notes, sessions, mistakes and sound settings while adding saved game and study stores.');
}finally{await browser.close();}
