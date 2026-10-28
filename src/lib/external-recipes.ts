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
    return 'เว็บไซต์สูตรอาหาร';
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
    return 'เว็บไซต์สูตรอาหาร';
  }
}

/**
 * Resolves the primary external recipe link (any platform/domain) for a given recipe,
 * along with alternative search links for convenience.
 */
export function getExternalRecipeLinks(recipe: Recipe): ResolvedExternalRecipeLinks {
  const cleanQuery = encodeURIComponent(recipe.name.trim());

  const wongnaiSearchUrl = `https://www.wongnai.com/recipes?q=${cleanQuery}`;
  const kruaSearchUrl = `https://krua.co/recipe?s=${cleanQuery}`;
  const kapookSearchUrl = `https://cooking.kapook.com/search?q=${cleanQuery}`;

  const hasValidCustomUrl = isSafeHttpUrl(recipe.external_recipe_url);
  const primaryUrl = hasValidCustomUrl ? recipe.external_recipe_url!.trim() : wongnaiSearchUrl;
  const primarySourceName =
    recipe.external_source_name?.trim() || inferExternalSourceName(primaryUrl);

  const sources: ExternalRecipeSourceLink[] = [
    {
      name: primarySourceName,
      url: primaryUrl,
    },
  ];

  if (!primaryUrl.includes('wongnai.com')) {
    sources.push({ name: 'Wongnai Cooking', url: wongnaiSearchUrl });
  }
  if (!primaryUrl.includes('krua.co')) {
    sources.push({ name: 'Krua.co', url: kruaSearchUrl });
  }
  if (!primaryUrl.includes('kapook.com')) {
    sources.push({ name: 'Kapook Cooking', url: kapookSearchUrl });
  }

  return {
    primaryUrl,
    primarySourceName,
    sources,
  };
}
