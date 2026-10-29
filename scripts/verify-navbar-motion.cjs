const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const width of [390,1440])for(const reduced of [false,true]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:reduced?'reduce':'no-preference'});
 await context.addInitScript(()=>{const original=Element.prototype.animate;window.__navMotions=[];Element.prototype.animate=function(frames,options){if(this.id==='main-content')window.__navMotions.push({frames,options});return original.call(this,frames,options);};});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:3100/');await page.waitForLoadState('networkidle');
 for(const [label,path] of [['ค้นตู้เย็น','/fridge'],['แบ่งปันเมนู','/community'],['วันนี้กินอะไร','/']]){
 await page.getByRole('navigation',{name:'เมนูหลัก'}).getByRole('link',{name:label}).click();await page.waitForURL('**'+path);await page.waitForLoadState('networkidle');
 await page.waitForFunction(()=>{const nav=document.querySelector('.primary-nav');const a=nav.querySelector('a[aria-current="page"]').getBoundingClientRect();const b=nav.querySelector('.nav-active-indicator').getBoundingClientRect();return Math.abs(a.x-b.x)<1&&Math.abs(a.width-b.width)<1;});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 const motions=await page.evaluate(()=>window.__navMotions);
 assert.equal(motions.length,reduced?0:3);
 if(!reduced){assert.equal(motions[0].options.duration,240);assert.equal(motions[0].frames[0].transform,'translateX(16px)');assert.equal(motions[2].frames[0].transform,'translateX(-16px)');}
 await page.getByRole('navigation',{name:'เมนูหลัก'}).getByRole('link',{name:'ค้นตู้เย็น'}).focus();await page.keyboard.press('Enter');await page.waitForURL('**/fridge');await page.waitForLoadState('networkidle');
 assert.equal((await page.evaluate(()=>window.__navMotions)).length,motions.length,'keyboard navigation should not animate content');
 if(reduced)assert.equal(await page.locator('.nav-active-indicator').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 assert.deepEqual(errors,[]);console.log(`PASS ${width} ${reduced?'reduced':'normal'}: active line alignment, forward/back direction, 240ms route slide, keyboard, no overflow/errors`);await context.close();
}
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
