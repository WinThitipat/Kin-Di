'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Link2,
  Plus,
  Send,
  Share2,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { ALL_ALLERGEN_IDS, INGREDIENT_LIST } from '@/data/recipes-seed';
import { getExternalRecipeLinks } from '@/lib/external-recipes';
import { submitCommunityRecipeForModeration } from '@/lib/recipes-repository';
import {
  deleteSharedRecipe,
  loadCustomIngredients,
  loadSharedRecipes,
} from '@/lib/user-storage';
import {
  ALLERGEN_LABELS,
  AllergenId,
  DIFFICULTY_LABELS,
  FOOD_CATEGORY_LABELS,
  FoodCategory,
  IngredientRecord,
  MEAL_TYPE_LABELS,
  MealType,
  Recipe,
  RecipeDietaryTag,
  RecipeDifficulty,
} from '@/types/recipe';

const DIETARY_TAG_OPTIONS: { id: RecipeDietaryTag; label: string }[] = [
  { id: 'vegetarian', label: 'มังสวิรัติ (Vegetarian)' },
  { id: 'vegan', label: 'วีแกน / เจ (Vegan)' },
  { id: 'halal', label: 'ฮาลาล (Halal)' },
];

export default function CommunityRecipesPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [externalRecipeUrl, setExternalRecipeUrl] = useState('');
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState<FoodCategory>('thai');
  const [mealTypes, setMealTypes] = useState<MealType[]>(['lunch']);
  const [cookingTime, setCookingTime] = useState<number>(20);
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>('easy');
  const [ingredientIds, setIngredientIds] = useState<string[]>([]);
  const [customIngredientNames, setCustomIngredientNames] = useState<string[]>([]);
  const [showOtherIngredientInput, setShowOtherIngredientInput] = useState(false);
  const [otherIngredientDraft, setOtherIngredientDraft] = useState('');
  const [dietaryTags, setDietaryTags] = useState<RecipeDietaryTag[]>([]);
  const [allergens, setAllergens] = useState<AllergenId[]>([]);
  const [instructionsText, setInstructionsText] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');

  const [customCatalogItems, setCustomCatalogItems] = useState<IngredientRecord[]>([]);
  const [sharedRecipes, setSharedRecipes] = useState<Recipe[]>([]);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSharedRecipes(loadSharedRecipes());
    setCustomCatalogItems(loadCustomIngredients());

    const syncShared = () => setSharedRecipes(loadSharedRecipes());
    const syncCustomIngs = () => setCustomCatalogItems(loadCustomIngredients());

    window.addEventListener('kindi-recipes-updated', syncShared);
    window.addEventListener('kindi-ingredients-updated', syncCustomIngs);
    return () => {
      window.removeEventListener('kindi-recipes-updated', syncShared);
      window.removeEventListener('kindi-ingredients-updated', syncCustomIngs);
    };
  }, []);

  const allAvailableIngredients = [
    ...INGREDIENT_LIST,
    ...customCatalogItems.filter(
      (custom) => !INGREDIENT_LIST.some((base) => base.id === custom.id)
    ),
  ];

  const toggleMealType = (mt: MealType) => {
    setMealTypes((prev) =>
      prev.includes(mt) ? prev.filter((item) => item !== mt) : [...prev, mt]
    );
  };

  const toggleIngredient = (id: string) => {
    setIngredientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const addCustomIngredient = () => {
    const clean = otherIngredientDraft.trim();
    if (!clean) return;
    if (!customIngredientNames.includes(clean)) {
      setCustomIngredientNames((prev) => [...prev, clean]);
    }
    setOtherIngredientDraft('');
  };

  const removeCustomIngredient = (target: string) => {
    setCustomIngredientNames((prev) => prev.filter((item) => item !== target));
  };

  const toggleDietaryTag = (tag: RecipeDietaryTag) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const toggleAllergen = (alg: AllergenId) => {
    setAllergens((prev) =>
      prev.includes(alg) ? prev.filter((item) => item !== alg) : [...prev, alg]
    );
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = typeof reader.result === 'string' ? reader.result : '';
      if (!resultStr) return;

      // Compress image onto a canvas so it fits comfortably in localStorage
      const img = new Image();
      img.onload = () => {
        const maxWidth = 800;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setImageUrl(compressed);
        } else {
          setImageUrl(resultStr);
        }
      };
      img.onerror = () => {
        setImageUrl(resultStr);
      };
      img.src = resultStr;
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    const updated = deleteSharedRecipe(recipeId);
    setSharedRecipes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    const result = await submitCommunityRecipeForModeration({
      name,
      description,
      external_recipe_url: externalRecipeUrl,
      image_url: imageUrl,
      category,
      meal_types: mealTypes,
      cooking_time: Number(cookingTime),
      difficulty,
      ingredientIds,
      customIngredientNames,
      dietary_tags: dietaryTags,
      allergens,
      instructionsText,
      submitted_by: submittedBy,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setStatusMessage({ type: 'error', text: result.message });
      return;
    }

    setSharedRecipes(loadSharedRecipes());
    setCustomCatalogItems(loadCustomIngredients());
    setStatusMessage({ type: 'success', text: result.message });

    // Reset form fields
    setName('');
    setDescription('');
    setExternalRecipeUrl('');
    setImageUrl('');
    setIngredientIds([]);
    setCustomIngredientNames([]);
    setInstructionsText('');
  };

  const totalSelectedIngredients = ingredientIds.length + customIngredientNames.length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <section className="rounded-3xl bg-[#F8D84A] border-2 border-[#171717] shadow-[6px_6px_0px_#171717] p-6 sm:p-8 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171717] text-[#F8D84A] text-xs font-extrabold">
          <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>ADD RECIPES · เพิ่มเมนูอาหาร</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#171717]">
          มีเมนูโปรดในใจ? เพิ่มสูตรเก็บไว้กินดิ!
        </h1>
        <p className="text-sm sm:text-base text-[#171717]/85 font-semibold">
          แปะลิงก์สูตรจากเว็บไหนก็ได้ (Wongnai, Krua.co, YouTube, TikTok, Lemon8, Facebook ฯลฯ)
          ใส่รูปกับวัตถุดิบไว้ เอาไว้สุ่มไพ่หรือค้นจากของในตู้เย็นได้ทันที
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 rounded-3xl bg-white border-2 border-[#171717] shadow-[4px_4px_0px_#171717] p-6 space-y-5"
        >
          <h2 className="text-lg sm:text-xl font-extrabold text-[#171717]">
            แบบฟอร์มเพิ่มเมนูอาหาร
          </h2>

          {statusMessage && (
            <div
              role={statusMessage.type === 'error' ? 'alert' : 'status'}
              className={`p-3.5 rounded-2xl border-2 border-[#171717] text-xs sm:text-sm font-bold flex items-start gap-2.5 ${
                statusMessage.type === 'error'
                  ? 'bg-[#FFE4E6] text-red-950'
                  : 'bg-emerald-100 text-emerald-950'
              }`}
            >
              {statusMessage.type === 'error' ? (
                <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* 1. ชื่อเมนูอาหาร */}
          <div>
            <label htmlFor="recipe-name" className="block text-xs font-extrabold mb-1">
              ชื่อเมนูอาหาร *
            </label>
            <input
              id="recipe-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ข้าวแมวคลุกปลาทูพริกขี้หนูสวน"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9EC] border-2 border-[#171717] text-sm font-semibold"
            />
          </div>

          {/* 2. ลิงก์สูตรอาหาร (บังคับ ไม่จำกัดค่าย) */}
          <div>
            <label htmlFor="recipe-link" className="block text-xs font-extrabold mb-1">
              ลิงก์สูตรอาหาร (ไม่จำกัดค่าย / เว็บไซต์ใดก็ได้) *
            </label>
            <div className="relative">
              <input
                id="recipe-link"
                type="url"
                required
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={externalRecipeUrl}
                onChange={(e) => setExternalRecipeUrl(e.target.value)}
                placeholder="https://... (เช่น Wongnai, Krua.co, YouTube, TikTok, Lemon8, เว็บบล็อก ฯลฯ)"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#FFF9EC] border-2 border-[#171717] text-sm font-semibold"
              />
              <Link2
                className="w-4 h-4 text-[#77736B] absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
            </div>
            <p className="text-[11px] text-[#77736B] font-medium mt-1">
              เมื่อกดปุ่ม &ldquo;ดูสูตรอาหาร&rdquo; ระบบจะเปิดลิงก์หน้าสูตรนี้ให้ทันที
            </p>
          </div>

          {/* 3. รูปภาพอาหาร (บังคับ อัปโหลดไฟล์ หรือ วางลิงก์รูป) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="block text-xs font-extrabold">รูปภาพอาหาร *</span>
              <div className="inline-flex rounded-xl border border-[#171717] overflow-hidden text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`px-2.5 py-1 cursor-pointer ${
                    imageMode === 'upload'
                      ? 'bg-[#171717] text-[#F8D84A]'
                      : 'bg-[#FFF9EC] text-[#171717]'
                  }`}
                >
                  อัปโหลดรูปภาพ
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-2.5 py-1 cursor-pointer ${
                    imageMode === 'url'
                      ? 'bg-[#171717] text-[#F8D84A]'
                      : 'bg-[#FFF9EC] text-[#171717]'
                  }`}
                >
                  ใส่ลิงก์รูปภาพ (URL)
                </button>
              </div>
            </div>

            {imageMode === 'upload' ? (
              <label
                htmlFor="recipe-image-upload"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#FFF9EC] border-2 border-dashed border-[#171717] hover:bg-[#EAE5DA]/60 cursor-pointer text-center"
              >
                <ImagePlus className="w-6 h-6 text-[#171717]" aria-hidden="true" />
                <span className="text-xs font-extrabold text-[#171717]">
                  คลิกเพื่อเลือกรูปภาพอาหารจากเครื่องของคุณ
                </span>
                <span className="text-[11px] text-[#77736B]">รองรับไฟล์ JPG, PNG, WEBP</span>
                <input
                  id="recipe-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="sr-only"
                />
              </label>
            ) : (
              <input
                id="recipe-image-url"
                type="url"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/food-image.jpg"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9EC] border-2 border-[#171717] text-sm font-semibold"
              />
            )}

            {imageUrl && (
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#171717] bg-[#EAE5DA] h-44">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="ตัวอย่างรูปอาหาร"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-[#171717]/85 text-white text-xs font-bold inline-flex items-center gap-1 hover:bg-[#171717] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>ลบรูป</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. คำอธิบายสั้นๆ */}
          <div>
            <label htmlFor="recipe-desc" className="block text-xs font-extrabold mb-1">
              คำอธิบายสั้นๆ *
            </label>
            <textarea
              id="recipe-desc"
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ความอร่อย จุดเด่น หรือเคล็ดลับของเมนูนี้..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#FFF9EC] border-2 border-[#171717] text-sm font-semibold"
            />
          </div>

          {/* 5. หมวดหมู่ + เวลาทำ (Range Slider แทนการใส่ Text, ไม่มีงบประมาณ) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label htmlFor="recipe-cat" className="block text-xs font-extrabold mb-1">
                หมวดหมู่ *
              </label>
              <select
                id="recipe-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as FoodCategory)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#FFF9EC] border-2 border-[#171717] text-xs sm:text-sm font-bold"
              >
                {(Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {FOOD_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="recipe-time-range" className="text-xs font-extrabold text-[#171717]">
                  เวลาทำ (นาที) *
                </label>
                <span className="px-2.5 py-0.5 rounded-full bg-[#171717] text-[#F8D84A] text-xs font-extrabold">
                  {cookingTime} นาที
                </span>
              </div>
              <input
                id="recipe-time-range"
                type="range"
                min={5}
                max={120}
                step={5}
                value={cookingTime}
                aria-valuetext={`${cookingTime} นาที`}
                onChange={(e) => setCookingTime(Number(e.target.value))}
                style={
                  {
                    '--attr-min': 5,
                    '--attr-max': 120,
                    '--control-value': cookingTime,
                  } as React.CSSProperties
                }
                className="kindi-range-slider"
              />
              <div className="flex justify-between text-[10px] font-bold text-[#77736B] mt-1">
                <span>5 นาที (ด่วนจี๋)</span>
                <span>60 นาที</span>
                <span>120 นาที</span>
              </div>
            </div>
          </div>

          {/* 6. มื้ออาหารที่เหมาะ */}
          <div>
            <span className="block text-xs font-extrabold mb-1.5">มื้ออาหารที่เหมาะ *</span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((mt) => {
                const active = mealTypes.includes(mt);
                return (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => toggleMealType(mt)}
                    aria-pressed={active}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border-2 cursor-pointer ${
                      active
                        ? 'bg-[#171717] text-[#F8D84A] border-[#171717]'
                        : 'bg-[#FFF9EC] text-[#171717] border-[#171717]/30'
                    }`}
                  >
                    {MEAL_TYPE_LABELS[mt]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. ระดับความยาก */}
          <div>
            <span className="block text-xs font-extrabold mb-1.5">ระดับความยาก</span>
            <div className="flex gap-2">
              {(Object.keys(DIFFICULTY_LABELS) as RecipeDifficulty[]).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  aria-pressed={difficulty === diff}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border-2 cursor-pointer ${
                    difficulty === diff
                      ? 'bg-[#F8D84A] text-[#171717] border-[#171717]'
                      : 'bg-[#FFF9EC] text-[#171717] border-[#171717]/30'
                  }`}
                >
                  {DIFFICULTY_LABELS[diff]}
                </button>
              ))}
            </div>
          </div>

          {/* 8. เลือกวัตถุดิบที่ใช้ + อื่นๆ */}
          <div>
            <span className="block text-xs font-extrabold mb-1.5">
              เลือกวัตถุดิบที่ใช้ ({totalSelectedIngredients} รายการ) *
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-3 rounded-xl bg-[#FFF9EC] border-2 border-[#171717]/30">
              {allAvailableIngredients.map((ing) => {
                const selected = ingredientIds.includes(ing.id);
                return (
                  <button
                    key={ing.id}
                    type="button"
                    onClick={() => toggleIngredient(ing.id)}
                    aria-pressed={selected}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                      selected
                        ? 'bg-[#171717] text-[#F8D84A] border-[#171717]'
                        : 'bg-white text-[#171717] border-[#171717]/25'
                    }`}
                  >
                    {ing.name_th}
                  </button>
                );
              })}

              {/* ปุ่ม "อื่นๆ" เพื่อเพิ่มวัตถุดิบเอง */}
              <button
                type="button"
                onClick={() => setShowOtherIngredientInput((prev) => !prev)}
                aria-expanded={showOtherIngredientInput || customIngredientNames.length > 0}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border cursor-pointer inline-flex items-center gap-1 ${
                  showOtherIngredientInput || customIngredientNames.length > 0
                    ? 'bg-[#F8D84A] text-[#171717] border-[#171717]'
                    : 'bg-white text-[#171717] border-dashed border-[#171717]'
                }`}
              >
                <Plus className="w-3 h-3 stroke-[3]" aria-hidden="true" />
                <span>อื่นๆ (เพิ่มวัตถุดิบเอง)</span>
              </button>
            </div>

            {(showOtherIngredientInput || customIngredientNames.length > 0) && (
              <div className="mt-2.5 p-3 rounded-2xl bg-[#FFF9EC] border-2 border-[#171717] space-y-2">
                <label
                  htmlFor="custom-ingredient-input"
                  className="block text-xs font-extrabold text-[#171717]"
                >
                  เพิ่มวัตถุดิบอื่นๆ ที่ไม่มีในรายการ:
                </label>
                <div className="flex gap-2">
                  <input
                    id="custom-ingredient-input"
                    type="text"
                    value={otherIngredientDraft}
                    onChange={(e) => setOtherIngredientDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        addCustomIngredient();
                      }
                    }}
                    placeholder="เช่น แหนม, วุ้นเส้น, ชะอม, หมูยอ, เห็ดเข็มทอง..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white border-2 border-[#171717] text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={addCustomIngredient}
                    className="px-3.5 py-1.5 rounded-xl bg-[#171717] text-[#F8D84A] text-xs font-extrabold cursor-pointer shrink-0"
                  >
                    + เพิ่มวัตถุดิบ
                  </button>
                </div>

                {customIngredientNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {customIngredientNames.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#171717] text-[#F8D84A] text-xs font-bold"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => removeCustomIngredient(item)}
                          aria-label={`ลบวัตถุดิบ ${item}`}
                          className="hover:opacity-75 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 9. ข้อมูลข้อจำกัดทางอาหารของสูตรนี้ (ไม่บังคับ แต่ช่วยให้กรองปลอดภัยแม่นยำ) */}
          <div className="p-3.5 rounded-2xl bg-[#FFF9EC] border border-[#171717]/30 space-y-3">
            <div>
              <span className="block text-xs font-extrabold text-[#171717] mb-1.5">
                รองรับรูปแบบการกิน (ถ้ามี)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DIETARY_TAG_OPTIONS.map((opt) => {
                  const active = dietaryTags.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleDietaryTag(opt.id)}
                      aria-pressed={active}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        active
                          ? 'bg-emerald-800 text-white border-emerald-950'
                          : 'bg-white text-[#171717] border-[#171717]/25'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-xs font-extrabold text-[#171717] mb-1.5">
                สารก่อภูมิแพ้ที่มีในเมนูนี้ (ระบบจะซ่อนเมนูนี้จากผู้ที่แพ้อัตโนมัติ)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_ALLERGEN_IDS.map((alg) => {
                  const active = allergens.includes(alg);
                  return (
                    <button
                      key={alg}
                      type="button"
                      onClick={() => toggleAllergen(alg)}
                      aria-pressed={active}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        active
                          ? 'bg-[#FFE4E6] text-red-950 border-[#171717]'
                          : 'bg-white text-[#171717] border-[#171717]/25'
                      }`}
                    >
                      {ALLERGEN_LABELS[alg].label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 10. ขั้นตอนวิธีทำย่อๆ (ไม่บังคับ เพราะมีลิงก์สูตรอาหารหลักแล้ว) */}
          <div>
            <label htmlFor="recipe-steps" className="block text-xs font-extrabold mb-1">
              สรุปขั้นตอนวิธีทำ / เคล็ดลับเพิ่มเติม (ไม่บังคับ)
            </label>
            <textarea
              id="recipe-steps"
              rows={2}
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              placeholder={'1. ตั้งกระทะทอดปลาทูให้เหลืองกรอบ\n2. แกะเนื้อปลาคลุกข้าวสวยร้อนๆ'}
              className="w-full px-3.5 py-2 rounded-xl bg-[#FFF9EC] border-2 border-[#171717] text-sm font-semibold"
            />
          </div>

          {/* 11. ชื่อผู้แบ่งปันสูตร */}
          <div>
            <label htmlFor="recipe-author" className="block text-xs font-extrabold mb-1">
              ชื่อผู้แบ่งปันสูตร (ไม่บังคับ)
            </label>
            <input
              id="recipe-author"
              type="text"
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
              placeholder="เช่น เชฟหอใน ห้อง 402"
              className="w-full px-3.5 py-2 rounded-xl bg-[#FFF9EC] border-2 border-[#171717] text-sm font-semibold"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#171717] text-[#F8D84A] font-extrabold text-sm shadow-[3px_3px_0px_#F8D84A] hover:bg-[#171717]/90 cursor-pointer"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>{isSubmitting ? 'กำลังบันทึกเมนูอาหาร...' : 'เพิ่มเมนูอาหารเลย!'}</span>
          </button>
        </form>

        {/* รายการเมนูอาหารที่เพิ่มแล้ว */}
        <section
          aria-labelledby="shared-recipes-heading"
          className="lg:col-span-5 rounded-3xl bg-white border-2 border-[#171717] shadow-[4px_4px_0px_#171717] p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="shared-recipes-heading" className="text-base font-extrabold text-[#171717]">
              เมนูอาหารที่เพิ่มแล้ว ({sharedRecipes.length} เมนู)
            </h2>
          </div>
          <p className="text-xs text-[#77736B] leading-relaxed">
            ทุกเมนูที่คุณเพิ่มที่นี่จะถูกนำไปใช้ใน <strong>สุ่มไพ่เมนู (Food Roulette)</strong>,{' '}
            <strong>มีอะไรในตู้ (Fridge Mode)</strong> และ <strong>รวมเมนูทั้งหมด</strong> ทันที
          </p>

          {sharedRecipes.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#FFF9EC] border-2 border-dashed border-[#171717]/30 text-center space-y-2">
              <p className="text-sm font-extrabold text-[#171717]">ยังไม่มีเมนูอาหารที่เพิ่มไว้</p>
              <p className="text-xs text-[#77736B]">
                กรอกฟอร์มด้านซ้ายเพื่อเพิ่มเมนูแรกเข้าสู่ระบบ กินดิ! — KIN DI ได้เลย
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {sharedRecipes.map((item) => {
                const ext = getExternalRecipeLinks(item);
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[#FFF9EC] border-2 border-[#171717] flex items-start gap-3"
                  >
                    {item.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-16 h-16 rounded-xl object-cover border border-[#171717] shrink-0 bg-[#EAE5DA]"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-[#171717] truncate">{item.name}</p>
                      <p className="text-[11px] text-[#77736B] font-semibold">
                        {FOOD_CATEGORY_LABELS[item.category]} · {item.cooking_time} นาที
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <a
                          href={ext.primaryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#171717] text-[#F8D84A] text-[11px] font-bold hover:bg-[#171717]/90"
                        >
                          <span>ดูสูตร ({ext.primarySourceName})</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecipe(item.id)}
                          aria-label={`ลบเมนู ${item.name}`}
                          className="p-1.5 rounded-lg text-red-700 hover:bg-red-100 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
