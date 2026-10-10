import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
let context;const remote=[],errors=[];
async function launch(offline=false){
  context=await chromium.launchPersistentContext('.qa/ai-profile',{channel:'msedge',headless:true,viewport:{width:1440,height:1000}});
  await context.setOffline(offline);context.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).hostname!=='localhost')remote.push(r.url());});
  const page=context.pages()[0]||await context.newPage();page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4173/');
  await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();
  return page;
}
const nav=(page,name)=>page.locator('.sidebar').getByRole('button',{name,exact:true});
async function ready(page){await page.getByRole('button',{name:/^Local AI ready/}).waitFor({timeout:240000});}
async function ask(page,question){await page.getByRole('textbox',{name:'Ask a question about your notes'}).fill(question);await page.getByRole('button',{name:'Send question',exact:true}).click();await page.locator('.chat-turn').last().locator('.answer-time').waitFor();return page.locator('.chat-turn').last().locator('.assistant-message p').innerText();}
try{
  let page=await launch();
  const update=page.getByRole('button',{name:'Update',exact:true});
  if(await update.waitFor({timeout:10000}).then(()=>true).catch(()=>false))await update.click();
  await ready(page);console.log('Actual cached local tutor restored.');
  await page.getByRole('button',{name:'Add study material',exact:true}).click();await page.getByRole('button',{name:'Use sample chapter',exact:true}).click();
  await page.getByRole('combobox',{name:'Study subject'}).selectOption('subject:biology');
  const answer=await ask(page,'Where does the Calvin cycle take place?');assert.match(answer,/stroma/i);console.log('Actual sourced answer:',answer.slice(0,280));
  await nav(page,'Settings & offline setup').click();await page.getByText('App files cached',{exact:true}).waitFor();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.close();
  remote.length=0;page=await launch(true);await ready(page);console.log('Cold browser restart offline restored the actual tutor.');
  await page.getByRole('combobox',{name:'Study subject'}).selectOption('subject:biology');
  const offline=await ask(page,'Where does the oxygen released by photosynthesis come from?');assert.match(offline,/water/i);assert(remote.length===0);console.log('Fresh offline generated answer:',offline.slice(0,280));
  await nav(page,'Practice').click();await page.getByRole('group',{name:'Quiz length'}).getByRole('button',{name:'10',exact:true}).click();
  await page.getByRole('button',{name:'Generate practice questions',exact:true}).click();
  await Promise.race([page.locator('.quiz-panel').waitFor({timeout:600000}),page.locator('.alert.error').waitFor({timeout:600000}).then(async()=>{throw new Error(await page.locator('.alert.error').innerText());})]);
  const quiz=await page.locator('.quiz-panel').innerText();console.log('Actual offline 10-question request:',quiz.slice(0,350));
  assert(quiz.length>70);const total=Number(quiz.match(/QUESTION 1 OF (\d+)/)[1]);assert(total>5,'Rich sample material should now support more than five questions');for(let i=0;i<total;i++){const question=await page.locator('.quiz-panel>h2').innerText();await page.locator('.quiz-option').first().click();const correct=await page.locator('.quiz-option.correct').locator('span').nth(1).innerText();assert(!question.toLowerCase().includes(correct.toLowerCase()),'Question cannot contain its marked answer');console.log(`Checked quiz ${i+1}: ${question} -> ${correct}`);await page.getByRole('button',{name:i+1===total?'Finish session':'Next question',exact:true}).click();}await page.getByRole('heading',{name:'Session complete'}).waitFor();assert.deepEqual(remote,[]);assert.deepEqual(errors,[]);
  await page.screenshot({path:'.qa/submission-offline-real-quiz.png',fullPage:true});
  console.log('PASS: actual cached local inference, sourced Q&A, full browser restart offline, fresh offline answer and quiz generation without remote requests.');
}catch(e){if(context){const p=context.pages()[0];console.log('AI audit screen:',(await p.locator('body').innerText()).slice(-4000));}throw e;}finally{await context?.close();}
