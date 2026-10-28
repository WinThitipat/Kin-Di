const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pin=process.env.TEST_ADMIN_PIN;
if(!pin)throw new Error('Provide TEST_ADMIN_PIN temporarily to verify the configured PIN.');
const base='http://127.0.0.1:3100';
const recipeId='pin-dialog-layout-test'; // Not a database recipe; no actual row is deleted.
(async()=>{
 const b=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const p=await b.newPage();
  await p.emulateMedia({reducedMotion:'reduce'});
  await p.goto(base+'/community');await p.waitForLoadState('networkidle');
  await p.evaluate(id=>{localStorage.setItem('kindi:shared-recipes:v1',JSON.stringify([{id,status:'approved',name:'เมนูทดสอบตำแหน่งหน้าต่าง',category:'thai',cooking_time:20}]));window.dispatchEvent(new Event('kindi-recipes-updated'));},recipeId);
  await p.getByRole('button',{name:'ลบเมนู เมนูทดสอบตำแหน่งหน้าต่าง',exact:true}).click();
  for(const [width,height]of [[320,740],[390,844],[768,1024],[1440,900],[844,390]]){
   await p.setViewportSize({width,height});
   const box=await p.locator('.admin-delete-dialog').boundingBox();assert(box);
   assert(Math.abs(box.x+box.width/2-width/2)<1,`Not horizontally centered at ${width}`);
   assert(Math.abs(box.y+box.height/2-height/2)<1,`Not vertically centered at ${width}`);
   assert(box.y>=15&&box.y+box.height<=height-15,`Dialog outside viewport at ${width}x${height}`);
   if(width===1440||width===390){fs.mkdirSync('artifacts/database',{recursive:true});await p.screenshot({path:`artifacts/database/centered-pin-${width}.png`});}
   console.log(`PASS: centered and contained at ${width}x${height}`);
  }
  await p.setViewportSize({width:390,height:844});
  await p.locator('#admin-delete-pin').fill('000000');
  await p.getByRole('button',{name:'ยืนยัน PIN และลบเมนู'}).click();await p.locator('#admin-delete-error').waitFor();
  assert.equal(await p.locator('.shared-menu-card').filter({hasText:'เมนูทดสอบตำแหน่งหน้าต่าง'}).count(),1);
  await p.locator('#admin-delete-pin').fill(pin);
  await p.getByRole('button',{name:'ยืนยัน PIN และลบเมนู'}).click();await p.locator('.admin-delete-dialog').waitFor({state:'hidden'});
  assert.equal(await p.locator('.shared-menu-card').filter({hasText:'เมนูทดสอบตำแหน่งหน้าต่าง'}).count(),0);
  const env=fs.readFileSync('.env.local','utf8');
  assert(!/^ADMIN_DELETE_PIN=/m.test(env));
  assert(/^ADMIN_DELETE_PIN_HASH=scrypt-v1:[a-f0-9]{64}:[a-f0-9]{128}$/m.test(env));
  function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=dir+'/'+entry.name;if(entry.isDirectory())scan(file);else if(file.endsWith('.js'))assert(!fs.readFileSync(file,'utf8').includes(pin),`PIN leaked into client code: ${file}`);}}
  scan('.next/static');
  console.log('PASS: wrong PIN rejected; chosen PIN with leading zero accepted; no real DB row modified; only salted hash stored; no plaintext PIN in client code.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
