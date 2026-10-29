import { enforceSharedLimit } from "@/lib/shared-limits.server";
import { storeRecipeImage } from "@/lib/recipe-image.server";
import { readBoundedJson, RequestBodyTooLarge } from "@/lib/request-body.server";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { CommunityRecipeSubmissionSchema } from "@/types/recipe";
import { buildCommunityRecipe } from "@/lib/build-community-recipe";
import { isSameOriginRequest } from "@/lib/request-origin.server";
import {
  listDatabaseRecipes,
  saveDatabaseRecipe,
} from "@/lib/recipe-database.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  try {
    return reply(await listDatabaseRecipes());
  } catch {
    return reply(
      { error: "ยังเชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง" },
      503,
    );
  }
}
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request))
    return reply({ error: "ไม่อนุญาตคำขอจากเว็บไซต์อื่น" }, 403);
  let body: Record<string, unknown>;
  try {
    body = await readBoundedJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Invalid body");
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return reply({error:"ข้อมูลใหญ่เกินไป"}, 413);
    return reply({ error: "ข้อมูลสูตรอาหารไม่ถูกต้อง" }, 400);
  }
  const parsed = CommunityRecipeSubmissionSchema.safeParse(body);
  if (!parsed.success)
    return reply({ error: parsed.error.issues[0].message }, 400);
  const legacyId = body.legacyRecipeId;
  if (
    legacyId !== undefined &&
    (typeof legacyId !== "string" || !/^shared-\d{10,20}$/.test(legacyId))
  )
    return reply({ error: "รหัสเมนูเดิมไม่ถูกต้อง" }, 400);
  const requestId = body.submissionId;
  if (
    requestId !== undefined &&
    (typeof requestId !== "string" || !/^[a-f0-9-]{36}$/.test(requestId))
  )
    return reply({ error: "รหัสการบันทึกไม่ถูกต้อง" }, 400);
  const limited = await enforceSharedLimit("create");
  if(limited)return limited;
  let recipe;
  try {
    recipe = buildCommunityRecipe(
      parsed.data,
      typeof legacyId === "string"
        ? legacyId
        : `shared-${requestId || randomUUID()}`,
    );
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : "วัตถุดิบไม่ถูกต้อง" },
      400,
    );
  }
  try {
    recipe.image_url = await storeRecipeImage(recipe.image_url!);
    return reply({ recipe: await saveDatabaseRecipe(recipe) }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("กรุณาอัปโหลด")) return reply({error:error.message},400);
    return reply(
      { error: "บันทึกลงฐานข้อมูลไม่สำเร็จ ข้อมูลในฟอร์มยังอยู่ กรุณาลองใหม่" },
      503,
    );
  }
}
