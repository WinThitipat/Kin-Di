const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:3100/community');
  await page.waitForLoadState('networkidle');
  for(const width of [320,360,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(()=>{
    localStorage.setItem('kindi:shared-recipes:v1',JSON.stringify([{id:'card-overflow-test',name:'หมูสามชั้นทอดกระเทียมพริกไทยสูตรชื่อยาวสำหรับตรวจสอบหน้าจอ',category:'international',cooking_time:480,image_url:'/images/thai-table.jpg',external_recipe_url:'https://www.wongnai.com/recipes'}]));
    window.dispatchEvent(new Event('kindi-recipes-updated'));
   });
   const card=page.locator('.shared-menu-card');await card.waitFor();
   const result=await card.evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {fits:el.scrollWidth<=el.clientWidth,controls:[...el.querySelectorAll('.shared-menu-actions > *')].map(c=>{const b=c.getBoundingClientRect();return {inside:b.left>=r.left&&b.right<=r.right&&b.bottom<=r.bottom,width:b.width,height:b.height};})};
   });
   assert(result.fits,`Card overflow at ${width}px`);
   assert(result.controls.every(c=>c.inside&&c.width>=44&&c.height>=44),`Control outside card at ${width}px`);
   if(width===390)await card.screenshot({path:'artifacts/community-steps/card-overflow-fixed.png'});
   await card.getByRole('button',{name:/ลบเมนู/}).click();
   assert.equal(await page.locator('.shared-menu-card').count(),0);
   console.log(`PASS ${width}px: long title/category; all actions inside card, targets >=44px; delete works`);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
