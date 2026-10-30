'use client';
import { useState } from 'react';
import { CardCountOption, FOOD_CATEGORY_LABELS, MEAL_TYPE_LABELS, RouletteQuickFilters } from '@/types/recipe';
import { CardCountSelector } from './CardCountSelector';

export function RouletteOptions({ filters, cardCount, onApply, onCancel }: {
  filters: RouletteQuickFilters; cardCount: CardCountOption;
  onApply: (filters: RouletteQuickFilters, count: CardCountOption) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState(filters);
  const [count, setCount] = useState(cardCount);
  return <form className="roulette-options space-y-5" onSubmit={event => { event.preventDefault(); onApply(draft, count); }}>
    <h3 className="text-lg font-semibold">ปรับตัวเลือกมื้อนี้</h3>
    <p className="text-sm text-[#6E5D50]">เลือกเท่าที่ต้องการ แล้วกดใช้ตัวเลือกนี้ ข้อจำกัดทางอาหารยังคงเดิม</p>
    <label>มื้ออาหาร<select value={draft.mealType} onChange={event => setDraft({...draft, mealType: event.target.value as RouletteQuickFilters['mealType']})}>
      <option value="all">ทุกมื้อ</option>{Object.entries(MEAL_TYPE_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}
    </select></label>
    <label>หมวดอาหาร<select value={draft.category} onChange={event => setDraft({...draft, category: event.target.value as RouletteQuickFilters['category']})}>
      <option value="all">ทุกหมวด</option>{Object.entries(FOOD_CATEGORY_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}
    </select></label>
    <label>เวลาทำอาหาร<select value={draft.maxCookingTime ?? ''} onChange={event => setDraft({...draft,maxCookingTime:event.target.value ? Number(event.target.value) : null})}>
      <option value="">ไม่จำกัดเวลา</option>{[10,15,30].map(time=><option key={time} value={time}>ไม่เกิน {time} นาที</option>)}
    </select></label>
    <CardCountSelector selectedCount={count} onSelectCount={setCount} />
    <div className="flex flex-wrap gap-3">
      <button type="submit" className="kindi-btn-primary min-h-11 px-5">ใช้ตัวเลือกนี้</button>
      <button type="button" onClick={onCancel} className="kindi-btn-secondary min-h-11 px-5">ยกเลิก</button>
    </div>
  </form>;
}
