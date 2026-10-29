create table if not exists private.kindi_request_limits (
 scope text primary key, hits integer not null, expires_at timestamptz not null
);
alter table private.kindi_request_limits enable row level security;
revoke all on private.kindi_request_limits from public, anon, authenticated;
create or replace function public.kindi_consume_limit(p_scope text, p_secret text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cap integer; result private.kindi_request_limits; limiter_now timestamptz := clock_timestamp();
begin
 perform private.kindi_check_secret(p_secret);
 cap := case p_scope when 'pin' then 5 when 'create' then 12 when 'upload' then 40 else null end;
 if cap is null then raise exception 'Invalid scope'; end if;
 insert into private.kindi_request_limits as limits(scope,hits,expires_at)
 values(p_scope,1,limiter_now+interval '60 seconds')
 on conflict(scope) do update set
 hits=case when limits.expires_at<=limiter_now then 1 else least(limits.hits+1,cap+1) end,
 expires_at=case when limits.expires_at<=limiter_now then limiter_now+interval '60 seconds' else limits.expires_at end
 returning * into result;
 return jsonb_build_object('allowed',result.hits<=cap,'retryAfter',greatest(1,ceil(extract(epoch from result.expires_at-limiter_now)))::integer);
end;
$$;
revoke all on function public.kindi_consume_limit(text,text) from public,anon,authenticated;
grant execute on function public.kindi_consume_limit(text,text) to anon;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('recipe-images','recipe-images',true,524288,array['image/webp'])
on conflict(id) do nothing;
