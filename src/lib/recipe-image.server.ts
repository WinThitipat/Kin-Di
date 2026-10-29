import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Only known public image hosts can be fetched server-side; no arbitrary SSRF. */
export async function storeRecipeImage(source: string): Promise<string> {
  const project=process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const prefix=project+'/storage/v1/object/public/recipe-images/';
  if(source.startsWith(prefix)&&/^[a-f0-9]{64}\.webp$/.test(source.slice(prefix.length)))return source;
  let bytes: Buffer;
  if(source.startsWith('data:')) {
    const match=/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(source);
    if(!match)throw new Error('รองรับรูป JPG, PNG และ WebP เท่านั้น');
    bytes=Buffer.from(match[1],'base64');
  } else if(/^\/images\/[a-zA-Z0-9_-]+\.(?:webp|jpg|jpeg|png)$/.test(source)) {
    bytes=await readFile(path.join(process.cwd(),'public',source));
  } else {
    const url=new URL(source);
    if(url.protocol!=='https:'||url.username||url.password||url.port||!['hot-thai-kitchen.com','img.wongnai.com','upload.wikimedia.org'].includes(url.hostname))throw new Error('กรุณาอัปโหลดไฟล์รูปจากเครื่อง แทนลิงก์รูปนี้');
    const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12_000)});
    if(!response.ok||!response.body)throw new Error('โหลดรูปไม่ได้');
    const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
    while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>8_000_000){await reader.cancel();throw new Error('รูปใหญ่เกินไป');}chunks.push(part.value);}
    bytes=Buffer.concat(chunks);
  }
  if(bytes.length>8_000_000)throw new Error('รูปใหญ่เกินไป');
  const image=await sharp(bytes,{limitInputPixels:40_000_000,animated:false}).rotate().resize(960,960,{fit:'inside',withoutEnlargement:true}).webp({quality:76,effort:4}).toBuffer();
  if(image.length>524288)throw new Error('รูปใหญ่เกินไปหลังย่อขนาด');
  const response=await fetch(project+'/functions/v1/recipe-image-upload',{method:'POST',headers:{'Content-Type':'image/webp','x-kindi-secret':process.env.RECIPE_SERVER_SECRET!},body:new Uint8Array(image),signal:AbortSignal.timeout(20_000)});
  const result=await response.json();
  if(!response.ok||!result.url?.startsWith(prefix))throw new Error('อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่');
  return result.url;
}
