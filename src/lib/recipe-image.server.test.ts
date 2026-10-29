import {afterEach,expect,it,vi} from 'vitest';
import sharp from 'sharp';
import {storeRecipeImage} from './recipe-image.server';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('encodes uploaded images as bounded WebP and blocks arbitrary network targets',async()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://project.supabase.co');vi.stubEnv('RECIPE_SERVER_SECRET','test-secret');
 const url='https://project.supabase.co/storage/v1/object/public/recipe-images/'+ 'a'.repeat(64)+'.webp';
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({url})});vi.stubGlobal('fetch',fetch);
 const input=await sharp({create:{width:10,height:10,channels:3,background:'#a33326'}}).png().toBuffer();
 expect(await storeRecipeImage('data:image/png;base64,'+input.toString('base64'))).toBe(url);
 const payload=fetch.mock.calls[0][1].body;expect(Buffer.from(payload).subarray(8,12).toString()).toBe('WEBP');
 fetch.mockClear();expect(await storeRecipeImage(url)).toBe(url);expect(fetch).not.toHaveBeenCalled();
 for(const target of ['http://127.0.0.1/a.png','https://169.254.169.254/a.png','https://evil.example/a.png','data:image/svg+xml;base64,abcd'])await expect(storeRecipeImage(target)).rejects.toThrow();
 expect(fetch).not.toHaveBeenCalled();
});
