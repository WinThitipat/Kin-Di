import {
  AllergenId,
  AllergenStatus,
  CrossContactRisk,
  IngredientRecord,
  Recipe,
  RecipeAllergenAssessment,
} from '@/types/recipe';

export const ALL_ALLERGEN_IDS: AllergenId[] = [
  'peanuts',
  'tree_nuts',
  'shellfish',
  'fish',
  'eggs',
  'dairy',
  'soy',
  'wheat_gluten',
  'sesame',
];

/**
 * Helper to create a complete fail-closed allergen assessment map for a recipe.
 * Defaults all 9 allergens to 'free' with 'low' cross-contact risk, then applies overrides.
 */
export function buildAllergenAssessments(
  overrides: Partial<
    Record<
      AllergenId,
      { status: AllergenStatus; cross_contact_risk?: CrossContactRisk; notes?: string }
    >
  > = {},
  defaultCrossContact: CrossContactRisk = 'low'
): Record<AllergenId, RecipeAllergenAssessment> {
  const result = {} as Record<AllergenId, RecipeAllergenAssessment>;
  for (const allergen of ALL_ALLERGEN_IDS) {
    const ov = overrides[allergen];
    result[allergen] = {
      allergen,
      status: ov?.status ?? 'free',
      cross_contact_risk: ov?.cross_contact_risk ?? defaultCrossContact,
      notes: ov?.notes,
    };
  }
  return result;
}

