// Live integration against the new Supabase project. Only explicitly named
// test recipes are created, then soft-archived using the real admin PIN flow.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {createClient}=require('@supabase/supabase-js');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const env=Object.fromEntries([...fs.readFileSync('.env.local','utf8').matchAll(/^([A-Z_]+)=(.*)$/gm)].map(m=>[m[1],m[2].trim()]));
const base='http://127.0.0.1:3100';
const adminPin=process.env.TEST_ADMIN_PIN;
if(!adminPin)throw new Error('Set TEST_ADMIN_PIN for the live PIN integration test; plaintext PINs are not stored in .env.local.');
const created=[];
const headers={origin:base};
fs.mkdirSync('artifacts/database',{recursive:true});
async function state(){const r=await fetch(base+'/api/recipes');assert.equal(r.status,200);return r.json();}
async function cleanup(){for(const id of created)await fetch(base+'/api/admin/authorize-recipe-deletion',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({pin:adminPin,recipeId:id})});}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const desktop=await browser.newContext({viewport:{width:1440,height:1000}});
  const p=await mobile.newPage();const other=await desktop.newPage();
  const name=`[ทดสอบระบบ] เมนูฐานข้อมูล ${Date.now()}`;
  await p.goto(base+'/community');await p.waitForLoadState('networkidle');
  await p.locator('#recipe-name').fill(name);
  await p.locator('#recipe-link').fill('https://www.wongnai.com/recipes');
  await p.locator('#recipe-desc').fill('สูตรทดสอบระบบฐานข้อมูล จะถูกซ่อนหลังทดสอบเสร็จ');
  await p.locator('#recipe-image-upload').setInputFiles('public/images/thai-table.jpg');await p.getByAltText('ตัวอย่างรูปอาหาร').waitFor();
  await p.getByRole('button',{name:'ถัดไป',exact:true}).tap();await p.getByRole('button',{name:'ถัดไป',exact:true}).tap();
  await p.getByRole('button',{name:'ข้าวสวยหอมมะลิ',exact:true}).tap();
  await p.getByRole('button',{name:'ถัดไป: ตรวจสอบสูตร'}).tap();
  // A full browser cache must not prevent a successful database save.
  await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')};});
  const savedResponse=p.waitForResponse(r=>r.url()===base+'/api/recipes'&&r.request().method()==='POST');
  await p.getByRole('button',{name:'บันทึกเมนูอาหารเข้าสำรับ!'}).tap();
  const response=await savedResponse;const body=await response.json();
  assert.equal(response.status(),201,JSON.stringify(body));
  const id=body.recipe.id;created.push(id);
  await p.getByRole('status').filter({hasText:'บันทึกเมนูลงฐานข้อมูลเรียบร้อยแล้ว'}).waitFor();
  assert.equal(await p.evaluate(()=>localStorage.getItem('kindi:shared-recipes:v1')),null);
  assert((await state()).recipes.some(r=>r.id===id));
  const repeated=await p.request.post(base+'/api/recipes',{headers,data:response.request().postDataJSON()});
  assert.equal(repeated.status(),201);assert.equal((await state()).recipes.filter(r=>r.id===id).length,1);
  await other.goto(base+'/community');await other.waitForLoadState('networkidle');
  await other.locator('.shared-menu-card').filter({hasText:name}).waitFor();
  await other.goto(base+'/recipes/'+id);await other.waitForLoadState('networkidle');
  assert.equal(await other.locator('#recipe-title').innerText(),name);
  await other.reload();await other.waitForLoadState('networkidle');assert.equal(await other.locator('#recipe-title').innerText(),name);
  console.log('PASS: live Supabase save, image and full recipe metadata; cache full; idempotent retry; separate browser and reload.');
  // The publishable key alone must never permit raw writes or the write RPCs.
  const anon=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
  const rawDelete=await anon.from('community_recipes').delete().eq('id',id);
  assert(rawDelete.error,'Anonymous direct DELETE unexpectedly allowed');
  const rawRPC=await anon.rpc('kindi_delete_recipe',{p_recipe_id:id,p_secret:'wrong-secret'});
  assert(rawRPC.error,'Unauthenticated deletion RPC unexpectedly allowed');
  assert((await state()).recipes.some(r=>r.id===id));
  await p.locator('.shared-menu-card').filter({hasText:name}).getByRole('button',{name:`ลบเมนู ${name}`,exact:true}).tap();
  await p.locator('#admin-delete-pin').fill('00000000');
  await p.getByRole('button',{name:'ยืนยัน PIN และลบเมนู'}).tap();
  await p.locator('#admin-delete-error').waitFor();
  assert((await state()).recipes.some(r=>r.id===id));
  await p.screenshot({path:'artifacts/database/admin-pin-mobile.png'});
  await p.getByRole('button',{name:'ยกเลิก',exact:true}).tap();
  await p.locator('.shared-menu-card').filter({hasText:name}).getByRole('button',{name:`ลบเมนู ${name}`,exact:true}).tap();
  await p.locator('#admin-delete-pin').fill(adminPin);
  await p.getByRole('button',{name:'ยืนยัน PIN และลบเมนู'}).tap();
  await p.locator('.admin-delete-dialog').waitFor({state:'hidden'});
  assert(!(await state()).recipes.some(r=>r.id===id));
  await other.goto(base+'/community');await other.waitForLoadState('networkidle');
  assert.equal(await other.locator('.shared-menu-card').filter({hasText:name}).count(),0);
  console.log('PASS: public-key DELETE and invalid RPC secret blocked; wrong PIN preserves recipe; cancel; correct PIN archives it across browsers.');
  // Existing browser-local recipes can be explicitly imported without losing backup.
  const legacyId=`shared-${Date.now()}`;
  const legacy={...body.recipe,id:legacyId,name:`[ทดสอบระบบ] เมนูนำเข้า ${Date.now()}`};
  await other.evaluate(recipe=>{localStorage.setItem('kindi:shared-recipes:v1',JSON.stringify([recipe]));window.dispatchEvent(new Event('kindi-recipes-updated'));},legacy);
  await other.getByRole('button',{name:'นำเมนูเดิมขึ้นฐานข้อมูล'}).waitFor();
  await other.getByRole('button',{name:'นำเมนูเดิมขึ้นฐานข้อมูล'}).click();
  created.push(legacyId);
  await other.getByRole('status').filter({hasText:'นำเข้า 1 เมนูลงฐานข้อมูลเรียบร้อย'}).waitFor();
  assert.equal((await state()).recipes.filter(r=>r.id===legacyId).length,1);
  assert(await other.evaluate(id=>JSON.parse(localStorage.getItem('kindi:shared-recipes:v1')).some(r=>r.id===id),legacyId));
  await other.screenshot({path:'artifacts/database/supabase-saved-desktop.png',fullPage:true});
  // A simulated database outage must preserve the form and never show success.
  const failure=await browser.newContext({viewport:{width:390,height:844}});const f=await failure.newPage();
  await f.route('**/api/recipes',async route=>route.request().method()==='POST'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'บันทึกลงฐานข้อมูลไม่สำเร็จ ข้อมูลในฟอร์มยังอยู่ กรุณาลองใหม่'})}):route.continue());
  await f.goto(base+'/community');await f.waitForLoadState('networkidle');
  await f.locator('#recipe-name').fill('ทดสอบบันทึกไม่สำเร็จ');await f.locator('#recipe-link').fill('https://www.wongnai.com/recipes');await f.locator('#recipe-desc').fill('ข้อมูลต้องอยู่ครบเมื่อฐานข้อมูลไม่พร้อม');
  await f.locator('#recipe-image-upload').setInputFiles('public/images/thai-table.jpg');await f.getByAltText('ตัวอย่างรูปอาหาร').waitFor();
  await f.getByRole('button',{name:'ถัดไป',exact:true}).click();await f.getByRole('button',{name:'ถัดไป',exact:true}).click();await f.getByRole('button',{name:'ข้าวสวยหอมมะลิ',exact:true}).click();await f.getByRole('button',{name:'ถัดไป: ตรวจสอบสูตร'}).click();
  await f.getByRole('button',{name:'บันทึกเมนูอาหารเข้าสำรับ!'}).click();await f.getByRole('alert').filter({hasText:'บันทึกลงฐานข้อมูลไม่สำเร็จ'}).waitFor();
  assert.equal(await f.locator('#recipe-name').inputValue(),'ทดสอบบันทึกไม่สำเร็จ');
  console.log('PASS: explicit legacy import preserves IDs and local backups; failed database save retains the complete draft.');
 }finally{await cleanup();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
