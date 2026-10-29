import { z } from "zod";
import {
  CommunityRecipeSubmissionSchema,
  RecipeIdSchema,
} from "@/types/recipe";

export const RECIPE_DRAFT_KEY = "kindi-recipe-draft-v1";
export const RecipeDraftSchema = z.object({
  version: z.literal(1),
  step: z.number().int().min(0).max(3),
  editId: RecipeIdSchema.nullable(),
  expectedVersion: z.string().max(100),
  imageMode: z.enum(["upload", "url"]),
  otherIngredientDraft: z.string().max(500),
  data: z.object(CommunityRecipeSubmissionSchema.shape).extend({
    name: z.string().max(10000),
    description: z.string().max(10000),
    image_url: z.string().max(2_000_000),
    external_recipe_url: z.string().max(10000),
    instructionsText: z.string().max(100000).optional(),
    submitted_by: z.string().max(10000).optional(),
    meal_types: z.array(z.enum(["breakfast", "lunch", "dinner", "snack"])),
  }),
});
export function readRecipeDraft() {
  try {
    const value = JSON.parse(localStorage.getItem(RECIPE_DRAFT_KEY) ?? "null");
    const parsed = RecipeDraftSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
