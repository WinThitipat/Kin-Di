import { createClient } from "npm:@supabase/supabase-js@2.49.1";
Deno.serve(async req => {
 const reply=(body:object,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
 const secret=req.headers.get("x-kindi-secret")??"";
 const {data:limit,error:authError}=await db.rpc("kindi_consume_limit",{p_scope:"upload",p_secret:secret});
 if(authError)return reply({error:"Unauthorized"},401);
 if(!limit?.allowed)return reply({error:"Upload limit"},429);
 const reader=req.body?.getReader();if(!reader)return reply({error:"Missing image"},400);
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>524288){await reader.cancel();return reply({error:"Too large"},413);}chunks.push(part.value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 if(new TextDecoder().decode(bytes.slice(0,4))!=="RIFF"||new TextDecoder().decode(bytes.slice(8,12))!=="WEBP")return reply({error:"Expected WebP"},400);
 const hash=[...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(n=>n.toString(16).padStart(2,"0")).join("");
 const path=hash+".webp";
 const {error}=await db.storage.from("recipe-images").upload(path,bytes,{contentType:"image/webp",cacheControl:"31536000",upsert:false});
 if(error&&String(error.statusCode)!=="409")return reply({error:"Storage write failed"},503);
 return reply({url:db.storage.from("recipe-images").getPublicUrl(path).data.publicUrl});
});
