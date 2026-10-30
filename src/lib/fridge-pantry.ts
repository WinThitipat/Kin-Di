export const PANTRY_KEY = 'kindi:fridge-pantry:v1';
export interface FridgePantry { ingredientIds: string[]; assumeBasicCondiments: boolean }
export function readPantry(): FridgePantry | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(PANTRY_KEY) || 'null');
    if (value?.version !== 1 || !Array.isArray(value.ingredientIds) || typeof value.assumeBasicCondiments !== 'boolean') return null;
    return { ingredientIds: [...new Set(value.ingredientIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= 200))] as string[], assumeBasicCondiments: value.assumeBasicCondiments };
  } catch { return null; }
}
export function savePantry(pantry: FridgePantry): void {
  try { window.localStorage.setItem(PANTRY_KEY, JSON.stringify({version: 1, ...pantry})); window.dispatchEvent(new Event('kindi-pantry-updated')); } catch { /* Storage unavailable: keep session usable. */ }
}
