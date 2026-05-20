// Falls back to DEMO_KEY for web/testing — rate-limited but functional (30 req/hr)
const API_KEY = (import.meta.env.VITE_USDA_API_KEY as string) || 'DEMO_KEY';
const BASE = 'https://api.nal.usda.gov/fdc/v1';

// Foundation foods report energy under 2048 (Atwater Specific Factors).
// SR Legacy uses 1008 (generic Energy). Prefer 2048 when present.
const NID = { calories: 1008, caloriesAtwater: 2048, protein: 1003, carbs: 1005, fat: 1004 } as const;


// Words that indicate a derived/processed product rather than the whole food itself.
// Used to penalise descriptions whose primary name begins with a processing category
// word that the user didn't ask for (e.g. "Flour, almond" for query "almonds").
const DERIVED_WORDS = new Set([
  'butter', 'flour', 'oil', 'milk', 'cream', 'juice', 'sauce', 'syrup',
  'paste', 'powder', 'flakes', 'starch', 'vinegar', 'extract', 'spread',
  'broth', 'stock', 'drink', 'beverage', 'mix', 'blend',
]);

function stem(w: string): string {
  return w.replace(/oes$/, 'o').replace(/ies$/, 'y').replace(/ses$/, 's').replace(/s$/, '');
}

// Re-rank USDA results by how well the description matches the user's query.
// USDA descriptions follow "Primary food, qualifier, qualifier, preparation" convention,
// so we give the most credit when the query matches the primary segment (before first comma).
function scoreRelevance(description: string, query: string): number {
  const desc  = description.toLowerCase();
  const q     = query.toLowerCase().trim();
  const qWords  = q.split(/\s+/);
  const qStems  = qWords.map(stem);
  const segments     = desc.split(/,\s*/);
  const primary      = segments[0];
  const primaryWords = primary.split(/\s+/).filter(Boolean);
  const primaryStems = primaryWords.map(stem);
  const normQ       = qStems.join(' ');
  const normPrimary = primaryStems.join(' ');

  let score = 0;
  let primaryMatched = false;

  // ── Primary segment match (strongest signal) ─────────────────
  if (normPrimary === normQ) {
    // Primary IS the query — e.g. "Oats" for "oats", "Milk, whole" for "milk"
    score += 2000;
    primaryMatched = true;
  } else if (normPrimary.startsWith(normQ)) {
    // Primary starts with query — e.g. "Oat milk" for "oats"
    const extra = primaryWords.length - qWords.length;
    let bonus = 1600 - extra * 250;
    // If the extra words are derived-product words the user didn't ask for, penalise harder
    if (primaryWords.some(w => DERIVED_WORDS.has(w) && !qWords.includes(w))) bonus -= 700;
    score += Math.max(bonus, 0);
    primaryMatched = true;
  } else if (primaryStems[0] === qStems[0]) {
    // First word of primary matches first word of query — e.g. "Chicken, breast" for "chicken breast"
    const extra = primaryWords.length - 1;
    score += Math.max(1200 - extra * 250, 0);
    primaryMatched = true;
  }

  // ── Query words found in primary but primary didn't directly match ──
  // Handles USDA categorical naming: "Nuts, almonds" for "almonds", "Rice, brown" for "brown rice"
  if (!primaryMatched) {
    const hits = qStems.filter(qs => primaryStems.includes(qs));
    if (hits.length > 0) {
      score += Math.round(400 * (hits.length / primaryStems.length));
    }
    // Penalise when the primary name is itself a derived-food category the user didn't ask for
    if (DERIVED_WORDS.has(primaryWords[0]) && !qWords.includes(primaryWords[0])) {
      score -= 500;
    }
  }

  // ── Non-primary segment scoring (position-weighted) ───────────
  // Segments after the first comma carry less signal the further they appear.
  // A segment that IS the query word (exact standalone) scores highest.
  const POS_WEIGHTS = [0, 1000, 400, 120, 40];
  for (const qStem of qStems) {
    for (let i = 1; i < segments.length; i++) {
      const seg      = segments[i].trim();
      const segStems = seg.split(/\s+/).map(stem).filter(Boolean);
      const w        = POS_WEIGHTS[Math.min(i, POS_WEIGHTS.length - 1)];

      if (segStems.length === 1 && segStems[0] === qStem) {
        score += w; // exact standalone segment — "almonds" segment for query "almonds"
        break;
      } else if (segStems.includes(qStem)) {
        // Query word inside a multi-word segment — penalise extra non-query words
        const extra = segStems.filter(ss => !qStems.includes(ss)).length;
        score += Math.round(w * 0.5) - extra * 25;
        break;
      }
    }
  }

  // ── Length penalty — shorter descriptions tend to be less processed ──
  score -= desc.split(/\s+/).length * 8;

  return score;
}

