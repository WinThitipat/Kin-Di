create or replace function public.kindi_update_recipe(p_recipe jsonb, p_secret text, p_expected_version text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  perform private.kindi_check_secret(p_secret);
  update public.community_recipes
  set name = p_recipe ->> 'name', recipe = p_recipe
  where id = p_recipe ->> 'id' and deleted_at is null
    and coalesce(recipe ->> 'updated_at', recipe ->> 'created_at') = p_expected_version
    and p_recipe ->> 'created_at' = recipe ->> 'created_at'
  returning recipe into result;
  if result is null then raise exception 'Recipe missing or changed' using errcode = '40001'; end if;
  return result;
end;
$$;
revoke all on function public.kindi_update_recipe(jsonb, text, text) from public, anon, authenticated;
grant execute on function public.kindi_update_recipe(jsonb, text, text) to anon;
