import { enforceSharedLimit } from "@/lib/shared-limits.server";
import { readBoundedJson, RequestBodyTooLarge } from "@/lib/request-body.server";
import { isAdminPinHash, verifyAdminPin } from "@/lib/admin-pin.server";
import { NextRequest, NextResponse } from "next/server";
import { RecipeIdSchema } from "@/types/recipe";
import { archiveDatabaseRecipe } from "@/lib/recipe-database.server";
import { isSameOriginRequest } from "@/lib/request-origin.server";

export const runtime = "nodejs";
function reply(
  body: object,
  status = 200,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return reply({ error: "ไม่อนุญาตคำขอจากเว็บไซต์อื่น" }, 403);
  }
  const expectedPinHash = process.env.ADMIN_DELETE_PIN_HASH;
  if (!isAdminPinHash(expectedPinHash)) {
    return reply(
      { error: "ยังไม่ได้ตั้ง PIN ผู้ดูแล กรุณาติดต่อผู้ดูแลระบบ" },
      503,
    );
  }
  let body: unknown;
  try {
    body = await readBoundedJson(request, 4096);
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return reply({error:"ข้อมูลใหญ่เกินไป"}, 413);
    return reply({ error: "ข้อมูลคำขอไม่ถูกต้อง" }, 400);
  }
  if (!body || typeof body !== "object")
    return reply({ error: "ข้อมูลคำขอไม่ถูกต้อง" }, 400);
  const { pin, recipeId } = body as { pin?: unknown; recipeId?: unknown };
  if (!RecipeIdSchema.safeParse(recipeId).success)
    return reply({ error: "รหัสเมนูไม่ถูกต้อง" }, 400);
  const limited = await enforceSharedLimit('pin');
  if (limited) return limited;
  if (typeof pin !== "string" || !/^\d{6,12}$/.test(pin)) {
    return reply({ error: "PIN ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" }, 401);
  }
  if (!(await verifyAdminPin(pin, expectedPinHash))) {
    return reply({ error: "PIN ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" }, 401);
  }
  try {
    await archiveDatabaseRecipe(String(recipeId));
  } catch {
    return reply(
      { error: "ลบจากฐานข้อมูลไม่สำเร็จ เมนูยังอยู่ กรุณาลองใหม่" },
      503,
    );
  }
  return reply({ authorizedRecipeId: recipeId });
}
