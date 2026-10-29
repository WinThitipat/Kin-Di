import { enforceSharedLimit } from "@/lib/shared-limits.server";
import { storeRecipeImage } from "@/lib/recipe-image.server";
import { readBoundedJson, RequestBodyTooLarge } from "@/lib/request-body.server";
import { NextRequest, NextResponse } from "next/server";
import {
  CommunityRecipeSubmissionSchema,
  RecipeIdSchema,
} from "@/types/recipe";
import { buildCommunityRecipe } from "@/lib/build-community-recipe";
import {
  listDatabaseRecipes,
  updateDatabaseRecipe,
} from "@/lib/recipe-database.server";
import { isSameOriginRequest } from "@/lib/request-origin.server";
import { isAdminPinHash, verifyAdminPin } from "@/lib/admin-pin.server";
export const runtime = "nodejs";
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request))
    return reply({ error: "ไม่อนุญาตคำขอจากเว็บไซต์อื่น" }, 403);
  const hash = process.env.ADMIN_DELETE_PIN_HASH;
  if (!isAdminPinHash(hash))
    return reply({ error: "ยังไม่ได้ตั้ง PIN ผู้ดูแล" }, 503);
  let body;
  try {
    body = await readBoundedJson(request);
    if (!body || typeof body !== "object") throw new Error();
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return reply({error:"ข้อมูลใหญ่เกินไป"}, 413);
    return reply({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
  }
  const parsed = CommunityRecipeSubmissionSchema.safeParse(body);
  if (!parsed.success || !RecipeIdSchema.safeParse(body.recipeId).success)
    return reply({ error: "ข้อมูลสูตรอาหารไม่ครบหรือไม่ถูกต้อง" }, 400);
  const limited = await enforceSharedLimit('pin');
  if(limited)return limited;
  if (
    typeof body.pin !== "string" ||
    !/^\d{6,12}$/.test(body.pin) ||
    !(await verifyAdminPin(body.pin, hash))
  )
    return reply({ error: "PIN ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" }, 401);
  try {
    const existing = (await listDatabaseRecipes()).recipes.find(
      (recipe) => recipe.id === body.recipeId,
    );
    if (!existing) return reply({ error: "ไม่พบเมนูนี้ อาจถูกลบแล้ว" }, 404);
    const version = existing.updated_at ?? existing.created_at;
    if (body.expectedVersion !== version)
      return reply({ error: "เมนูนี้มีการแก้ไขแล้ว กรุณาเปิดแก้ไขใหม่" }, 409);
    const updated = {
      ...buildCommunityRecipe(parsed.data, existing.id),
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };
    updated.image_url = await storeRecipeImage(updated.image_url!);
    return reply({ recipe: await updateDatabaseRecipe(updated, version) });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("กรุณาอัปโหลด")) return reply({error:error.message},400);
    return reply(
      { error: "บันทึกไม่สำเร็จ ข้อมูลยังอยู่ กรุณาเปิดสูตรล่าสุดแล้วลองใหม่" },
      503,
    );
  }
}
