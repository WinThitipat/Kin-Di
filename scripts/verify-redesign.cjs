// Isolated browser checks. Test recipes exist only in this disposable context.
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const output = `artifacts/usability/${process.env.TEST_DEVICE || 'desktop'}`;
fs.mkdirSync(output, { recursive: true });
const allergens = [
  "peanuts",
  "tree_nuts",
  "shellfish",
  "fish",
  "eggs",
  "dairy",
  "soy",
  "wheat_gluten",
  "sesame",
];
const recipes = [
  "ข้าวผัดไข่ทดสอบ",
  "ข้าวกะเพราทดสอบ",
  "ข้าวผักทดสอบ",
  "ข้าวต้มทดสอบ",
  "ผัดผักทดสอบ",
].map((name, i) => ({
  id: `qa-recipe-${i}`,
  name,
  description: "ข้อมูลทดสอบเฉพาะในเบราว์เซอร์สำหรับตรวจสอบหน้าจอ",
  category: i === 4 ? "healthy" : "thai",
  meal_types: [i === 3 ? "breakfast" : "lunch", "dinner"],
  cooking_time: 10 + i * 5,
  difficulty: "easy",
  image_url: "/images/thai-table.jpg",
  external_recipe_url: "https://www.wongnai.com/recipes",
  external_source_name: "Wongnai",
  status: "approved",
  dietary_tags: [],
  safety_metadata_complete: true,
  cross_contact_risk: "low",
  ingredients: [
    {
      ingredient_id: "jasmine_rice",
      quantity: "1 ถ้วย",
      role: "main",
      is_optional: false,
      composition_verified: true,
    },
  ],
  allergen_assessments: Object.fromEntries(
    allergens.map((a) => [
      a,
      {
        allergen: a,
        status: i === 0 && a === "eggs" ? "contains" : "free",
        cross_contact_risk: "low",
      },
    ]),
  ),
  instructions: ["เตรียมวัตถุดิบ", "ปรุงอาหารให้สุก"],
  created_at: "2026-10-28T00:00:00Z",
}));
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext(process.env.TEST_DEVICE === 'mobile' ? { isMobile: true, hasTouch: true } : {});
  const page = await context.newPage();
  await require('./mock-recipe-api.cjs').mockRecipeAPI(context);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  async function go(path) {
    await page.goto(base + path);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
  }
  async function noOverflow() {
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Horizontal overflow: ${page.url()}`,
    );
  }
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await go("/");
    assert.equal(await page.locator("dialog[open]").count(), 0);
    assert(
      await page
        .locator(".hero-food")
        .evaluate((el) => el.complete && el.naturalWidth > 0),
    );
    assert(await page.evaluate(() => document.fonts.check('16px "Plex Thai"')));
    await page.getByRole("button", { name: "สุ่มเลย กินดิ!" }).click();
    await page.locator("dialog[open]").waitFor();
    await page.getByText("วันนี้ยังไม่มีเมนูที่ตรงเงื่อนไข").waitFor();
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: `${output}/home-desktop.png`,
      fullPage: true,
    });
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/roulette", "/fridge", "/community"]) {
        await go(path);
        await noOverflow();
        if (path === '/' || path === '/roulette') {
          const metrics = await page.locator('.category-tabs').evaluate(el => {
            const bounds = el.getBoundingClientRect();
            return { fits: el.scrollWidth <= el.clientWidth, buttons: [...el.querySelectorAll('button')].map(button => {
              const r = button.getBoundingClientRect();
              return { fits: r.left >= bounds.left - 1 && r.right <= bounds.right + 1, height: r.height, width: r.width };
            }) };
          });
          assert(metrics.fits, `Category strip scrolls at ${width}px`);
          assert.equal(metrics.buttons.length, 7);
          assert(metrics.buttons.every(b => b.fits && b.height >= 44 && b.width >= 44), `Hidden or small category button at ${width}px`);
          for (const button of await page.locator('.category-tabs button').all()) {
            if (process.env.TEST_DEVICE === 'mobile') await button.tap();
            else { await button.focus(); await page.keyboard.press('Enter'); }
            assert.equal(await button.getAttribute('aria-pressed'), 'true');
          }
          await page.locator('.category-tabs button').first().click();
        }
      }
    }
    console.log(
      `PASS (${process.env.TEST_DEVICE || 'desktop'}): four routes at 320–1440px; all seven categories fit, targets >=44px, touch/keyboard selection works; image, fonts, empty roulette.`,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await go("/");
    await page.screenshot({
      path: `${output}/home-mobile.png`,
      fullPage: true,
    });
    // Load fixtures once, without replacing persistence on future navigations.
    await page.evaluate((data) => {
      localStorage.setItem("kindi:shared-recipes:v1", JSON.stringify(data));
      window.dispatchEvent(new Event("kindi-recipes-updated"));
    }, recipes);
    await page.locator(".editorial-recipe").first().waitFor();
    assert.equal(await page.locator(".editorial-recipe").count(), 5);
    await page
      .getByRole("searchbox", { name: "ค้นหาเมนูอาหาร" })
      .fill("ผัดไข่");
    assert.equal(await page.locator(".editorial-recipe").count(), 1);
    await page.getByRole("searchbox", { name: "ค้นหาเมนูอาหาร" }).fill("");
    await page
      .locator(".category-tabs")
      .getByRole("button", { name: "สายเฮลท์ตี้" })
      .click();
    assert.equal(await page.locator(".editorial-recipe").count(), 1);
    await page
      .locator(".category-tabs")
      .getByRole("button", { name: "ทั้งหมด", exact: true })
      .click();
    await page.locator(".favorite-button").first().click();
    assert.equal(
      await page
        .locator(".favorite-button")
        .first()
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.reload();
    await page.waitForLoadState("networkidle");
    assert.equal(
      await page
        .locator(".favorite-button")
        .first()
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.getByLabel("มีเวลาสักเท่าไร").selectOption("10");
    await page.getByText("1 เมนูในสำรับ", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "ล้างตัวกรอง", exact: true })
      .click();
    await page.getByRole("button", { name: "สุ่มเลย กินดิ!" }).click();
    await page.locator("dialog[open] .kindi-card-scene").first().waitFor();
    assert.equal(
      await page.locator("dialog[open] .kindi-card-scene").count(),
      5,
    );
    await page.locator("dialog[open] .kindi-card-btn").first().click();
    await page.locator(".kindi-reveal-panel").waitFor();
    await page.screenshot({
      path: `${output}/roulette-mobile.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "ข้อจำกัดทางอาหาร", exact: true }).click();
    await page
      .locator("dialog[open]")
      .getByRole("button", { name: /ไข่ \(Eggs\)/ })
      .click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".editorial-recipe").count(), 4);
    await page.reload();
    await page.waitForLoadState("networkidle");
    assert.equal(await page.locator(".editorial-recipe").count(), 4);
    await page.locator('.diet-trigger').click();
    await page
      .locator("dialog[open]")
      .getByRole("button", { name: /ไข่ \(Eggs\)/ })
      .click();
    await page.screenshot({
      path: `${output}/dietary-mobile.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    console.log(
      "PASS: search, categories, favorites persistence, time filter, five-card reveal, dietary filtering and persistence.",
    );
    await go("/recipes/qa-recipe-0");
    await page.locator("#recipe-title").waitFor();
    await noOverflow();
    await page.screenshot({
      path: `${output}/recipe-mobile.png`,
      fullPage: true,
    });
    const checkboxes = page.getByRole("checkbox");
    if (await checkboxes.count()) await checkboxes.first().check();
    await go("/fridge");
    await page.getByRole("button", { name: "ล้างที่เลือก" }).click();
    await page
      .getByRole("button", { name: "ข้าวสวยหอมมะลิ", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "เมนูที่ทำได้ทันที (5 เมนู)" })
      .waitFor();
    await page.screenshot({
      path: `${output}/fridge-mobile.png`,
      fullPage: true,
    });
    console.log("PASS: recipe detail and ingredient matching.");
    await go("/community");
    await page.locator("#recipe-name").fill("สูตรตรวจสอบหน้าเว็บ");
    await page.locator("#recipe-link").fill("https://www.wongnai.com/recipes");
    await page
      .locator("#recipe-desc")
      .fill("สูตรสำหรับตรวจสอบการบันทึกในเบราว์เซอร์ทดสอบเท่านั้น");
    await page
      .locator("#recipe-image-upload")
      .setInputFiles("public/images/thai-table.jpg");
    await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
    await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
    await page
      .getByRole("button", { name: "หมูสับ / เนื้อหมู", exact: true })
      .click();
    await page.getByRole('button', { name: 'ถัดไป: ตรวจสอบสูตร' }).click();
    await page
      .getByRole("button", { name: "บันทึกเมนูอาหารเข้าสำรับ!" })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "บันทึกเมนูลงฐานข้อมูลเรียบร้อยแล้ว" })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("kindi:shared-recipes:v1")).length,
      ),
      6,
    );
    await noOverflow();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: `${output}/community-desktop.png`,
      fullPage: true,
    });
    console.log("PASS: community form submission and local persistence.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await go("/");
    assert.equal(
      await page
        .locator(".hero-copy")
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    await page.getByRole("button", { name: "สุ่มเลย กินดิ!" }).click();
    await page.locator("dialog[open] .kindi-card-btn").first().click();
    await page.locator(".kindi-reveal-panel").waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: reduced motion, Escape dismissal, no browser runtime errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
