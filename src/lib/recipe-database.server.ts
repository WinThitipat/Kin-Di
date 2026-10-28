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
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    secret,
  };
}
export async function listDatabaseRecipes(): Promise<{
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
