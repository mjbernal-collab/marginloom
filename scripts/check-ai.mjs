import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
await mkdir('.qa/ai-profile',{recursive:true});
const context=await chromium.launchPersistentContext('.qa/ai-profile',{channel:'msedge',headless:true,viewport:{width:1440,height:1000}});
await context.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(url, options) { super(url, options); this.isEmbedding = String(url).includes('embed.worker'); }
    postMessage(data, ...rest) {
      if (this.isEmbedding && window.failEmbeddingAction === data.action) {
        window.failEmbeddingAction = null;
        queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: { id: data.id, error: 'Injected embedding failure' } })));
      } else super.postMessage(data, ...rest);
    }
  };
});
const page=context.pages()[0] || await context.newPage();
page.setDefaultTimeout(60000);
const errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('Page error:',e.message);});
page.on('console',m=>{if(m.text().startsWith('Quiz validation failed:'))console.log(m.text());});
page.on('requestfailed',r=>console.log('Request failed:',new URL(r.url()).hostname,r.failure()?.errorText));
let progressTimer;
try {
  await page.goto('http://localhost:4173');
  await page.getByRole('heading',{name:'Study desk'}).waitFor();
  const update=page.getByRole('button',{name:'Update',exact:true});
  if(await update.waitFor({timeout:5000}).then(()=>true).catch(()=>false)) { await update.click(); await page.getByRole('heading',{name:'Study desk'}).waitFor(); }
  while(await page.getByRole('button',{name:'Delete Offline-physics.txt',exact:true}).count()) {
    await page.getByRole('button',{name:'Delete Offline-physics.txt',exact:true}).first().click();
    await page.getByRole('button',{name:'Remove material',exact:true}).click();
    await page.getByRole('heading',{name:'Remove this material?'}).waitFor({state:'detached'});
  }
  await page.getByRole('button',{name:'Try a sample chapter'}).click();
  await page.getByRole('button',{name:/^Photosynthesis · sample chapter/}).waitFor();
  await page.locator('.sidebar').getByRole('button',{name:'Settings & offline setup'}).click();
  const modelProfile=process.argv[2] || 'Compact';
  await page.locator('.model-option').filter({hasText:modelProfile}).click();
  if (!await page.getByRole('button',{name:'Local tutor is ready',exact:true}).count()) await page.getByRole('button',{name:/^(Load saved AI|Download AI for offline use|Repair AI download)$/}).click();
  let last='';
  progressTimer=setInterval(async()=>{try {const text=await page.locator('.setup-progress').innerText().catch(()=> '');if(text !== last){console.log('Setup:',text);last=text;}const error=await page.locator('.alert.error').innerText().catch(()=> '');if(error){console.log('Setup error:',error);}}catch{}},10000);
  await Promise.race([
    page.getByRole('button',{name:'Local tutor is ready',exact:true}).waitFor({timeout:600000}),
    page.locator('.alert.error').waitFor({timeout:600000}).then(async()=>{throw new Error(await page.locator('.alert.error').innerText());}),
  ]);
  clearInterval(progressTimer);
  console.log(`PASS: real local embedding model and ${modelProfile} language model loaded.`);
  await page.locator('.sidebar').getByRole('button',{name:'Study desk',exact:true}).click();
  await page.getByRole('button',{name:'Where does the Calvin cycle happen?'}).click();
  await page.locator('.answer-time').waitFor({timeout:180000});
  const answer=await page.locator('.assistant-message p').innerText();
  assert.match(answer,/stroma/i);
  console.log('Local answer:',answer,'Timing:',await page.locator('.answer-time').innerText());
  await page.screenshot({path:'.qa/local-ai-answer.png',fullPage:true});
  await page.locator('.sidebar').getByRole('button',{name:'Practice',exact:true}).click();
  await page.getByRole('button',{name:'Generate practice questions'}).click();
  await Promise.race([
    page.locator('.quiz-panel').waitFor({timeout:300000}),
    page.locator('.alert.error').waitFor({timeout:300000}).then(async()=>{throw new Error(await page.locator('.alert.error').innerText());}),
  ]);
  console.log('PASS: generated a quiz with real local AI.',await page.locator('.quiz-panel>h2').innerText());
  await page.screenshot({path:'.qa/local-ai-quiz.png',fullPage:true});
  await page.locator('.sidebar').getByRole('button',{name:'Settings & offline setup'}).click();
  await page.getByText('App files cached',{exact:true}).waitFor();
  await page.close();
  await context.setOffline(true);
  const offlinePage=await context.newPage();
  offlinePage.on('pageerror', e => errors.push(e.message));
  offlinePage.on('console',m=>{if(m.text().startsWith('Quiz validation failed:'))console.log(m.text());});
  offlinePage.setDefaultTimeout(60000);
  await offlinePage.goto('http://localhost:4173');
  await offlinePage.getByRole('heading',{name:'Study desk'}).waitFor();
  await offlinePage.locator('.sidebar').getByRole('button',{name:'Settings & offline setup'}).click();
  await Promise.race([
    offlinePage.getByRole('button',{name:'Local tutor is ready',exact:true}).waitFor({timeout:180000}),
    offlinePage.locator('.alert.error').waitFor({timeout:180000}).then(async()=>{throw new Error(await offlinePage.locator('.alert.error').innerText());}),
  ]);
  await offlinePage.locator('.sidebar').getByRole('button',{name:'Study desk',exact:true}).click();
  await offlinePage.getByRole('textbox',{name:'Ask a question about your notes'}).fill('Where does the oxygen released in photosynthesis come from?');
  await offlinePage.getByRole('button',{name:'Send question'}).click();
  await offlinePage.locator('.answer-time').waitFor({timeout:180000});
  const offlineAnswer=await offlinePage.locator('.assistant-message p').innerText();
  assert.match(offlineAnswer,/water/i);
  console.log('PASS: closed tab, disconnected browser, reopened app, loaded both models from cache, and generated a fresh answer offline:',offlineAnswer);
  await offlinePage.screenshot({path:'.qa/offline-ai.png',fullPage:true});
  await offlinePage.getByRole('button',{name:'Add study material',exact:true}).click();
  await offlinePage.locator('input[type=file]').setInputFiles({name:'Offline-physics.txt',mimeType:'text/plain',buffer:Buffer.from('Newton\'s first law states that an object remains at rest or in uniform motion unless acted upon by a net external force. Inertia is resistance to a change in motion. Newton\'s second law states that force equals mass multiplied by acceleration. The unit of force is the newton. Newton\'s third law states that every action has an equal and opposite reaction.')});await offlinePage.getByRole('button',{name:'Add material',exact:true}).click();
  await offlinePage.getByRole('button',{name:/^Offline-physics.txt/}).waitFor();
  await offlinePage.locator('.sidebar').getByRole('button',{name:'Practice',exact:true}).click();
  await offlinePage.getByRole('button',{name:'Generate practice questions'}).click();
  await Promise.race([
    offlinePage.locator('.quiz-panel').waitFor({timeout:300000}),
    offlinePage.locator('.alert.error').waitFor({timeout:300000}).then(async()=>{throw new Error(await offlinePage.locator('.alert.error').innerText());}),
  ]);
  console.log('PASS: imported and semantically indexed new notes, then generated a new quiz while disconnected:',await offlinePage.locator('.quiz-panel>h2').innerText());
  await offlinePage.screenshot({path:'.qa/offline-new-quiz.png',fullPage:true});
  if (process.argv[3]) {
    await offlinePage.locator('.sidebar').getByRole('button',{name:'Study desk',exact:true}).click();
    await offlinePage.getByRole('button',{name:'Add study material',exact:true}).click();
    await offlinePage.locator('input[type=file]').setInputFiles(process.argv[3]);await offlinePage.getByRole('button',{name:'Add material',exact:true}).click();
    await offlinePage.getByRole('button',{name:/^Java_Reviewer_Expanded.pdf/}).first().waitFor();
    await offlinePage.getByRole('textbox',{name:'Ask a question about your notes'}).fill('Why use buffered streams?');
    await offlinePage.getByRole('button',{name:'Send question'}).click();
    await offlinePage.locator('.chat-turn').last().locator('.answer-time').waitFor({timeout:180000});
    const javaAnswer = await offlinePage.locator('.assistant-message p').last().innerText();
    assert.match(javaAnswer, /buffer|memory/i);
    console.log('PASS: actual four-page Java PDF imported, indexed and answered offline:', javaAnswer);
  }
  await offlinePage.locator('.sidebar').getByRole('button',{name:'Study desk',exact:true}).click();
  await offlinePage.evaluate(() => { window.failEmbeddingAction = 'query'; });
  await offlinePage.getByRole('textbox',{name:'Ask a question about your notes'}).fill(process.argv[3] ? 'Explain streams and buffers' : 'What is force?');
  await offlinePage.getByRole('button',{name:'Send question'}).click();
  await offlinePage.getByText('Semantic search stopped.',{exact:false}).waitFor();
  await offlinePage.locator('.chat-turn').last().locator('.answer-time').waitFor({timeout:180000});
  await offlinePage.locator('.sidebar').getByRole('button',{name:'Settings & offline setup'}).click();
  assert.equal(await offlinePage.getByRole('button',{name:'Load saved AI'}).isEnabled(),true);
  await offlinePage.getByRole('button',{name:'Load saved AI'}).click();
  await offlinePage.getByRole('button',{name:'Local tutor is ready'}).waitFor({timeout:180000});
  await offlinePage.evaluate(() => { window.failEmbeddingAction = 'index'; });
  await offlinePage.locator('.sidebar').getByRole('button',{name:'Study desk',exact:true}).click();
  await offlinePage.getByRole('button',{name:'Add study material',exact:true}).click();
  await offlinePage.locator('input[type=file]').setInputFiles({name:'Failure-recovery.txt',mimeType:'text/plain',buffer:Buffer.from('Buffered streams use a memory buffer to reduce expensive operating system reads and writes.')});await offlinePage.getByRole('button',{name:'Add material',exact:true}).click();
  await offlinePage.getByRole('button',{name:/^Failure-recovery.txt/}).first().waitFor();
  await offlinePage.getByText('Semantic indexing failed.',{exact:false}).waitFor();
  console.log('PASS: injected embedding query/index failures fall back to source search, preserve imported notes, and allow AI setup to retry.');
  assert.deepEqual(errors,[]);
} catch(e) {
  console.log('AI CHECK FAILED:',e.stack);
  if(!page.isClosed()) await page.screenshot({path:'.qa/ai-error.png',fullPage:true});
  process.exitCode=1;
} finally {clearInterval(progressTimer);await context.close();}
