'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, RotateCcw, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { ALL_ALLERGEN_IDS, INGREDIENTS_CATALOG } from '@/data/recipes-seed';
import { DEFAULT_USER_RESTRICTIONS } from '@/features/food-safety/eligibility';
import {
  ALLERGEN_LABELS,
  AllergenId,
  DIETARY_PREFERENCE_LABELS,
  DietaryPreference,
  SAFETY_DISCLAIMER_TH,
  UserFoodRestrictions,
} from '@/types/recipe';

interface FoodRestrictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  restrictions: UserFoodRestrictions;
  onChange: (next: UserFoodRestrictions) => void;
}

const AVOIDABLE_INGREDIENTS_OPTIONS = [
  { id: 'beef', label: 'เนื้อวัว (รวมน้ำสต็อกเนื้อ)' },
  { id: 'pork', label: 'เนื้อหมู (รวมหมูสับ/หมูกรอบ)' },
  { id: 'chicken', label: 'เนื้อไก่' },
  { id: 'shrimp', label: 'กุ้งและซอสหอยนางรม' },
  { id: 'fish', label: 'ปลาและน้ำปลา' },
  { id: 'garlic', label: 'กระเทียม' },
  { id: 'onion', label: 'หอมหัวใหญ่ / หอมแดง' },
  { id: 'chili', label: 'พริก (ไม่กินเผ็ด)' },
  { id: 'holy_basil', label: 'ใบกะเพรา' },
  { id: 'morning_glory', label: 'ผักบุ้ง' },
];

