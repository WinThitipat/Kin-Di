const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3100';
const pin=process.env.TEST_ADMIN_PIN;
if(!pin)throw new Error('Set TEST_ADMIN_PIN');
const key='kindi-recipe-draft-v1';
const headers={origin:base};
fs.mkdirSync('artifacts/recipe-functions',{recursive:true});
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});
const created=[];
try{
 for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
 await context.addInitScript(()=>{
  Object.defineProperty(navigator,'share',{value:undefined,configurable:true});
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copiedLink=text;}},configurable:true});
 });
 const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/community');await page.waitForLoadState('networkidle');
 const name=`[ทดสอบระบบ] ฟังก์ชันสูตร ${width} ${Date.now()}`;
 await page.locator('#recipe-name').fill(name);
 await page.locator('#recipe-desc').fill('ทดสอบร่าง แก้ไข และแชร์ จะถูกซ่อนหลังทดสอบ');
 await page.locator('#recipe-link').fill('https://www.wongnai.com/recipes');
 await page.locator('#recipe-image-upload').setInputFiles('public/images/thai-table.jpg');await page.getByAltText('ตัวอย่างรูปอาหาร').waitFor();
 await page.getByRole('button',{name:'ถัดไป',exact:true}).click();
 await page.reload();await page.waitForLoadState('networkidle');
 assert.equal(await page.locator('#community-step-title').innerText(),'หมวดหมู่และเวลา');
 assert.equal(await page.locator('#recipe-name').inputValue(),name);
 await page.goto(base+'/fridge');await page.goto(base+'/community');await page.waitForLoadState('networkidle');
 assert.equal(await page.locator('#recipe-name').inputValue(),name);
 await page.getByRole('button',{name:'ถัดไป',exact:true}).click();
 await page.getByRole('button',{name:'ข้าวสวยหอมมะลิ',exact:true}).click();
 await page.getByRole('button',{name:'ถัดไป: ตรวจสอบสูตร'}).click();
 const saved=page.waitForResponse(r=>r.url()===base+'/api/recipes'&&r.request().method()==='POST');
 await page.getByRole('button',{name:'บันทึกเมนูอาหารเข้าสำรับ!'}).click();
 const response=await saved;const body=await response.json();assert.equal(response.status(),201);
 const recipe=body.recipe;created.push(recipe.id);
 await page.getByRole('status').filter({hasText:'บันทึกเมนูลงฐานข้อมูลเรียบร้อยแล้ว'}).waitFor();
 await page.waitForFunction(k=>localStorage.getItem(k)===null,key);
 let card=page.locator('.shared-menu-card').filter({hasText:name});
 await card.getByRole('button',{name:`แชร์เมนู ${name}`,exact:true}).click();
 assert.equal(await page.evaluate(()=>window.__copiedLink),base+'/recipes/'+recipe.id);
 await card.getByRole('button',{name:'แก้ไขสูตร',exact:true}).click();
 assert.equal(await page.locator('#recipe-name').inputValue(),name);
 await page.locator('#recipe-name').fill(name+' แก้ไข');
 await page.getByRole('button',{name:'ถัดไป',exact:true}).click();await page.getByRole('button',{name:'ถัดไป',exact:true}).click();
 await page.getByRole('button',{name:'ถัดไป: ตรวจสอบสูตร'}).click();
 await page.locator('#edit-admin-pin').fill('000000');
 await page.getByRole('button',{name:'ยืนยัน PIN และบันทึกการแก้ไข'}).click();
 await page.getByRole('alert').filter({hasText:'PIN ไม่ถูกต้อง'}).waitFor();
 assert.equal(await page.locator('#edit-admin-pin').inputValue(),'');
 assert(!JSON.stringify(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)).includes('000000'));
 await page.reload();await page.waitForLoadState('networkidle');
 assert.equal(await page.locator('#recipe-name').inputValue(),name+' แก้ไข');
 await page.locator('#edit-admin-pin').fill(pin);
 const updated=page.waitForResponse(r=>r.url().includes('/api/admin/update-recipe'));
 await page.getByRole('button',{name:'ยืนยัน PIN และบันทึกการแก้ไข'}).click();
 const updateResponse=await updated;assert.equal(updateResponse.status(),200,await updateResponse.text());
 await page.getByRole('status').filter({hasText:'บันทึกการแก้ไขแล้ว'}).waitFor();
 await page.waitForFunction(k=>localStorage.getItem(k)===null,key);
 const get=await (await page.request.get(base+'/api/recipes')).json();
 const actual=get.recipes.find(r=>r.id===recipe.id);assert.equal(actual.name,name+' แก้ไข');assert.equal(actual.created_at,recipe.created_at);
 const stale=await page.request.post(base+'/api/admin/update-recipe',{headers,data:{...response.request().postDataJSON(),recipeId:recipe.id,pin,expectedVersion:recipe.created_at}});
 assert.equal(stale.status(),409);
 const other=await browser.newContext();
 await other.addInitScript(recipe=>localStorage.setItem('kindi:shared-recipes:v1',JSON.stringify([{...recipe,id:'local-only-should-not-appear',name:'LOCAL_ONLY_SHOULD_NOT_RENDER'}])),actual);
 const detail=await other.newPage();
 for(const path of ['/', '/roulette', '/fridge', '/community']) {
   const read=detail.waitForResponse(r=>r.url()===base+'/api/recipes'&&r.request().method()==='GET');
   await detail.goto(base+path);assert.equal((await read).status(),200);await detail.waitForLoadState('networkidle');
   await detail.getByText(actual.name,{exact:true}).first().waitFor();
   assert.equal(await detail.getByText('LOCAL_ONLY_SHOULD_NOT_RENDER',{exact:true}).count(),0);
 }
 console.log(`PASS ${width}: home, roulette, fridge, community all read the database and exclude browser-only recipes`);
 await detail.goto(base+'/recipes/'+recipe.id);await detail.waitForLoadState('networkidle');
 assert.equal(await detail.locator('#recipe-title').innerText(),name+' แก้ไข');await other.close();
 await page.goto(base+'/recipes/'+recipe.id);await page.waitForLoadState('networkidle');
 await page.getByRole('button',{name:`แชร์เมนู ${actual.name}`,exact:true}).click();assert.equal(await page.evaluate(()=>window.__copiedLink),base+'/recipes/'+recipe.id);
 await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__nativeShare=data;}}));
 await page.getByRole('button',{name:`แชร์เมนู ${actual.name}`,exact:true}).click();assert.equal((await page.evaluate(()=>window.__nativeShare)).url,base+'/recipes/'+recipe.id);
 await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}});});
 await page.getByRole('button',{name:`แชร์เมนู ${actual.name}`,exact:true}).click();assert.equal(await page.getByLabel('ลิงก์สำหรับแชร์').inputValue(),base+'/recipes/'+recipe.id);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`artifacts/recipe-functions/detail-${width}.png`,fullPage:true});
 await page.goto(base+'/community');await page.waitForLoadState('networkidle');await page.screenshot({path:`artifacts/recipe-functions/community-${width}.png`,fullPage:true});
 assert.deepEqual(errors,[]);
 console.log(`PASS ${width}: draft reload/navigation, image restored, cleared after save, PIN wrong/correct, edit reload, same identity, stale edit blocked, separate browser, share native/copy/manual, no overflow/errors`);
 await context.close();
 }
}finally{
 for(const recipeId of created){const r=await fetch(base+'/api/admin/authorize-recipe-deletion',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({recipeId,pin})});assert.equal(r.status,200,'cleanup');}
 await browser.close();
}
})().catch(e=>{console.error(e);process.exitCode=1});
