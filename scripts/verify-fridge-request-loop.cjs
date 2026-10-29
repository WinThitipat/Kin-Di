const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});let reads=0;const errors=[];
 page.on('request',r=>{if(r.url().endsWith('/api/recipes'))reads++;});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3100/fridge');await page.waitForLoadState('networkidle');await page.waitForTimeout(1000);
 assert.equal(reads,1,'initial load must issue only one recipes request');
 await page.evaluate(()=>{for(let i=0;i<10;i++)window.dispatchEvent(new Event('kindi-ingredients-updated'));});
 await page.waitForTimeout(700);assert.equal(reads,1,'ingredient events must not reload recipes');
 await page.evaluate(()=>window.dispatchEvent(new Event('kindi-recipes-updated')));await page.waitForLoadState('networkidle');await page.waitForTimeout(700);assert.equal(reads,2,'recipe event reloads once');
 await page.getByRole('navigation',{name:'เมนูหลัก'}).getByRole('link',{name:'แบ่งปันเมนู'}).click();await page.waitForURL('**/community');await page.waitForLoadState('networkidle');
 const before=reads;
 await page.getByRole('navigation',{name:'เมนูหลัก'}).getByRole('link',{name:'ค้นตู้เย็น'}).click();await page.waitForURL('**/fridge');await page.waitForLoadState('networkidle');await page.waitForTimeout(1000);
 assert.equal(reads,before+1,'returning must not leave duplicate listeners');assert.deepEqual(errors,[]);
 console.log(`PASS ${width}: one initial GET; 10 ingredient events cause zero GETs; recipe event causes one GET; navigation has no duplicate listeners`);await page.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
