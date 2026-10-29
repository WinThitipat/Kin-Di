import {afterEach,expect,it,vi} from 'vitest';
import {enforceSharedLimit} from './shared-limits.server';
const rpc=vi.hoisted(()=>vi.fn());
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({rpc})}));
afterEach(()=>vi.unstubAllEnvs());
it('uses the shared pin scope, forwards retry time and fails closed',async()=>{
 vi.stubEnv('RECIPE_SERVER_SECRET','server-only-test');
 rpc.mockResolvedValueOnce({data:{allowed:true},error:null});
 expect(await enforceSharedLimit('pin')).toBeNull();
 expect(rpc).toHaveBeenCalledWith('kindi_consume_limit',{p_scope:'pin',p_secret:'server-only-test'});
 rpc.mockResolvedValueOnce({data:{allowed:false,retryAfter:42},error:null});
 const blocked=await enforceSharedLimit('pin');expect(blocked?.status).toBe(429);expect(blocked?.headers.get('Retry-After')).toBe('42');
 rpc.mockResolvedValueOnce({error:{message:'offline'}});expect((await enforceSharedLimit('create'))?.status).toBe(503);
});
