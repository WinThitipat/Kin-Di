import { z } from 'zod';

export type RecipeStatus = 'pending' | 'approved' | 'rejected';

export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FoodCategory =
  | 'thai'
  | 'international'
  | 'rice'
  | 'noodles'
  | 'healthy'
  | 'street_food';

export type AllergenId =
  | 'peanuts'
  | 'tree_nuts'
  | 'shellfish'
  | 'fish'
  | 'eggs'
  | 'dairy'
  | 'soy'
  | 'wheat_gluten'
  | 'sesame';

export type DietaryPreference =
  | 'unrestricted'
  | 'vegetarian'
  | 'vegan'
  | 'halal';

export type RecipeDietaryTag = Exclude<DietaryPreference, 'unrestricted'>;

export type AllergenStatus = 'free' | 'contains' | 'may_contain' | 'unknown';

export type CrossContactRisk = 'low' | 'possible' | 'unknown';

export type IngredientCategory =
  | 'meat'
  | 'seafood'
  | 'egg_dairy'
  | 'vegetable'
  | 'carb'
  | 'condiment'
  | 'nut_seed'
  | 'other';

export interface IngredientRecord {
  id: string;
  name_th: string;
  name_en?: string;
  category: IngredientCategory;
  allergens: AllergenId[];
  /** Explicit dietary compatibility tags ('vegetarian', 'vegan', 'halal') */
  dietary_compatible: RecipeDietaryTag[];
  /** Whether full composition (including sub-ingredients in sauces/stocks) is known */
  composition_known: boolean;
}

export interface RecipeIngredientEntry {
  ingredient_id: string;
  quantity: string;
  role: 'main' | 'sauce' | 'stock' | 'dressing' | 'condiment' | 'garnish';
  is_optional: boolean;
  /** Whether the exact composition of this ingredient/sauce in this recipe is verified */
  composition_verified: boolean;
}

export interface RecipeAllergenAssessment {
  allergen: AllergenId;
  status: AllergenStatus;
  cross_contact_risk: CrossContactRisk;
  notes?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: FoodCategory;
  meal_types: MealType[];
  cooking_time: number; // minutes
  estimated_cost?: number; // legacy optional field (no longer displayed/used)
  difficulty: RecipeDifficulty;
  image_url?: string | null;
  external_recipe_url?: string | null;
  external_source_name?: string | null;
  status: RecipeStatus;
  /** Explicit verified dietary tags ('vegetarian', 'vegan', 'halal') */
  dietary_tags?: Exclude<DietaryPreference, 'unrestricted'>[] | null;
  instructions: string[];
  /** Normalized ingredient entries (including sauces, stocks, condiments) */
  ingredients?: RecipeIngredientEntry[] | null;
  /** Custom ingredient names added via "อื่นๆ" */
  custom_ingredients?: string[] | null;
  /** Explicit allergen assessments for fail-closed filtering */
  allergen_assessments?: Record<AllergenId, RecipeAllergenAssessment> | null;
  /** Overall cross-contact risk for the recipe preparation */
  cross_contact_risk?: CrossContactRisk | null;
  /** Whether recipe safety and ingredient metadata are complete */
  safety_metadata_complete?: boolean;
  submitted_by?: string;
  created_at: string;
}

export interface UserFoodRestrictions {
  allergens: AllergenId[];
  /** Custom allergens specified via "อื่นๆ" in Section 2 */
  customAllergens?: string[];
  avoidedIngredients: string[]; // ingredient IDs or custom terms
  /** Custom avoided food/ingredient terms specified via "อื่นๆ" in Section 3 */
  customAvoidedTerms?: string[];
  dietaryPreference: DietaryPreference;
}

export interface RouletteQuickFilters {
  mealType: MealType | 'all';
  category: FoodCategory | 'all';
  maxBudget?: number | null;
  maxCookingTime: number | null; // minutes or null for no limit
}

export type CardCountOption = 3 | 5 | 7;

export interface MysteryCardAssignment {
  cardId: string;
  cardIndex: number; // 1-based display number
  recipe: Recipe;
}