export const INGREDIENTS_CATALOG: Record<string, IngredientRecord> = {
  // Meats
  pork: {
    id: 'pork',
    name_th: 'หมูสับ / เนื้อหมู',
    name_en: 'Pork',
    category: 'meat',
    allergens: [],
    dietary_compatible: [],
    composition_known: true,
  },
  crispy_pork: {
    id: 'crispy_pork',
    name_th: 'หมูกรอบ',
    name_en: 'Crispy Pork Belly',
    category: 'meat',
    allergens: [],
    dietary_compatible: [],
    composition_known: true,
  },
  beef: {
    id: 'beef',
    name_th: 'เนื้อวัว',
    name_en: 'Beef',
    category: 'meat',
    allergens: [],
    dietary_compatible: ['halal'],
    composition_known: true,
  },
  chicken: {
    id: 'chicken',
    name_th: 'อกไก่ / เนื้อไก่',
    name_en: 'Chicken',
    category: 'meat',
    allergens: [],
    dietary_compatible: ['halal'],
    composition_known: true,
  },
  beef_stock: {
    id: 'beef_stock',
    name_th: 'น้ำสต็อกเนื้อวัว',
    name_en: 'Beef Stock',
    category: 'condiment',
    allergens: [],
    dietary_compatible: ['halal'],
    composition_known: true,
  },

  // Seafood
  shrimp: {
    id: 'shrimp',
    name_th: 'กุ้งสด',
    name_en: 'Shrimp',
    category: 'seafood',
    allergens: ['shellfish'],
    dietary_compatible: ['halal'],
    composition_known: true,
  },
  salmon: {
    id: 'salmon',
    name_th: 'ปลาแซลมอน',
    name_en: 'Salmon',
    category: 'seafood',
    allergens: ['fish'],
    dietary_compatible: ['halal'],
    composition_known: true,
  },
  mackerel: {
    id: 'mackerel',
    name_th: 'ปลาทู',
    name_en: 'Mackerel',
    category: 'seafood',
    allergens: ['fish'],
    dietary_compatible: ['halal'],
    composition_known: true,
  },
  canned_tuna: {
    id: 'canned_tuna',
    name_th: 'ทูน่ากระป๋องในน้ำแร่',
    name_en: 'Canned Tuna',
    category: 'seafood',
    allergens: ['fish'],
    dietary_compatible: ['halal'],
    composition_known: true,
  },

  // Eggs & Dairy & Tofu
  egg: {
    id: 'egg',
    name_th: 'ไข่ไก่',
    name_en: 'Chicken Egg',
    category: 'egg_dairy',
    allergens: ['eggs'],
    dietary_compatible: ['vegetarian', 'halal'],
    composition_known: true,
  },
  milk: {
    id: 'milk',
    name_th: 'นมสด / นมข้นจืด',
    name_en: 'Milk / Evaporated Milk',
    category: 'egg_dairy',
    allergens: ['dairy'],
    dietary_compatible: ['vegetarian', 'halal'],
    composition_known: true,
  },
  butter: {
    id: 'butter',
    name_th: 'เนยสด',
    name_en: 'Butter',
    category: 'egg_dairy',
    allergens: ['dairy'],
    dietary_compatible: ['vegetarian', 'halal'],
    composition_known: true,
  },
  cheese: {
    id: 'cheese',
    name_th: 'ชีส (เชดดาร์ / มอซซาเรลล่า)',
    name_en: 'Cheese',
    category: 'egg_dairy',
    allergens: ['dairy'],
    dietary_compatible: ['vegetarian', 'halal'],
    composition_known: true,
  },
  tofu: {
    id: 'tofu',
    name_th: 'เต้าหู้ถั่วเหลือง',
    name_en: 'Soy Tofu',
    category: 'other',
    allergens: ['soy'],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },

  // Vegetables & Herbs
  holy_basil: {
    id: 'holy_basil',
    name_th: 'ใบกะเพรา',
    name_en: 'Holy Basil',
    category: 'vegetable',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  garlic: {
    id: 'garlic',
    name_th: 'กระเทียม',
    name_en: 'Garlic',
    category: 'vegetable',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  chili: {
    id: 'chili',
    name_th: 'พริกขี้หนู / พริกจินดา',
    name_en: 'Chili',
    category: 'vegetable',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  morning_glory: {
    id: 'morning_glory',
    name_th: 'ผักบุ้งจีน',
    name_en: 'Morning Glory',
    category: 'vegetable',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  mushroom: {
    id: 'mushroom',
    name_th: 'เห็ดรวม (ชิเมจิ / ออรินจิ)',
    name_en: 'Mixed Mushrooms',
    category: 'vegetable',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  cabbage: {
    id: 'cabbage',
    name_th: 'กะหล่ำปลี',
    name_en: 'Cabbage',
    category: 'vegetable',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  tomato: {
    id: 'tomato',
    name_th: 'มะเขือเทศ',
    name_en: 'Tomato',
    category: 'vegetable',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  avocado: {
    id: 'avocado',
    name_th: 'อะโวคาโด',
    name_en: 'Avocado',
    category: 'vegetable',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  lime: {
    id: 'lime',
    name_th: 'มะนาวสด',
    name_en: 'Fresh Lime',
    category: 'vegetable',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  onion: {
    id: 'onion',
    name_th: 'หอมหัวใหญ่ / หอมแดง',
    name_en: 'Onion / Shallot',
    category: 'vegetable',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },

  // Carbs
  jasmine_rice: {
    id: 'jasmine_rice',
    name_th: 'ข้าวสวยหอมมะลิ',
    name_en: 'Jasmine Rice',
    category: 'carb',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  rice_noodles: {
    id: 'rice_noodles',
    name_th: 'เส้นจันท์ / เส้นใหญ่ (ทำจากข้าวเจ้า)',
    name_en: 'Rice Noodles',
    category: 'carb',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  wheat_noodles: {
    id: 'wheat_noodles',
    name_th: 'บะหมี่กึ่งสำเร็จรูป / เส้นพาสต้าแป้งสาลี',
    name_en: 'Wheat Noodles / Pasta',
    category: 'carb',
    allergens: ['wheat_gluten'],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  bread: {
    id: 'bread',
    name_th: 'ขนมปังโฮลวีต / ขนมปังปอนด์',
    name_en: 'Bread',
    category: 'carb',
    allergens: ['wheat_gluten'],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  quinoa: {
    id: 'quinoa',
    name_th: 'ควินัวหุงสุก',
    name_en: 'Cooked Quinoa',
    category: 'carb',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },

  // Nuts & Seeds
  peanuts: {
    id: 'peanuts',
    name_th: 'ถั่วลิสงคั่วป่น',
    name_en: 'Roasted Crushed Peanuts',
    category: 'nut_seed',
    allergens: ['peanuts'],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  cashew_nuts: {
    id: 'cashew_nuts',
    name_th: 'เม็ดมะม่วงหิมพานต์',
    name_en: 'Cashew Nuts',
    category: 'nut_seed',
    allergens: ['tree_nuts'],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  sesame_oil: {
    id: 'sesame_oil',
    name_th: 'น้ำมันงา / งาคั่ว',
    name_en: 'Sesame Oil / Roasted Sesame',
    category: 'nut_seed',
    allergens: ['sesame'],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },

  // Condiments & Sauces
  fish_sauce: {
    id: 'fish_sauce',
    name_th: 'น้ำปลาแท้',
    name_en: 'Fish Sauce',
    category: 'condiment',
    allergens: ['fish'],
    dietary_compatible: ['halal'],
    composition_known: true,
  },
  oyster_sauce: {
    id: 'oyster_sauce',
    name_th: 'ซอสหอยนางรม',
    name_en: 'Oyster Sauce',
    category: 'condiment',
    allergens: ['shellfish', 'soy', 'wheat_gluten'],
    dietary_compatible: ['halal'],
    composition_known: true,
  },
  soy_sauce: {
    id: 'soy_sauce',
    name_th: 'ซีอิ๊วขาว (หมักถั่วเหลืองและข้าวสาลี)',
    name_en: 'Light Soy Sauce',
    category: 'condiment',
    allergens: ['soy', 'wheat_gluten'],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  tamari_sauce: {
    id: 'tamari_sauce',
    name_th: 'ซอสทามาริ (ซีอิ๊วถั่วเหลืองไร้กลูเตน)',
    name_en: 'Gluten-Free Tamari Soy Sauce',
    category: 'condiment',
    allergens: ['soy'],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  sea_salt: {
    id: 'sea_salt',
    name_th: 'ดอกเกลือ / เกลือทะเล',
    name_en: 'Sea Salt',
    category: 'condiment',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  olive_oil: {
    id: 'olive_oil',
    name_th: 'น้ำมันมะกอก / น้ำมันรำข้าว',
    name_en: 'Olive / Rice Bran Oil',
    category: 'condiment',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
  coconut_milk: {
    id: 'coconut_milk',
    name_th: 'กะทิคั้นสด',
    name_en: 'Coconut Milk',
    category: 'condiment',
    allergens: [],
    dietary_compatible: ['vegetarian', 'vegan', 'halal'],
    composition_known: true,
  },
};

export const INGREDIENT_LIST: IngredientRecord[] = Object.values(INGREDIENTS_CATALOG);

/**
 * Initial Recipe Database — cleared as requested so only user-shared recipes
 * (or Supabase records) populate the app.
 */
export const INITIAL_RECIPES: Recipe[] = [];
