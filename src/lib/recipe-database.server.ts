import { createClient } from "@supabase/supabase-js";
import { Recipe } from "@/types/recipe";

function connection() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.RECIPE_SERVER_SECRET;
  if (!url || !key || !secret)
    throw new Error("RECIPE_DATABASE_NOT_CONFIGURED");
  return {
    client: createClient(url, key, {
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }) },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    secret,
  };
}
async function readDatabaseRecipes(): Promise<{
  recipes: Recipe[];
  deletedIds: string[];
}> {
  const { client, secret } = connection();
  const { data, error } = await client.rpc("kindi_list_recipes", {
    p_secret: secret,
  });
  if (error) throw new Error("RECIPE_DATABASE_READ_FAILED");
  return { recipes: data?.recipes ?? [], deletedIds: data?.deletedIds ?? [] };
}
export async function saveDatabaseRecipe(recipe: Recipe): Promise<Recipe> {
  const { client, secret } = connection();
  const { data, error } = await client.rpc("kindi_save_recipe", {
    p_recipe: recipe,
    p_secret: secret,
  });
  if (error || !data?.id) throw new Error("RECIPE_DATABASE_WRITE_FAILED");
  return data as Recipe;
}
export async function archiveDatabaseRecipe(recipeId: string): Promise<void> {
  const { client, secret } = connection();
  const { error } = await client.rpc("kindi_delete_recipe", {
    p_recipe_id: recipeId,
    p_secret: secret,
  });
  if (error) throw new Error("RECIPE_DATABASE_DELETE_FAILED");
}

export async function updateDatabaseRecipe(
  recipe: Recipe,
  expectedVersion: string,
): Promise<Recipe> {
  const { client, secret } = connection();
  const { data, error } = await client.rpc("kindi_update_recipe", {
    p_recipe: recipe,
    p_secret: secret,
    p_expected_version: expectedVersion,
  });
  if (error || !data?.id) throw new Error("RECIPE_DATABASE_UPDATE_FAILED");
  return data as Recipe;
}

// Collapse simultaneous reads within one server instance without caching stale data.
let pendingRead: ReturnType<typeof readDatabaseRecipes> | null = null;
export function listDatabaseRecipes() {
  if (!pendingRead) pendingRead = readDatabaseRecipes().finally(() => { pendingRead = null; });
  return pendingRead;
}
