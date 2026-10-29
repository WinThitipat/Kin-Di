import {expect,it,vi} from 'vitest';
const rpc=vi.hoisted(()=>vi.fn());
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({rpc})}));
it('collapses simultaneous reads and retries after failure without caching',async()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://test.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY','test');vi.stubEnv('RECIPE_SERVER_SECRET','test');
 try{
 const {listDatabaseRecipes}=await import('./recipe-database.server');
 rpc.mockResolvedValueOnce({data:{recipes:[],deletedIds:[]},error:null});
 await Promise.all(Array.from({length:100},()=>listDatabaseRecipes()));expect(rpc).toHaveBeenCalledTimes(1);
 rpc.mockResolvedValueOnce({error:{message:'offline'}});await expect(listDatabaseRecipes()).rejects.toThrow();
 rpc.mockResolvedValueOnce({data:{recipes:[],deletedIds:[]},error:null});await listDatabaseRecipes();expect(rpc).toHaveBeenCalledTimes(3);
 }finally{vi.unstubAllEnvs();}
});