export function FoodRestrictionsModal({
  isOpen,
  onClose,
  restrictions,
  onChange,
}: FoodRestrictionsModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [showOtherAllergenInput, setShowOtherAllergenInput] = useState(false);
  const [otherAllergenDraft, setOtherAllergenDraft] = useState('');

  const [showOtherAvoidInput, setShowOtherAvoidInput] = useState(false);
  const [otherAvoidDraft, setOtherAvoidDraft] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    let cleanupFallback: (() => void) | undefined;
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isDialogContent) {
          dialog.close();
        }
      };
      dialog.addEventListener('click', handleBackdropClick);
      cleanupFallback = () => dialog.removeEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupFallback?.();
    };
  }, [onClose]);

  const toggleAllergen = (allergen: AllergenId) => {
    const exists = restrictions.allergens.includes(allergen);
    const nextAllergens = exists
      ? restrictions.allergens.filter((a) => a !== allergen)
      : [...restrictions.allergens, allergen];
    onChange({
      ...restrictions,
      allergens: nextAllergens,
    });
  };

  const addCustomAllergen = () => {
    const clean = otherAllergenDraft.trim();
    if (!clean) return;
    const current = restrictions.customAllergens ?? [];
    if (!current.includes(clean)) {
      onChange({
        ...restrictions,
        customAllergens: [...current, clean],
      });
    }
    setOtherAllergenDraft('');
  };

  const removeCustomAllergen = (term: string) => {
    const current = restrictions.customAllergens ?? [];
    onChange({
      ...restrictions,
      customAllergens: current.filter((item) => item !== term),
    });
  };

  const toggleAvoidedIngredient = (ingredientId: string) => {
    const exists = restrictions.avoidedIngredients.includes(ingredientId);
    const nextAvoided = exists
      ? restrictions.avoidedIngredients.filter((id) => id !== ingredientId)
      : [...restrictions.avoidedIngredients, ingredientId];
    onChange({
      ...restrictions,
      avoidedIngredients: nextAvoided,
    });
  };

  const addCustomAvoidedTerm = () => {
    const clean = otherAvoidDraft.trim();
    if (!clean) return;
    const current = restrictions.customAvoidedTerms ?? [];
    if (!current.includes(clean)) {
      onChange({
        ...restrictions,
        customAvoidedTerms: [...current, clean],
      });
    }
    setOtherAvoidDraft('');
  };

  const removeCustomAvoidedTerm = (term: string) => {
    const current = restrictions.customAvoidedTerms ?? [];
    onChange({
      ...restrictions,
      customAvoidedTerms: current.filter((item) => item !== term),
    });
  };

  const setDiet = (diet: DietaryPreference) => {
    onChange({
      ...restrictions,
      dietaryPreference: diet,
    });
  };

  const resetAll = () => {
    onChange(DEFAULT_USER_RESTRICTIONS);
    setOtherAllergenDraft('');
    setOtherAvoidDraft('');
  };

  const customAllergens = restrictions.customAllergens ?? [];
  const customAvoidedTerms = restrictions.customAvoidedTerms ?? [];

  const activeCount =
    restrictions.allergens.length +
    customAllergens.length +
    restrictions.avoidedIngredients.length +
    customAvoidedTerms.length +
    (restrictions.dietaryPreference !== 'unrestricted' ? 1 : 0);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby="restrictions-dialog-title"
      aria-describedby="restrictions-dialog-desc"
      className="kindi-modal m-auto w-[calc(100%-1.5rem)] max-w-2xl max-h-[88dvh] rounded-xl bg-[#FBF7EF] text-[#302923] p-0 overflow-hidden"
    >
      {/* Clean Editorial Modal Header (No heavy yellow slab) */}
      <div className="bg-white border-b border-[#DDD2C2] flex items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 shrink-0">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F3E3D2] border border-[#DDD2C2] flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5 text-[#302923]" aria-hidden="true" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F1EADF] border border-[#DDD2C2] text-[#6E5D50] text-xs font-bold mb-1">
              <span>ใช้ร่วมกันทั้งโหมดสุ่มไพ่และค้นตู้เย็น</span>
            </div>
            <h2
              id="restrictions-dialog-title"
              className="text-xl sm:text-2xl font-semibold tracking-tight text-[#302923]"
            >
              ข้อจำกัดทางอาหาร
            </h2>
            <p id="restrictions-dialog-desc" className="text-xs sm:text-sm text-[#6E5D50] mt-0.5">
              ตั้งค่าอาหารที่แพ้หรือวัตถุดิบที่ไม่กิน ระบบจะคัดเมนูให้ตรงตามที่คุณทานได้อัตโนมัติ
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="ปิดหน้าต่างตั้งค่าข้อจำกัดทางอาหาร"
          className="w-10 h-10 rounded-xl bg-[#F1EADF] border border-[#DDD2C2] flex items-center justify-center hover:bg-[#DDD2C2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#302923] shrink-0 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5 text-[#302923]" aria-hidden="true" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
        {/* 1. Dietary Preference */}
        <section aria-labelledby="diet-section-heading">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 id="diet-section-heading" className="text-sm sm:text-base font-semibold text-[#302923]">
              1. รูปแบบการกินหลัก
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.keys(DIETARY_PREFERENCE_LABELS) as DietaryPreference[]).map((diet) => {
              const info = DIETARY_PREFERENCE_LABELS[diet];
              const isSelected = restrictions.dietaryPreference === diet;
              return (
                <button
                  key={diet}
                  type="button"
                  onClick={() => setDiet(diet)}
                  aria-pressed={isSelected}
                  className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#302923] text-white border-[#302923] shadow-xs'
                      : 'bg-white text-[#302923] border-[#DDD2C2] hover:border-[#C6B7A5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm">{info.label}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#FBF0DC] text-[#302923] flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      isSelected ? 'text-white/80' : 'text-[#76685C]'
                    }`}
                  >
                    {info.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Allergens + "อื่นๆ" */}
        <section aria-labelledby="allergen-section-heading">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 id="allergen-section-heading" className="text-sm sm:text-base font-semibold text-[#302923]">
              2. อาหารหรือสารก่อภูมิแพ้ที่ต้องเลี่ยงเด็ดขาด
            </h3>
            {restrictions.allergens.length + customAllergens.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 tabular-nums">
                เลือกไว้ {restrictions.allergens.length + customAllergens.length} รายการ
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_ALLERGEN_IDS.map((allergenId) => {
              const info = ALLERGEN_LABELS[allergenId];
              const isSelected = restrictions.allergens.includes(allergenId);
              return (
                <button
                  key={allergenId}
                  type="button"
                  onClick={() => toggleAllergen(allergenId)}
                  aria-pressed={isSelected}
                  className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-rose-50/90 text-[#302923] border-rose-300 shadow-xs'
                      : 'bg-white text-[#302923] border-[#DDD2C2] hover:border-[#C6B7A5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm">{info.label}</span>
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#302923] border-[#302923] text-[#FBF0DC]'
                          : 'border-[#C6B7A5] bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />}
                    </span>
                  </div>
                  <p className="text-xs text-[#76685C] mt-0.5">{info.detail}</p>
                </button>
              );
            })}

            {/* "อื่นๆ" Option for Allergens not in the list */}
            <button
              type="button"
              onClick={() => setShowOtherAllergenInput((prev) => !prev)}
              aria-expanded={showOtherAllergenInput || customAllergens.length > 0}
              className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                showOtherAllergenInput || customAllergens.length > 0
                  ? 'bg-rose-50/90 text-[#302923] border-rose-300 shadow-xs'
                  : 'bg-white text-[#302923] border-dashed border-[#C6B7A5] hover:border-[#302923]/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm">อื่นๆ (ระบุอาหารที่แพ้เพิ่มเติม)</span>
                <span className="w-5 h-5 rounded-md bg-[#F3E3D2] border border-[#DDD2C2] text-[#302923] flex items-center justify-center shrink-0">
                  <Plus className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
                </span>
              </div>
              <p className="text-xs text-[#76685C] mt-0.5">
                เพิ่มอาหารหรือส่วนผสมที่แพ้นอกเหนือจากรายการด้านบน
              </p>
            </button>
          </div>

          {/* Custom Allergens Input & Tags */}
          {(showOtherAllergenInput || customAllergens.length > 0) && (
            <div className="kindi-input-group mt-3 p-4 rounded-lg bg-white border border-[#DDD2C2] space-y-2.5">
              <label htmlFor="custom-allergen-input" className="block text-xs font-semibold text-[#302923]">
                ระบุอาหารหรือสารก่อภูมิแพ้อื่นๆ ที่ต้องเลี่ยงเด็ดขาด:
              </label>
              <div className="flex gap-2">
                <input
                  id="custom-allergen-input"
                  type="text"
                  value={otherAllergenDraft}
                  onChange={(e) => setOtherAllergenDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      addCustomAllergen();
                    }
                  }}
                  placeholder="เช่น ผงชูรส, หอยนางรม, ข้าวโพด, กีวี..."
                  className="kindi-input-field flex-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={addCustomAllergen}
                  className="kindi-btn-primary px-4 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer shrink-0"
                >
                  + เพิ่ม
                </button>
              </div>
              {customAllergens.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customAllergens.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-950 border border-rose-200 text-xs font-bold"
                    >
                      <span>แพ้: {item}</span>
                      <button
                        type="button"
                        onClick={() => removeCustomAllergen(item)}
                        aria-label={`ลบรายการแพ้ ${item}`}
                        className="hover:text-rose-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 3. Avoided Ingredients + "อื่นๆ" */}
        <section aria-labelledby="avoid-section-heading">
          <h3 id="avoid-section-heading" className="text-sm sm:text-base font-semibold text-[#302923] mb-2.5">
            3. วัตถุดิบที่ไม่กิน / อยากเลี่ยง (รวมในน้ำซุปและซอส)
          </h3>
          <div className="flex flex-wrap gap-2">
            {AVOIDABLE_INGREDIENTS_OPTIONS.map((opt) => {
              const isSelected = restrictions.avoidedIngredients.includes(opt.id);
              const catalogName = INGREDIENTS_CATALOG[opt.id]?.name_th ?? opt.label;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleAvoidedIngredient(opt.id)}
                  aria-pressed={isSelected}
                  title={catalogName}
                  className={`min-h-9 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#302923] text-[#FBF0DC] border-[#302923] shadow-xs'
                      : 'bg-white text-[#302923] border-[#DDD2C2] hover:border-[#C6B7A5]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />}
                </button>
              );
            })}

            {/* "อื่นๆ" Option for Avoided Ingredients */}
            <button
              type="button"
              onClick={() => setShowOtherAvoidInput((prev) => !prev)}
              aria-expanded={showOtherAvoidInput || customAvoidedTerms.length > 0}
              className={`min-h-9 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                showOtherAvoidInput || customAvoidedTerms.length > 0
                  ? 'bg-[#F3E3D2] text-[#302923] border-[#C6B7A5]'
                  : 'bg-white text-[#302923] border-dashed border-[#C6B7A5] hover:border-[#302923]/50'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
              <span>อื่นๆ (ระบุวัตถุดิบที่ไม่กินเพิ่ม)</span>
            </button>
          </div>

          {/* Custom Avoided Ingredients Input & Tags */}
          {(showOtherAvoidInput || customAvoidedTerms.length > 0) && (
            <div className="kindi-input-group mt-3 p-4 rounded-lg bg-white border border-[#DDD2C2] space-y-2.5">
              <label htmlFor="custom-avoid-input" className="block text-xs font-semibold text-[#302923]">
                ระบุวัตถุดิบอื่นๆ ที่ไม่กินหรืออยากเลี่ยง:
              </label>
              <div className="flex gap-2">
                <input
                  id="custom-avoid-input"
                  type="text"
                  value={otherAvoidDraft}
                  onChange={(e) => setOtherAvoidDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      addCustomAvoidedTerm();
                    }
                  }}
                  placeholder="เช่น ผักชี, แตงกวา, ขิง, เครื่องใน..."
                  className="kindi-input-field flex-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={addCustomAvoidedTerm}
                  className="kindi-btn-primary px-4 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer shrink-0"
                >
                  + เพิ่ม
                </button>
              </div>
              {customAvoidedTerms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customAvoidedTerms.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F3E3D2] text-[#302923] border border-[#DDD2C2] text-xs font-bold"
                    >
                      <span>ไม่กิน: {item}</span>
                      <button
                        type="button"
                        onClick={() => removeCustomAvoidedTerm(item)}
                        aria-label={`ลบวัตถุดิบที่เลี่ยง ${item}`}
                        className="hover:opacity-70 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Mandatory Safety Disclaimer */}
        <div
          role="note"
          className="p-3.5 rounded-lg bg-[#F1EADF] border border-[#DDD2C2] flex items-start gap-3 text-xs text-[#6E5D50]"
        >
          <ShieldAlert className="w-4 h-4 text-[#302923] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed font-medium">{SAFETY_DISCLAIMER_TH}</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-3.5 sm:px-6 bg-white border-t border-[#DDD2C2] flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={resetAll}
          disabled={activeCount === 0}
          className="min-h-10 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#6E5D50] border border-[#DDD2C2] hover:bg-[#F1EADF] hover:text-[#302923] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>ล้างข้อจำกัดทั้งหมด</span>
        </button>

        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="kindi-btn-primary min-h-10 px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer tabular-nums"
        >
          บันทึกและใช้งาน ({activeCount} เงื่อนไข)
        </button>
      </div>
    </dialog>
  );
}
