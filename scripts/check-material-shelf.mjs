import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium,_electron}=require('playwright');
const desktop=process.argv.includes('--desktop');
await mkdir('.qa',{recursive:true});
const host=desktop?await _electron.launch({executablePath:path.resolve('release/win-unpacked/Marginloom.exe'),env:{...process.env,MARGINLOOM_TEST_PROFILE:path.resolve('.qa/material-shelf-desktop'),MARGINLOOM_TEST_OFFLINE:'1'}}):await chromium.launch({channel:'msedge',headless:true});
try {
  const page=desktop?await host.firstWindow():await host.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(!desktop)await page.goto('http://127.0.0.1:4176/');
  await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();
  await page.evaluate(async()=>{
    const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('offline-study-buddy',3);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('documents','readwrite'),store=tx.objectStore('documents');store.clear();
      const names=['Mobile_Computing_Quick_Exam_Reviewer_UPDATED.pdf','CIT_306_Mobile_Computing_Study_Guide.pdf','Java_IO_Exceptions_Threads_Regex_Reviewer (1).pdf','Java_OOP_Quick_Exam_Reviewer_UPDATED.pdf','CCS201_Java_IO_Exception_Handling_Reviewer.pdf','RPH_Week1-5_Quick_Exam_Reviewer.pdf','RPH_Midterm_Reviewer_Weeks7-11.pdf'];
      names.forEach((name,i)=>store.put({id:`shelf-${i}`,name,subject:i<2?'Mobile Computing':i<5?'OOP':'RPH',subjectConfirmed:true,pages:16,chars:100,createdAt:Date.now(),chunks:[{id:`shelf-${i}-chunk`,page:1,text:'A study passage for checking the material library layout.'}]}));
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });db.close();
  });
  await page.reload();await page.locator('.document-row').nth(6).waitFor();
  for(const theme of ['dark','light']) {
    const switchName=theme==='dark'?'Switch to dark mode':'Switch to light mode';
    if(await page.getByRole('button',{name:switchName}).count())await page.getByRole('button',{name:switchName}).click();
    for(const width of desktop?[1440]:[1920,1440,1024,820,390]) {
      await page.setViewportSize({width,height:1000});
      const geometry=await page.locator('.library-panel').evaluate(panel=>{
        const list=panel.querySelector('.document-list'),listRect=list.getBoundingClientRect();
        return {pageWidth:document.documentElement.clientWidth,pageScroll:document.documentElement.scrollWidth,
          listHeight:list.clientHeight,listScroll:list.scrollHeight,
          rows:[...list.querySelectorAll('.document-row')].map(row=>{
            const name=row.querySelector('strong'),r=row.getBoundingClientRect();
            return {width:name.clientWidth,scroll:name.scrollWidth,whiteSpace:getComputedStyle(name).whiteSpace,
              inside:r.left>=listRect.left-1&&r.right<=listRect.right+1&&r.bottom<=listRect.bottom+1,
              controls:[...row.querySelectorAll('.icon-button')].every(b=>{const a=b.getBoundingClientRect();return a.left>=r.left&&a.right<=r.right+1;})};
          })};
      });
      assert.equal(geometry.rows.length,7);assert(geometry.pageScroll<=geometry.pageWidth+1,JSON.stringify(geometry));
      assert(geometry.listScroll<=geometry.listHeight+1,'Material list must use page scrolling');
      for(const row of geometry.rows){assert(row.inside&&row.controls,'Rows and controls stay inside the shelf');assert.equal(row.whiteSpace,'normal');assert(row.scroll<=row.width+1,'Filename wraps completely');}
      await page.getByRole('button',{name:'Edit subject for RPH_Midterm_Reviewer_Weeks7-11.pdf'}).click();
      await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Cancel',exact:true}).click();
      if(!desktop)await page.screenshot({path:`.qa/material-shelf-${theme}-${width}.png`,fullPage:true});
    }
  }
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${desktop?'packaged desktop':'production web'} seven-document shelf, complete wrapping names, all subject groups and edit controls accessible, no nested clipping or horizontal overflow in both themes.`);
} finally {await host.close();}
