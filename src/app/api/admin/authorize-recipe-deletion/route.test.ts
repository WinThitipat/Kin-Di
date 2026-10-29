import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { hashAdminPin } from '@/lib/admin-pin.server';
let testHash: string;
const archive = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/recipe-database.server", () => ({
  archiveDatabaseRecipe: archive,
}));

async function endpoint() {
  return (await import("./route")).POST;
}
function request(
  pin: unknown,
  origin = "http://localhost:3100",
  recipeId = "shared-test",
) {
  return new NextRequest(
    "http://localhost:3100/api/admin/authorize-recipe-deletion",
    {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify({ pin, recipeId }),
    },
  );
}
describe("Admin recipe deletion authorization", () => {
  beforeEach(async () => {
    vi.resetModules();
    archive.mockReset().mockResolvedValue(undefined);
    testHash ??= await hashAdminPin('12345678');
    vi.stubEnv("ADMIN_DELETE_PIN_HASH", testHash);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  it("rejects missing, malformed and wrong PINs; authorizes only the submitted recipe", async () => {
    const post = await endpoint();
    for (const pin of [undefined, "123", "00000000"])
      expect((await post(request(pin))).status).toBe(401);
    const response = await post(request("12345678"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authorizedRecipeId: "shared-test",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(archive).toHaveBeenCalledExactlyOnceWith("shared-test");
  });
  it("rejects cross-site requests and invalid recipe IDs", async () => {
    const post = await endpoint();
    expect(
      (await post(request("12345678", "https://other.example"))).status,
    ).toBe(403);
    expect(
      (await post(request("12345678", "http://localhost:3100", "../invalid")))
        .status,
    ).toBe(400);
  });
  it("fails closed when server PIN is not configured", async () => {
    vi.stubEnv("ADMIN_DELETE_PIN_HASH", "");
    expect((await (await endpoint())(request("12345678"))).status).toBe(503);
  });
  it("does not report deletion success if the database write fails", async () => {
    archive.mockRejectedValueOnce(new Error("offline"));
    expect((await (await endpoint())(request("12345678"))).status).toBe(503);
  });
  it("forwards the shared database limit and retry header", async () => {
    sharedLimit.mockResolvedValueOnce(NextResponse.json({error:"limited"},{status:429,headers:{"Retry-After":"60"}}));
    const locked=await (await endpoint())(request("12345678"));
    expect(locked.status).toBe(429);expect(locked.headers.get("retry-after")).toBe("60");expect(archive).not.toHaveBeenCalled();
  });
});


const sharedLimit = vi.hoisted(() => vi.fn().mockResolvedValue(null));
vi.mock("@/lib/shared-limits.server", () => ({enforceSharedLimit:sharedLimit}));
vi.mock("@/lib/recipe-image.server", () => ({storeRecipeImage:vi.fn(async (source:string) => source)}));
