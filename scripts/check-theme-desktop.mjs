import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {_electron}=require('playwright');
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
let checked=0;
async function compare(folder=''){
 for(const item of await readdir(path.join('dist',folder),{withFileTypes:true})){
  const relative=path.join(folder,item.name);
  if(item.isDirectory()){await compare(relative);continue;}
  if(!folder&&(item.name==='sw.js'||item.name.startsWith('workbox-')))continue;
  assert.equal(hash(await readFile(path.join('release/win-unpacked/resources/webapp',relative))),hash(await readFile(path.join('dist',relative))),relative);
  checked++;
 }
}
await compare();
const profile=path.resolve('.qa/dark-desktop-profile');
const options={executablePath:path.resolve('release/win-unpacked/Marginloom.exe'),args:[],env:{...process.env,MARGINLOOM_TEST_PROFILE:profile,MARGINLOOM_TEST_OFFLINE:'1'}};
let app;
const errors=[];
try{
 app=await _electron.launch(options);let page=await app.firstWindow();
 page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();
 assert(await page.evaluate(()=>window.marginloomDesktop.installed&&isSecureContext));
 if(await page.getByRole('button',{name:'Switch to dark mode'}).count())await page.getByRole('button',{name:'Switch to dark mode'}).click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.getByRole('button',{name:'Add study material',exact:true}).click();
 assert.equal(await page.getByRole('dialog').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(35, 36, 44)');
 await page.getByRole('button',{name:'Close dialog'}).click();

 await app.close();app=undefined;
 app=await _electron.launch(options);page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.getByRole('button',{name:'Settings & offline setup',exact:true}).click();
 await page.getByRole('button',{name:'Light',exact:true}).click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.getByRole('button',{name:'Dark',exact:true}).click();
 assert.deepEqual(errors,[]);
 console.log(`PASS: ${checked} packaged files match the current build; packaged dark mode, dialog palette, offline full restart/persistence and Light/Dark settings work.`);
}finally{await app?.close();}

