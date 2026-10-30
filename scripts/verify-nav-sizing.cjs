const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert/strict');const fs=require('fs');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3102';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});fs.mkdirSync('artifacts/nav-sizing',{recursive:true});try{
for(const reduced of [false,true]){const context=await browser.newContext({reducedMotion:reduced?'reduce':'no-preference'});const page=await context.newPage();await page.goto(base);await page.waitForLoadState('networkidle');
async function aligned(){await page.waitForFunction(()=>{const nav=document.querySelector('.primary-nav');return !nav.querySelector('.nav-active-indicator')&&[...nav.querySelectorAll('a')].every(a=>{const s=getComputedStyle(a);return parseFloat(s.borderBottomWidth)>=2&&(a.hasAttribute('aria-current')?s.borderBottomColor===getComputedStyle(document.documentElement).getPropertyValue('--red').trim()||s.borderBottomColor==='rgb(163, 51, 38)':s.borderBottomColor==='rgba(0, 0, 0, 0)');});},{},{timeout:5000});}
for(const width of [320,375,390,430,760,768,1024,1440,1920]){await page.setViewportSize({width,height:850});
for(const path of ['/fridge','/community','/']){await page.locator(`.primary-nav a[href="${path}"]`).click();await page.waitForURL(base+path);await aligned();
// Simulate a font swap changing only link metrics, not the nav container.
await page.locator('.primary-nav a').evaluateAll(links=>links.forEach(a=>a.style.letterSpacing='1.5px'));await aligned();
await page.locator('.primary-nav a').evaluateAll(links=>links.forEach(a=>a.style.letterSpacing=''));await aligned();
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
await page.locator('.site-header').screenshot({path:`artifacts/nav-sizing/header-${width}-${reduced}.png`});console.log('PASS',width,reduced?'reduced':'normal','all 3 links, resize, text metric changes');}
await context.close();}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
