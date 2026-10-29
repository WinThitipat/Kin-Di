const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const menus=JSON.parse(fs.readFileSync('data/curated-menus-2026-10-29.json','utf8'));
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.goto('http://127.0.0.1:3100/community');await page.waitForLoadState('networkidle');
 for(const menu of menus){const card=page.locator('.shared-menu-card').filter({hasText:menu.name});assert.equal(await card.count(),1);assert(await card.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0),menu.name+' image');}
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`artifacts/curated-menus/community-${width}.png`,fullPage:true});
 await page.goto('http://127.0.0.1:3100/');await page.waitForLoadState('networkidle');
 for(const menu of menus)await page.getByText(menu.name,{exact:true}).first().waitFor();
 console.log(`PASS ${width}: all eight database recipes visible, images load, no overflow; homepage catalog includes all eight`);
 await page.close();
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
