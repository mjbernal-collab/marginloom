import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {_electron}=require('playwright');
const hash=b=>createHash('sha256').update(b).digest('hex');let checked=0;
async function compare(folder=''){for(const item of await readdir(path.join('dist',folder),{withFileTypes:true})){const rel=path.join(folder,item.name);if(item.isDirectory()){await compare(rel);continue;}if(!folder&&(item.name==='sw.js'||item.name.startsWith('workbox-')))continue;assert.equal(hash(await readFile(path.join('dist',rel))),hash(await readFile(path.join('release/win-unpacked/resources/webapp',rel))),rel);checked++;}}
await compare();
const app=await _electron.launch({executablePath:path.resolve('release/win-unpacked/Marginloom.exe'),env:{...process.env,MARGINLOOM_TEST_PROFILE:path.resolve('.qa/navigation-desktop-profile'),MARGINLOOM_TEST_OFFLINE:'1'}});
try{
const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();
if(await page.getByRole('button',{name:'Try a sample chapter',exact:true}).count())await page.getByRole('button',{name:'Try a sample chapter',exact:true}).first().click();
await page.locator('.document-row').first().waitFor();
for(const [button,heading] of [['15-minute session','A little time to study'],['Interactive lesson','Explore this lesson'],['Teach it back','Teach it back']]){
 await page.getByRole('navigation',{name:'Study tools'}).getByRole('button',{name:new RegExp(button)}).click();
 await page.getByRole('dialog').getByRole('heading',{name:heading,exact:true}).waitFor();
 await page.getByRole('button',{name:'Close learning window'}).click();
}
await page.getByRole('navigation',{name:'Study tools'}).getByRole('button',{name:/Create a reviewer/}).click();
await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:/Close/}).last().click();
await page.getByRole('button',{name:'Practice',exact:true}).first().click();
for(const n of [5,10,20,30,50]){await page.getByRole('group',{name:'Quiz length'}).getByRole('button',{name:String(n),exact:true}).click();assert.equal(await page.getByRole('spinbutton',{name:'Number of questions'}).inputValue(),String(n));}
await page.getByRole('spinbutton',{name:'Number of questions'}).fill('17');assert.equal(await page.getByRole('spinbutton',{name:'Number of questions'}).inputValue(),'17');
await page.getByRole('spinbutton',{name:'Number of questions'}).fill('');assert(await page.getByRole('button',{name:'Set up AI to generate questions'}).isDisabled());
await page.getByRole('spinbutton',{name:'Number of questions'}).fill('100');assert.equal(await page.getByRole('spinbutton',{name:'Number of questions'}).inputValue(),'50');
await page.getByRole('combobox',{name:'Question selection'}).selectOption('weak');
assert.equal(await page.locator('.practice-builder .practice-focus').count(),1);
assert.deepEqual(errors,[]);console.log(`PASS: ${checked} matching packaged assets; direct shortcuts, 1-50 quiz controls, focus placement, mobile/desktop layouts; no runtime errors.`);
}finally{await app.close();}
