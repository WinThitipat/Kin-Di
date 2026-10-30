const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
fs.mkdirSync('artifacts/card-motion',{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const width of [320,390,1440]) for(const reduced of [false,true]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<640,hasTouch:width<640,reducedMotion:reduced?'reduce':'no-preference'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:3100')+'/');await page.waitForLoadState('networkidle');
  await page.getByRole('button',{name:'เลือกไพ่มื้อนี้'}).click();
  const modal=page.locator('dialog.kindi-modal[open]');await modal.waitFor();
  const cards=modal.locator('[data-deal-card]');assert.equal(await cards.count(),5);
  const first=cards.first().locator('button');
  if(!reduced){
   assert(await first.isDisabled());
   const timings=await cards.first().evaluate(el=>({duration:getComputedStyle(el).animationDuration,from:el.style.getPropertyValue('--from-x')}));
   assert.equal(timings.duration,'0.8s');
   assert.equal(await cards.first().evaluate(el=>getComputedStyle(el).opacity),'1');
   assert.equal(await modal.evaluate(el=>getComputedStyle(el).opacity),'1');
   assert(await cards.first().evaluate(el=>el.getAnimations().every(a=>a.effect.getKeyframes().every(f=>f.opacity===undefined||Number(f.opacity)===1))));assert.notEqual(timings.from,'0.0px');
   await page.screenshot({path:`artifacts/card-motion/dealing-${width}.png`});
   await modal.getByText('เลือกไพ่ที่ใช่ แล้วเปิดเลย!',{exact:true}).waitFor();
  }else{
   await first.waitFor({state:'visible'});assert(await first.isEnabled());
   assert.equal(await cards.first().evaluate(el=>getComputedStyle(el).animationName),'none');
  }
  if(width<640) {
   const centered=await cards.last().evaluate(el=>{const a=el.getBoundingClientRect();const b=el.parentElement.getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2)<1;});assert(centered,'last card must be centered');
  }
  await first.click();await modal.locator('.kindi-reveal-panel').waitFor();
  assert.equal(await modal.locator('.is-chosen').count(),1);
  const chosen=modal.locator('.is-chosen');await chosen.scrollIntoViewIfNeeded();
  assert(await chosen.evaluate(el=>{const face=el.querySelector('.kindi-card-face-back');const meta=el.querySelector('.kindi-card-meta');return meta.getBoundingClientRect().bottom<=face.getBoundingClientRect().bottom+1&&face.scrollHeight<=face.clientHeight+1;}),'card footer must fit inside border');
  await page.screenshot({path:`artifacts/card-motion/revealed-${width}-${reduced?'reduced':'normal'}.png`});
  await modal.getByRole('button',{name:'สับไพ่รอบใหม่',exact:true}).click();
  await modal.getByText('เลือกไพ่ที่ใช่ แล้วเปิดเลย!',{exact:true}).waitFor();
  await modal.getByRole('button',{name:'ปรับตัวเลือก',exact:true}).click();await modal.getByRole('button',{name:'7 ใบ',exact:true}).click();await modal.getByRole('button',{name:'ใช้ตัวเลือกนี้',exact:true}).click();
  await modal.getByText('เลือกไพ่ที่ใช่ แล้วเปิดเลย!',{exact:true}).waitFor();assert.equal(await cards.count(),7);
  await modal.getByRole('button',{name:'ปรับตัวเลือก',exact:true}).click();await modal.getByRole('button',{name:'3 ใบ',exact:true}).click();await modal.getByRole('button',{name:'ใช้ตัวเลือกนี้',exact:true}).click();
  await modal.getByText('เลือกไพ่ที่ใช่ แล้วเปิดเลย!',{exact:true}).waitFor();assert.equal(await cards.count(),3);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await modal.getByRole('button',{name:'ปิดหน้าต่างสุ่มไพ่'}).click();await modal.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'เลือกไพ่มื้อนี้'}).click();await modal.waitFor();
  await modal.getByText('เลือกไพ่ที่ใช่ แล้วเปิดเลย!',{exact:true}).waitFor();assert(await cards.first().locator('button').isEnabled());
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width} ${reduced?'reduced motion':'normal motion'}: deal gating/timing, nonzero pile offsets, flip/reveal, reshuffle, 3/7 cards, close/reopen, no overflow/errors`);
  await context.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
