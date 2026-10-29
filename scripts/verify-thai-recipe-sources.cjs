const { chromium } = require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const base = 'https://kin-di.vercel.app';
  const response = await fetch(base + '/api/recipes');
  assert.equal(response.status, 200);
  const { recipes } = await response.json();
  const checks = JSON.parse(fs.readFileSync('.firecrawl/thai-source-checks.json'));
  for (const recipe of recipes) assert(checks.some(c => c.status === 200 && c.thai && decodeURI(c.url) === decodeURI(recipe.external_recipe_url)), recipe.name);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/community');
      await page.locator('.shared-menu-card').first().waitFor();
      for (const recipe of recipes) {
        const card = page.locator('.shared-menu-card').filter({ hasText: recipe.name });
        assert.equal(await card.count(), 1, recipe.name);
        assert.equal(await card.locator(`a[href="${recipe.external_recipe_url}"]`).count(), 1, recipe.name + ' source link');
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const sample = recipes.find(r => r.name.includes('คาร์โบนารา'));
      await page.goto(base + '/recipes/' + sample.id);
      await page.locator(`a[href="${sample.external_recipe_url}"]`).first().waitFor();
      assert.equal(errors.length, 0, errors.join('\n'));
      await page.screenshot({ path: `artifacts/thai-source-migration/detail-${width}.png`, fullPage: true });
      console.log('PASS', width, recipes.length, 'Thai source links, detail link, no overflow or runtime errors');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
