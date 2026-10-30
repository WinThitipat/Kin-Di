const { chromium } = require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  fs.mkdirSync('artifacts/community-concept',{recursive:true});
  try {
    for (const width of [320,390,600,768,1024,1440]) {
      const page = await browser.newPage({viewport:{width,height:900}});
      const errors=[]; page.on('pageerror',e=>errors.push(e.message));
      await page.goto((process.env.TEST_BASE_URL || 'http://127.0.0.1:3115')+'/community');
      await page.waitForLoadState('networkidle');
      if(width<1024) await page.getByRole('button',{name:/ดูเมนูที่แบ่งปัน/}).click();
      await page.locator('.shared-menu-card').first().waitFor();
      const initial=await page.locator('.shared-menu-card').count();
      assert(initial<=6);
      const more=page.getByRole('button',{name:/ดูเพิ่มอีก/});
      if(await more.count()) { await more.click(); assert(await page.locator('.shared-menu-card').count()>initial); }
      const name=await page.locator('.shared-menu-card .shared-menu-info p').first().innerText();
      const search=page.getByRole('searchbox',{name:'ค้นหาเมนูที่แบ่งปันแล้ว'});
      await search.fill(name); assert(await page.locator('.shared-menu-card').count()>0);
      await search.fill('zzzzzzไม่พบแน่นอน'); assert.equal(await page.locator('.shared-menu-card').count(),0);
      assert(await page.getByRole('status').filter({hasText:'ไม่พบเมนูที่ค้นหา'}).isVisible());
      await search.fill(''); assert.equal(await page.locator('.shared-menu-card').count(),initial);
      const cards=page.locator('.shared-menu-card');
      const firstHeight=await cards.first().evaluate(el=>el.getBoundingClientRect().height);
      const menus=page.locator('.community-manage');
      await menus.first().locator('summary').click();
      assert.equal(await menus.first().getAttribute('open'),'');
      assert.equal(await cards.first().evaluate(el=>el.getBoundingClientRect().height),firstHeight);
      const menuBox=await menus.first().locator('.community-manage-options').boundingBox();
      assert(menuBox.x>=0 && menuBox.x+menuBox.width<=width);
      await page.screenshot({path:`artifacts/community-concept/actions-${width}.png`,fullPage:true});
      await menus.nth(1).locator('summary').focus(); await menus.nth(1).locator('summary').press('Enter');
      assert.equal(await menus.first().getAttribute('open'),null);
      await page.locator('#shared-recipes-heading').click();
      assert.equal(await page.locator('.community-manage[open]').count(),0);

      await page.evaluate(()=>scrollTo(0,0));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      if(width<1024) { await page.screenshot({path:`artifacts/community-concept/collection-${width}.png`,fullPage:true}); await page.getByRole('button',{name:'เพิ่มสูตร',exact:true}).click(); }
      if(width<=600) { assert(await page.locator('.community-mobile-progress').isVisible()); assert.equal(await page.locator('progress').getAttribute('value'),'1'); }
      await page.screenshot({path:`artifacts/community-concept/${width}.png`,fullPage:true});
      assert.deepEqual(errors,[]); console.log('PASS community responsive/search',width);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
