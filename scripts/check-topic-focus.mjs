import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.MARGINLOOM_TEST_URL||'http://localhost:4173');await page.getByRole('button',{name:'Add study material',exact:true}).click();
 await page.locator('input[type=file]').setInputFiles({name:'Architecture.txt',mimeType:'text/plain',buffer:Buffer.from('Assembly language uses mnemonic instructions. Full adders are circuits that add three binary inputs. A ripple carry adder is a circuit made by chaining full adders. All values here are hexadecimal.')});await page.getByRole('button',{name:'Add material',exact:true}).click();
 await page.locator('.sidebar').getByRole('button',{name:'Practice',exact:true}).click();await page.locator('.practice-focus>summary').click();
 const panel=page.locator('.exam-focus-panel');await panel.getByRole('checkbox',{name:'Architecture',exact:true}).check();
 await panel.getByRole('checkbox',{name:'Use exam focus in Practice'}).check();
 await panel.getByRole('checkbox',{name:'Topic hexadecimal in Architecture.txt',exact:true}).waitFor();
 assert.equal(await panel.getByRole('checkbox',{name:'Topic All values here in Architecture.txt',exact:true}).count(),0);
 await panel.getByRole('checkbox',{name:'Topic Full adders in Architecture.txt',exact:true}).check();
 const topic=panel.locator('.topic-option').filter({has:page.getByRole('checkbox',{name:'Topic Full adders in Architecture.txt',exact:true})});
 await topic.getByText('Check passages',{exact:false}).click();assert.match(await topic.innerText(),/three binary inputs/);
 await topic.getByRole('textbox',{name:'Label for topic Full adders',exact:true}).fill('Binary addition');await topic.getByRole('textbox',{name:'Label for topic Full adders',exact:true}).press('Tab');
 await panel.getByRole('textbox',{name:'Add topic in Architecture.txt',exact:true}).fill('mnemonic instructions');await panel.getByRole('button',{name:'Add topic',exact:true}).click();
 await panel.getByRole('checkbox',{name:'Topic mnemonic instructions in Architecture.txt',exact:true}).waitFor();
 await page.reload();await page.locator('.sidebar').getByRole('button',{name:'Practice',exact:true}).click();await page.locator('.practice-focus>summary').click();await panel.getByRole('checkbox',{name:'Topic Full adders in Architecture.txt',exact:true}).waitFor();assert.ok(await panel.getByRole('checkbox',{name:'Topic Full adders in Architecture.txt',exact:true}).isChecked());assert.match(await panel.innerText(),/Binary addition/);
 assert.ok(await panel.getByRole('checkbox',{name:'Topic mnemonic instructions in Architecture.txt',exact:true}).isChecked());
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.qa/topic-focus-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: topic choices, source inspection, label editing, custom source phrases, reload persistence and phone layout.');
}finally{await browser.close();}
