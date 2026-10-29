const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:320,height:740}});
  await require('./mock-recipe-api.cjs').mockRecipeAPI(context);
  await context.addInitScript(()=>{
   localStorage.setItem('kindi-recipe-draft-v1','{broken');
   Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3100/community');await page.waitForLoadState('networkidle');
  await page.locator('#recipe-name').fill('พื้นที่เต็ม');
  await page.getByRole('status').filter({hasText:'บันทึกร่างไม่ได้'}).waitFor();
  assert.equal(await page.locator('#recipe-name').inputValue(),'พื้นที่เต็ม');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log('PASS: corrupt draft ignored; quota failure warns and preserves typed input; 320px no overflow');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
