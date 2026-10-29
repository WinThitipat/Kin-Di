const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
const base=process.env.TEST_BASE_URL||'https://kin-di.vercel.app';
(async()=>{
 const data=await(await fetch(base+'/api/recipes')).json();
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const results=[];fs.mkdirSync('artifacts/responsive-audit',{recursive:true});
 async function inspect(page,label,width){
  const issues=await page.evaluate(()=>{
   const out=[];
   if(document.documentElement.scrollWidth>innerWidth+1)out.push({type:'page',width:document.documentElement.scrollWidth});
   for(const el of document.querySelectorAll('main button,main a,main input,main select,main textarea,main h1,main h2,main p,dialog[open] button')){
    const r=el.getBoundingClientRect(),s=getComputedStyle(el);if(!r.width||!r.height||s.visibility==='hidden'||el.closest('[hidden]'))continue;
    if(r.left< -1||r.right>innerWidth+1)out.push({type:'outside',tag:el.tagName,text:el.textContent.trim().slice(0,65),left:r.left,right:r.right});
    if(el.matches('button,a,h1,h2,p')&&el.scrollWidth>el.clientWidth+2&&s.overflowX==='visible')out.push({type:'text',tag:el.tagName,text:el.textContent.trim().slice(0,65),client:el.clientWidth,scroll:el.scrollWidth});
   }return out;
  });
  results.push({width,label,issues});if(issues.length)console.log(JSON.stringify({width,label,issues}));
 }
 try{for(const width of [320,375,390,430,768,1024,1440,1920]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/','/fridge','/community',...data.recipes.map(r=>'/recipes/'+r.id)]){
   await page.goto(base+route);await page.waitForLoadState('networkidle');await inspect(page,route,width);
   if(['/','/fridge','/community'].includes(route))await page.screenshot({path:`artifacts/responsive-audit/${route.slice(1)||'home'}-${width}.png`,fullPage:true});
   if(route==='/'){
    await page.getByRole('button',{name:'สุ่มเลย กินดิ!'}).click();const modal=page.locator('dialog[open]');await modal.waitFor();
    await inspect(page,'cards-5',width);
    for(const count of [7,3]){await modal.getByRole('button',{name:count+' ใบ',exact:true}).click();await inspect(page,'cards-'+count,width);}
    await modal.locator('[data-deal-card] button').first().click();await page.locator('.kindi-reveal-panel').waitFor();await inspect(page,'revealed',width);
   }
  }
  if(errors.length)results.push({width,label:'runtime',issues:errors});
  console.log('DONE',width);await context.close();
 }}finally{await browser.close();fs.writeFileSync('artifacts/responsive-audit/report.json',JSON.stringify(results,null,2));}
 const failures=results.filter(r=>r.issues.length);console.log('RESULT',results.length,'checks;',failures.length,'with findings');
})().catch(e=>{console.error(e);process.exitCode=1});
