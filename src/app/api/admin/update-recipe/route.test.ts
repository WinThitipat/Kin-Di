import { NextResponse } from "next/server";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { hashAdminPin } from "@/lib/admin-pin.server";
const db = vi.hoisted(() => ({ listDatabaseRecipes: vi.fn(), updateDatabaseRecipe: vi.fn() }));
vi.mock("@/lib/recipe-database.server", () => db);
const input = { name:"สูตรทดสอบ", description:"คำอธิบายเมนู", external_recipe_url:"https://example.com/recipe", image_url:"https://example.com/food.jpg", category:"thai", meal_types:["lunch"], cooking_time:20, difficulty:"easy", ingredientIds:["jasmine_rice"], recipeId:"shared-test", expectedVersion:"original", pin:"012345" };
const request = (body: object, origin = "http://localhost:3100") => new NextRequest("http://localhost:3100/api/admin/update-recipe", {method:"POST", headers:{origin}, body:JSON.stringify(body)});
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); sharedLimit.mockResolvedValue(null);
  vi.stubEnv("ADMIN_DELETE_PIN_HASH", await hashAdminPin("012345"));
  db.listDatabaseRecipes.mockResolvedValue({recipes:[{id:"shared-test",created_at:"original"}]});
  db.updateDatabaseRecipe.mockImplementation(async recipe => recipe);
});
afterEach(() => vi.unstubAllEnvs());
it("rejects wrong PIN and cross-origin without accessing data", async () => {
  const { POST } = await import("./route");
  expect((await POST(request({...input,pin:"000000"}))).status).toBe(401);
  expect((await POST(request(input,"https://evil.example"))).status).toBe(403);
  expect(db.listDatabaseRecipes).not.toHaveBeenCalled();
  expect(db.updateDatabaseRecipe).not.toHaveBeenCalled();
});
it("preserves identity and creation time; rebuilds safety on server", async () => {
  const { POST } = await import("./route");
  const response = await POST(request({...input, safety_metadata_complete:true}));
  expect(response.status).toBe(200);
  const {recipe} = await response.json();
  expect(recipe.id).toBe(input.recipeId);
  expect(recipe.created_at).toBe("original");
  expect(recipe.updated_at).toBeTruthy();
  expect(recipe.safety_metadata_complete).toBe(false);
  expect(db.updateDatabaseRecipe).toHaveBeenCalledWith(expect.objectContaining({id:input.recipeId}),"original");
});
it("refuses stale edits and deleted recipes", async () => {
  const { POST } = await import("./route");
  expect((await POST(request({...input,expectedVersion:"old"}))).status).toBe(409);
  db.listDatabaseRecipes.mockResolvedValue({recipes:[]});
  expect((await POST(request(input))).status).toBe(404);
  expect(db.updateDatabaseRecipe).not.toHaveBeenCalled();
});
it("fails closed and reports write errors", async () => {
  const { POST } = await import("./route");
  vi.stubEnv("ADMIN_DELETE_PIN_HASH","");
  expect((await POST(request(input))).status).toBe(503);
  vi.stubEnv("ADMIN_DELETE_PIN_HASH",await hashAdminPin("012345"));
  db.updateDatabaseRecipe.mockRejectedValue(new Error("offline"));
  expect((await POST(request(input))).status).toBe(503);
});
it("does not edit when the shared limiter rejects", async () => {
  const { POST } = await import("./route");
  sharedLimit.mockResolvedValueOnce(NextResponse.json({error:"limited"},{status:429}));
  expect((await POST(request(input))).status).toBe(429);expect(db.updateDatabaseRecipe).not.toHaveBeenCalled();
});


const sharedLimit = vi.hoisted(() => vi.fn().mockResolvedValue(null));
vi.mock("@/lib/shared-limits.server", () => ({enforceSharedLimit:sharedLimit}));
vi.mock("@/lib/recipe-image.server", () => ({storeRecipeImage:vi.fn(async (source:string) => source)}));
