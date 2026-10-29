const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:3100';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
const context=await browser.newContext();const api=context.request;
const response=await api.get(base+'/api/recipes');assert.equal(response.status(),200);assert.equal(response.headers()['cache-control'],'no-store');const data=await response.json();const id=data.recipes[0].id;
for(const path of ['/api/recipes','/api/admin/update-recipe','/api/admin/authorize-recipe-deletion']){
 assert.equal((await api.post(base+path,{headers:{origin:'https://foreign.example'},data:{}})).status(),403);
 assert.equal((await api.post(base+path,{headers:{origin:base,'Content-Type':'application/json'},data:'{bad'})).status(),400);
 const limit=path.includes('deletion')?5000:2000100;
 assert.equal((await api.post(base+path,{headers:{origin:base,'Content-Type':'application/json'},data:JSON.stringify({large:'x'.repeat(limit)})})).status(),413);
}
for(const width of [390,1440]){
 const page=await context.newPage();await page.setViewportSize({width,height:900});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const path of ['/','/roulette','/fridge','/community','/recipes/'+id,'/recipes/%25invalid']){await page.goto(base+path);await page.waitForLoadState('networkidle');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path);}
 let fail=true;await page.route('**/api/recipes',route=>fail?route.fulfill({status:503,json:{error:'ทดสอบฐานข้อมูลไม่พร้อม'}}):route.continue());
 await page.goto(base+'/recipes/'+id);await page.getByRole('heading',{name:'โหลดสูตรอาหารไม่สำเร็จ'}).waitFor();fail=false;await page.getByRole('button',{name:'ลองอีกครั้ง',exact:true}).click();await page.locator('#recipe-title').waitFor();
 assert.deepEqual(errors,[]);console.log(`PASS ${width}: all routes, malformed ID, layout, database outage/retry; no runtime errors`);await page.close();
}
console.log('PASS all three API endpoints: origin rejection, malformed JSON, streamed body limits; database GET/no-store');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
