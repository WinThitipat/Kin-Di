'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, RotateCcw, ShieldAlert, SlidersHorizontal, X } from 'lucide-react';
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

  // Fallback for browsers without native `closedby="any"` support (per modern-web-guidance)
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
      className="kindi-modal m-auto w-[calc(100%-1.5rem)] max-w-2xl max-h-[88dvh] rounded-3xl bg-[#FFF9EC] text-[#171717] p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="kindi-hero-surface border-0 border-b border-[#171717]/10 rounded-none shadow-none flex items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#171717] text-[#F8D84A] text-xs font-bold mb-1">
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>ตั้งค่าร่วมกันทุกโหมด (สุ่มไพ่ + ค้นตู้เย็น)</span>
          </div>
          <h2 id="restrictions-dialog-title" className="text-xl sm:text-2xl font-extrabold tracking-tight">
            ข้อจำกัดทางอาหาร
          </h2>
          <p id="restrictions-dialog-desc" className="text-xs sm:text-sm text-[#171717]/80 mt-0.5">
            ระบบจะคัดเมนูที่มีวัตถุดิบที่คุณแพ้หรือเลี่ยงออกให้อัตโนมัติ
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="ปิดหน้าต่างตั้งค่าข้อจำกัดทางอาหาร"
          className="w-9 h-9 rounded-xl bg-white/90 border border-[#171717]/15 flex items-center justify-center hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] shrink-0 cursor-pointer"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
        {/* 1. Dietary Preference */}
        <section aria-labelledby="diet-section-heading">
          <h3 id="diet-section-heading" className="text-base font-bold text-[#171717] mb-2.5">
            1. รูปแบบการกินหลัก
          </h3>
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
                  className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#171717] text-white border-[#171717] shadow-sm'
                      : 'bg-white text-[#171717] border-[#171717]/12 hover:border-[#171717]/35'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm">{info.label}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#F8D84A] text-[#171717] flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      isSelected ? 'text-white/80' : 'text-[#6E6A63]'
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
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <h3 id="allergen-section-heading" className="text-base font-bold text-[#171717]">
              2. อาหารหรือสารก่อภูมิแพ้ที่ต้องเลี่ยงเด็ดขาด
            </h3>
            {restrictions.allergens.length + customAllergens.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-200">
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
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFE4E6] text-[#171717] border-red-300 shadow-xs'
                      : 'bg-white text-[#171717] border-[#171717]/12 hover:border-[#171717]/35'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm">{info.label}</span>
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#171717] border-[#171717] text-[#F8D84A]'
                          : 'border-[#6E6A63]/35 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E6A63] mt-0.5">{info.detail}</p>
                </button>
              );
            })}

            {/* "อื่นๆ" Option for Allergens not in the list */}
            <button
              type="button"
              onClick={() => setShowOtherAllergenInput((prev) => !prev)}
              aria-expanded={showOtherAllergenInput || customAllergens.length > 0}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                showOtherAllergenInput || customAllergens.length > 0
                  ? 'bg-[#FFE4E6] text-[#171717] border-red-300 shadow-xs'
                  : 'bg-white text-[#171717] border-dashed border-[#171717]/30 hover:border-[#171717]/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm">อื่นๆ (ระบุอาหารที่แพ้เพิ่มเติม)</span>
                <span className="w-5 h-5 rounded-md border border-[#171717]/20 bg-[#F8D84A] text-[#171717] flex items-center justify-center shrink-0">
                  <Plus className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
                </span>
              </div>
              <p className="text-xs text-[#6E6A63] mt-0.5">
                เพิ่มอาหารหรือส่วนผสมที่แพ้นอกเหนือจากรายการด้านบน
              </p>
            </button>
          </div>

          {/* Custom Allergens Input & Tags */}
          {(showOtherAllergenInput || customAllergens.length > 0) && (
            <div className="kindi-input-group mt-3 p-4 rounded-2xl bg-white border border-[#171717]/15 space-y-2.5">
              <label htmlFor="custom-allergen-input" className="block text-xs font-extrabold text-[#171717]">
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
                  className="kindi-input-field flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={addCustomAllergen}
                  className="px-3.5 py-2 rounded-xl bg-[#171717] text-[#F8D84A] text-xs sm:text-sm font-extrabold hover:bg-[#171717]/90 cursor-pointer shrink-0"
                >
                  + เพิ่ม
                </button>
              </div>
              {customAllergens.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customAllergens.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFE4E6] text-red-950 border border-red-200 text-xs font-extrabold"
                    >
                      <span>แพ้: {item}</span>
                      <button
                        type="button"
                        onClick={() => removeCustomAllergen(item)}
                        aria-label={`ลบรายการแพ้ ${item}`}
                        className="hover:text-red-700 cursor-pointer"
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
          <h3 id="avoid-section-heading" className="text-base font-bold text-[#171717] mb-2">
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
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#F8D84A] text-[#171717] border-[#171717]/25 shadow-xs'
                      : 'bg-white text-[#171717] border-[#171717]/12 hover:border-[#171717]/35'
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
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                showOtherAvoidInput || customAvoidedTerms.length > 0
                  ? 'bg-[#F8D84A] text-[#171717] border-[#171717]/25 shadow-xs'
                  : 'bg-white text-[#171717] border-dashed border-[#171717]/30 hover:border-[#171717]/60'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
              <span>อื่นๆ (ระบุวัตถุดิบที่ไม่กินเพิ่ม)</span>
            </button>
          </div>

          {/* Custom Avoided Ingredients Input & Tags */}
          {(showOtherAvoidInput || customAvoidedTerms.length > 0) && (
            <div className="kindi-input-group mt-3 p-4 rounded-2xl bg-white border border-[#171717]/20 space-y-2.5">
              <label htmlFor="custom-avoid-input" className="block text-xs font-extrabold text-[#171717]">
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
                  className="kindi-input-field flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={addCustomAvoidedTerm}
                  className="px-3.5 py-2 rounded-xl bg-[#171717] text-[#F8D84A] text-xs sm:text-sm font-extrabold hover:bg-[#171717]/90 cursor-pointer shrink-0"
                >
                  + เพิ่ม
                </button>
              </div>
              {customAvoidedTerms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customAvoidedTerms.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8D84A] text-[#171717] border border-[#171717]/30 text-xs font-extrabold"
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
          className="p-3.5 rounded-2xl bg-[#EAE5DA]/80 border border-[#171717]/15 flex items-start gap-3 text-xs text-[#171717]"
        >
          <ShieldAlert className="w-5 h-5 text-[#171717] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed font-medium">{SAFETY_DISCLAIMER_TH}</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-3.5 sm:px-6 bg-white border-t border-[#171717]/15 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={resetAll}
          disabled={activeCount === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#171717] border border-[#171717]/20 hover:bg-[#EAE5DA] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>ล้างข้อจำกัดทั้งหมด</span>
        </button>

        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="kindi-btn-primary px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer"
        >
          บันทึกและใช้งาน ({activeCount} เงื่อนไข)
        </button>
      </div>
    </dialog>
  );
}
