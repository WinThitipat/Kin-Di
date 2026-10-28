import { Recipe } from '@/types/recipe';

export interface ExternalRecipeSourceLink {
  name: string;
  url: string;
}

export interface ResolvedExternalRecipeLinks {
  primaryUrl: string;
  primarySourceName: string;
  sources: ExternalRecipeSourceLink[];
}

/**
 * Validates that a candidate URL is a safe https:// or http:// URL (never javascript: or data:).
 */
export function isSafeHttpUrl(rawUrl?: string | null): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Infers a human-friendly platform or domain label from any recipe URL (unrestricted domain).
 */
export function inferExternalSourceName(rawUrl?: string | null): string {
  if (!rawUrl || !isSafeHttpUrl(rawUrl)) {
    return 'ลิงก์สูตรอาหาร';
  }

  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host.includes('wongnai.com')) return 'Wongnai Cooking';
    if (host.includes('krua.co')) return 'Krua.co';
    if (host.includes('kapook.com')) return 'Kapook Cooking';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube';
    if (host.includes('tiktok.com')) return 'TikTok';
    if (host.includes('lemon8-app.com') || host.includes('lemon8')) return 'Lemon8';
    if (host.includes('facebook.com') || host.includes('fb.watch')) return 'Facebook';
    if (host.includes('instagram.com')) return 'Instagram';
    if (host.includes('pantip.com')) return 'Pantip';
    if (host.includes('trueid.net')) return 'TrueID Food';
    if (host.includes('sanook.com')) return 'Sanook';
    if (host.includes('cpbrandsite.com')) return 'CP Kitchen';

    return host;
  } catch {
    return 'ลิงก์สูตรอาหาร';
  }
}

/**
 * Resolves the external recipe link for a given recipe without adding extra third-party search buttons.
 */
export function getExternalRecipeLinks(recipe: Recipe): ResolvedExternalRecipeLinks {
  const cleanQuery = encodeURIComponent(recipe.name.trim());
  const fallbackUrl = `https://www.google.com/search?q=${cleanQuery}`;

  const hasValidCustomUrl = isSafeHttpUrl(recipe.external_recipe_url);
  const primaryUrl = hasValidCustomUrl ? recipe.external_recipe_url!.trim() : fallbackUrl;
  const primarySourceName =
    recipe.external_source_name?.trim() || inferExternalSourceName(primaryUrl);

  const sources: ExternalRecipeSourceLink[] = [
    {
      name: 'ลิงก์สูตรอาหาร',
      url: primaryUrl,
    },
  ];

  return {
    primaryUrl,
    primarySourceName,
    sources,
  };
}
