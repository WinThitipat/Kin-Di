import { afterEach, expect, it, vi } from "vitest";
import { readRecipeDraft } from "./recipe-draft";
const data = {name:"",description:"",external_recipe_url:"unfinished",image_url:"",category:"thai",meal_types:[],cooking_time:20,difficulty:"easy",ingredientIds:[]};
afterEach(() => vi.unstubAllGlobals());
it("restores incomplete input and steps, without retaining PIN fields", () => {
  vi.stubGlobal("localStorage", {getItem:()=>JSON.stringify({version:1,step:2,editId:null,expectedVersion:"",imageMode:"upload",otherIngredientDraft:"ซอส",data,pin:"not-stored"})});
  const draft = readRecipeDraft();
  expect(draft?.data.external_recipe_url).toBe("unfinished");
  expect(draft?.step).toBe(2);
  expect(draft).not.toHaveProperty("pin");
});
it("handles corrupt, obsolete and blocked browser storage", () => {
  for (const value of ["{bad", "null", '{"version":99}', '{"step":50}']) {
    vi.stubGlobal("localStorage",{getItem:()=>value});
    expect(readRecipeDraft()).toBeNull();
  }
  vi.stubGlobal("localStorage",{getItem:()=>{throw new Error("blocked");}});
  expect(readRecipeDraft()).toBeNull();
});
