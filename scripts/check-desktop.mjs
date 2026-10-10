import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const { _electron } = require('playwright');
const executablePath = path.resolve('release/win-unpacked/Marginloom.exe');
let app;
const errors = [];
async function open(offline = false) {
  app = await _electron.launch({ executablePath, args: [], env: { ...process.env, MARGINLOOM_TEST_PROFILE: path.resolve('.qa/desktop-profile'), MARGINLOOM_TEST_OFFLINE: offline ? '1' : '0' } });
  const page = await app.firstWindow();
  page.setDefaultTimeout(180000);
  page.on('pageerror', e => { errors.push(e.message); console.log('Page error:', e.message); });
  await page.getByRole('heading', { name: 'Study desk', exact: true }).waitFor();
  return page;
}
async function ready(page) {
  await Promise.race([
    page.getByRole('button', { name: /^Local AI ready/ }).waitFor({ timeout: 600000 }),
    page.locator('.alert.error').waitFor({ timeout: 600000 }).then(async () => { throw new Error(await page.locator('.alert.error').innerText()); }),
  ]);
}
try {
  const page = await open();
  const capabilities = await page.evaluate(async () => ({ installed: window.marginloomDesktop?.installed, secure: isSecureContext, gpu: !!(navigator.gpu && await navigator.gpu.requestAdapter()), nodeExposed: typeof window.require !== 'undefined' }));
  console.log('Desktop capabilities:', capabilities);
  assert.equal(capabilities.installed, true);
  assert.equal(capabilities.secure, true);
  assert.equal(capabilities.nodeExposed, false);
  assert.equal(capabilities.gpu, true);
  const sampleMaterial=page.getByRole('button',{name:/^Photosynthesis · sample chapter/});if(await sampleMaterial.count())await sampleMaterial.click();else await page.getByRole('button',{name:'Try a sample chapter',exact:true}).click();
  await page.locator('.sidebar').getByRole('button', { name: 'Games', exact: true }).click();
  await page.getByRole('button', { name: /Build games from notes|Build a new set/ }).click();
  await page.getByText('Ready to replay offline', { exact: false }).waitFor();
  await page.getByRole('button', { name: /Play Memory Match/ }).click();
  assert.equal(await page.locator('.memory-card').count(), 8);
  await page.getByRole('button', { name: /Study Flashcards/ }).click();
  await page.getByRole('button', { name: 'Reveal flashcard answer', exact: true }).click();
  assert.ok((await page.locator('.flashcard-back strong').innerText()).length > 2);
  await page.getByRole('button', { name: 'I remembered it', exact: true }).click();
  await page.locator('.sidebar').getByRole('button', { name: 'Study desk', exact: true }).click();
  await page.getByRole('button',{name:'Create a reviewer',exact:true}).click();await page.getByRole('textbox',{name:'Reviewer title',exact:true}).waitFor();assert.ok(await page.locator('.reviewer-sections>section').count());await page.getByRole('button',{name:'Close study dialog',exact:true}).click();
  console.log('PASS: packaged desktop reviewer preparation and Games tab builds a sourced memory game and reveals/reviews flashcards.');
  if (process.argv.includes('--ai')) {
    await page.locator('.sidebar').getByRole('button', { name: 'Settings & offline setup' }).click();
    await page.locator('.model-option').filter({ hasText: 'Compact' }).click();
    const load = page.getByRole('button', { name: /^(Download AI for offline use|Load saved AI)$/ });
    if (await load.count()) await load.click();
    const timer = setInterval(async () => { try { console.log('Desktop setup:', await page.locator('.setup-progress').innerText()); } catch {} }, 15000);
    try { await ready(page); } finally { clearInterval(timer); }
    await page.locator('.sidebar').getByRole('button', { name: 'Study desk', exact: true }).click();
    await page.getByRole('button', { name: 'Where does the Calvin cycle happen?' }).click();
    await page.locator('.answer-time').waitFor({ timeout: 180000 });
    assert.match(await page.locator('.assistant-message p').innerText(), /stroma/i);
    await app.close();
    const offline = await open(true);
    await ready(offline);
    await offline.getByRole('button', { name: 'Try a sample chapter', exact: true }).click();
    await offline.getByRole('textbox', { name: 'Ask a question about your notes' }).fill('Where does the Calvin cycle happen?');
    await offline.getByRole('button', { name: 'Send question' }).click();
    await offline.locator('.answer-time').waitFor({ timeout: 180000 });
    assert.match(await offline.locator('.assistant-message p').innerText(), /stroma/i);
    console.log('PASS: packaged desktop AI inference, full app shutdown, automatic offline restoration, and a fresh offline answer.');
    await offline.screenshot({ path: '.qa/desktop-app-offline.png' });
  } else {
    await page.getByRole('button', { name: 'Where does the Calvin cycle happen?' }).click();
    await page.locator('.source-chip').first().waitFor();
    await page.locator('.source-chip').first().click();
    assert.match(await page.locator('.source-passage').innerText(), /Calvin cycle/i);
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.locator('.answer-label .spin').waitFor({ state: 'detached', timeout: 180000 });
    console.log('PASS: packaged executable launches with secure local assets, GPU support, sandboxed renderer, persisted library and source search.');
  }
  assert.deepEqual(errors, []);
} finally { await app?.close(); }
