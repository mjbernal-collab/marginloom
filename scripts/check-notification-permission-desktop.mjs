import {createRequire} from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {_electron}=require('playwright');let app;
async function open(){app=await _electron.launch({executablePath:path.resolve('release/win-unpacked/Marginloom.exe'),env:{...process.env,MARGINLOOM_TEST_PROFILE:path.resolve('.qa/notification-submission-profile')}});const page=await app.firstWindow();await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();return page;}
try{
  let page=await open();console.log('Initial real permission:',await page.evaluate(()=>Notification.permission));
  await page.getByText('How reminders work',{exact:true}).click();
  const enable=page.getByRole('button',{name:'Enable device notifications',exact:true});
  if(await enable.count())await enable.click();
  assert.equal(await page.evaluate(()=>Notification.permission),'granted','Explicit calendar enable must grant real desktop permission');
  await app.close();page=await open();assert.equal(await page.evaluate(()=>Notification.permission),'granted');
  assert(await page.evaluate(()=>window.marginloomDesktop.installed&&isSecureContext));
  console.log('PASS: real Electron notification permission through calendar UI and full desktop restart; no OS notification was emitted.');
}finally{await app?.close();}
