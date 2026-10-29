import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
const database = vi.hoisted(() => ({
  listDatabaseRecipes: vi.fn(),
  saveDatabaseRecipe: vi.fn(),
}));
vi.mock("@/lib/recipe-database.server", () => database);
const input = {
  name: "สูตรทดสอบ",
  description: "ตรวจสอบการบันทึกเมนูลงฐานข้อมูล",
  external_recipe_url: "https://www.wongnai.com/recipes",
  image_url: "https://example.com/food.jpg",
  category: "thai",
  meal_types: ["lunch"],
  cooking_time: 15,
  difficulty: "easy",
  ingredientIds: ["jasmine_rice"],
  customIngredientNames: [],
  dietary_tags: [],
  allergens: [],
};
const request = (body: object, origin = "http://localhost:3100") =>
  new NextRequest("http://localhost:3100/api/recipes", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
describe("Recipe database API", () => {
  beforeEach(() => {
    vi.clearAllMocks(); sharedLimit.mockResolvedValue(null);
    database.listDatabaseRecipes.mockResolvedValue({
      recipes: [],
      deletedIds: [],
    });
    database.saveDatabaseRecipe.mockImplementation(async (recipe) => recipe);
  });
  it("returns server data and deletion markers without caching", async () => {
    const response = await GET();
    expect(await response.json()).toEqual({ recipes: [], deletedIds: [] });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("validates input and origin before writing", async () => {
    expect((await POST(request({ ...input, image_url: "" }))).status).toBe(400);
    expect((await POST(request(input, "https://other.example"))).status).toBe(
      403,
    );
    expect(database.saveDatabaseRecipe).not.toHaveBeenCalled();
  });
  it("commits full metadata and refuses client-provided safety claims", async () => {
    const response = await POST(
      request({
        ...input,
        safety_metadata_complete: true,
        customIngredientNames: ["ซอสไม่ทราบส่วนประกอบ"],
      }),
    );
    expect(response.status).toBe(201);
    const { recipe } = await response.json();
    expect(recipe.safety_metadata_complete).toBe(false);
    expect(recipe.allergen_assessments.peanuts.status).toBe("unknown");
    expect(recipe.ingredients).toHaveLength(2);
    expect(recipe.ingredient_catalog).toHaveLength(2);
    expect(database.saveDatabaseRecipe).toHaveBeenCalledOnce();
  });
  it("preserves legacy IDs for retry-safe importing; refuses invalid IDs", async () => {
    const response = await POST(
      request({ ...input, legacyRecipeId: "shared-1793000000000" }),
    );
    expect((await response.json()).recipe.id).toBe("shared-1793000000000");
    expect(
      (await POST(request({ ...input, legacyRecipeId: "../bad" }))).status,
    ).toBe(400);
  });
  it("reports read and write failures instead of false success", async () => {
    database.saveDatabaseRecipe.mockRejectedValueOnce(new Error("offline"));
    database.listDatabaseRecipes.mockRejectedValueOnce(new Error("offline"));
    expect((await POST(request(input))).status).toBe(503);
    expect((await GET()).status).toBe(503);
  });
});


const sharedLimit = vi.hoisted(() => vi.fn().mockResolvedValue(null));
vi.mock("@/lib/shared-limits.server", () => ({enforceSharedLimit:sharedLimit}));
vi.mock("@/lib/recipe-image.server", () => ({storeRecipeImage:vi.fn(async (source:string) => source)}));
