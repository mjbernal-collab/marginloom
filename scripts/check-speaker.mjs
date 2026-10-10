import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
const url=process.env.MARGINLOOM_TEST_URL||'http://localhost:4175';
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
page.setDefaultTimeout(30000);const errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(url))remote.push(r.url());});
async function open(){await page.getByRole('textbox',{name:'Ask a question about your notes'}).fill('Teach it back');await page.getByRole('button',{name:'Send question',exact:true}).click();await page.locator('.voice-options summary').click();await page.getByRole('combobox',{name:'Tutor voice',exact:true}).waitFor();}
try{
 await page.goto(url);await page.locator('.sidebar-reflection').waitFor();await page.locator('.sidebar-reflection').getByRole('button',{name:'Try a sample chapter'}).click();await page.locator('.document-row').waitFor();
 assert.equal(await page.locator('.sidebar-reflection svg').count(),1);await page.screenshot({path:'.qa/final-study-desk.png',fullPage:true});
 await open();await page.getByRole('combobox',{name:'Tutor voice',exact:true}).selectOption('af_heart');await page.getByRole('button',{name:'Set up natural voice',exact:true}).waitFor();assert.equal(remote.length,0);
 const start=Date.now();await page.getByRole('button',{name:'Set up natural voice',exact:true}).click();await page.getByText('Voice ready. You can stop playback below.',{exact:true}).waitFor({timeout:300000});console.log('Natural voice setup + first preview seconds:',(Date.now()-start)/1000);assert.ok(remote.some(u=>u.includes('Kokoro')));await page.locator('.voice-presence.speaking').waitFor();
 await page.screenshot({path:'.qa/natural-voice.png'});await page.getByRole('button',{name:'Stop reading aloud',exact:true}).click();await page.locator('.voice-presence.idle').waitFor();
 await page.getByRole('checkbox',{name:'Read tutor responses aloud',exact:true}).check();await page.getByRole('button',{name:'Close learning window',exact:true}).click();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);remote.length=0;await page.reload();await open();assert.equal(await page.getByRole('combobox',{name:'Tutor voice',exact:true}).inputValue(),'af_heart');
 await page.getByRole('combobox',{name:'Tutor voice',exact:true}).selectOption('bf_emma');const restored=Date.now();await page.getByRole('button',{name:'Preview voice',exact:true}).click();await page.getByText('Voice ready. You can stop playback below.',{exact:true}).waitFor({timeout:180000});assert.ok(await page.locator('.voice-presence.speaking').count());console.log('Offline Emma preview seconds:',(Date.now()-restored)/1000);assert.deepEqual(remote,[]);
 await page.getByRole('button',{name:'Stop reading aloud',exact:true}).click();await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.qa/natural-voice-mobile.png'});
 await page.getByRole('button',{name:'Close learning window',exact:true}).click();assert.deepEqual(errors,[]);console.log('PASS: persistent leaf, explicit natural voice setup, actual local synthesis/playback, animated speaking and stop states, saved preference, cold offline reopen and voice switch with no remote requests, mobile layout.');
}finally{await browser.close();}
