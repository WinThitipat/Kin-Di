-- Additive storage for complete community recipes. Legacy normalized tables,
-- if present, and browser-local backups are not modified by this migration.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.kindi_server_config (
  singleton boolean primary key default true check (singleton),
  token_hash text not null
);
revoke all on private.kindi_server_config from public, anon, authenticated;

create table if not exists public.community_recipes (
  id text primary key,
  name text not null,
  recipe jsonb not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint recipe_document_valid check (
    jsonb_typeof(recipe) = 'object'
    and recipe ->> 'id' = id
    and recipe ->> 'status' = 'approved'
    and length(name) between 2 and 120
  )
);
alter table public.community_recipes enable row level security;
revoke all on public.community_recipes from anon, authenticated;
grant select on public.community_recipes to anon, authenticated;
create policy "Read active community recipes"
  on public.community_recipes for select to anon, authenticated
  using (deleted_at is null);
create index community_recipes_active_created_at on public.community_recipes(created_at desc) where deleted_at is null;

create or replace function private.kindi_check_secret(p_secret text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_secret is null or length(p_secret) < 32 or not exists (
    select 1 from private.kindi_server_config
    where singleton and token_hash = pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_secret, 'UTF8')), 'hex')
  ) then raise exception 'Server authorization required' using errcode = '42501'; end if;
end;
$$;
revoke all on function private.kindi_check_secret(text) from public, anon, authenticated;

create or replace function public.kindi_list_recipes(p_secret text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  perform private.kindi_check_secret(p_secret);
  select pg_catalog.jsonb_build_object(
    'recipes', coalesce(pg_catalog.jsonb_agg(recipe order by created_at desc) filter (where deleted_at is null), '[]'::jsonb),
    'deletedIds', coalesce(pg_catalog.jsonb_agg(id) filter (where deleted_at is not null), '[]'::jsonb)
  ) into result from public.community_recipes;
  return result;
end;
$$;

create or replace function public.kindi_save_recipe(p_recipe jsonb, p_secret text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  perform private.kindi_check_secret(p_secret);
  if p_recipe ->> 'id' is null or p_recipe ->> 'id' !~ '^[a-zA-Z0-9_-]{1,100}$' then
    raise exception 'Invalid recipe ID' using errcode = '22023';
  end if;
  insert into public.community_recipes(id, name, recipe)
    values (p_recipe ->> 'id', p_recipe ->> 'name', p_recipe)
    on conflict (id) do nothing;
  select recipe into result from public.community_recipes where id = p_recipe ->> 'id' and deleted_at is null;
  if result is null then raise exception 'Recipe is archived' using errcode = '22023'; end if;
  return result;
end;
$$;

create or replace function public.kindi_delete_recipe(p_recipe_id text, p_secret text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  perform private.kindi_check_secret(p_secret);
  update public.community_recipes set deleted_at = now() where id = p_recipe_id and deleted_at is null;
  get diagnostics changed = row_count;
  return changed > 0;
end;
$$;

revoke all on function public.kindi_list_recipes(text) from public, anon, authenticated;
revoke all on function public.kindi_save_recipe(jsonb, text) from public, anon, authenticated;
revoke all on function public.kindi_delete_recipe(text, text) from public, anon, authenticated;
-- These RPCs require the separate high-entropy server secret. Possession of
-- the publishable key alone never permits writes or deletion.
grant execute on function public.kindi_list_recipes(text) to anon;
grant execute on function public.kindi_save_recipe(jsonb, text) to anon;
grant execute on function public.kindi_delete_recipe(text, text) to anon;
