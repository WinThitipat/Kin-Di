const fs=require('fs');fs.mkdirSync('.firecrawl',{recursive:true});
(async()=>{for(const slug of ['garlic-pepper-chicken','tom-yum-goong','green-curry-new-2','laab-moo','pineapple-fried-rice','pad-kee-mao-2','cashew-chicken','tom-kha-gai']){
 const r=await fetch('https://hot-thai-kitchen.com/'+slug+'/');const html=await r.text();let recipe;
 function walk(x){if(!x||typeof x!=='object')return;if([x['@type']].flat().includes('Recipe'))recipe=x;for(const v of Object.values(x))if(typeof v==='object')Array.isArray(v)?v.forEach(walk):walk(v);}
 for(const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)){try{walk(JSON.parse(m[1]));}catch{}}
 if(!recipe){console.log(slug,'NO RECIPE',r.status);continue;}
 const record={slug,url:r.url,name:recipe.name,image:recipe.image,totalTime:recipe.totalTime,prepTime:recipe.prepTime,cookTime:recipe.cookTime,ingredients:recipe.recipeIngredient};fs.writeFileSync('.firecrawl/'+slug+'.json',JSON.stringify(record,null,2));console.log(JSON.stringify(record));
}})().catch(e=>{console.error(e.message);process.exitCode=1});
