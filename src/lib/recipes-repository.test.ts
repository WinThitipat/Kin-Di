import { IngredientRecord } from "@/types/recipe";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchApprovedRecipes, submitCommunityRecipeForModeration } from "./recipes-repository";
const storage = vi.hoisted(() => ({
  loadSharedRecipes: vi.fn(() => [{id:"local-only",status:"approved"}]),
  saveSharedRecipe: vi.fn(),
  loadCustomIngredients: vi.fn(() => [] as IngredientRecord[]),
  saveCustomIngredient: vi.fn(),
  getMergedIngredientsCatalog: vi.fn(() => ({})),
}));
vi.mock("@/lib/user-storage", () => storage);
beforeEach(() => {
  vi.clearAllMocks();
  storage.loadCustomIngredients.mockReturnValue([]);
  storage.saveCustomIngredient.mockReset();
  vi.stubGlobal("window", {dispatchEvent:vi.fn()});
});
afterEach(() => vi.unstubAllGlobals());
it("every reader gets only database recipes, never browser-only records", async () => {
  const fetch = vi.fn().mockResolvedValue({ok:true,json:async()=>({recipes:[{id:"database-only",status:"approved"}],deletedIds:["archived"]})});
  vi.stubGlobal("fetch",fetch);
  const result = await fetchApprovedRecipes();
  expect(result.recipes.map(recipe => recipe.id)).toEqual(["database-only"]);
  expect(fetch).toHaveBeenCalledWith("/api/recipes",expect.objectContaining({cache:"no-store"}));
  expect(storage.loadSharedRecipes).not.toHaveBeenCalled();
});
it("database outages return an error and no local fallback", async () => {
  vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("offline")));
  const result = await fetchApprovedRecipes();
  expect(result.recipes).toEqual([]);
  expect(result.error).toBeTruthy();
  expect(storage.loadSharedRecipes).not.toHaveBeenCalled();
});
it("save waits for database confirmation, and never saves a browser-only recipe", async () => {
  let resolve!: (value: unknown) => void;
  vi.stubGlobal("fetch",vi.fn(()=>new Promise(done => {resolve=done;})));
  const input = {name:"ทดสอบสูตร",description:"ทดสอบการบันทึกลงฐานข้อมูล",external_recipe_url:"https://example.com/recipe",image_url:"https://example.com/photo.jpg",category:"thai" as const,meal_types:["lunch" as const],cooking_time:20,difficulty:"easy" as const,ingredientIds:["jasmine_rice"]};
  let finished = false;
  const pending = submitCommunityRecipeForModeration(input).then(result => {finished=true;return result;});
  await Promise.resolve();
  expect(finished).toBe(false);
  expect(storage.saveSharedRecipe).not.toHaveBeenCalled();
  resolve({ok:true,json:async()=>({recipe:{id:"database-confirmed",status:"approved"}})});
  expect((await pending).success).toBe(true);
  expect(storage.saveSharedRecipe).not.toHaveBeenCalled();
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:false,json:async()=>({error:"Database unavailable"})}));
  expect((await submitCommunityRecipeForModeration(input)).success).toBe(false);
});

it("merges conflicting snapshots once and remains stable on later reads", async () => {
  const saved = new Map<string, IngredientRecord>();
  storage.loadCustomIngredients.mockImplementation(() => [...saved.values()]);
  storage.saveCustomIngredient.mockImplementation((item: IngredientRecord) => { saved.set(item.id, item); return [...saved.values()]; });
  const ingredient: IngredientRecord = {id:"custom_sauce",name_th:"ซอส",category:"other",allergens:["fish"],dietary_compatible:[],composition_known:false};
  const recipes = [{id:"one",status:"approved",ingredient_catalog:[ingredient]}, {id:"two",status:"approved",ingredient_catalog:[{...ingredient,allergens:["soy"]}]}];
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({recipes})}));
  await fetchApprovedRecipes();
  expect(storage.saveCustomIngredient).toHaveBeenCalledTimes(1);
  expect(saved.get(ingredient.id)?.allergens).toEqual(["fish","soy"]);
  await fetchApprovedRecipes();
  recipes.reverse();
  await fetchApprovedRecipes();
  expect(storage.saveCustomIngredient).toHaveBeenCalledTimes(1);
});
