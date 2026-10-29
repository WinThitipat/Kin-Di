const fs = require('node:fs');
const sources = [...require('../data/thai-recipe-sources-2026-10-29.json'), {
  name: 'หมูสามชั้นทอดกระเทียม', url: 'https://www.wongnai.com/recipes/deep-fried-pork-belly-with-garlic',
}];
(async () => {
  fs.mkdirSync('.firecrawl', { recursive: true });
  const results = [];
  for (const source of sources) {
    const response = await fetch(source.url, { signal: AbortSignal.timeout(30000) });
    const html = await response.text();
    let facts;
    function walk(value) {
      if (!value || typeof value !== 'object') return;
      if ([value['@type']].flat().includes('Recipe')) facts = { name: value.name, ingredients: value.recipeIngredient };
      Object.values(value).forEach(v => typeof v === 'object' && (Array.isArray(v) ? v.forEach(walk) : walk(v)));
    }
    for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)) {
      try { walk(JSON.parse(match[1])); } catch {}
    }
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
    const result = { name: source.name, status: response.status, url: response.url, title, facts, thai: /[ก-๙]/.test(title) };
    results.push(result);
    console.log(JSON.stringify(result));
  }
  fs.writeFileSync('.firecrawl/thai-source-checks.json', JSON.stringify(results, null, 2));
  if (results.some(r => r.status !== 200 || !r.thai)) process.exitCode = 1;
})().catch(e => { console.error(e.message); process.exitCode = 1; });