export const GRAMS_PER_OZ = 28.3495;

export function gramsToOz(g: number): string {
  const oz = g / GRAMS_PER_OZ;
  return oz < 1 ? `${oz.toFixed(2)} oz` : `${oz.toFixed(1)} oz`;
}

export function gramsToMetric(g: number): string {
  return `${Math.round(g)}g`;
}

export function gramsToDisplay(g: number, unit: 'metric' | 'imperial'): string {
  return unit === 'metric' ? gramsToMetric(g) : gramsToOz(g);
}

export interface UsdaFood {
  fdcId: number;
  description: string;
  dataType: string;
  foodCategory?: string;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
}

// Standard water-density fallbacks for volume units.
// Used only when USDA food-specific portion data is unavailable for that unit.
export const FALLBACK_VOLUME_GRAMS: Record<string, number> = {
  tsp:  4.93,
  tbsp: 14.79,
  cup:  236.6,
};

export interface UsdaPortion {
  label: string;
  gramWeight: number;
  amount: number;
  unitName?: string; // raw API unit for deriving food-specific volume conversions
}

function extractNutrients(raw: { nutrientId?: number; value?: number }[]) {
  const map: Record<number, number> = {};
  for (const n of raw) {
    if (n.nutrientId != null && n.value != null) map[n.nutrientId] = n.value;
  }
  return {
    calories: Math.max(0, map[NID.caloriesAtwater] ?? map[NID.calories] ?? 0),
    protein:  Math.max(0, map[NID.protein]  ?? 0),
    carbs:    Math.max(0, map[NID.carbs]    ?? 0),
    fat:      Math.max(0, map[NID.fat]      ?? 0),
  };
}

export async function searchFoods(query: string, signal?: AbortSignal): Promise<UsdaFood[]> {
  const params = new URLSearchParams({ query, api_key: API_KEY, pageSize: '50' });
  params.append('dataType', 'Foundation');
  params.append('dataType', 'SR Legacy');
  const res = await fetch(`${BASE}/foods/search?${params}`, { signal });
  if (!res.ok) throw new Error(`USDA search error ${res.status}`);
  const data = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const foods: UsdaFood[] = (data.foods ?? []).map((f: any): UsdaFood => ({
    fdcId: f.fdcId,
    description: f.description,
    dataType: f.dataType,
    foodCategory: f.foodCategory || undefined,
    per100g: extractNutrients(f.foodNutrients ?? []),
  }));

  // Re-rank by query relevance, then Foundation before SR Legacy as tiebreaker
  foods.sort((a, b) => {
    const aScore = scoreRelevance(a.description, query) + (a.dataType === 'Foundation' ? 10 : 0);
    const bScore = scoreRelevance(b.description, query) + (b.dataType === 'Foundation' ? 10 : 0);
    return bScore - aScore;
  });

  return foods.slice(0, 15);
}

export async function getFoodPortions(fdcId: number, signal?: AbortSignal): Promise<UsdaPortion[]> {
  const params = new URLSearchParams({ api_key: API_KEY });
  const res = await fetch(`${BASE}/food/${fdcId}?${params}`, { signal });
  if (!res.ok) throw new Error(`USDA food error ${res.status}`);
  const data = await res.json();

  const portions: UsdaPortion[] = [];

  // Foundation / SR Legacy: rich foodPortions array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of data.foodPortions ?? []) {
    if (!p.gramWeight || !p.amount) continue;
    const unit = p.measureUnit?.name ?? '';
    const mod  = p.modifier && p.modifier !== unit ? `, ${p.modifier}` : '';
    const label = unit.toUpperCase() === 'RACC'
      ? `1 serving${mod}`
      : `${p.amount} ${unit}${mod}`.trim();
    portions.push({ label, gramWeight: p.gramWeight, amount: p.amount, unitName: unit });
  }

  // Branded: single serving size from the top-level fields
  if (portions.length === 0 && data.servingSize && data.servingSizeUnit) {
    const label = data.householdServingFullText
      ? `${data.householdServingFullText} (${data.servingSize}${data.servingSizeUnit})`
      : `${data.servingSize} ${data.servingSizeUnit}`;
    portions.push({ label, gramWeight: data.servingSize, amount: 1 });
  }

  // 3.5 oz / 100g reference — useful baseline
  portions.push({ label: '3.5 oz (100g)', gramWeight: 100, amount: 100 });

  return portions;
}
