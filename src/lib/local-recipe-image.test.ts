import { expect, it } from "vitest";
import { CommunityRecipeSubmissionSchema } from "@/types/recipe";

it("accepts bundled recipe images while rejecting traversal and protocol-relative URLs", () => {
  const schema = CommunityRecipeSubmissionSchema.shape.image_url;
  expect(schema.safeParse("/images/crispy-pork-garlic.webp").success).toBe(true);
  for (const path of ["//evil.example/photo.webp", "/images/../../secret.png", "javascript:alert(1)"]) {
    expect(schema.safeParse(path).success).toBe(false);
  }
});
