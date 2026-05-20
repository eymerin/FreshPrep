import { NutrientInfo, IngredientNutrition, Recipe } from '../types';

export function parseQtyNumber(quantity: string): number | null {
  const s = quantity.trim();
  // Match mixed number "1 1/4", fraction "1/4", or decimal/integer "2.5"
  const m = s.match(/^(\d+)\s+(\d+)\/(\d+)|^(\d+)\/(\d+)|^(\d+\.?\d*)/);
  if (!m) return null;
  if (m[1] !== undefined) return parseInt(m[1]) + parseInt(m[2]) / parseInt(m[3]);
  if (m[4] !== undefined) return parseInt(m[4]) / parseInt(m[5]);
  if (m[6] !== undefined) return parseFloat(m[6]);
  return null;
}

const WEIGHT_UNIT_GRAMS: Record<string, number> = {
  g: 1, gram: 1, grams: 1,
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
  kg: 1000, kilogram: 1000, kilograms: 1000,
};

// When a quantity string contains a weight unit (e.g. "6 oz", "200g", "0.5 lb"),
// compute grams directly from it instead of using the qty × gramsPerUnit model.
// That model is designed for unit-based quantities ("1 breast", "2 cups") where
// gramsPerUnit encodes the weight of one piece. Multiplying "6 oz" × gramsPerUnit
// would treat 6 as a count of servings rather than an amount in ounces.
export function quantityToGrams(quantity: string, gramsPerUnit: number): number {
  const m = quantity.trim().match(/^([\d.\s/]+)\s*([a-z]+)\s*$/i);
  if (m) {
    const unitGrams = WEIGHT_UNIT_GRAMS[m[2].toLowerCase()];
    if (unitGrams != null) {
      return (parseQtyNumber(m[1]) ?? parseFloat(m[1])) * unitGrams;
    }
  }
  return (parseQtyNumber(quantity) ?? 1) * gramsPerUnit;
}

function ingredientMacros(quantity: string, nutrition: IngredientNutrition): NutrientInfo {
  const grams = quantityToGrams(quantity, nutrition.gramsPerUnit);
  const f = grams / 100;
  return {
    calories: nutrition.per100g.calories * f,
    protein:  nutrition.per100g.protein  * f,
    carbs:    nutrition.per100g.carbs    * f,
    fat:      nutrition.per100g.fat      * f,
  };
}

export function sumNutrients(items: NutrientInfo[]): NutrientInfo {
  return items.reduce(
    (acc, n) => ({ calories: acc.calories + n.calories, protein: acc.protein + n.protein, carbs: acc.carbs + n.carbs, fat: acc.fat + n.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function scaleNutrients(n: NutrientInfo, factor: number): NutrientInfo {
  return { calories: n.calories * factor, protein: n.protein * factor, carbs: n.carbs * factor, fat: n.fat * factor };
}

/**
 * Computes per-serving macros for a recipe at log time.
 * Returns null if no ingredients have nutrition data linked.
 * slotPicks is a resolved single-option map (slotId → optionName) for composed recipes.
 */
export function computeRecipeNutrientsPerServing(
  recipe: Recipe,
  servings: number,
  variantId?: string,
  slotPicks?: Record<string, string>,
): NutrientInfo | null {
  if (servings <= 0) return null;
  const parts: NutrientInfo[] = [];

  if (recipe.type === 'standard') {
    for (const ing of recipe.coreIngredients) {
      if (ing.nutrition) parts.push(ingredientMacros(ing.quantity, ing.nutrition));
    }
    if (variantId) {
      const variant = recipe.variants.find((v) => v.id === variantId);
      if (variant) {
        for (const ing of variant.additionalIngredients) {
          if (ing.nutrition) parts.push(ingredientMacros(ing.quantity, ing.nutrition));
        }
      }
    }
  } else if (recipe.type === 'composed' && slotPicks) {
    for (const slot of recipe.slots ?? []) {
      const picked = slotPicks[slot.id];
      if (!picked) continue;
      const opt = slot.options.find((o) => o.name === picked);
      if (opt?.nutrition) parts.push(ingredientMacros(opt.quantity, opt.nutrition));
    }
  }

  if (parts.length === 0) return null;
  return scaleNutrients(sumNutrients(parts), 1 / servings);
}

/**
 * Counts how many ingredients (core + variant-specific) in a standard recipe have nutrition linked.
 */
export function ingredientNutritionCoverage(recipe: Recipe, variantId?: string): { linked: number; total: number } {
  if (recipe.type !== 'standard') return { linked: 0, total: 0 };
  const allIngs = [
    ...recipe.coreIngredients,
    ...(variantId ? (recipe.variants.find((v) => v.id === variantId)?.additionalIngredients ?? []) : []),
  ];
  return { linked: allIngs.filter((i) => !!i.nutrition).length, total: allIngs.length };
}
