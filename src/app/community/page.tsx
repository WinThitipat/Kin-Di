"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AdminDeleteRecipeDialog } from "@/components/AdminDeleteRecipeDialog";
import {
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Link2,
  Plus,
  PlusCircle,
  Send,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { ALL_ALLERGEN_IDS, INGREDIENT_LIST } from "@/data/recipes-seed";
import { getExternalRecipeLinks } from "@/lib/external-recipes";
import {
  fetchApprovedRecipes,
  importLocalRecipe,
  submitCommunityRecipeForModeration,
} from "@/lib/recipes-repository";
import {
  deleteSharedRecipe,
  loadCustomIngredients,
  loadSharedRecipes,
} from "@/lib/user-storage";
import {
  ALLERGEN_LABELS,
  AllergenId,
  CommunityRecipeSubmissionSchema,
  DIFFICULTY_LABELS,
  FOOD_CATEGORY_LABELS,
  FoodCategory,
  IngredientRecord,
  MEAL_TYPE_LABELS,
  MealType,
  Recipe,
  RecipeDietaryTag,
  RecipeDifficulty,
} from "@/types/recipe";

const DIETARY_TAG_OPTIONS: { id: RecipeDietaryTag; label: string }[] = [
  { id: "vegetarian", label: "มังสวิรัติ (Vegetarian)" },
  { id: "vegan", label: "วีแกน / เจ (Vegan)" },
  { id: "halal", label: "ฮาลาล (Halal)" },
];

const FORM_STEPS = [
  "ข้อมูลเมนู",
  "หมวดหมู่และเวลา",
  "วัตถุดิบและสารก่อภูมิแพ้",
  "ตรวจสอบก่อนบันทึก",
];
const STEP_FIELDS = [
  ["name", "description", "external_recipe_url", "image_url"],
  ["category", "meal_types", "cooking_time", "difficulty"],
  [
    "ingredientIds",
    "customIngredientNames",
    "dietary_tags",
    "allergens",
    "instructionsText",
    "submitted_by",
  ],
];
const FIELD_IDS: Record<string, string> = {
  name: "recipe-name",
  description: "recipe-desc",
  external_recipe_url: "recipe-link",
  image_url: "recipe-image-label",
  meal_types: "recipe-meals",
  ingredientIds: "recipe-ingredients",
  instructionsText: "recipe-steps",
  submitted_by: "recipe-author",
  cooking_time: "recipe-time-range",
};

export default function CommunityRecipesPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const shouldFocusStep = useRef(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [externalRecipeUrl, setExternalRecipeUrl] = useState("");
  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState<FoodCategory>("thai");
  const [mealTypes, setMealTypes] = useState<MealType[]>(["lunch"]);
  const [cookingTime, setCookingTime] = useState<number>(20);
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>("easy");
  const [ingredientIds, setIngredientIds] = useState<string[]>([]);
  const [customIngredientNames, setCustomIngredientNames] = useState<string[]>(
    [],
  );
  const [showOtherIngredientInput, setShowOtherIngredientInput] =
    useState(false);
  const [otherIngredientDraft, setOtherIngredientDraft] = useState("");
  const [dietaryTags, setDietaryTags] = useState<RecipeDietaryTag[]>([]);
  const [allergens, setAllergens] = useState<AllergenId[]>([]);
  const [instructionsText, setInstructionsText] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");

  const [customCatalogItems, setCustomCatalogItems] = useState<
    IngredientRecord[]
  >([]);
  const [sharedRecipes, setSharedRecipes] = useState<Recipe[]>([]);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [databaseRecipeIds, setDatabaseRecipeIds] = useState<string[]>([]);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshCollection = useCallback(async () => {
    const result = await fetchApprovedRecipes();
    setSharedRecipes(result.recipes);
    setDatabaseRecipeIds(result.databaseRecipeIds ?? []);
    setCollectionError(result.error);
    setCustomCatalogItems(loadCustomIngredients());
  }, []);

  const localOnlyRecipes = sharedRecipes.filter(
    (recipe) => !databaseRecipeIds.includes(recipe.id),
  );
  const handleImportLocalRecipes = async () => {
    if (isImporting) return;
    setIsImporting(true);
    let imported = 0;
    let failure = "";
    try {
      for (const recipe of localOnlyRecipes) {
        const result = await importLocalRecipe(recipe);
        if (!result.success) {
          failure = result.message;
          break;
        }
        imported++;
      }
      await refreshCollection();
      setStatusMessage({
        type: failure ? "error" : "success",
        text: failure
          ? `นำเข้าแล้ว ${imported} เมนู เมนูที่เหลือยังอยู่ในเครื่อง: ${failure}`
          : `นำเข้า ${imported} เมนูลงฐานข้อมูลเรียบร้อย ข้อมูลเดิมในเครื่องยังอยู่`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    if (!shouldFocusStep.current) return;
    shouldFocusStep.current = false;
    stepHeadingRef.current?.focus({ preventScroll: true });
    stepHeadingRef.current?.scrollIntoView({
      block: "start",
      behavior: "auto",
    });
  }, [currentStep]);

  const moveToStep = (step: number) => {
    setStepError(null);
    setStatusMessage(null);
    shouldFocusStep.current = true;
    setCurrentStep(step);
  };

  useEffect(() => {
    setSharedRecipes(loadSharedRecipes());
    setCustomCatalogItems(loadCustomIngredients());

    void refreshCollection();
    const syncShared = () => {
      void refreshCollection();
    };
    const syncCustomIngs = () => setCustomCatalogItems(loadCustomIngredients());

    window.addEventListener("kindi-recipes-updated", syncShared);
    window.addEventListener("kindi-ingredients-updated", syncCustomIngs);
    return () => {
      window.removeEventListener("kindi-recipes-updated", syncShared);
      window.removeEventListener("kindi-ingredients-updated", syncCustomIngs);
    };
  }, [refreshCollection]);

  const allAvailableIngredients = [
    ...INGREDIENT_LIST,
    ...customCatalogItems.filter(
      (custom) => !INGREDIENT_LIST.some((base) => base.id === custom.id),
    ),
  ];

  const toggleMealType = (mt: MealType) => {
    setMealTypes((prev) =>
      prev.includes(mt) ? prev.filter((item) => item !== mt) : [...prev, mt],
    );
  };

  const toggleIngredient = (id: string) => {
    setIngredientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const addCustomIngredient = () => {
    const clean = otherIngredientDraft.trim();
    if (!clean) return;
    if (!customIngredientNames.includes(clean)) {
      setCustomIngredientNames((prev) => [...prev, clean]);
    }
    setOtherIngredientDraft("");
  };

  const removeCustomIngredient = (target: string) => {
    setCustomIngredientNames((prev) => prev.filter((item) => item !== target));
  };

  const toggleDietaryTag = (tag: RecipeDietaryTag) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const toggleAllergen = (alg: AllergenId) => {
    setAllergens((prev) =>
      prev.includes(alg) ? prev.filter((item) => item !== alg) : [...prev, alg],
    );
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = typeof reader.result === "string" ? reader.result : "";
      if (!resultStr) return;

      const img = new Image();
      img.onload = () => {
        const maxWidth = 800;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL("image/jpeg", 0.82);
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
    void refreshCollection();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setStatusMessage(null);
    const draft = {
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
    };
    const parsed = CommunityRecipeSubmissionSchema.safeParse(draft);
    const issue = !parsed.success
      ? parsed.error.issues.find(
          (item) =>
            currentStep === 3 ||
            STEP_FIELDS[currentStep].includes(String(item.path[0])),
        )
      : undefined;
    if (issue) {
      setStepError(issue.message);
      const fieldId = FIELD_IDS[String(issue.path[0])];
      requestAnimationFrame(() =>
        (
          document.getElementById(fieldId) ??
          document.getElementById("community-step-error")
        )?.focus(),
      );
      return;
    }
    if (currentStep === 2 && otherIngredientDraft.trim()) {
      setStepError(
        "คุณยังมีวัตถุดิบที่พิมพ์ค้างไว้ กดเพิ่มวัตถุดิบหรือล้างข้อความก่อนไปต่อ",
      );
      document.getElementById("custom-ingredient-input")?.focus();
      return;
    }
    if (currentStep < 3) {
      moveToStep(currentStep + 1);
      return;
    }
    if (!parsed.success) return;
    setStepError(null);
    setIsSubmitting(true);
    let result;
    try {
      result = await submitCommunityRecipeForModeration(parsed.data);
    } catch {
      setStatusMessage({
        type: "error",
        text: "บันทึกสูตรไม่สำเร็จ ข้อมูลยังอยู่ครบ กรุณาลองบันทึกอีกครั้ง",
      });
      return;
    } finally {
      setIsSubmitting(false);
    }

    if (!result.success) {
      setStatusMessage({ type: "error", text: result.message });
      return;
    }

    await refreshCollection();
    setCustomCatalogItems(loadCustomIngredients());
    setStatusMessage({ type: "success", text: result.message });

    // Reset form fields
    formRef.current?.reset();
    setName("");
    setDescription("");
    setExternalRecipeUrl("");
    setImageUrl("");
    setIngredientIds([]);
    setCustomIngredientNames([]);
    setInstructionsText("");
    setCurrentStep(0);
    shouldFocusStep.current = true;
    setStepError(null);
    setMealTypes(["lunch"]);
    setCategory("thai");
    setCookingTime(20);
    setDifficulty("easy");
    setDietaryTags([]);
    setAllergens([]);
    setSubmittedBy("");
    setOtherIngredientDraft("");
    setShowOtherIngredientInput(false);
    setImageMode("upload");
  };

  const totalSelectedIngredients =
    ingredientIds.length + customIngredientNames.length;

  return (
    <div className="interior-page community-page">
      {/* Editorial Bento Header */}
      <section className="interior-header community-header">
        <div>
          <h1>
            สูตรดี ๆ<br />
            <span>มีไว้แบ่งกัน</span>
          </h1>
          <p>
            เก็บเมนูโปรดจากเว็บหรือโซเชียล พร้อมรูปและวัตถุดิบ
            <br className="hidden sm:block" /> ให้ทุกมื้อที่เลือกง่ายขึ้น
            เริ่มจากจานที่คุณชอบ
          </p>
        </div>
        <div className="community-note">
          <span>จากครัวคุณ</span>
          <strong>สู่มื้อถัดไป</strong>
          <p>เก็บไว้แล้ว {sharedRecipes.length} เมนู</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          aria-label="แบ่งปันเมนูทีละขั้น"
          className="lg:col-span-7 space-y-5"
        >
          <nav className="recipe-stepper" aria-label="ขั้นตอนเพิ่มเมนู">
            <ol>
              {FORM_STEPS.map((label, index) => (
                <li
                  key={label}
                  aria-current={currentStep === index ? "step" : undefined}
                  data-complete={index < currentStep}
                >
                  <span aria-hidden="true">
                    {index < currentStep ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span>{label}</span>
                </li>
              ))}
            </ol>
          </nav>
          <div className="step-intro">
            <p role="status">
              ขั้นตอนที่ {currentStep + 1} จาก {FORM_STEPS.length}
            </p>
            <h2 id="community-step-title" ref={stepHeadingRef} tabIndex={-1}>
              {FORM_STEPS[currentStep]}
            </h2>
            <p>
              {currentStep === 3
                ? "เช็กข้อมูลให้พร้อม แล้วค่อยบันทึกสูตรเข้าสำรับ"
                : "กรอกหัวข้อนี้ให้ครบ แล้วกดถัดไป ข้อมูลจะอยู่ครบเมื่อย้อนกลับ"}
            </p>
            {currentStep < 3 && (
              <p className="step-next">ถัดไป: {FORM_STEPS[currentStep + 1]}</p>
            )}
          </div>
          {statusMessage && (
            <div
              role={statusMessage.type === "error" ? "alert" : "status"}
              className={`p-4 rounded-lg border text-xs sm:text-sm font-bold flex items-start gap-3 shadow-xs ${
                statusMessage.type === "error"
                  ? "bg-rose-50 text-rose-950 border-rose-200"
                  : "bg-emerald-50 text-emerald-950 border-emerald-200"
              }`}
            >
              {statusMessage.type === "error" ? (
                <ShieldAlert
                  className="w-5 h-5 shrink-0 text-rose-700 mt-0.5"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2
                  className="w-5 h-5 shrink-0 text-emerald-700 mt-0.5"
                  aria-hidden="true"
                />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {stepError && (
            <p
              id="community-step-error"
              className="step-error"
              role="alert"
              tabIndex={-1}
            >
              {stepError}
            </p>
          )}

          {/* Block 1: ข้อมูลเมนู & ลิงก์สูตรอาหาร */}
          <fieldset
            hidden={currentStep !== 0}
            disabled={currentStep !== 0 || isSubmitting}
            className="recipe-step kindi-surface-card p-5 sm:p-6 space-y-4"
            aria-label="ข้อมูลเมนู"
          >
            <div className="flex items-center gap-2.5 border-b border-[#DDD2C2] pb-3">
              <span className="w-6 h-6 rounded-lg bg-[#302923] text-[#FBF0DC] text-xs font-black flex items-center justify-center">
                1
              </span>
              <h2 className="text-base sm:text-lg font-semibold text-[#302923]">
                ข้อมูลเมนู & ลิงก์สูตรอาหาร
              </h2>
            </div>

            {/* 1.1 ชื่อเมนูอาหาร */}
            <div className="kindi-input-group">
              <label
                htmlFor="recipe-name"
                className="block text-xs font-bold text-[#302923] mb-1.5"
              >
                ชื่อเมนูอาหาร *
              </label>
              <input
                id="recipe-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น ข้าวหมูแดงฮ่องกง (หม้อทอดไร้น้ำมัน)"
                className="kindi-input-field w-full px-3.5 py-2.5 text-sm font-medium"
              />
            </div>

            {/* 1.2 ลิงก์สูตรอาหาร (บังคับ ไม่จำกัดค่าย) */}
            <div className="kindi-input-group">
              <label
                htmlFor="recipe-link"
                className="block text-xs font-bold text-[#302923] mb-1.5"
              >
                ลิงก์สูตรอาหาร (เว็บไหนหรือแพลตฟอร์มไหนก็ได้) *
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
                  placeholder="https://... (Wongnai, Krua.co, YouTube, TikTok, Lemon8 ฯลฯ)"
                  className="kindi-input-field w-full pl-9 pr-3.5 py-2.5 text-sm font-medium"
                />
                <Link2
                  className="w-4 h-4 text-[#76685C] absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
              </div>
              <p className="text-xs text-[#6E5D50] mt-1">
                เมื่อกดปุ่ม &ldquo;ลิงก์สูตรอาหาร&rdquo; ในการ์ด
                ระบบจะพาไปเปิดสูตรต้นฉบับนี้ทันที
              </p>
            </div>

            {/* 1.3 รูปภาพอาหาร */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  id="recipe-image-label"
                  tabIndex={-1}
                  className="block text-xs font-bold text-[#302923]"
                >
                  รูปภาพอาหาร *
                </span>
                <div className="inline-flex p-0.5 rounded-xl bg-[#F1EADF] border border-[#DDD2C2] text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setImageMode("upload")}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      imageMode === "upload"
                        ? "bg-[#302923] text-[#FBF0DC]"
                        : "text-[#6E5D50] hover:text-[#302923]"
                    }`}
                  >
                    อัปโหลดรูป
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode("url")}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      imageMode === "url"
                        ? "bg-[#302923] text-[#FBF0DC]"
                        : "text-[#6E5D50] hover:text-[#302923]"
                    }`}
                  >
                    วางลิงก์รูป (URL)
                  </button>
                </div>
              </div>

              {imageMode === "upload" ? (
                <label
                  htmlFor="recipe-image-upload"
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg bg-[#FBF7EF] border border-dashed border-[#C6B7A5] hover:border-[#302923] hover:bg-[#F3E3D2]/25 transition-colors cursor-pointer text-center"
                >
                  <ImagePlus
                    className="w-6 h-6 text-[#302923]"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-bold text-[#302923]">
                    คลิกเพื่อเลือกรูปอาหารจากเครื่องของคุณ
                  </span>
                  <span className="text-xs text-[#6E5D50]">
                    รองรับไฟล์ JPG, PNG, WEBP
                  </span>
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
                  aria-label="ลิงก์รูปภาพอาหาร"
                  type="url"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={imageUrl.startsWith("data:") ? "" : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/food-image.jpg"
                  className="kindi-input-field w-full px-3.5 py-2.5 text-sm font-medium"
                />
              )}

              {imageUrl && (
                <div className="relative rounded-lg overflow-hidden border border-[#DDD2C2] bg-[#F1EADF] h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="ตัวอย่างรูปอาหาร"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-[#302923]/85 text-white text-xs font-bold inline-flex items-center gap-1 hover:bg-[#302923] cursor-pointer shadow-xs"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>เปลี่ยนรูป</span>
                  </button>
                </div>
              )}
            </div>

            {/* 1.4 คำอธิบายสั้นๆ */}
            <div className="kindi-input-group">
              <label
                htmlFor="recipe-desc"
                className="block text-xs font-bold text-[#302923] mb-1.5"
              >
                คำอธิบายสั้นๆ *
              </label>
              <textarea
                id="recipe-desc"
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ความอร่อย จุดเด่น หรือเคล็ดลับของเมนูนี้..."
                className="kindi-input-field w-full px-3.5 py-2.5 text-sm font-medium"
              />
            </div>
          </fieldset>

          {/* Block 2: การจัดหมวดหมู่ & เวลาทำอาหาร */}
          <fieldset
            hidden={currentStep !== 1}
            disabled={currentStep !== 1 || isSubmitting}
            className="recipe-step kindi-surface-card p-5 sm:p-6 space-y-4"
            aria-label="หมวดหมู่และเวลา"
          >
            <div className="flex items-center gap-2.5 border-b border-[#DDD2C2] pb-3">
              <span className="w-6 h-6 rounded-lg bg-[#302923] text-[#FBF0DC] text-xs font-black flex items-center justify-center">
                2
              </span>
              <h2 className="text-base sm:text-lg font-semibold text-[#302923]">
                การจัดหมวดหมู่ & เวลาในการทำอาหาร
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* หมวดหมู่ */}
              <div className="kindi-input-group">
                <label
                  htmlFor="recipe-cat"
                  className="block text-xs font-bold text-[#302923] mb-1.5"
                >
                  หมวดหมู่อาหาร *
                </label>
                <select
                  id="recipe-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FoodCategory)}
                  className="kindi-input-field w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold"
                >
                  {(Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[]).map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {FOOD_CATEGORY_LABELS[cat]}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* เวลาทำ (Range Slider) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="recipe-time-range"
                    className="text-xs font-bold text-[#302923]"
                  >
                    เวลาทำโดยประมาณ *
                  </label>
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#F3E3D2] border border-[#DDD2C2] text-[#302923] text-xs font-semibold tabular-nums">
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
                      "--attr-min": 5,
                      "--attr-max": 120,
                      "--control-value": cookingTime,
                    } as React.CSSProperties
                  }
                  className="kindi-range-slider"
                />
                <div className="flex justify-between text-xs font-medium text-[#6E5D50] mt-0.5 tabular-nums">
                  <span>5 นาที</span>
                  <span>60 นาที</span>
                  <span>120 นาที</span>
                </div>
              </div>
            </div>

            {/* มื้ออาหาร & ระดับความยาก */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <span className="block text-xs font-bold text-[#302923] mb-2">
                  มื้ออาหารที่เหมาะ *
                </span>
                <div
                  id="recipe-meals"
                  tabIndex={-1}
                  className="flex flex-wrap gap-1.5"
                >
                  {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((mt) => {
                    const active = mealTypes.includes(mt);
                    return (
                      <button
                        key={mt}
                        type="button"
                        onClick={() => toggleMealType(mt)}
                        aria-pressed={active}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          active
                            ? "bg-[#302923] text-[#FBF0DC] border-[#302923]"
                            : "bg-white text-[#302923] border-[#DDD2C2] hover:border-[#C6B7A5]"
                        }`}
                      >
                        {MEAL_TYPE_LABELS[mt]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-[#302923] mb-2">
                  ระดับความยาก
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(DIFFICULTY_LABELS) as RecipeDifficulty[]).map(
                    (diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficulty(diff)}
                        aria-pressed={difficulty === diff}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          difficulty === diff
                            ? "bg-[#302923] text-[#FBF0DC] border-[#302923]"
                            : "bg-white text-[#302923] border-[#DDD2C2] hover:border-[#C6B7A5]"
                        }`}
                      >
                        {DIFFICULTY_LABELS[diff]}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          </fieldset>

          {/* Block 3: วัตถุดิบ & การประเมินสารก่อภูมิแพ้ */}
          <fieldset
            hidden={currentStep !== 2}
            disabled={currentStep !== 2 || isSubmitting}
            className="recipe-step kindi-surface-card p-5 sm:p-6 space-y-4"
            aria-label="วัตถุดิบและสารก่อภูมิแพ้"
          >
            <div className="flex items-center gap-2.5 border-b border-[#DDD2C2] pb-3">
              <span className="w-6 h-6 rounded-lg bg-[#302923] text-[#FBF0DC] text-xs font-black flex items-center justify-center">
                3
              </span>
              <h2 className="text-base sm:text-lg font-semibold text-[#302923]">
                วัตถุดิบ & การประเมินสารก่อภูมิแพ้
              </h2>
            </div>

            {/* เลือกวัตถุดิบ */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#302923] tabular-nums">
                  เลือกวัตถุดิบหลักที่ใช้ ({totalSelectedIngredients} รายการ) *
                </span>
              </div>
              <div
                id="recipe-ingredients"
                tabIndex={-1}
                className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto p-3.5 rounded-lg bg-[#FBF7EF] border border-[#DDD2C2]"
              >
                {allAvailableIngredients.map((ing) => {
                  const selected = ingredientIds.includes(ing.id);
                  return (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => toggleIngredient(ing.id)}
                      aria-pressed={selected}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        selected
                          ? "bg-[#302923] text-[#FBF0DC] border-[#302923]"
                          : "bg-white text-[#302923] border-[#DDD2C2] hover:border-[#C6B7A5]"
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
                  aria-expanded={
                    showOtherIngredientInput || customIngredientNames.length > 0
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                    showOtherIngredientInput || customIngredientNames.length > 0
                      ? "bg-[#F3E3D2] text-[#302923] border-[#302923]"
                      : "bg-white text-[#302923] border-dashed border-[#C6B7A5] hover:border-[#302923]"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>อื่นๆ (เพิ่มวัตถุดิบเอง)</span>
                </button>
              </div>

              {(showOtherIngredientInput ||
                customIngredientNames.length > 0) && (
                <div className="mt-2.5 p-3.5 rounded-lg bg-[#FBF7EF] border border-[#DDD2C2] space-y-2.5">
                  <label
                    htmlFor="custom-ingredient-input"
                    className="block text-xs font-bold text-[#302923]"
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
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          addCustomIngredient();
                        }
                      }}
                      placeholder="เช่น แหนม, วุ้นเส้น, ชะอม, หมูยอ, เห็ดเข็มทอง..."
                      className="kindi-input-field flex-1 px-3 py-2 text-xs font-medium bg-white"
                    />
                    <button
                      type="button"
                      onClick={addCustomIngredient}
                      className="kindi-btn-primary px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                    >
                      + เพิ่มวัตถุดิบ
                    </button>
                  </div>

                  {customIngredientNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {customIngredientNames.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#302923] text-[#FBF0DC] text-xs font-bold shadow-xs"
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

            {/* รูปแบบการกิน & สารก่อภูมิแพ้ */}
            <div className="p-4 rounded-lg bg-[#FBF7EF] border border-[#DDD2C2] space-y-3.5">
              <div>
                <span className="block text-xs font-bold text-[#302923] mb-1.5">
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          active
                            ? "bg-emerald-800 text-white border-emerald-900 shadow-xs"
                            : "bg-white text-[#302923] border-[#DDD2C2] hover:border-[#C6B7A5]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-[#302923] mb-1.5">
                  สารก่อภูมิแพ้ที่มีในเมนูนี้
                  (เพื่อช่วยซ่อนเมนูจากคนที่แพ้อัตโนมัติ)
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          active
                            ? "bg-rose-50 text-rose-950 border-rose-300 shadow-xs"
                            : "bg-white text-[#302923] border-[#DDD2C2] hover:border-[#C6B7A5]"
                        }`}
                      >
                        {ALLERGEN_LABELS[alg].label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* เคล็ดลับ & ผู้เพิ่มสูตร */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="kindi-input-group">
                <label
                  htmlFor="recipe-steps"
                  className="block text-xs font-bold text-[#302923] mb-1.5"
                >
                  โน้ตวิธีทำ / เคล็ดลับสั้นๆ (ไม่บังคับ)
                </label>
                <input
                  id="recipe-steps"
                  type="text"
                  value={instructionsText}
                  onChange={(e) => setInstructionsText(e.target.value)}
                  placeholder="เช่น หมักหมูไว้ข้ามคืนจะนุ่มเข้าเนื้อมาก"
                  className="kindi-input-field w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium"
                />
              </div>

              <div className="kindi-input-group">
                <label
                  htmlFor="recipe-author"
                  className="block text-xs font-bold text-[#302923] mb-1.5"
                >
                  ชื่อคนเพิ่มสูตร (ไม่บังคับ)
                </label>
                <input
                  id="recipe-author"
                  type="text"
                  value={submittedBy}
                  onChange={(e) => setSubmittedBy(e.target.value)}
                  placeholder="เช่น เชฟกระทะเหล็ก"
                  className="kindi-input-field w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium"
                />
              </div>
            </div>
          </fieldset>

          {currentStep === 3 && (
            <section className="recipe-review" aria-label="สรุปสูตรก่อนบันทึก">
              {imageUrl && (
                <img src={imageUrl} alt={name} className="review-image" />
              )}
              <h3>{name}</h3>
              <p>{description}</p>
              <dl>
                <div>
                  <dt>หมวดหมู่</dt>
                  <dd>{FOOD_CATEGORY_LABELS[category]}</dd>
                </div>
                <div>
                  <dt>เวลาทำ</dt>
                  <dd>
                    {cookingTime} นาที · {DIFFICULTY_LABELS[difficulty]}
                  </dd>
                </div>
                <div>
                  <dt>มื้ออาหาร</dt>
                  <dd>
                    {mealTypes
                      .map((meal) => MEAL_TYPE_LABELS[meal])
                      .join(" / ")}
                  </dd>
                </div>
                <div>
                  <dt>วัตถุดิบ</dt>
                  <dd>
                    {[
                      ...ingredientIds.map(
                        (id) =>
                          allAvailableIngredients.find((ing) => ing.id === id)
                            ?.name_th ?? id,
                      ),
                      ...customIngredientNames,
                    ].join(", ")}
                  </dd>
                </div>
                <div>
                  <dt>รูปแบบการกิน</dt>
                  <dd>
                    {dietaryTags.length
                      ? DIETARY_TAG_OPTIONS.filter((tag) =>
                          dietaryTags.includes(tag.id),
                        )
                          .map((tag) => tag.label)
                          .join(", ")
                      : "ไม่ได้ระบุ"}
                  </dd>
                </div>
                <div>
                  <dt>สารก่อภูมิแพ้ที่ระบุ</dt>
                  <dd>
                    {allergens.length
                      ? allergens
                          .map((id) => ALLERGEN_LABELS[id].label)
                          .join(", ")
                      : "ไม่ได้ระบุ (ไม่ได้หมายความว่าปลอดสารก่อภูมิแพ้)"}
                  </dd>
                </div>
                <div>
                  <dt>โน้ตวิธีทำ</dt>
                  <dd>{instructionsText || "ไม่ได้ระบุ"}</dd>
                </div>
                <div>
                  <dt>ผู้เพิ่มสูตร</dt>
                  <dd>{submittedBy || "เพื่อนนักกิน KIN DI"}</dd>
                </div>
                <div>
                  <dt>สูตรต้นฉบับ</dt>
                  <dd>
                    <span className="review-url">{externalRecipeUrl}</span>
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                className="text-link"
                onClick={() => moveToStep(0)}
              >
                กลับไปแก้ไขข้อมูลเมนู
              </button>
            </section>
          )}

          <div className="step-actions">
            {currentStep > 0 && (
              <button
                type="button"
                className="kindi-btn-secondary step-back"
                disabled={isSubmitting}
                onClick={() => moveToStep(currentStep - 1)}
              >
                ย้อนกลับ
              </button>
            )}
            <button
              key={currentStep === 3 ? "save" : "next"}
              type="submit"
              disabled={isSubmitting}
              className="kindi-btn-primary min-h-12 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-sm sm:text-base cursor-pointer shadow-xs"
            >
              {currentStep === 3 && (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
              <span>
                {isSubmitting
                  ? "กำลังบันทึกเมนูอาหาร..."
                  : currentStep === 3
                    ? "บันทึกเมนูอาหารเข้าสำรับ!"
                    : currentStep === 2
                      ? "ถัดไป: ตรวจสอบสูตร"
                      : "ถัดไป"}
              </span>
            </button>
          </div>
        </form>

        {/* รายการเมนูอาหารที่เพิ่มแล้ว */}
        <section
          aria-labelledby="shared-recipes-heading"
          className="lg:col-span-5 kindi-surface-card shared-recipes-panel"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#DDD2C2] pb-3">
            <h2
              id="shared-recipes-heading"
              className="text-base font-semibold text-[#302923] tabular-nums"
            >
              เมนูอาหารที่เพิ่มแล้ว ({sharedRecipes.length} เมนู)
            </h2>
          </div>
          <p className="text-xs text-[#6E5D50] leading-relaxed">
            เมนูทั้งหมดในรายการนี้พร้อมใช้ใน <strong>สุ่มไพ่เมนู</strong>,{" "}
            <strong>มีอะไรในตู้</strong> และ <strong>รวมเมนูทั้งหมด</strong>{" "}
            ทันที
          </p>

          {collectionError && (
            <p role="alert" className="step-error">
              {collectionError}{" "}
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  void refreshCollection();
                }}
              >
                ลองอีกครั้ง
              </button>
            </p>
          )}
          {!collectionError && localOnlyRecipes.length > 0 && (
            <div className="recipe-import-notice">
              <p>
                มี {localOnlyRecipes.length} เมนูเดิมที่ยังอยู่เฉพาะในเครื่องนี้
                นำขึ้นฐานข้อมูลเพื่อเปิดดูจากอุปกรณ์อื่นได้
              </p>
              <button
                type="button"
                className="kindi-btn-secondary"
                disabled={isImporting}
                onClick={handleImportLocalRecipes}
              >
                {isImporting ? "กำลังนำเข้า…" : "นำเมนูเดิมขึ้นฐานข้อมูล"}
              </button>
            </div>
          )}

          {sharedRecipes.length === 0 ? (
            <div className="p-6 rounded-lg bg-[#FBF7EF] border border-dashed border-[#C6B7A5] text-center space-y-1.5">
              <p className="text-sm font-bold text-[#302923]">
                ยังไม่มีเมนูอาหารที่เพิ่มไว้
              </p>
              <p className="text-xs text-[#6E5D50]">
                เพิ่มเมนูโปรดทางด้านซ้ายเพื่อเริ่มสร้างสำรับไพ่ของคุณได้เลย
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
              {sharedRecipes.map((item) => {
                const ext = getExternalRecipeLinks(item);
                return (
                  <div
                    key={item.id}
                    className="shared-menu-card kindi-recipe-card p-3.5 sm:p-4 group"
                  >
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-20 h-20 rounded-lg object-cover border border-[#DDD2C2] shrink-0 bg-[#F1EADF] group-hover:scale-102 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg border border-[#DDD2C2] bg-[#F1EADF] shrink-0 flex items-center justify-center text-[#76685C] text-xs font-bold">
                        ไม่มีรูป
                      </div>
                    )}
                    <div className="shared-menu-info">
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#F3E3D2] border border-[#DDD2C2] text-[#302923]">
                            {FOOD_CATEGORY_LABELS[item.category]}
                          </span>
                          <span className="text-xs text-[#6E5D50] font-medium tabular-nums">
                            {item.cooking_time} นาที
                          </span>
                        </div>
                        <p className="text-sm sm:text-base font-semibold text-[#302923] line-clamp-2 mt-1 break-words">
                          {item.name}
                        </p>
                      </div>
                    </div>

                    <div className="shared-menu-actions">
                      <a
                        href={ext.primaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`เปิดสูตรต้นฉบับ ${item.name}`}
                        className="kindi-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer"
                      >
                        <span>ดูสูตร</span>
                        <ExternalLink
                          className="w-3.5 h-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      </a>
                      <Link
                        href={`/recipes/${encodeURIComponent(item.id)}`}
                        className="kindi-btn-secondary inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold text-[#302923] whitespace-nowrap cursor-pointer"
                      >
                        ส่วนผสม
                      </Link>
                      <button
                        type="button"
                        onClick={() => setRecipeToDelete(item)}
                        aria-label={`ลบเมนู ${item.name}`}
                        title="ลบเมนูนี้ออกจากระบบ"
                        className="p-1.5 rounded-xl text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors ml-auto cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <AdminDeleteRecipeDialog
        recipe={recipeToDelete}
        onClose={() => setRecipeToDelete(null)}
        onDelete={handleDeleteRecipe}
      />
    </div>
  );
}
