import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const { chromium } = require('playwright');
let context;
const errors = [];
const remote = [];
async function open(offline = false) {
  context = await chromium.launchPersistentContext('.qa/ai-profile', { channel: 'msedge', headless: true, viewport: { width: 1440, height: 1000 } });
  await context.setOffline(offline);
  context.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).hostname !== 'localhost') remote.push(r.url()); });
  const page = context.pages()[0];
  page.on('pageerror', e => errors.push(e.message));
  page.setDefaultTimeout(60000);
  await page.goto('http://localhost:4173');
  return page;
}
async function ready(page) {
  const timer = setInterval(async () => {
    try { console.log('Restore status:', await page.locator('.ai-badge').innerText(), await page.locator('.alert').allTextContents()); } catch {}
  }, 15000);
  try {
  await Promise.race([
    page.getByRole('button', { name: /^Local AI ready/ }).waitFor({ timeout: 180000 }),
    page.locator('.alert.error').waitFor({ timeout: 180000 }).then(async () => { throw new Error(await page.locator('.alert.error').innerText()); }),
  ]);
  } finally { clearInterval(timer); }
}
try {
  let page = await open();
  const update = page.getByRole('button', { name: 'Update', exact: true });
  await Promise.race([
    update.waitFor({ timeout: 60000 }).catch(() => {}),
    page.getByRole('button', { name: /^Local AI ready/ }).waitFor({ timeout: 60000 }).catch(() => {}),
  ]);
  if (await update.isVisible()) {
    await update.click();
  }
  await ready(page);
  await page.getByRole('heading', { name: 'Study desk', exact: true }).waitFor();
  console.log('PASS: previously downloaded AI restores automatically on the study desk.');
  await context.close();
  remote.length = 0;
  page = await open(true);
  await ready(page);
  await page.getByRole('heading', { name: 'Study desk', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Try a sample chapter', exact: true }).click();
  await page.locator('.sidebar').getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByRole('button', { name: 'Generate practice questions', exact: true }).click();
  await Promise.race([
    page.locator('.quiz-panel').waitFor({ timeout: 300000 }),
    page.locator('.alert.error').waitFor({ timeout: 300000 }).then(async () => { throw new Error(await page.locator('.alert.error').innerText()); }),
  ]);
  assert.deepEqual(remote, [], 'No external network requests during restored offline AI or quiz generation');
  assert.deepEqual(errors, []);
  await page.screenshot({ path: '.qa/automatic-offline-quiz.png', fullPage: true });
  console.log('PASS: full browser shutdown, offline relaunch, automatic cached model restoration, and a fresh quiz without visiting setup or contacting remote hosts.');
} finally { await context?.close(); }