export interface RouletteRoundState {
  roundId: string;
  requestedCardCount: CardCountOption;
  cards: MysteryCardAssignment[];
  totalEligibleCount: number;
  selectedCardId: string | null;
  isRevealed: boolean;
  isTransitioning: boolean;
}

export interface RouletteHistoryEntry {
  roundId: string;
  recipeId: string;
  recipeName: string;
  category: FoodCategory;
  cookingTime?: number;
  revealedAt: string;
}

// =============================================================================
// UI Metadata & Labels (Natural Thai Microcopy)
// =============================================================================

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'มื้อเช้า',
  lunch: 'มื้อเที่ยง',
  dinner: 'มื้อเย็น',
  snack: 'มื้อว่าง / ของกินเล่น',
};

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  thai: 'อาหารไทย',
  international: 'อาหารนานาชาติ',
  rice: 'เมนูจานเดียว (ข้าว)',
  noodles: 'เมนูเส้น',
  healthy: 'สายเฮลท์ตี้',
  street_food: 'สตรีทฟู้ด / ตามสั่ง',
};

export const DIFFICULTY_LABELS: Record<RecipeDifficulty, string> = {
  easy: 'ทำง่ายมาก',
  medium: 'ปานกลาง',
  hard: 'ปราบเซียน',
};

export const ALLERGEN_LABELS: Record<AllergenId, { label: string; detail: string }> = {
  peanuts: { label: 'ถั่วลิสง (Peanuts)', detail: 'รวมซอสสะเต๊ะ น้ำจิ้มถั่ว น้ำมันถั่วลิสง' },
  tree_nuts: { label: 'ถั่วเปลือกแข็ง (Tree Nuts)', detail: 'อัลมอนด์ เม็ดมะม่วงหิมพานต์ วอลนัท' },
  shellfish: { label: 'สัตว์น้ำเปลือกแข็ง (Shellfish)', detail: 'กุ้ง ปู กั้ง หอย และกะปิ/ซอสหอยนางรม' },
  fish: { label: 'ปลา (Fish)', detail: 'เนื้อปลา น้ำปลา ปลาร้า น้ำสต็อกปลา' },
  eggs: { label: 'ไข่ (Eggs)', detail: 'ไข่ไก่ ไข่เป็ด มายองเนส เส้นบะหมี่ไข่' },
  dairy: { label: 'นมและผลิตภัณฑ์จากนม (Dairy)', detail: 'นมวัว เนย ชีส ครีม นมข้นจืด' },
  soy: { label: 'ถั่วเหลือง (Soy)', detail: 'เต้าหู้ ซีอิ๊วขาว ซอสปรุงรส เต้าเจี้ยว มิโซะ' },
  wheat_gluten: { label: 'แป้งสาลีและกลูเตน (Wheat/Gluten)', detail: 'เส้นพาสต้า บะหมี่ ขนมปัง ซีอิ๊วบางชนิด' },
  sesame: { label: 'งา (Sesame)', detail: 'งาขาว งาดำ น้ำมันงา ซอสงา' },
};

export const DIETARY_PREFERENCE_LABELS: Record<
  DietaryPreference,
  { label: string; description: string }
> = {
  unrestricted: {
    label: 'กินได้หมด (ไม่มีข้อจำกัด)',
    description: 'ทานได้ทุกประเภท (ยังกรองสารก่อภูมิแพ้และวัตถุดิบที่เลี่ยงให้ตามปกติ)',
  },
  vegetarian: {
    label: 'มังสวิรัติ (Vegetarian)',
    description: 'งดเนื้อสัตว์และน้ำสต็อกสัตว์ (ทานไข่และนมได้เฉพาะเมนูที่ยืนยันแล้ว)',
  },
  vegan: {
    label: 'วีแกน / เจ (Vegan)',
    description: 'งดเนื้อสัตว์ ไข่ นม น้ำปลา น้ำมันหอย และผลิตภัณฑ์จากสัตว์ทุกชนิด',
  },
  halal: {
    label: 'ฮาลาล (Halal)',
    description: 'แสดงเฉพาะเมนูที่ได้รับการระบุสถานะฮาลาลอย่างชัดเจนเท่านั้น',
  },
};

