const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const context=await browser.newContext();const page=await context.newPage();const wongnai=[];
 page.on('request',request=>{if(new URL(request.url()).hostname.endsWith('wongnai.com'))wongnai.push(request.url());});
 for(const route of ['/community','/','/recipes/shared-1793208511753']){
  await page.goto('http://127.0.0.1:3100'+route);await page.waitForLoadState('networkidle');
  const image=page.locator('img[src="/images/crispy-pork-garlic.webp"]').first();await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.images].some(image=>image.src.endsWith('/images/crispy-pork-garlic.webp')&&image.complete&&image.naturalWidth===640));
 }
 assert.deepEqual(wongnai,[]);
 assert.deepEqual((await context.cookies()).filter(cookie=>cookie.domain.includes('wongnai')),[]);
 const image=await page.request.get('http://127.0.0.1:3100/images/crispy-pork-garlic.webp');
 assert.equal(image.status(),200);assert.equal(image.headers()['content-type'],'image/webp');assert((await image.body()).length<100000);
 console.log('PASS: community, home and detail show the local 640px WebP; under 100 KB; zero Wongnai network requests or cookies');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
