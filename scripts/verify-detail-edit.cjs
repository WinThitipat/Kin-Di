const { chromium } = require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3101';
(async () => {
  const { recipes } = await (await fetch('https://kin-di.vercel.app/api/recipes')).json();
  const recipe = recipes.find(r => r.name === 'กะเพราไก่');
  assert(recipe);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  fs.mkdirSync('artifacts/detail-edit', { recursive: true });
  try {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/recipes', route => route.fulfill({ json: { recipes, databaseRecipeIds: recipes.map(r => r.id), deletedIds: [] } }));
      await page.goto(base + '/recipes/' + recipe.id);
      const step = page.getByRole('button', { name: /ขั้นตอนที่ 1/ });
      await step.waitFor();
      assert(!await step.innerText().then(t => t.includes('Step')));
      const badge = step.locator(':scope > div').first();
      assert.equal((await badge.innerText()).trim(), '1');
      assert(await badge.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight));
      await step.click();
      assert.equal(await step.getAttribute('aria-pressed'), 'true');
      await step.click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `artifacts/detail-edit/detail-${width}.png`, fullPage: true });
      await page.getByRole('link', { name: 'แก้ไขสูตร', exact: true }).click();
      await page.getByText('กำลังแก้ไขสูตรอาหาร', { exact: true }).waitFor();
      assert.equal(await page.locator('#recipe-name').inputValue(), recipe.name);
      assert.equal(await page.locator('#recipe-link').inputValue(), recipe.external_recipe_url);
      for (let i = 0; i < 3; i++) await page.locator('#recipe-share-form button[type="submit"]').click();
      await page.locator('#edit-admin-pin').waitFor();
      assert.equal(await page.locator('#edit-admin-pin').inputValue(), '');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.equal(errors.length, 0, errors.join('\n'));
      console.log('PASS', width, 'step fits, toggle works, edit prefilled, final PIN required, no overflow');
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
