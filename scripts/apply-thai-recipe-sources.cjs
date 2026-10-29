// One-off, version-checked content update. Run the source checker first.
require('@next/env').loadEnvConfig(process.cwd());
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const Module = require('node:module');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const sources = require('../data/thai-recipe-sources-2026-10-29.json');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.resolve('src', request.slice(2)) : request, ...args);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { buildCommunityRecipe } = require('../src/lib/build-community-recipe.ts');
const { CommunityRecipeSubmissionSchema } = require('../src/types/recipe.ts');
const curated = [...require('../data/curated-menus-2026-10-29.json'), ...require('../data/curated-world-menus-2026-10-29.json')];
const overrides = {
  'ผัดซีอิ๊วหมู': { ids: ['pork', 'egg', 'garlic', 'oyster_sauce', 'soy_sauce'], custom: ['เส้นใหญ่', 'คะน้า', 'ซีอิ๊วดำ', 'น้ำมันพืช', 'น้ำตาลทราย', 'พริกไทย', 'ผงฟู'] },
  'แกงจืดวุ้นเส้นเต้าหู้ไข่หมูสับ': { ids: ['pork', 'garlic', 'fish_sauce', 'soy_sauce', 'sea_salt'], custom: ['เต้าหู้ไข่', 'วุ้นเส้น', 'ผักกาดขาว', 'แครอท', 'รากผักชี', 'พริกไทย', 'ต้นหอม', 'ขึ้นฉ่าย'], allergens: ['eggs', 'soy', 'fish', 'wheat_gluten'] },
  'ผัดวุ้นเส้นหมูใส่ไข่': { ids: ['pork', 'egg', 'garlic', 'onion', 'cabbage', 'tomato', 'oyster_sauce', 'fish_sauce'], custom: ['วุ้นเส้น', 'น้ำมันพืช', 'น้ำตาลทราย', 'ต้นหอม', 'ขึ้นฉ่าย', 'พริกไทย'] },
  'แกงเขียวหวานไก่': { ids: ['chicken'], custom: ['พริกแกงเขียวหวาน', 'กะทิ', 'มะเขือเปราะ', 'มะเขือพวง', 'ใบโหระพา', 'พริกหยวก', 'เครื่องปรุงรสตามชอบ'] },
  'ลาบหมูอีสาน': { ids: ['pork', 'lime', 'fish_sauce'], custom: ['หอมแดง', 'ผักชีฝรั่ง', 'ต้นหอม', 'ข้าวคั่ว', 'พริกป่น', 'น้ำตาลทราย'] },
};
(async () => {
  const checks = JSON.parse(fs.readFileSync('.firecrawl/thai-source-checks.json'));
  for (const source of sources) assert(checks.some(c => c.name === source.name && c.status === 200 && c.thai && decodeURI(c.url) === decodeURI(source.url)), 'Source not checked: ' + source.name);
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const secret = process.env.RECIPE_SERVER_SECRET;
  const { data, error } = await db.rpc('kindi_list_recipes', { p_secret: secret });
  if (error) throw error;
  const folder = 'artifacts/thai-source-migration';
  fs.mkdirSync(folder, { recursive: true });
  if (!fs.existsSync(folder + '/before.json')) fs.writeFileSync(folder + '/before.json', JSON.stringify(data.recipes, null, 2));
  const planned = sources.map(source => {
    const old = data.recipes.find(r => r.name === source.name || (source.newName && r.name === source.newName));
    assert(old, 'Missing recipe ' + source.name);
    const input = curated.find(r => r.name === source.name);
    assert(input);
    const fields = { ...overrides[source.name], ...source };
    const platform = new URL(source.url).hostname.includes('wongnai') ? 'Wongnai Cooking' : 'Cookpad ภาษาไทย';
    const submission = CommunityRecipeSubmissionSchema.parse({ ...input,
      name: source.newName || source.name,
      description: source.description || input.description.replace('สูตรต้นฉบับเลือกเปลี่ยนโปรตีนได้', '').trim(),
      external_recipe_url: source.url, image_url: old.image_url,
      ingredientIds: fields.ids || input.ingredientIds,
      customIngredientNames: fields.custom || input.customIngredientNames,
      allergens: fields.allergens || input.allergens, dietary_tags: [],
      submitted_by: `KIN DI · ${source.author} (${platform})`,
      instructionsText: `อ่านสัดส่วนและวิธีทำฉบับเต็มภาษาไทยจาก ${platform} โดย ${source.author} ที่ปุ่มลิงก์สูตรอาหาร\nรายการวัตถุดิบใช้ช่วยเลือกเมนู เวลาเตรียมและทำเป็นค่าประมาณ โปรดอ้างอิงสูตรต้นทางและตรวจฉลากเครื่องปรุงที่ใช้จริง ภาพเป็นภาพประกอบเมนู`,
    });
    const updated = { ...buildCommunityRecipe(submission, old.id), created_at: old.created_at, updated_at: new Date().toISOString() };
    updated.external_source_name = platform;
    return { old, updated };
  });
  fs.writeFileSync(folder + '/planned.json', JSON.stringify(planned.map(p => p.updated), null, 2));
  for (const { old, updated } of planned) {
    if (old.external_recipe_url === updated.external_recipe_url) { console.log('ALREADY', updated.name); continue; }
    const result = await db.rpc('kindi_update_recipe', { p_recipe: updated, p_expected_version: old.updated_at || old.created_at, p_secret: secret });
    if (result.error) throw result.error;
    console.log('UPDATED', updated.name);
  }
  const response = await fetch('https://kin-di.vercel.app/api/recipes', { cache: 'no-store' });
  assert.equal(response.status, 200);
  const live = (await response.json()).recipes;
  assert.equal(live.length, data.recipes.length);
  for (const { old, updated } of planned) {
    const actual = live.find(r => r.id === old.id);
    assert.equal(actual.external_recipe_url, updated.external_recipe_url);
    assert.equal(actual.image_url, old.image_url);
    assert.equal(actual.created_at, old.created_at);
  }
  assert(live.every(r => ['www.wongnai.com', 'cookpad.com'].includes(new URL(r.external_recipe_url).hostname)));
  fs.writeFileSync(folder + '/verified.json', JSON.stringify({ total: live.length, recipes: live.map(r => ({ id: r.id, name: r.name, url: r.external_recipe_url })) }, null, 2));
  console.log('VERIFIED all', live.length, 'live recipes use Thai sources');
})().catch(e => { console.error(e.message); process.exitCode = 1; });
