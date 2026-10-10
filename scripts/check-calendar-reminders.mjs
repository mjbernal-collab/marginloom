import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import path from 'node:path';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium,_electron}=require('playwright');
const desktop=process.argv.includes('--desktop');
const host=desktop?await _electron.launch({executablePath:path.resolve('release/win-unpacked/Marginloom.exe'),env:{...process.env,MARGINLOOM_TEST_PROFILE:path.resolve('.qa/calendar-reminders-desktop'),MARGINLOOM_TEST_OFFLINE:'1'}}):await chromium.launch({channel:'msedge',headless:true});
try {
  const page=desktop?await host.firstWindow():await host.newPage();
  page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Test delivery/deduplication without sending real OS notifications.
  await page.addInitScript(()=>{window.testNotifications=[];class TestNotification{static permission='granted';static async requestPermission(){return 'granted';}constructor(title,options){window.testNotifications.push({title,options});}}Object.defineProperty(window,'Notification',{value:TestNotification,configurable:true});});
  if(!desktop)await page.goto('http://127.0.0.1:4176/');
  else {await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();await page.reload();}
  await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();
  await page.evaluate(async()=>{
    const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('offline-study-buddy',3);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    await new Promise((resolve,reject)=>{const tx=db.transaction(['documents','events'],'readwrite');tx.objectStore('documents').clear();tx.objectStore('events').clear();tx.objectStore('documents').put({id:'calendar-doc',name:'Biology notes',subject:'Biology',subjectConfirmed:true,pages:1,createdAt:Date.now(),chunks:[{id:'c',page:1,text:'Chlorophyll absorbs light during photosynthesis.'}]});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
  });
  await page.reload();await page.locator('.document-row').waitFor();
  const instant=new Date(Date.now()+30*60000),date=`${instant.getFullYear()}-${String(instant.getMonth()+1).padStart(2,'0')}-${String(instant.getDate()).padStart(2,'0')}`,time=`${String(instant.getHours()).padStart(2,'0')}:${String(instant.getMinutes()).padStart(2,'0')}`;
  await page.getByText('Add a subject-linked quiz',{exact:true}).click();
  await page.getByRole('textbox',{name:'Quiz name',exact:true}).fill('Biology assessment');
  await page.getByLabel('Quiz date',{exact:true}).fill(date);await page.getByLabel('Quiz time',{exact:true}).fill(time);
  await page.getByRole('combobox',{name:'Reminder timing'}).selectOption('60');
  await page.getByRole('button',{name:'Save quiz reminder',exact:true}).click();
  const banner=page.getByRole('complementary',{name:'Quiz reminders'});await banner.waitFor();assert.match(await banner.innerText(),/Biology assessment/);
  await page.waitForFunction(()=>window.testNotifications.length===1,{},{timeout:12000});
  await page.getByRole('button',{name:'Practice',exact:true}).first().click();await banner.waitFor();
  await page.reload();await banner.waitFor();assert.equal(await page.evaluate(()=>window.testNotifications.length),0,'Notification is not repeated after reopening');
  await page.getByRole('button',{name:'Dismiss reminder Biology assessment'}).click();await banner.waitFor({state:'hidden'});
  await page.reload();await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();assert.equal(await banner.count(),0);
  await page.getByRole('button',{name:'Study desk',exact:true}).first().click();
  await page.getByRole('button',{name:'Edit quiz',exact:true}).click();assert.equal(await page.getByLabel('Quiz time',{exact:true}).inputValue(),time);
  await page.getByRole('combobox',{name:'Reminder timing'}).selectOption('none');await page.getByRole('button',{name:'Save quiz changes'}).click();
  await page.getByText('No reminder',{exact:false}).first().waitFor();
  if(desktop){await page.evaluate(()=>{const original=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){window.testDownload=this.download;}else original.call(this);};});await page.getByRole('button',{name:'Add to device calendar'}).click();assert.equal(await page.evaluate(()=>window.testDownload),'marginloom-quiz.ics');}else{const download=page.waitForEvent('download');await page.getByRole('button',{name:'Add to device calendar'}).click();assert.equal((await download).suggestedFilename(),'marginloom-quiz.ics');}
  await page.getByText('How reminders work',{exact:true}).click();assert.match(await page.locator('.reminder-help').innerText(),/closed/);
  for(const width of desktop?[1440]:[1440,390]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));if(!desktop)await page.locator('.calendar-panel').screenshot({path:`.qa/calendar-reminders-${width}.png`});}
  await page.getByRole('button',{name:'Mark complete',exact:true}).click();await page.locator('.quiz-date-row').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${desktop?'offline packaged desktop':'production web'} timed quiz creation, subject binding, across-tab reminder, mocked device notification and restart deduplication, dismissal persistence, edit/no reminder, calendar export, completion and responsive layout.`);
}finally{await host.close();}
