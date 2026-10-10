import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark'});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4176/');await page.getByRole('heading',{name:'Study desk',exact:true}).waitFor();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(23, 24, 29)');
 await page.getByRole('button',{name:'Try a sample chapter',exact:true}).first().click();await page.locator('.document-row').waitFor();
 await page.getByRole('button',{name:'Dismiss notice'}).click();
 for(const tab of ['Study desk','Practice','Games']){
  await page.getByRole('button',{name:tab,exact:true}).first().click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`.qa/charcoal-${tab.replaceAll(' ','-')}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'Study desk',exact:true}).first().click();
 await page.getByRole('button',{name:'Add study material',exact:true}).click();assert.equal(await page.getByRole('dialog').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(35, 36, 44)');await page.screenshot({path:'.qa/charcoal-dialog.png'});await page.getByRole('button',{name:'Close dialog'}).click();
 await page.getByRole('navigation',{name:'Study tools'}).getByRole('button',{name:/Teach it back/}).click();await page.getByRole('dialog').waitFor();assert.equal(await page.getByRole('dialog').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(35, 36, 44)');await page.getByRole('button',{name:'Close learning window'}).click();
 await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.getByRole('button',{name:'Switch to light mode'}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');await page.screenshot({path:'.qa/charcoal-light-control.png'});
 await page.getByRole('button',{name:'Switch to dark mode'}).click();await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.setViewportSize({width:390,height:844});
 for(const tab of ['Study desk','Practice','Games']){await page.getByRole('button',{name:tab,exact:true}).first().click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tab);await page.screenshot({path:`.qa/charcoal-mobile-${tab.replaceAll(' ','-')}.png`,fullPage:true});}
 // WCAG contrast for the semantic dark text against both main and panel surfaces.
 const rgb=h=>h.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 const lum=h=>rgb(h).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
 for(const fg of ['eeedf3','adaebb'])for(const bg of ['17181d','23242c','292a33']){const ratio=(lum(fg)+.05)/(lum(bg)+.05);assert(ratio>=4.5);}
 assert((lum('f8fbf9')+.05)/(lum('356b55')+.05)>=4.5);
 assert.deepEqual(errors,[]);console.log('PASS: charcoal palette, readable semantic text/action colors, theme persistence, dialogs/lazy tools, light mode and three mobile layouts.');
}finally{await browser.close();}
