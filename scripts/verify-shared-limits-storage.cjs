require('@next/env').loadEnvConfig(process.cwd());
const {createClient}=require('@supabase/supabase-js');const fs=require('fs');const assert=require('node:assert/strict');
const base='http://127.0.0.1:3100';const headers={origin:base,'Content-Type':'application/json'};const pin=process.env.TEST_ADMIN_PIN;
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);const secret=process.env.RECIPE_SERVER_SECRET;
const post=async(path,body)=>fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)});
(async()=>{
 if(process.argv.includes('--check-lock')){const response=await post('/api/admin/authorize-recipe-deletion',{pin:'000000',recipeId:'shared-limit-test'});assert.equal(response.status,429);console.log('PASS lock survives app restart; Retry-After',response.headers.get('retry-after'));return;}
 assert(pin,'Set TEST_ADMIN_PIN');
 const input={...JSON.parse(fs.readFileSync('data/curated-menus-2026-10-29.json'))[0],name:'[ทดสอบระบบ] Storage '+Date.now(),image_url:'data:image/webp;base64,'+fs.readFileSync('public/images/crispy-pork-garlic.webp').toString('base64'),submissionId:crypto.randomUUID()};
 let id;
 try{
 const response=await post('/api/recipes',input);const result=await response.json();assert.equal(response.status,201,JSON.stringify(result));id=result.recipe.id;
 assert(result.recipe.image_url.includes('/storage/v1/object/public/recipe-images/'));assert.equal((await fetch(result.recipe.image_url)).status,200);
 const edit=await post('/api/admin/update-recipe',{...input,name:input.name+' edited',image_url:result.recipe.image_url,recipeId:id,expectedVersion:result.recipe.created_at,pin});assert.equal(edit.status,200,await edit.text());
 const anonymous=await db.storage.from('recipe-images').upload('anonymous-test.webp',fs.readFileSync('public/images/crispy-pork-garlic.webp'),{contentType:'image/webp'});assert(anonymous.error,'Anonymous upload must fail');
 const unauthorized=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/functions/v1/recipe-image-upload',{method:'POST',headers:{'x-kindi-secret':'invalid'},body:'invalid'});assert.equal(unauthorized.status,401);
 console.log('PASS new recipe image upload, public read, authorized edit, anonymous write denied, edge secret required');
 const responses=await Promise.all(Array.from({length:6},(_,i)=>i%2?post('/api/admin/authorize-recipe-deletion',{recipeId:id,pin:'000000'}):post('/api/admin/update-recipe',{...input,recipeId:id,expectedVersion:result.recipe.created_at,pin:'000000'})));
 const statuses=responses.map(r=>r.status);assert.equal(statuses.filter(s=>s===401).length,4,JSON.stringify(statuses));assert.equal(statuses.filter(s=>s===429).length,2,JSON.stringify(statuses));
 console.log('PASS concurrent edit/delete share the same 5-attempt database budget',JSON.stringify(statuses));
 }finally{if(id){const {error}=await db.rpc('kindi_delete_recipe',{p_recipe_id:id,p_secret:secret});if(error)throw error;}}
})().catch(e=>{console.error(e.message);process.exitCode=1});
