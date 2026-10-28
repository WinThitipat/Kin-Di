// Browser-only fixtures. These regression tests must never write to live Supabase.
exports.mockRecipeAPI = async function(target) {
  const recipes = new Map();
  const deleted = new Set();
  await target.route('**/api/recipes', async route => {
    if (route.request().method() === 'GET') return route.fulfill({json:{recipes:[...recipes.values()],deletedIds:[...deleted]}});
    const data=route.request().postDataJSON();
    const id=data.legacyRecipeId||`shared-${data.submissionId}`;
    if(!recipes.has(id))recipes.set(id,{
      id,name:data.name,description:data.description,category:data.category,meal_types:data.meal_types,
      cooking_time:data.cooking_time,difficulty:data.difficulty,image_url:data.image_url,
      external_recipe_url:data.external_recipe_url,status:'approved',dietary_tags:data.dietary_tags,
      custom_ingredients:data.customIngredientNames,instructions:[data.instructionsText||'ทดสอบ'],
      ingredients:data.ingredientIds.map(ingredient_id=>({ingredient_id,quantity:'ตามสูตร',role:'main',is_optional:false,composition_verified:true})),
      safety_metadata_complete:false,cross_contact_risk:'unknown',created_at:new Date().toISOString(),
    });
    return route.fulfill({status:201,json:{recipe:recipes.get(id)}});
  });
  await target.route('**/api/admin/authorize-recipe-deletion',async route=>{
    const {pin,recipeId}=route.request().postDataJSON();
    if(pin!=='12345678')return route.fulfill({status:401,json:{error:'PIN ไม่ถูกต้อง'}});
    recipes.delete(recipeId);deleted.add(recipeId);
    return route.fulfill({json:{authorizedRecipeId:recipeId}});
  });
};
