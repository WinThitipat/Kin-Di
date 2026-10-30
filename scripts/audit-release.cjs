const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];fs.mkdirSync('artifacts/release-audit',{recursive:true});try{
 const base='https://kin-di.vercel.app';const response=await fetch(base+'/api/recipes');const payload=await response.json();
 results.push({api:{status:response.status,recipeCount:payload.recipes?.length,cacheControl:response.headers.get('cache-control')}});
 for(const width of [390,1440])for(const path of ['/', '/fridge','/community','/recipes/'+payload.recipes[0].id]){
 const page=await browser.newPage({viewport:{width,height:900}});const errors=[],failed=[];let apiRequests=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText}));page.on('request',r=>{if(r.url().includes('/api/recipes'))apiRequests++});
 await page.goto(base+path);await page.waitForLoadState('networkidle');await page.waitForTimeout(3000);
 const measurements=await page.evaluate(()=>({title:document.title,h1:[...document.querySelectorAll('h1')].map(e=>e.textContent),overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(e=>e.complete&&!e.naturalWidth).map(e=>e.src),smallVisibleText:[...document.querySelectorAll('p,span,label,small,a,button')].filter(e=>e.getClientRects().length&&e.textContent.trim()&&parseFloat(getComputedStyle(e).fontSize)<12).slice(0,12).map(e=>({text:e.textContent.trim().slice(0,70),size:getComputedStyle(e).fontSize})),height:document.documentElement.scrollHeight}));
 const result={width,path,...measurements,apiRequestsDuringIdle:apiRequests,errors,failed};results.push(result);console.log(JSON.stringify(result));await page.screenshot({path:`artifacts/release-audit/${width}-${path.replaceAll('/','_')||'home'}.png`,fullPage:true});await page.close();
 }
}finally{await browser.close();fs.writeFileSync('artifacts/release-audit/results.json',JSON.stringify(results,null,2))}})().catch(e=>{console.error(e);process.exitCode=1});
