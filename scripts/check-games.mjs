import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
await mkdir('.qa',{recursive:true});
const aiMode=process.argv.includes('--ai');
const browser=aiMode?null:await chromium.launch({channel:'msedge',headless:true});
const context=aiMode?await chromium.launchPersistentContext('.qa/ai-profile',{channel:'msedge',headless:true,viewport:{width:1440,height:1050}}):await browser.newContext({viewport:{width:1440,height:1050}});
await context.addInitScript(()=>{
  const NativeAudio=window.AudioContext;
  window.gameAudioNotes=0;
  window.AudioContext=class extends NativeAudio {
    createOscillator(){window.gameAudioNotes++;return super.createOscillator();}
  };
});
const page=context.pages()[0]||await context.newPage();
page.setDefaultTimeout(60000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const nav=name=>page.locator('.sidebar').getByRole('button',{name,exact:true});
const readDeck=()=>page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('offline-study-buddy');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const cards=await new Promise(resolve=>{const r=db.transaction('games').objectStore('games').getAll();r.onsuccess=()=>resolve(r.result);});db.close();return cards;
});
try{
  await page.goto('http://localhost:4173');
  if(aiMode){
    // Isolated test profile: refresh app assets while retaining model caches and notes.
    await page.evaluate(async()=>{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const key of await caches.keys())if(key.startsWith('workbox-precache'))await caches.delete(key);});
    await page.goto('about:blank');
    await page.goto('http://localhost:4173');
  }
  await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();
  const update=page.getByRole('button',{name:'Update',exact:true});
  if(await update.waitFor({timeout:5000}).then(()=>true).catch(()=>false)){await Promise.all([page.waitForEvent('framenavigated'),update.click()]);await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();}
  if(!aiMode){
    await nav('Games').click();
    await page.getByRole('heading',{name:'Bring something to play with.'}).waitFor();
    await nav('Study desk').click();
    await page.getByRole('button',{name:'Try a sample chapter'}).click();
  }
  if(aiMode){
    await nav('Settings & offline setup').click();
    await page.getByRole('button',{name:'Local tutor is ready',exact:true}).waitFor({timeout:180000});
    await page.getByText('App files cached',{exact:true}).waitFor();
    await page.reload();
    await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();
    await nav('Settings & offline setup').click();
    await page.getByRole('button',{name:'Local tutor is ready',exact:true}).waitFor({timeout:180000});
    assert.ok(await page.evaluate(()=>!!navigator.serviceWorker.controller),'Current app is controlled for offline navigation');
    await context.setOffline(true);
  }
  await nav('Games').click();
  const sample=await page.getByRole('combobox',{name:'Study subject'}).locator('option').filter({hasText:'Biology'}).first().getAttribute('value');
  await page.getByRole('combobox',{name:'Study subject'}).selectOption(sample);
  if(aiMode){await page.getByRole('button',{name:'Customize set',exact:true}).click();await page.getByRole('checkbox',{name:'Let local AI write the clues'}).check();await page.getByRole('button',{name:'Done',exact:true}).click();}
  const buildStart=await page.evaluate(()=>Date.now());
  console.log('Current app:',await page.locator('script[type=module]').getAttribute('src'));
  await page.getByRole('button',{name:/Build games from notes|Build a new set/}).click();
  let deck;
  const deadline=Date.now()+240000;
  do{
    deck=(await readDeck()).find(d=>d.id===sample);
    if(deck?.createdAt>=buildStart)break;
    const error=page.locator('.alert.error');
    if(await error.isVisible())throw new Error(await error.innerText());
    if(Date.now()>deadline)throw new Error('Game generation timed out');
    await page.waitForTimeout(1000);
  }while(true);
  await page.getByText('Ready to replay offline',{exact:false}).waitFor({timeout:240000});
  console.log('Deck:',deck.cards.map(c=>({answer:c.answer,clue:c.clue,oldQuestion:c.question})));
  assert.ok(deck.cards.length>=2);
  assert.equal(deck.kind,aiMode?'ai':'source');
  console.log('Generated words:',deck.cards.map(c=>c.answer));
  await page.screenshot({path:'.qa/games-menu.png',fullPage:true});
  const sound=page.getByRole('button',{name:/^Sound /});
  if(await sound.getAttribute('aria-pressed')==='true')await sound.click();
  await page.getByRole('button',{name:/Play Word Trail/}).click();
  const noteCount=await page.evaluate(()=>gameAudioNotes);
  for(const [index,card]of deck.cards.entries()){
    // Solve using distinct physical tiles, including repeated letters.
    for(const letter of [...card.answer.toUpperCase()].filter(c=>/[\p{L}\p{N}]/u.test(c))) await page.getByRole('button',{name:`Add letter ${letter}`,exact:true}).filter({visible:true}).evaluateAll((buttons)=>{const b=buttons.find(b=>!b.disabled);if(!b)throw new Error('Missing letter tile');b.click();});
    await page.getByRole('button',{name:'Check word',exact:false}).click();
    await page.getByText(/You found it! \+\d+ points/).waitFor();
    if(index===0){await page.locator('.game-evidence').getByRole('button').click();await page.getByRole('heading',{name:'Back to the source'}).waitFor();assert.match(await page.locator('.source-passage').innerText(),new RegExp(card.answer,'i'));await page.getByRole('button',{name:'Close dialog'}).click();}
    if(index<deck.cards.length-1)await page.getByRole('button',{name:'Next word'}).click();
  }
  await page.getByRole('heading',{name:'Trail complete!'}).waitFor();
  assert.equal(await page.evaluate(()=>gameAudioNotes),noteCount,'Muted play creates no audio notes');
  await sound.click();await page.waitForTimeout(250);
  assert.ok(await page.evaluate(()=>gameAudioNotes)>noteCount,'Enabling sound synthesizes audio locally');
  await page.screenshot({path:'.qa/games-trail.png',fullPage:true});
  await page.getByRole('button',{name:/Play Memory Match/}).click();
  // Discover card positions as a player would, then match the recorded faces.
  const faces=[];
  for(let i=0;i<deck.cards.length*2;i+=2){
    const buttons=page.locator('.memory-card');
    for(const j of [i,i+1]){const button=buttons.nth(j);if(await button.isEnabled())await button.click();faces[j]=await button.getAttribute('aria-label');}
    await page.waitForTimeout(1500);
  }
  for(const card of deck.cards){
    const indices=faces.map((f,i)=>[ `Word: ${card.answer}`, `Clue: ${card.clue}` ].includes(f?.replace(/, matched$/,''))?i:-1).filter(i=>i>=0);
    assert.equal(indices.length,2);
    for(const i of indices){const button=page.locator('.memory-card').nth(i);if(await button.isEnabled())await button.click();}
  }
  await page.getByRole('heading',{name:'Notebook cleared!'}).waitFor();
  await nav('Practice').click();
  assert.ok(await page.getByRole('heading',{name:'Your next practice session'}).isVisible());
  if(!aiMode)assert.equal(await page.locator('.session-row').count(),0,'Games never write quiz scores');
  await nav('Games').click();await page.getByRole('heading',{name:'Notebook cleared!'}).waitFor();
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile games must fit');
  await page.screenshot({path:'.qa/games-mobile.png',fullPage:true});
  await page.locator('.mobile-nav').getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByText('App files cached',{exact:true}).waitFor();
  // Source-mode run verifies disconnected navigation. AI run already generated
  // its new questions disconnected, after a deliberate test-profile SW reset.
  await context.setOffline(!aiMode);await page.reload();
  await page.locator('.mobile-nav').getByRole('button',{name:'Games',exact:true}).click();
  await page.getByRole('combobox',{name:'Study subject'}).selectOption(sample);
  await page.getByText('Ready to replay offline',{exact:false}).waitFor();
  await page.getByRole('button',{name:/Play Word Trail/}).click();
  await page.getByRole('heading',{name:'Find the missing word.'}).waitFor();
  assert.equal((await readDeck()).find(d=>d.id===sample).cards[0].id,deck.cards[0].id,'Same saved game restored offline');
  if(!aiMode){
    await page.locator('.mobile-nav').getByRole('button',{name:'Study desk',exact:true}).click();
    await page.getByRole('button',{name:'Delete Photosynthesis · sample chapter',exact:true}).click();
    await page.getByRole('button',{name:'Remove material',exact:true}).click();
    await page.locator('.mobile-nav').getByRole('button',{name:'Games',exact:true}).click();
    await page.getByRole('heading',{name:'Bring something to play with.'}).waitFor();
    assert.equal((await readDeck()).length,0,'Deleting material removes dependent game sets');
  }
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${aiMode?'real offline local-AI':'source'} generation, Word Trail, Memory Match, audio/mute, citations, separate quiz scores, mobile layout and ${aiMode?'saved-game reload':'offline saved-game restart'}.`);
}finally{await context.close();await browser?.close();}
