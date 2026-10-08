import 'server-only';
import type { Macros } from '@/lib/domain/nutrition';

export interface FoodHit {
  name: string;
  brand: string | null;
  per100g: Macros;
}

/** Open Food Facts (no API key). Values are per 100 g from a crowd-sourced database: shown as "from database", not lab-verified. */
export async function searchFoods(query: string): Promise<{ hits: FoodHit[]; error?: string }> {
  const q = query.trim();
  if (q.length < 2) return { hits: [] };
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,brands,nutriments`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TrioFit/0.1 (private fitness app)' }, signal: AbortSignal.timeout(7000), next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { products?: { product_name?: string; brands?: string; nutriments?: Record<string, number> }[] };
    const hits: FoodHit[] = [];
    for (const p of json.products ?? []) {
      const n = p.nutriments ?? {};
      const kcal = n['energy-kcal_100g'];
      if (!p.product_name || typeof kcal !== 'number') continue;
      hits.push({ name: p.product_name.slice(0, 100), brand: p.brands?.split(',')[0]?.slice(0, 40) ?? null, per100g: { calories: kcal, proteinG: n['proteins_100g'] ?? 0, carbsG: n['carbohydrates_100g'] ?? 0, fatG: n['fat_100g'] ?? 0, fiberG: n['fiber_100g'] ?? 0 } });
    }
    return { hits: hits.slice(0, 8) };
  } catch {
    return { hits: [], error: 'Food database is unavailable right now. You can still add the food manually.' };
  }
}
