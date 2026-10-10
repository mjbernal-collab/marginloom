import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import path from 'node:path';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium,_electron}=require('playwright');
const desktop=process.argv.includes('--desktop');
const browser=desktop?await _electron.launch({executablePath:path.resolve('release/win-unpacked/Marginloom.exe'),env:{...process.env,MARGINLOOM_TEST_PROFILE:path.resolve('.qa/dialog-desktop-profile')}}):await chromium.launch({channel:'msedge',headless:true});
const page=desktop?await browser.firstWindow():await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function stage(){await page.getByRole('button',{name:'Add study material',exact:true}).click();await page.locator('input[type=file]').setInputFiles({name:'Computer_Architecture.txt',mimeType:'text/plain',buffer:Buffer.from('Full adders are circuits that add three binary inputs. Assembly language uses mnemonic instructions.')});await page.getByRole('heading',{name:'Name your study material',exact:true}).waitFor();}
try{
 if(!desktop)await page.goto(process.env.MARGINLOOM_TEST_URL||'http://localhost:4173');await stage();
 const subject=page.getByLabel('Material subject 1',{exact:true});
 await subject.click();await subject.press('Control+a');assert.equal(await subject.evaluate(e=>e.selectionEnd-e.selectionStart),(await subject.inputValue()).length);
 const dialog=page.getByRole('dialog'),box=await dialog.boundingBox(),field=await subject.boundingBox();
 await page.mouse.move(field.x+120,field.y+field.height/2);await page.mouse.down();await page.mouse.move(box.x-15,field.y+field.height/2,{steps:12});await page.mouse.up();
 if(process.argv.includes('--expect-bug')){if(await dialog.count())await page.mouse.click(box.x+4,box.y+20);assert.equal(await dialog.count(),0);console.log('REPRODUCED: a click in the dialog padding closes the import form.');}
 else{
  assert.ok(await dialog.isVisible());await page.mouse.click(box.x+4,box.y+20);assert.ok(await dialog.isVisible());await page.mouse.click(box.x-15,box.y+20);assert.ok(await dialog.isVisible());
  await subject.fill('Digital logic');await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await dialog.count(),0);assert.equal(await page.locator('.document-row').count(),0);
  await stage();await page.getByRole('button',{name:'Close dialog',exact:true}).click();assert.equal(await dialog.count(),0);
  await stage();await subject.press('Escape');assert.equal(await dialog.count(),0);
  await stage();await subject.fill('Digital logic');await page.getByRole('textbox',{name:'Material name 1',exact:true}).fill('Adders lesson');await page.getByRole('button',{name:'Add material',exact:true}).click();await page.getByRole('button',{name:/^Adders lesson/}).waitFor();assert.equal(await dialog.count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: selecting subject text, dragging outside, padding/backdrop clicks preserve the draft; Cancel, X, Escape and confirmed import work.');
 }
}finally{await browser.close();}
