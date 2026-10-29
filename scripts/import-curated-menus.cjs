// Explicitly import curated menus through the application's validated save API.
// Default is a dry run. Stable submission IDs make retries idempotent.
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const assert=require('node:assert/strict');
const base=process.env.APP_BASE_URL||'http://127.0.0.1:3100';
const menus=JSON.parse(fs.readFileSync('data/curated-menus-2026-10-29.json','utf8'));
(async()=>{
 const response=await fetch(base+'/api/recipes');assert.equal(response.status,200,'Database must be available before import');
 const before=await response.json();
 const bySource=new Map(before.recipes.map(recipe=>[recipe.external_recipe_url,recipe]));
 const names=new Set(before.recipes.map(recipe=>recipe.name));
 const results=[];
 for(const menu of menus){
  const existing=bySource.get(menu.external_recipe_url);
  if(existing||names.has(menu.name)){console.log('SKIP existing:',menu.name);results.push({name:menu.name,id:existing?.id,existing:true});continue;}
  const image=await fetch(menu.image_url);assert(image.ok,`Image unavailable: ${menu.name}`);assert((image.headers.get('content-type')||'').startsWith('image/'),`Invalid image: ${menu.name}`);await image.arrayBuffer();
  if(!process.argv.includes('--import')){console.log('READY:',menu.name);continue;}
  const digest=createHash('sha256').update('curated-2026-10-29:'+menu.external_recipe_url).digest('hex').slice(0,32);
  const submissionId=[digest.slice(0,8),digest.slice(8,12),digest.slice(12,16),digest.slice(16,20),digest.slice(20)].join('-');
  const saved=await fetch(base+'/api/recipes',{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify({...menu,submissionId})});
  const body=await saved.json();assert.equal(saved.status,201,JSON.stringify(body));
  assert.equal(body.recipe.name,menu.name);
  results.push({name:menu.name,id:body.recipe.id,source:menu.external_recipe_url});console.log('SAVED:',menu.name);
 }
 if(process.argv.includes('--import')){
  const after=await (await fetch(base+'/api/recipes')).json();
  for(const menu of menus)assert(after.recipes.some(recipe=>recipe.name===menu.name),'Missing '+menu.name);
  fs.mkdirSync('artifacts/curated-menus',{recursive:true});
  fs.writeFileSync('artifacts/curated-menus/import-report.json',JSON.stringify({importedAt:new Date().toISOString(),results,totalActive:after.recipes.length},null,2));
  console.log('Verified all 8 menus in database. Active menu count:',after.recipes.length);
 }
})().catch(error=>{console.error(error.message);process.exitCode=1});
