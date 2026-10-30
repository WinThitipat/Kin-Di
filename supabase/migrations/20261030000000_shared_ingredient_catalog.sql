create table private.kindi_ingredients (name_key text primary key, record jsonb not null, created_at timestamptz not null default now());
alter table private.kindi_ingredients enable row level security;
revoke all on private.kindi_ingredients from public,anon,authenticated;
create function public.kindi_list_ingredients(p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$ begin
perform private.kindi_check_secret(p_secret);
return (select coalesce(jsonb_agg(record order by name_key),'[]'::jsonb) from private.kindi_ingredients);
end; $$;
create function public.kindi_save_ingredient(p_secret text,p_record jsonb) returns jsonb language plpgsql security definer set search_path='' as $$ declare result jsonb; begin
perform private.kindi_check_secret(p_secret);
if length(p_record->>'name_th') not between 1 and 80 then raise exception 'invalid name'; end if;
insert into private.kindi_ingredients as i(name_key,record) values(lower(regexp_replace(trim(p_record->>'name_th'),'\s+',' ','g')),p_record)
on conflict(name_key) do update set record=i.record returning record into result;
return result; end; $$;
revoke all on function public.kindi_list_ingredients(text),public.kindi_save_ingredient(text,jsonb) from public,anon,authenticated;
grant execute on function public.kindi_list_ingredients(text),public.kindi_save_ingredient(text,jsonb) to anon;
