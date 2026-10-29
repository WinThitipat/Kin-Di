const fs=require('node:fs');
(async()=>{for(const slug of ['lockdown-pad-woon-sen','leftover-fried-rice','pad-see-ew-new','cabbage-fish-sauce']){
const html=await (await fetch('https://hot-thai-kitchen.com/'+slug+'/')).text();
const images=[...html.matchAll(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)/g)].map(m=>m[1]);
console.log(slug,JSON.stringify(images));
}})().catch(e=>{console.error(e.message);process.exitCode=1});
