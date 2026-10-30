import { afterEach, expect, it, vi } from 'vitest';
import { readPantry, savePantry } from './fridge-pantry';
afterEach(()=>vi.unstubAllGlobals());
it('preserves an explicitly emptied pantry and condiment preference',()=>{
 let raw: string | null = null;
 vi.stubGlobal('window',{localStorage:{getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}},dispatchEvent:vi.fn()});
 savePantry({ingredientIds:[],assumeBasicCondiments:false});
 expect(readPantry()).toEqual({ingredientIds:[],assumeBasicCondiments:false});
});
it('ignores invalid data and handles blocked storage',()=>{
 for(const raw of ['broken','null','{"version":2}','{"version":1,"ingredientIds":[],"assumeBasicCondiments":"yes"}']){
 vi.stubGlobal('window',{localStorage:{getItem:()=>raw}});expect(readPantry()).toBeNull();
 }
 vi.stubGlobal('window',{localStorage:{getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}}});
 expect(readPantry()).toBeNull();expect(()=>savePantry({ingredientIds:['egg'],assumeBasicCondiments:true})).not.toThrow();
});
