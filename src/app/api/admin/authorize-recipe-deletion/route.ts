import { isAdminPinHash, verifyAdminPin } from "@/lib/admin-pin.server";
import { NextRequest, NextResponse } from "next/server";
import { RecipeIdSchema } from "@/types/recipe";
import { archiveDatabaseRecipe } from "@/lib/recipe-database.server";
import { isSameOriginRequest } from "@/lib/request-origin.server";

export const runtime = "nodejs";
// Local single-server protection. Deployments with multiple instances should
// move this counter to a shared rate limiter.
let failures = 0;
let resetAt = 0;
const WINDOW_MS = 60_000;
const MAX_FAILURES = 5;
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
  const now = Date.now();
  if (now >= resetAt) {
    failures = 0;
    resetAt = now + WINDOW_MS;
  }
  if (failures >= MAX_FAILURES) {
    const seconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
    return reply(
      { error: `ใส่ PIN ผิดหลายครั้ง กรุณารอ ${seconds} วินาทีแล้วลองใหม่` },
      429,
      { "Retry-After": String(seconds) },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ error: "ข้อมูลคำขอไม่ถูกต้อง" }, 400);
  }
  if (!body || typeof body !== "object")
    return reply({ error: "ข้อมูลคำขอไม่ถูกต้อง" }, 400);
  const { pin, recipeId } = body as { pin?: unknown; recipeId?: unknown };
  if (!RecipeIdSchema.safeParse(recipeId).success)
    return reply({ error: "รหัสเมนูไม่ถูกต้อง" }, 400);
  if (typeof pin !== "string" || !/^\d{6,12}$/.test(pin)) {
    failures++;
    return reply({ error: "PIN ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" }, 401);
  }
  // Reserve the attempt before the asynchronous hash check so concurrent
  // guesses cannot all bypass the attempt limit.
  failures++;
  if (!(await verifyAdminPin(pin, expectedPinHash))) {
    return reply({ error: "PIN ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" }, 401);
  }
  failures = 0;
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