export const SAFETY_DISCLAIMER_TH =
  'ข้อมูลนี้ใช้ช่วยกรองเมนูเบื้องต้น ไม่ใช่การรับประกันความปลอดภัย โปรดตรวจสอบส่วนผสม ฉลากอาหาร ซอส และความเสี่ยงจากการปนเปื้อนร่วมก่อนรับประทาน';

// =============================================================================
// Zod Validation Schemas
// =============================================================================

export const RecipeIdSchema = z
  .string()
  .trim()
  .min(1, 'รหัสเมนูอาหารไม่ถูกต้อง')
  .max(100, 'รหัสเมนูอาหารยาวเกินไป')
  .regex(/^[a-zA-Z0-9_-]+$/, 'รูปแบบรหัสเมนูอาหารไม่ถูกต้อง');

const SafeRecipeUrlSchema = z
  .string()
  .trim()
  .min(1, 'กรุณาใส่ลิงก์สูตรอาหาร')
  .refine(
    (val) => {
      try {
        const parsed = new URL(val);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    },
    { message: 'กรุณาระบุลิงก์สูตรอาหารที่ถูกต้อง (ขึ้นต้นด้วย https:// หรือ http://)' }
  );

const SafeImageUrlOrDataUriSchema = z
  .string()
  .trim()
  .min(1, 'กรุณาอัปโหลดรูปอาหารหรือใส่ลิงก์รูปภาพ')
  .refine(
    (val) => {
      if (val.startsWith('data:image/')) return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    },
    { message: 'กรุณาอัปโหลดไฟล์รูปภาพ หรือระบุลิงก์รูปภาพที่ถูกต้อง' }
  );

export const CommunityRecipeSubmissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'กรุณาระบุชื่อเมนูอย่างน้อย 2 ตัวอักษร')
    .max(120, 'ชื่อเมนูยาวเกินไป'),
  description: z
    .string()
    .trim()
    .min(5, 'กรุณาเขียนคำอธิบายสั้นๆ อย่างน้อย 5 ตัวอักษร')
    .max(400, 'คำอธิบายยาวเกินไป'),
  external_recipe_url: SafeRecipeUrlSchema,
  image_url: SafeImageUrlOrDataUriSchema,
  category: z.enum(['thai', 'international', 'rice', 'noodles', 'healthy', 'street_food']),
  meal_types: z
    .array(z.enum(['breakfast', 'lunch', 'dinner', 'snack']))
    .min(1, 'เลือกมื้ออาหารอย่างน้อย 1 มื้อ'),
  cooking_time: z
    .number({ invalid_type_error: 'ระบุเวลาเป็นตัวเลข' })
    .int()
    .min(1, 'เวลาทำอาหารต้องอย่างน้อย 1 นาที')
    .max(480, 'เวลาทำอาหารไม่เกิน 480 นาที'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  ingredientIds: z.array(z.string()),
  customIngredientNames: z.array(z.string()).optional(),
  dietary_tags: z.array(z.enum(['vegetarian', 'vegan', 'halal'])).optional(),
  allergens: z
    .array(
      z.enum([
        'peanuts',
        'tree_nuts',
        'shellfish',
        'fish',
        'eggs',
        'dairy',
        'soy',
        'wheat_gluten',
        'sesame',
      ])
    )
    .optional(),
  instructionsText: z.string().trim().max(3000, 'วิธีทำยาวเกินไป').optional(),
  submitted_by: z.string().trim().max(80, 'ชื่อผู้ส่งยาวเกินไป').optional(),
}).refine(
  (data) =>
    data.ingredientIds.length + (data.customIngredientNames?.filter((c) => c.trim()).length ?? 0) >=
    1,
  {
    message: 'เลือกหรือเพิ่มวัตถุดิบหลักอย่างน้อย 1 รายการ',
    path: ['ingredientIds'],
  }
);
export type CommunityRecipeSubmissionInput = z.infer<typeof CommunityRecipeSubmissionSchema>;
