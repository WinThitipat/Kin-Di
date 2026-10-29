require('@next/env').loadEnvConfig(process.cwd());
const {createClient}=require('@supabase/supabase-js');const fs=require('node:fs');
(async()=>{
 const {storeRecipeImage}=await import('../src/lib/recipe-image.server.ts');
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});const secret=process.env.RECIPE_SERVER_SECRET;
 const {data,error}=await db.rpc('kindi_list_recipes',{p_secret:secret});if(error)throw error;
 fs.mkdirSync('artifacts/storage-migration',{recursive:true});
 if(!fs.existsSync('artifacts/storage-migration/before.json'))fs.writeFileSync('artifacts/storage-migration/before.json',JSON.stringify(data.recipes,null,2));
 for(const recipe of data.recipes){
  const url=await storeRecipeImage(recipe.image_url);
  if(url===recipe.image_url){console.log('ALREADY STORED',recipe.name);continue;}
  const version=recipe.updated_at||recipe.created_at;
  const updated={...recipe,image_url:url,updated_at:new Date().toISOString()};
  const {error}=await db.rpc('kindi_update_recipe',{p_recipe:updated,p_expected_version:version,p_secret:secret});if(error)throw error;
  const check=await fetch(url);if(!check.ok)throw new Error('Uploaded image unavailable');
  console.log('MIGRATED',recipe.name,(await check.arrayBuffer()).byteLength,'bytes');
 }
 const final=await db.rpc('kindi_list_recipes',{p_secret:secret});
 if(final.data.recipes.some(recipe=>!recipe.image_url.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL+'/storage/v1/object/public/recipe-images/')))throw new Error('Unmigrated images remain');
 console.log('All active images stored in Supabase Storage');
})().catch(e=>{console.error(e.message);process.exitCode=1});
