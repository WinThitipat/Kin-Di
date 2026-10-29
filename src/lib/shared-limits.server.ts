import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function enforceSharedLimit(scope: 'pin' | 'create') {
  try {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {auth:{persistSession:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10_000)})}});
    const {data,error}=await client.rpc('kindi_consume_limit',{p_scope:scope,p_secret:process.env.RECIPE_SERVER_SECRET});
    if(error || typeof data?.allowed !== 'boolean') throw new Error('Limit unavailable');
    if(data.allowed)return null;
    return NextResponse.json({error:`คำขอถี่เกินไป กรุณารอ ${data.retryAfter} วินาที`},{status:429,headers:{'Cache-Control':'no-store','Retry-After':String(data.retryAfter)}});
  } catch {
    return NextResponse.json({error:'ตรวจสอบสิทธิ์ชั่วคราวไม่ได้ กรุณาลองใหม่'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
