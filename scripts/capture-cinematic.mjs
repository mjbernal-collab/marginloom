import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
await mkdir('output/promo-cinematic',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'output/promo-cinematic/capture',size:{width:1440,height:900}}});
const page=await context.newPage(),video=page.video(),started=Date.now();const segments={};
const mark=()=>((Date.now()-started)/1000);
const hold=ms=>page.waitForTimeout(ms);
try{
 await page.goto('http://127.0.0.1:4175');await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();
 if(await page.getByRole('button',{name:'Switch to light mode'}).count())await page.getByRole('button',{name:'Switch to light mode'}).click();
 await page.getByRole('button',{name:'Try a sample chapter',exact:true}).first().click();await page.locator('.document-row').waitFor();
 await page.getByRole('combobox',{name:'Study document',exact:true}).selectOption({label:'Photosynthesis · sample chapter'});
 segments.chat={start:mark()};
 await page.getByRole('textbox',{name:'Ask a question about your notes'}).pressSequentially('Where does the Calvin cycle happen?',{delay:45});
 await page.getByRole('button',{name:'Send question',exact:true}).click();await page.locator('.source-chip').first().waitFor();await hold(1500);segments.chat.end=mark();
 segments.source={start:mark()};await page.locator('.source-chip').first().click();await page.getByRole('heading',{name:'Back to the source',exact:true}).waitFor();await hold(2500);segments.source.end=mark();await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.getByRole('button',{name:'Games',exact:true}).first().click();await page.getByRole('button',{name:'Build games from notes',exact:true}).click();await page.getByRole('button',{name:/Build it, letter by letter/}).click();
 segments.trail={start:mark()};await hold(500);await page.locator('.word-trail').focus();await page.keyboard.type('photosynthesis',{delay:105});await hold(250);await page.keyboard.press('Enter');await hold(1100);segments.trail.end=mark();
 await page.getByRole('button',{name:'Play Memory Match',exact:true}).click();segments.memory={start:mark()};await hold(450);const cards=page.locator('.memory-card');await cards.nth(0).click();await hold(650);await cards.nth(1).click();await hold(1100);await cards.nth(2).click();await hold(650);segments.memory.end=mark();
 await page.getByRole('button',{name:'Study Flashcards',exact:true}).click();segments.flash={start:mark()};await hold(500);await page.locator('.flashcard').click();await hold(1600);segments.flash.end=mark();
 console.log('Recorded real source lookup, source opening, Word Trail typing, Memory Match flips, and flashcard reveal.');
}finally{await context.close();await browser.close();}
await writeFile('output/promo-cinematic/capture.json',JSON.stringify({file:await video.path(),segments},null,2));
