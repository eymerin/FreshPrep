import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../store';
import { Recipe, IngredientNutrition, NutrientInfo } from '../types';
import { CATEGORY_ORDER } from '../utils/categorize';
import { searchFoods, getFoodPortions, UsdaFood, UsdaPortion, gramsToDisplay, GRAMS_PER_OZ, FALLBACK_VOLUME_GRAMS } from '../utils/usda';
import { quantityToGrams, sumNutrients, scaleNutrients, ingredientNutritionCoverage } from '../utils/nutrition';

interface IngredientSuggestion { name: string; quantity: string; category?: string; nutrition?: IngredientNutrition; }

function useIngredientSuggestions(): IngredientSuggestion[] {
  const recipes = useAppStore((s) => s.recipes);
  return useMemo(() => {
    const seen = new Map<string, IngredientSuggestion>();
    for (const recipe of recipes) {
      for (const ing of recipe.coreIngredients) {
        const k = ing.name.toLowerCase();
        if (!seen.has(k)) seen.set(k, { name: ing.name, quantity: ing.quantity, category: ing.category, nutrition: ing.nutrition });
      }
      for (const v of recipe.variants) {
        for (const ing of v.additionalIngredients) {
          const k = ing.name.toLowerCase();
          if (!seen.has(k)) seen.set(k, { name: ing.name, quantity: ing.quantity, category: ing.category, nutrition: ing.nutrition });
        }
      }
      for (const slot of recipe.slots || []) {
        for (const opt of slot.options) {
          const k = opt.name.toLowerCase();
          if (!seen.has(k)) seen.set(k, { name: opt.name, quantity: opt.quantity, category: opt.category, nutrition: opt.nutrition });
        }
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [recipes]);
}

// ── Recipe tags ───────────────────────────────────────────────

const PRESET_TAGS = [
  'breakfast', 'lunch', 'dinner', 'snack',
  'low carb', 'high protein', 'vegetarian', 'vegan',
  'quick', 'batch cook', 'freezer friendly',
  'soup', 'salad', 'bowl', 'wrap',
] as const;

function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  const q = query.toLowerCase().trim();
  if (!q) return recipes;
  return recipes.filter(r => {
    if (r.name.toLowerCase().includes(q)) return true;
    if (r.description.toLowerCase().includes(q)) return true;
    if (r.tags?.some(t => t.toLowerCase().includes(q))) return true;
    if (r.coreIngredients.some(i => i.name.toLowerCase().includes(q))) return true;
    if (r.variants.some(v => v.additionalIngredients.some(i => i.name.toLowerCase().includes(q)))) return true;
    if (r.slots?.some(s => s.options.some(o => o.name.toLowerCase().includes(q)))) return true;
    return false;
  });
}

// ── Ingredient quantity units ─────────────────────────────────

const QTY_UNITS = ['each', 'g', 'oz', 'lb', 'tsp', 'tbsp', 'cup', 'ml'] as const;
type QtyUnit = typeof QTY_UNITS[number];
const QTY_UNIT_LABELS: Record<QtyUnit, string> = {
  each: 'each', g: 'g', oz: 'oz', lb: 'lb', tsp: 'tsp', tbsp: 'tbsp', cup: 'cup', ml: 'ml',
};
function fmtQtyString(amount: string, unit: QtyUnit): string {
  const n = parseFloat(amount);
  if (!amount || isNaN(n) || n === 0) return '';
  return unit === 'each' ? amount : `${amount} ${unit}`;
}
function parseQtyInput(qty: string): [string, QtyUnit] {
  const m = qty.trim().match(/^([\d./\s]+)\s*([a-z]+)?$/i);
  if (!m) return [qty, 'each'];
  const raw = (m[2] ?? '').toLowerCase() as QtyUnit;
  return [m[1].trim(), (QTY_UNITS as readonly string[]).includes(raw) ? raw : 'each'];
}

// ── Shared sub-components ─────────────────────────────────────

function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-brand-bg border border-brand-muted/20 rounded-md px-2 py-1.5 text-xs text-brand-muted focus:outline-none focus:border-brand-accent/60 accent-brand-accent w-full"
    >
      <option value="">Auto</option>
      {CATEGORY_ORDER.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
    </select>
  );
}

// ── Macro display ─────────────────────────────────────────────

function MacroChips({ n, label }: { n: NutrientInfo; label?: string }) {
  return (
    <div className="mt-3 pt-3 border-t border-brand-muted/10">
      {label && <p className="text-[11px] text-brand-muted/40 uppercase tracking-wide mb-2">{label}</p>}
      <div className="flex gap-2">
        {[
          { val: Math.round(n.calories), unit: 'cal' },
          { val: Math.round(n.protein),  unit: 'g protein' },
          { val: Math.round(n.carbs),    unit: 'g carbs' },
          { val: Math.round(n.fat),      unit: 'g fat' },
        ].map(({ val, unit }) => (
          <div key={unit} className="flex-1 bg-brand-raised rounded-lg px-2 py-2 text-center">
            <p className="text-sm font-semibold text-brand-muted leading-none">{val}</p>
            <p className="text-[10px] text-brand-muted/40 mt-1 leading-tight">{unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Manual nutrition entry form ───────────────────────────────

function ManualNutritionForm({
  ingredientName,
  existing,
  onSave,
}: {
  ingredientName: string;
  existing?: IngredientNutrition;
  onSave: (n: IngredientNutrition) => void;
}) {
  const [label,       setLabel]       = useState(existing?.foodDescription ?? ingredientName);
  const [servingAmt,  setServingAmt]  = useState(existing ? String(
    existing.portionLabel.match(/^[\d.]+/) ? existing.portionLabel.match(/^[\d.]+/)![0] : '100'
  ) : '100');
  const [servingUnit, setServingUnit] = useState<'g' | 'oz'>(
    existing?.portionLabel.includes('oz') ? 'oz' : 'g'
  );
  const gps = existing?.gramsPerUnit ?? 100;
  const initCal  = existing ? Math.round(existing.per100g.calories * gps / 100) : 0;
  const initPro  = existing ? Math.round(existing.per100g.protein  * gps / 100) : 0;
  const initCarb = existing ? Math.round(existing.per100g.carbs    * gps / 100) : 0;
  const initFat  = existing ? Math.round(existing.per100g.fat      * gps / 100) : 0;
  const [calories, setCalories] = useState(initCal  > 0 ? String(initCal)  : '');
  const [protein,  setProtein]  = useState(initPro  > 0 ? String(initPro)  : '');
  const [carbs,    setCarbs]    = useState(initCarb > 0 ? String(initCarb) : '');
  const [fat,      setFat]      = useState(initFat  > 0 ? String(initFat)  : '');

  const servingGrams = servingUnit === 'g'
    ? parseFloat(servingAmt) || 0
    : (parseFloat(servingAmt) || 0) * GRAMS_PER_OZ;

  const canSave = servingGrams > 0 && calories !== '';

  function handleSave() {
    if (!canSave) return;
    const cal  = parseFloat(calories) || 0;
    const pro  = parseFloat(protein)  || 0;
    const carb = parseFloat(carbs)    || 0;
    const f    = parseFloat(fat)      || 0;
    const toP100 = (v: number) => servingGrams > 0 ? (v / servingGrams) * 100 : 0;
    onSave({
      fdcId: 0,
      foodDescription: label.trim() || ingredientName,
      source: 'manual',
      per100g: { calories: toP100(cal), protein: toP100(pro), carbs: toP100(carb), fat: toP100(f) },
      gramsPerUnit: servingGrams,
      portionLabel: `${servingAmt} ${servingUnit}`,
    });
  }

  const inputCls = 'w-full bg-brand-bg border border-brand-muted/20 rounded-lg px-2 py-1.5 text-sm text-brand-muted text-center focus:outline-none focus:border-brand-accent/60 placeholder:text-brand-muted/30';

  return (
    <div className="space-y-3.5">
      <div>
        <p className="text-[11px] text-brand-muted/40 uppercase tracking-wide mb-1">Brand or item name</p>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder={ingredientName}
          className="w-full bg-brand-bg border border-brand-muted/20 rounded-lg px-3 py-2 text-sm text-brand-muted placeholder:text-brand-muted/30 focus:outline-none focus:border-brand-accent/60" />
      </div>

      <div>
        <p className="text-[11px] text-brand-muted/40 uppercase tracking-wide mb-1">Serving size (from nutrition label)</p>
        <div className="flex gap-2">
          <input value={servingAmt} onChange={e => setServingAmt(e.target.value)}
            type="number" min="0.1" step="0.1" placeholder="100"
            className="flex-1 bg-brand-bg border border-brand-muted/20 rounded-lg px-3 py-2 text-sm text-brand-muted focus:outline-none focus:border-brand-accent/60" />
          <select value={servingUnit} onChange={e => setServingUnit(e.target.value as 'g' | 'oz')}
            className="bg-brand-bg border border-brand-muted/20 rounded-lg px-3 py-2 text-sm text-brand-muted focus:outline-none focus:border-brand-accent/60 accent-brand-accent">
            <option value="g">g</option>
            <option value="oz">oz</option>
          </select>
        </div>
        {servingGrams > 0 && (
          <p className="text-[11px] text-brand-muted/30 mt-1">{Math.round(servingGrams)} g per serving</p>
        )}
      </div>

      <div>
        <p className="text-[11px] text-brand-muted/40 uppercase tracking-wide mb-1.5">Nutrition per serving</p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { label: 'Calories (kcal)', v: calories, set: setCalories },
            { label: 'Protein (g)',     v: protein,  set: setProtein  },
            { label: 'Carbs (g)',       v: carbs,    set: setCarbs    },
            { label: 'Fat (g)',         v: fat,      set: setFat      },
          ] as { label: string; v: string; set: (x: string) => void }[]).map(({ label, v, set }) => (
            <div key={label}>
              <p className="text-[10px] text-brand-muted/40 mb-0.5">{label}</p>
              <input value={v} onChange={e => set(e.target.value)}
                type="number" min="0" step="0.1" placeholder="0" className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={!canSave}
        className="w-full bg-brand-accent text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-30 hover:bg-brand-accent/80 transition-colors">
        Use this nutrition
      </button>
    </div>
  );
}

// ── USDA nutrition modal (bottom sheet) ──────────────────────

type CustomUnit = 'g' | 'oz' | 'tsp' | 'tbsp' | 'cup';

const COMMON_AMOUNTS: Record<CustomUnit, { label: string; value: number }[]> = {
  tsp:  [
    { label: '¼',  value: 0.25 }, { label: '½',  value: 0.5  }, { label: '1',  value: 1   },
    { label: '1½', value: 1.5  }, { label: '2',  value: 2    }, { label: '3',  value: 3   },
  ],
  tbsp: [
    { label: '½',  value: 0.5  }, { label: '1',  value: 1    }, { label: '1½', value: 1.5 },
    { label: '2',  value: 2    }, { label: '3',  value: 3    }, { label: '4',  value: 4   },
  ],
  cup:  [
    { label: '⅛',  value: 0.125 }, { label: '¼',  value: 0.25  }, { label: '⅓',  value: 1/3  },
    { label: '½',  value: 0.5   }, { label: '⅔',  value: 2/3   }, { label: '¾',  value: 0.75 },
    { label: '1',  value: 1     }, { label: '1½', value: 1.5   }, { label: '2',  value: 2    },
  ],
  oz:   [
    { label: '½',  value: 0.5 }, { label: '1',  value: 1 }, { label: '1.5', value: 1.5 },
    { label: '2',  value: 2   }, { label: '3',  value: 3 }, { label: '4',   value: 4   },
    { label: '6',  value: 6   }, { label: '8',  value: 8 },
  ],
  g:    [
    { label: '5',   value: 5   }, { label: '10',  value: 10  }, { label: '15',  value: 15  },
    { label: '25',  value: 25  }, { label: '50',  value: 50  }, { label: '75',  value: 75  },
    { label: '100', value: 100 }, { label: '150', value: 150 }, { label: '200', value: 200 },
  ],
};

// For a composed (build-your-own) recipe, compute the calorie range by picking the
// lowest-cal and highest-cal option from each slot independently.
function composedCalRange(recipe: Recipe): { min: number; max: number } | null {
  if (recipe.type !== 'composed') return null;
  const slots = recipe.slots ?? [];
  if (slots.length === 0) return null;

  let totalMin = 0;
  let totalMax = 0;
  let slotsWithData = 0;

  for (const slot of slots) {
    const cals = slot.options
      .filter(o => o.nutrition)
      .map(o => (quantityToGrams(o.quantity, o.nutrition!.gramsPerUnit) / 100) * o.nutrition!.per100g.calories);
    if (cals.length === 0) continue;
    slotsWithData++;
    totalMin += Math.min(...cals);
    totalMax += Math.max(...cals);
  }

  if (slotsWithData === 0) return null;
  return { min: Math.round(totalMin), max: Math.round(totalMax) };
}

function fmtFraction(val: number): string {
  const fracs: [number, string][] = [
    [0.125, '⅛'], [0.25, '¼'], [1/3, '⅓'], [0.5, '½'],
    [2/3, '⅔'], [0.75, '¾'], [1.5, '1½'],
  ];
  for (const [v, s] of fracs) if (Math.abs(val - v) < 0.005) return s;
  return Number.isInteger(val) ? `${val}` : `${val}`;
}

function foodBadge(dataType: string): { label: string; className: string } | null {
  if (dataType === 'Foundation') return { label: 'Lab tested', className: 'text-amber-400/90' };
  if (dataType === 'SR Legacy')  return { label: 'USDA verified', className: 'text-emerald-400/80' };
  return null;
}

function foodSubtitle(food: UsdaFood): string {
  return food.foodCategory ?? '';
}

function UnitToggle() {
  const measurementUnit = useAppStore((s) => s.measurementUnit);
  const setMeasurementUnit = useAppStore((s) => s.setMeasurementUnit);
  return (
    <div className="flex items-center gap-0.5 bg-brand-bg rounded-lg p-0.5 shrink-0">
      <button
        onClick={() => setMeasurementUnit('imperial')}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${measurementUnit === 'imperial' ? 'bg-brand-surface text-brand-muted shadow-sm' : 'text-brand-muted/40 hover:text-brand-muted/60'}`}
      >
        oz
      </button>
      <button
        onClick={() => setMeasurementUnit('metric')}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${measurementUnit === 'metric' ? 'bg-brand-surface text-brand-muted shadow-sm' : 'text-brand-muted/40 hover:text-brand-muted/60'}`}
      >
        g
      </button>
    </div>
  );
}

function NutritionModal({
  ingredientName,
  quantity,
  currentNutrition,
  initialFood,
  onSave,
  onClear,
  onClose,
}: {
  ingredientName: string;
  quantity: string;
  currentNutrition?: IngredientNutrition;
  initialFood?: UsdaFood;
  onSave: (n: IngredientNutrition) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const measurementUnit    = useAppStore((s) => s.measurementUnit);
  const ingredientLibrary  = useAppStore((s) => s.ingredientLibrary);
  const libraryMatch       = ingredientLibrary[ingredientName.toLowerCase().trim()];

  // Default to manual tab if the existing nutrition was entered manually
  const [nutrMode, setNutrMode] = useState<'usda' | 'manual'>(
    currentNutrition?.source === 'manual' || currentNutrition?.fdcId === 0 ? 'manual' : 'usda'
  );
  const [query, setQuery]               = useState(ingredientName);
  const [results, setResults]           = useState<UsdaFood[]>([]);
  const [searching, setSearching]       = useState(false);
  const [searchErr, setSearchErr]       = useState(false);
  const [selectedFood, setSelectedFood] = useState<UsdaFood | null>(initialFood ?? null);
  const [portions, setPortions]         = useState<UsdaPortion[]>([]);
  const [loadingP, setLoadingP]         = useState(!!initialFood);
  const [customUnit, setCustomUnit]     = useState<CustomUnit>(measurementUnit === 'metric' ? 'g' : 'oz');
  const [customAmount, setCustomAmount] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // If opened with a pre-selected food, load its portions immediately (skip search step)
  useEffect(() => {
    if (!initialFood) return;
    getFoodPortions(initialFood.fdcId)
      .then(setPortions)
      .finally(() => setLoadingP(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Gram-per-unit ratios derived from USDA food-specific portion data
  const volumeGramsPerUnit = useMemo(() => {
    const map: Partial<Record<string, number>> = {};
    for (const p of portions) {
      const u = p.unitName?.toLowerCase();
      if (u && (u === 'cup' || u === 'tbsp' || u === 'tsp') && !map[u]) {
        map[u] = p.gramWeight / p.amount;
      }
    }
    return map;
  }, [portions]);

  function unitToGrams(amount: number, unit: CustomUnit): number {
    if (unit === 'g')  return amount;
    if (unit === 'oz') return amount * GRAMS_PER_OZ;
    const ratio = volumeGramsPerUnit[unit] ?? FALLBACK_VOLUME_GRAMS[unit] ?? 1;
    return amount * ratio;
  }

  function buildPortionLabel(amount: number, unit: CustomUnit, grams: number): string {
    const weightLabel = gramsToDisplay(grams, measurementUnit);
    if (unit === 'g')  return `${amount}g`;
    if (unit === 'oz') return `${amount} oz`;
    return `${fmtFraction(amount)} ${unit} (${weightLabel})`;
  }

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSearching(true);
    setSearchErr(false);
    setResults([]);
    setSelectedFood(null);
    setPortions([]);
    try {
      const foods = await searchFoods(q.trim(), ctrl.signal);
      setResults(foods);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') setSearchErr(true);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => { runSearch(ingredientName); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 450);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  async function selectFood(food: UsdaFood) {
    setSelectedFood(food);
    setLoadingP(true);
    setPortions([]);
    try { setPortions(await getFoodPortions(food.fdcId)); }
    finally { setLoadingP(false); }
  }

  function confirmPortion(portion: UsdaPortion) {
    if (!selectedFood) return;
    const weightLabel = gramsToDisplay(portion.gramWeight, measurementUnit);
    onSave({
      fdcId: selectedFood.fdcId,
      foodDescription: selectedFood.description,
      per100g: selectedFood.per100g,
      gramsPerUnit: portion.gramWeight / portion.amount,
      portionLabel: `${portion.label} (${weightLabel})`,
    });
  }

  function confirmForAmount(amount: number) {
    if (!selectedFood) return;
    const grams = unitToGrams(amount, customUnit);
    onSave({
      fdcId: selectedFood.fdcId,
      foodDescription: selectedFood.description,
      per100g: selectedFood.per100g,
      gramsPerUnit: grams,
      portionLabel: buildPortionLabel(amount, customUnit, grams),
    });
  }

  function confirmCustomAmount() {
    const val = parseFloat(customAmount);
    if (!isNaN(val) && val > 0) confirmForAmount(val);
  }

  const isVolumeUnit = customUnit === 'tsp' || customUnit === 'tbsp' || customUnit === 'cup';
  const usingFallback = isVolumeUnit && !volumeGramsPerUnit[customUnit];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-brand-surface w-full rounded-t-2xl shadow-2xl flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-brand-muted/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 pt-2 border-b border-brand-muted/15 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-brand-muted">
                {selectedFood ? 'Pick a serving size' : 'Add nutrition data'}
              </h3>
              <p className="text-xs text-brand-muted/50 mt-0.5 truncate">
                {selectedFood ? selectedFood.description : `${ingredientName} · ${quantity}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              {nutrMode === 'usda' && !selectedFood && <UnitToggle />}
              <button onClick={onClose} className="text-brand-muted/40 hover:text-brand-muted text-xl leading-none">×</button>
            </div>
          </div>
          {/* Source tabs — only shown on the search step */}
          {!selectedFood && (
            <div className="flex gap-1 mt-3 bg-brand-bg rounded-lg p-0.5">
              {(['usda', 'manual'] as const).map(mode => (
                <button key={mode} onClick={() => setNutrMode(mode)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${nutrMode === mode ? 'bg-brand-surface text-brand-muted shadow-sm' : 'text-brand-muted/40 hover:text-brand-muted/60'}`}>
                  {mode === 'usda' ? 'Search USDA' : 'Enter manually'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Step 1: Manual entry ── */}
          {!selectedFood && nutrMode === 'manual' && (
            <div className="p-5">
              <ManualNutritionForm
                ingredientName={ingredientName}
                existing={currentNutrition?.source === 'manual' || currentNutrition?.fdcId === 0 ? currentNutrition : undefined}
                onSave={(n) => { onSave(n); }}
              />
              {currentNutrition && (
                <button onClick={onClear} className="mt-4 text-xs text-brand-muted/40 hover:text-red-400 transition-colors">
                  Remove nutrition data
                </button>
              )}
            </div>
          )}

          {/* ── Step 1: USDA Search ── */}
          {!selectedFood && nutrMode === 'usda' && (
            <div className="p-5 space-y-4">

              {/* Current link */}
              {currentNutrition && (
                <div className="flex items-center justify-between p-3 bg-emerald-900/20 border border-emerald-700/25 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-emerald-400">Currently linked</p>
                    <p className="text-xs text-brand-muted/70 mt-0.5 truncate">{currentNutrition.foodDescription}</p>
                    <p className="text-[11px] text-brand-muted/40 mt-0.5">
                      {currentNutrition.portionLabel} · {gramsToDisplay(currentNutrition.gramsPerUnit, measurementUnit)} per unit
                    </p>
                  </div>
                  <button onClick={onClear} className="ml-4 text-xs text-brand-muted/40 hover:text-red-400 transition-colors shrink-0">Unlink</button>
                </div>
              )}

              {/* Library match — shown when this ingredient name has been linked before */}
              {libraryMatch && (
                <button
                  onClick={() => selectFood({
                    fdcId: libraryMatch.fdcId,
                    description: libraryMatch.foodDescription,
                    dataType: 'Foundation',
                    per100g: libraryMatch.per100g,
                  })}
                  className="w-full text-left px-3 py-3 rounded-lg border border-brand-accent/30 bg-brand-accent/5 hover:bg-brand-accent/10 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-medium text-brand-accent">Saved food</span>
                    <span className="text-[11px] text-brand-muted/40">· matches your library</span>
                  </div>
                  <p className="text-sm text-brand-muted leading-snug">{libraryMatch.foodDescription}</p>
                  <p className="text-[11px] text-brand-muted/40 mt-0.5">{Math.round(libraryMatch.per100g.calories)} cal / 100g — tap to pick a serving size</p>
                </button>
              )}

              {/* Search input */}
              <input
                autoFocus={!libraryMatch}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={libraryMatch ? 'Search for a different food…' : 'Search USDA food database…'}
                className="w-full bg-brand-bg border border-brand-muted/20 rounded-lg px-3 py-2.5 text-sm text-brand-muted placeholder:text-brand-muted/30 focus:outline-none focus:border-brand-accent/60"
              />

              {searching && <p className="text-sm text-brand-muted/40">Searching…</p>}
              {searchErr  && <p className="text-sm text-red-400/70">Search failed — check your connection.</p>}

              {/* Results */}
              {!searching && results.length > 0 && (
                <div className="space-y-1">
                  {results.map((food) => {
                    const badge = foodBadge(food.dataType);
                    return (
                      <button key={food.fdcId} onClick={() => selectFood(food)}
                        className="w-full text-left px-3 py-3 rounded-lg hover:bg-brand-accent/10 transition-colors border border-transparent hover:border-brand-accent/20">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-brand-muted leading-snug flex-1">{food.description}</p>
                          {badge && (
                            <span className={`text-[11px] font-medium shrink-0 mt-0.5 ${badge.className}`}>{badge.label}</span>
                          )}
                        </div>
                        <p className="text-xs text-brand-muted/40 mt-0.5">
                          {Math.round(food.per100g.calories)} cal / {gramsToDisplay(100, measurementUnit)}
                          {foodSubtitle(food) && <span> · {foodSubtitle(food)}</span>}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {!searching && results.length === 0 && !searchErr && query.trim().length >= 2 && (
                <div className="space-y-2">
                  <p className="text-sm text-brand-muted/50">No verified results for "{query}".</p>
                  <p className="text-xs text-brand-muted/30">Try a more general term — e.g. "tomato" instead of "cherry tomatoes", or "chicken" instead of a brand name.</p>
                  <button onClick={() => setNutrMode('manual')}
                    className="text-xs text-brand-accent hover:text-brand-accent/80 transition-colors mt-1">
                    Enter nutrition manually instead
                  </button>
                </div>
              )}
              {!searching && results.length > 0 && (
                <p className="text-[11px] text-brand-muted/25 text-center pt-1">
                  Not what you're looking for?{' '}
                  <button onClick={() => setNutrMode('manual')} className="text-brand-accent/70 hover:text-brand-accent transition-colors">
                    Enter manually
                  </button>
                </p>
              )}
            </div>
          )}

          {/* ── Step 2: Portion picker ── */}
          {selectedFood && (
            <div className="p-5 space-y-4">

              {/* Back */}
              <button onClick={() => { setSelectedFood(null); setPortions([]); }}
                className="text-sm text-brand-accent hover:text-brand-accent/80 transition-colors">
                ← Search results
              </button>

              {/* Ingredient context */}
              <div className="bg-brand-bg rounded-lg px-4 py-3">
                <p className="text-xs text-brand-muted/50 mb-0.5">Your ingredient</p>
                <p className="text-sm font-semibold text-brand-muted">{quantity} {ingredientName}</p>
                <p className="text-xs text-brand-muted/40 mt-1">Pick the option below that best matches this amount.</p>
              </div>

              {/* Portions list */}
              {loadingP && <p className="text-sm text-brand-muted/40">Loading serving sizes…</p>}
              {!loadingP && portions.length > 0 && (
                <div className="space-y-2">
                  {portions.map((p, i) => (
                    <button key={i} onClick={() => confirmPortion(p)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-brand-muted/15 hover:border-brand-accent hover:bg-brand-accent/10 transition-colors">
                      <span className="text-sm text-brand-muted">{p.label}</span>
                      <span className="text-sm text-brand-muted/50 ml-3 shrink-0">{gramsToDisplay(p.gramWeight, measurementUnit)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Custom amount entry */}
              <div className="pt-2 border-t border-brand-muted/10 space-y-3">
                <p className="text-xs text-brand-muted/40">None of these match? Set your own amount:</p>

                {/* Unit selector */}
                <div className="flex gap-1">
                  {(['g', 'oz', 'tsp', 'tbsp', 'cup'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => { setCustomUnit(u); setCustomAmount(''); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        customUnit === u
                          ? 'bg-brand-accent text-white'
                          : 'bg-brand-bg text-brand-muted/50 hover:text-brand-muted'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>

                {/* Common amounts — tap to confirm directly */}
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_AMOUNTS[customUnit].map(({ label, value }) => (
                    <button
                      key={label}
                      onClick={() => confirmForAmount(value)}
                      className="px-3 py-1.5 bg-brand-bg rounded-lg text-xs text-brand-muted hover:bg-brand-accent/20 hover:text-brand-muted transition-colors"
                    >
                      {label} {customUnit}
                    </button>
                  ))}
                </div>

                {/* Free-text fallback */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-brand-muted/50 shrink-0">Or type:</span>
                  <input
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmCustomAmount()}
                    type="number"
                    min="0.01"
                    step={customUnit === 'g' ? '1' : '0.25'}
                    placeholder="0"
                    className="w-20 bg-brand-bg border border-brand-muted/20 rounded-lg px-3 py-2 text-sm text-brand-muted placeholder:text-brand-muted/30 focus:outline-none focus:border-brand-accent/60 text-center"
                  />
                  <span className="text-sm text-brand-muted/50 shrink-0">{customUnit}</span>
                  <button
                    onClick={confirmCustomAmount}
                    disabled={!customAmount || parseFloat(customAmount) <= 0}
                    className="ml-auto text-sm text-brand-accent font-medium disabled:opacity-30 shrink-0 px-3 py-2 bg-brand-accent/10 rounded-lg disabled:bg-transparent transition-colors"
                  >
                    Use this
                  </button>
                </div>

                {usingFallback && (
                  <p className="text-[11px] text-brand-muted/30">
                    Volume estimated using water density — USDA has no {customUnit} portion for this food.
                  </p>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ingredient row with optional nutrition linking ────────────

function IngredientRow({ name, quantity, category, nutrition, onDelete, onSetNutrition }: {
  name: string;
  quantity: string;
  category?: string;
  nutrition?: IngredientNutrition;
  onDelete: () => void;
  onSetNutrition?: (n: IngredientNutrition | undefined) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [portionOnly, setPortionOnly] = useState(false);

  const grams = nutrition ? quantityToGrams(quantity, nutrition.gramsPerUnit) : 0;
  const f     = grams / 100;
  const cal     = nutrition ? Math.round(nutrition.per100g.calories * f) : null;
  const protein = nutrition ? Math.round(nutrition.per100g.protein  * f) : null;
  const carbs   = nutrition ? Math.round(nutrition.per100g.carbs    * f) : null;
  const fat     = nutrition ? Math.round(nutrition.per100g.fat      * f) : null;

  function handleRowTap() {
    if (nutrition) {
      setExpanded(e => !e); // linked → toggle overview panel
    } else if (onSetNutrition) {
      setModalOpen(true);   // unlinked → open link modal
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 py-2">
        {onSetNutrition ? (
          <button onClick={handleRowTap} className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <span className="text-sm text-brand-muted">{name}</span>
                {category && <span className="text-xs text-brand-muted/40 bg-brand-bg px-1.5 py-0.5 rounded">{category}</span>}
              </div>
              <span className="text-xs text-brand-muted/50 shrink-0">{quantity}</span>
              {!nutrition && (
                <span className="text-[11px] text-brand-accent/70 bg-brand-accent/10 border border-brand-accent/20 px-2 py-0.5 rounded-full shrink-0 font-medium">
                  + Nutrition
                </span>
              )}
              {nutrition && cal !== null && (
                <span className="text-[11px] text-emerald-400 font-medium shrink-0">{cal} cal</span>
              )}
            </div>
            {nutrition && (
              <p className="text-[11px] text-emerald-400/70 mt-0.5 truncate">
                ● {nutrition.foodDescription}
              </p>
            )}
          </button>
        ) : (
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className="text-sm text-brand-muted">{name}</span>
              {category && <span className="text-xs text-brand-muted/40 bg-brand-bg px-1.5 py-0.5 rounded">{category}</span>}
            </div>
            <span className="text-xs text-brand-muted/50 shrink-0">{quantity}</span>
          </div>
        )}
        <button onClick={onDelete} className="text-brand-muted/30 hover:text-red-400 transition-colors text-lg leading-none shrink-0">×</button>
      </div>

      {/* Nutrition overview panel — shown when ingredient is tapped and nutrition is linked */}
      {expanded && nutrition && (
        <div className="mb-2 px-3 py-2.5 bg-brand-bg rounded-lg border border-brand-muted/15 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-brand-muted/50 truncate">{nutrition.portionLabel}</p>
            {onSetNutrition && (
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => { setExpanded(false); setPortionOnly(true); setModalOpen(true); }}
                  className="text-[11px] text-brand-accent"
                >
                  Edit serving
                </button>
                <button
                  onClick={() => { setExpanded(false); setPortionOnly(false); setModalOpen(true); }}
                  className="text-[11px] text-brand-muted/40 hover:text-brand-muted/70"
                >
                  Change food
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {([
              { val: cal,     label: 'cal' },
              { val: protein, label: 'g protein' },
              { val: carbs,   label: 'g carbs' },
              { val: fat,     label: 'g fat' },
            ] as { val: number | null; label: string }[]).map(({ val, label }) => (
              <div key={label} className="flex-1 bg-brand-raised rounded-lg px-2 py-1.5 text-center">
                <p className="text-xs font-semibold text-brand-muted leading-none">{val ?? '—'}</p>
                <p className="text-[10px] text-brand-muted/40 mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalOpen && onSetNutrition && (
        <NutritionModal
          ingredientName={name}
          quantity={quantity}
          currentNutrition={nutrition}
          initialFood={portionOnly && nutrition ? {
            fdcId: nutrition.fdcId,
            description: nutrition.foodDescription,
            dataType: 'Foundation',
            per100g: nutrition.per100g,
          } : undefined}
          onSave={(n) => { onSetNutrition(n); setModalOpen(false); setPortionOnly(false); }}
          onClear={() => { onSetNutrition(undefined); setModalOpen(false); setPortionOnly(false); }}
          onClose={() => { setModalOpen(false); setPortionOnly(false); }}
        />
      )}
    </>
  );
}

function AddIngredientForm({ onAdd }: {
  onAdd: (name: string, quantity: string, category?: string, nutrition?: IngredientNutrition) => void;
}) {
  const [open, setOpen]           = useState(false);
  const [name, setName]           = useState('');
  const [qtyAmount, setQtyAmount] = useState('');
  const [qtyUnit, setQtyUnit]     = useState<QtyUnit>('oz');
  const [category, setCategory]   = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const [nutrSource, setNutrSource]       = useState<'usda' | 'manual'>('usda');
  const [usdaResults, setUsdaResults]     = useState<UsdaFood[]>([]);
  const [usdaSearching, setUsdaSearching] = useState(false);
  const [pendingNutrition, setPendingNutrition] = useState<IngredientNutrition | undefined>();
  const [selectedFood, setSelectedFood]   = useState<UsdaFood | null>(null);
  const [inlinePortions, setInlinePortions] = useState<UsdaPortion[]>([]);
  const [loadingPortions, setLoadingPortions] = useState(false);
  const [customUnit, setCustomUnit]       = useState<CustomUnit>('oz');
  const [customAmount, setCustomAmount]   = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [fromSuggestion, setFromSuggestion]     = useState(false);

  const measurementUnit   = useAppStore((s) => s.measurementUnit);
  const ingredientLibrary = useAppStore((s) => s.ingredientLibrary);
  const inputRef   = useRef<HTMLInputElement>(null);
  const usdaAbort  = useRef<AbortController | null>(null);
  const allSuggestions = useIngredientSuggestions();

  // Load portions whenever a food is selected from the inline list
  useEffect(() => {
    if (!selectedFood) { setInlinePortions([]); setCustomAmount(''); return; }
    setLoadingPortions(true);
    getFoodPortions(selectedFood.fdcId)
      .then(setInlinePortions)
      .finally(() => setLoadingPortions(false));
  }, [selectedFood]);

  // Food-specific gram-per-volume-unit derived from USDA portion data
  const inlineVolumeGramsPerUnit = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of inlinePortions) {
      const u = p.unitName?.toLowerCase();
      if (u && (u === 'cup' || u === 'tbsp' || u === 'tsp') && !map[u]) {
        map[u] = p.gramWeight / p.amount;
      }
    }
    return map;
  }, [inlinePortions]);

  function inlineUnitToGrams(amount: number, unit: CustomUnit): number {
    if (unit === 'g')  return amount;
    if (unit === 'oz') return amount * GRAMS_PER_OZ;
    return amount * (inlineVolumeGramsPerUnit[unit] ?? FALLBACK_VOLUME_GRAMS[unit] ?? 1);
  }

  function confirmInlineCustom(amount: number) {
    if (!selectedFood) return;
    const grams = inlineUnitToGrams(amount, customUnit);
    const weightLabel = gramsToDisplay(grams, measurementUnit);
    const label = customUnit === 'g' ? `${amount}g`
      : customUnit === 'oz' ? `${amount} oz`
      : `${fmtFraction(amount)} ${customUnit} (${weightLabel})`;
    setPendingNutrition({
      fdcId: selectedFood.fdcId,
      foodDescription: selectedFood.description,
      per100g: selectedFood.per100g,
      gramsPerUnit: grams,
      portionLabel: label,
    });
    setSelectedFood(null);
  }

  const filtered = name.trim().length >= 1
    ? allSuggestions.filter((s) => s.name.toLowerCase().includes(name.toLowerCase())).slice(0, 6)
    : [];

  // Auto-search USDA as the ingredient name changes
  useEffect(() => {
    if (name.trim().length < 3) { setUsdaResults([]); return; }
    const t = setTimeout(async () => {
      usdaAbort.current?.abort();
      const ctrl = new AbortController();
      usdaAbort.current = ctrl;
      setUsdaSearching(true);
      try {
        const foods = await searchFoods(name.trim(), ctrl.signal);
        setUsdaResults(foods);
      } catch (e) {
        if (!(e instanceof Error && e.name === 'AbortError')) setUsdaResults([]);
      } finally {
        setUsdaSearching(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [name]);

  function updateRect() {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    // Subtract visualViewport.offsetTop so the dropdown stays anchored
    // to the input when the iOS soft keyboard shifts the visual viewport.
    const vvOffset = window.visualViewport?.offsetTop ?? 0;
    setDropdownRect({ top: r.bottom - vvOffset + 4, left: r.left, width: r.width });
  }

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !showSuggestions) return;
    const handler = () => {
      if (!inputRef.current) return;
      const r = inputRef.current.getBoundingClientRect();
      setDropdownRect({ top: r.bottom - vv.offsetTop + 4, left: r.left, width: r.width });
    };
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => { vv.removeEventListener('resize', handler); vv.removeEventListener('scroll', handler); };
  }, [showSuggestions]);

  function pickSuggestion(s: IngredientSuggestion) {
    setName(s.name);
    const [amt, unit] = parseQtyInput(s.quantity);
    setQtyAmount(amt);
    setQtyUnit(unit);
    setCategory(s.category || '');
    if (s.nutrition) setPendingNutrition(s.nutrition);
    setFromSuggestion(true);
    setDuplicateWarning(false);
    setShowSuggestions(false);
  }

  function confirmInlinePortion(portion: UsdaPortion) {
    if (!selectedFood) return;
    const weightLabel = gramsToDisplay(portion.gramWeight, measurementUnit);
    setPendingNutrition({
      fdcId: selectedFood.fdcId,
      foodDescription: selectedFood.description,
      per100g: selectedFood.per100g,
      gramsPerUnit: portion.gramWeight / portion.amount,
      portionLabel: `${portion.label} (${weightLabel})`,
    });
    setSelectedFood(null);
  }

  function reset() {
    setName(''); setQtyAmount(''); setQtyUnit('oz'); setCategory('');
    setPendingNutrition(undefined); setUsdaResults([]);
    setSelectedFood(null); setFromSuggestion(false);
    setDuplicateWarning(false); setNutrSource('usda');
    setOpen(false); setShowSuggestions(false);
  }

  function submit() {
    if (!name.trim()) return;
    const norm = name.trim().toLowerCase();
    const isDuplicate = allSuggestions.some(s => s.name.toLowerCase() === norm);
    if (isDuplicate && !fromSuggestion) {
      setDuplicateWarning(true);
      return;
    }
    const qty = fmtQtyString(qtyAmount, qtyUnit);
    onAdd(name.trim(), qty, category || undefined, pendingNutrition);
    reset();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-brand-warm/80 hover:text-brand-warm transition-colors mt-1">
        + Add ingredient
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Name row */}
      <div className="relative">
        <input
          ref={inputRef}
          autoFocus
          value={name}
          onChange={(e) => { setName(e.target.value); setShowSuggestions(true); updateRect(); setFromSuggestion(false); setDuplicateWarning(false); }}
          onFocus={() => { setShowSuggestions(true); updateRect(); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setShowSuggestions(false); }}
          placeholder="Ingredient name"
          className="w-full bg-brand-bg border border-brand-muted/20 rounded-md px-2 py-1.5 text-sm text-brand-muted placeholder:text-brand-muted/30 focus:outline-none focus:border-brand-accent/60"
        />
        {showSuggestions && filtered.length > 0 && dropdownRect && (
          <div
            style={{ position: 'fixed', top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width }}
            className="bg-brand-surface border border-brand-muted/20 rounded-lg shadow-2xl z-50 overflow-hidden"
          >
            {filtered.map((s) => (
              <button
                key={s.name}
                onMouseDown={() => pickSuggestion(s)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-brand-accent/10 transition-colors"
              >
                <span className="text-sm text-brand-muted">{s.name}</span>
                <span className="text-xs text-brand-muted/40 ml-2 shrink-0">{s.quantity}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quantity row: number + unit dropdown */}
      <div className="flex gap-2 items-center">
        <input
          value={qtyAmount}
          onChange={(e) => setQtyAmount(e.target.value)}
          type="number" min="0" step="0.25" placeholder="Qty"
          className="w-20 bg-brand-bg border border-brand-muted/20 rounded-md px-2 py-1.5 text-sm text-brand-muted placeholder:text-brand-muted/30 focus:outline-none focus:border-brand-accent/60"
        />
        <select
          value={qtyUnit}
          onChange={(e) => setQtyUnit(e.target.value as QtyUnit)}
          className="bg-brand-bg border border-brand-muted/20 rounded-md px-2 py-1.5 text-sm text-brand-muted focus:outline-none focus:border-brand-accent/60 accent-brand-accent"
        >
          {QTY_UNITS.map(u => (
            <option key={u} value={u}>{QTY_UNIT_LABELS[u]}</option>
          ))}
        </select>
        <div className="flex-1">
          <CategorySelect value={category} onChange={setCategory} />
        </div>
        <button onClick={submit} className="text-brand-warm font-medium text-sm px-2">Add</button>
        <button onClick={reset} className="text-brand-muted/40 text-sm">✕</button>
      </div>

      {/* ── Duplicate name warning ── */}
      {duplicateWarning && (
        <div className="rounded-lg border border-brand-warm/30 bg-brand-warm/10 px-3 py-2.5 space-y-2">
          <p className="text-xs text-brand-muted/80">
            <span className="font-medium text-brand-warm">"{name.trim()}"</span> already exists in your ingredients.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const match = allSuggestions.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
                if (match) pickSuggestion(match);
                setDuplicateWarning(false);
              }}
              className="flex-1 text-xs py-1.5 bg-brand-accent text-white rounded-lg font-medium"
            >
              Use existing
            </button>
            <button
              onClick={() => { setName(''); setDuplicateWarning(false); inputRef.current?.focus(); }}
              className="flex-1 text-xs py-1.5 border border-brand-muted/20 text-brand-muted/60 rounded-lg"
            >
              Rename mine
            </button>
          </div>
        </div>
      )}

      {/* ── Nutrition section ── */}
      {!pendingNutrition && !selectedFood && name.trim().length >= 3 && (
        <div className="space-y-1.5 pt-1">
          {/* Source toggle */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-brand-muted/40 uppercase tracking-wide">Nutrition</p>
            <div className="flex gap-0.5 bg-brand-bg rounded-lg p-0.5">
              {(['usda', 'manual'] as const).map(mode => (
                <button key={mode} onClick={() => setNutrSource(mode)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${nutrSource === mode ? 'bg-brand-surface text-brand-muted shadow-sm' : 'text-brand-muted/40 hover:text-brand-muted/60'}`}>
                  {mode === 'usda' ? 'USDA' : 'Manual'}
                </button>
              ))}
            </div>
          </div>

          {/* Manual entry */}
          {nutrSource === 'manual' && (
            <ManualNutritionForm
              ingredientName={name}
              onSave={(n) => { setPendingNutrition(n); setSelectedFood(null); }}
            />
          )}

          {/* USDA search */}
          {nutrSource === 'usda' && (
            <>
              {/* Library match */}
              {(() => {
                const libMatch = ingredientLibrary[name.toLowerCase().trim()];
                if (!libMatch) return null;
                return (
                  <button onClick={() => setSelectedFood({
                    fdcId: libMatch.fdcId,
                    description: libMatch.foodDescription,
                    dataType: 'Foundation',
                    per100g: libMatch.per100g,
                  })}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-brand-accent/30 bg-brand-accent/5 hover:bg-brand-accent/10 transition-colors">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] font-medium text-brand-accent">Previously used</span>
                    </div>
                    <p className="text-xs text-brand-muted leading-snug">{libMatch.foodDescription}</p>
                    <p className="text-[11px] text-brand-muted/40 mt-0.5">{Math.round(libMatch.per100g.calories)} cal / 100g</p>
                  </button>
                );
              })()}

              {usdaSearching && <p className="text-xs text-brand-muted/30">Searching…</p>}
              {!usdaSearching && usdaResults.length === 0 && (
                <p className="text-xs text-brand-muted/25">No verified match found.</p>
              )}
              {usdaResults.slice(0, 4).map((food) => {
                const badge = foodBadge(food.dataType);
                return (
                  <button key={food.fdcId} onClick={() => setSelectedFood(food)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-brand-muted/10 hover:border-brand-accent/40 hover:bg-brand-accent/5 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-brand-muted leading-snug flex-1">{food.description}</p>
                      {badge && <span className={`text-[10px] font-medium shrink-0 mt-0.5 ${badge.className}`}>{badge.label}</span>}
                    </div>
                    <p className="text-[11px] text-brand-muted/40 mt-0.5">{Math.round(food.per100g.calories)} cal / 100g</p>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── Inline portion picker (replaces modal) ── */}
      {selectedFood && !pendingNutrition && (
        <div className="rounded-lg border border-brand-accent/25 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-bg/60 border-b border-brand-muted/10">
            <button onClick={() => setSelectedFood(null)} className="text-brand-accent text-xs shrink-0">← Back</button>
            <p className="text-xs text-brand-muted/70 truncate flex-1">{selectedFood.description}</p>
          </div>
          <div className="px-3 py-2.5 space-y-2">
            {/* USDA portions */}
            {loadingPortions && <p className="text-xs text-brand-muted/30">Loading…</p>}
            {!loadingPortions && inlinePortions.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] text-brand-muted/40">Serving sizes:</p>
                {inlinePortions.map((p, i) => (
                  <button key={i} onClick={() => confirmInlinePortion(p)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-brand-muted/15 hover:border-brand-accent hover:bg-brand-accent/10 transition-colors">
                    <span className="text-xs text-brand-muted">{p.label}</span>
                    <span className="text-xs text-brand-muted/50 shrink-0 ml-2">{gramsToDisplay(p.gramWeight, measurementUnit)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Custom amount — unit selector + common chips + text input */}
            {!loadingPortions && (
              <div className="space-y-2 pt-1 border-t border-brand-muted/10">
                <p className="text-[11px] text-brand-muted/40">Or enter your own:</p>
                <div className="flex gap-1">
                  {(['g', 'oz', 'tsp', 'tbsp', 'cup'] as const).map((u) => (
                    <button key={u} onClick={() => { setCustomUnit(u); setCustomAmount(''); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        customUnit === u ? 'bg-brand-accent text-white' : 'bg-brand-bg text-brand-muted/50 hover:text-brand-muted'
                      }`}>
                      {u}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_AMOUNTS[customUnit].map(({ label, value }) => (
                    <button key={label} onClick={() => confirmInlineCustom(value)}
                      className="px-3 py-1.5 bg-brand-bg rounded-lg text-xs text-brand-muted hover:bg-brand-accent/20 transition-colors">
                      {label} {customUnit}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseFloat(customAmount); if (!isNaN(v) && v > 0) confirmInlineCustom(v); } }}
                    type="number" min="0.01" step={customUnit === 'g' ? '1' : '0.25'} placeholder="0"
                    className="w-20 bg-brand-bg border border-brand-muted/20 rounded-lg px-3 py-2 text-sm text-brand-muted placeholder:text-brand-muted/30 focus:outline-none focus:border-brand-accent/60 text-center"
                  />
                  <span className="text-sm text-brand-muted/50 shrink-0">{customUnit}</span>
                  <button
                    onClick={() => { const v = parseFloat(customAmount); if (!isNaN(v) && v > 0) confirmInlineCustom(v); }}
                    disabled={!customAmount || parseFloat(customAmount) <= 0}
                    className="ml-auto text-sm text-brand-accent font-medium disabled:opacity-30 px-3 py-2 bg-brand-accent/10 rounded-lg disabled:bg-transparent transition-colors">
                    Use this
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Linked nutrition preview */}
      {pendingNutrition && (
        <div className="flex items-center justify-between px-3 py-2 bg-emerald-900/20 border border-emerald-700/25 rounded-lg">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-emerald-400">Nutrition matched</p>
            <p className="text-[11px] text-brand-muted/60 mt-0.5 truncate">{pendingNutrition.foodDescription} · {pendingNutrition.portionLabel}</p>
          </div>
          <button onClick={() => { setPendingNutrition(undefined); setSelectedFood(null); }}
            className="text-[11px] text-brand-muted/40 hover:text-brand-muted ml-3 shrink-0">Change</button>
        </div>
      )}
    </div>
  );
}

// ── Composed recipe: slot manager ─────────────────────────────

function SlotManager({ recipe }: { recipe: Recipe }) {
  const store = useAppStore();
  const liveRecipe = useAppStore((s) => s.recipes.find((r) => r.id === recipe.id))!;
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [newSlotLabel, setNewSlotLabel] = useState('');
  const [editingSlotLabels, setEditingSlotLabels] = useState<Record<string, string>>({});

  function addSlot() {
    if (!newSlotLabel.trim()) return;
    store.addSlot(recipe.id, newSlotLabel.trim());
    setNewSlotLabel('');
  }

  return (
    <div className="bg-brand-surface rounded-lg border border-brand-muted/15 p-4 mb-4">
      <p className="text-xs font-semibold text-brand-muted/50 uppercase tracking-wide mb-3">Component Slots</p>
      <p className="text-xs text-brand-muted/40 mb-4">
        Each slot is a category users pick from when planning (e.g. Protein, Carb, Vegetable).
      </p>

      <div className="space-y-3">
        {(liveRecipe.slots || []).map((slot) => {
          const isExpanded = expandedSlot === slot.id;
          const editLabel = editingSlotLabels[slot.id] ?? slot.label;

          return (
            <div key={slot.id} className="rounded-lg border border-brand-muted/15 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 bg-brand-bg/30">
                <button className="flex-1 text-left" onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}>
                  <span className="text-sm font-medium text-brand-muted">{slot.label}</span>
                  <span className="text-xs text-brand-muted/40 ml-2">{slot.options.length} option{slot.options.length !== 1 ? 's' : ''}</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-brand-muted/30 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  <button onClick={() => store.deleteSlot(recipe.id, slot.id)}
                    className="text-brand-muted/30 hover:text-red-400 transition-colors text-lg leading-none ml-1">×</button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 py-3 border-t border-brand-muted/10 space-y-3">
                  <div>
                    <label className="text-xs text-brand-muted/40 uppercase tracking-wide">Slot label</label>
                    <input
                      value={editLabel}
                      onChange={(e) => setEditingSlotLabels((p) => ({ ...p, [slot.id]: e.target.value }))}
                      onBlur={() => {
                        if (editLabel.trim() && editLabel !== slot.label)
                          store.updateSlotLabel(recipe.id, slot.id, editLabel.trim());
                      }}
                      className="block w-full bg-brand-bg border border-brand-muted/20 rounded-md px-2 py-1.5 text-sm text-brand-muted mt-1 focus:outline-none focus:border-brand-accent/60"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-brand-muted/40 uppercase tracking-wide mb-2">Options</p>
                    {slot.options.length === 0 && <p className="text-xs text-brand-muted/30 mb-1">No options yet.</p>}
                    <div className="divide-y divide-brand-muted/10">
                      {slot.options.map((opt) => (
                        <IngredientRow
                          key={opt.name}
                          name={opt.name}
                          quantity={opt.quantity}
                          category={opt.category}
                          nutrition={opt.nutrition}
                          onSetNutrition={(n) => store.setSlotOptionNutrition(liveRecipe.id, slot.id, opt.name, n)}
                          onDelete={() => store.deleteSlotOption(recipe.id, slot.id, opt.name)}
                        />
                      ))}
                    </div>
                    <AddIngredientForm onAdd={(name, qty, cat, nutrition) => store.addSlotOption(recipe.id, slot.id, name, qty, cat, nutrition)} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2 items-center">
        <input
          value={newSlotLabel}
          onChange={(e) => setNewSlotLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSlot()}
          placeholder="New slot label (e.g. Protein)"
          className="flex-1 bg-brand-bg border border-brand-muted/20 rounded-md px-2 py-1.5 text-sm text-brand-muted placeholder:text-brand-muted/30 focus:outline-none focus:border-brand-accent/60"
        />
        <button onClick={addSlot} disabled={!newSlotLabel.trim()} className="text-sm text-brand-accent font-medium disabled:opacity-30">Add</button>
      </div>
    </div>
  );
}

// ── Per-serving macro summary for standard recipes ────────────

function RecipeMacroSummary({ recipe }: { recipe: Recipe }) {
  const serves = recipe.serves ?? 4;

  const parts: NutrientInfo[] = [];
  for (const ing of recipe.coreIngredients) {
    if (!ing.nutrition) continue;
    const grams = quantityToGrams(ing.quantity, ing.nutrition.gramsPerUnit);
    const f = grams / 100;
    parts.push({
      calories: ing.nutrition.per100g.calories * f,
      protein:  ing.nutrition.per100g.protein  * f,
      carbs:    ing.nutrition.per100g.carbs    * f,
      fat:      ing.nutrition.per100g.fat      * f,
    });
  }

  const { linked, total } = ingredientNutritionCoverage(recipe);
  if (linked === 0) return null;

  const perServing = scaleNutrients(sumNutrients(parts), 1 / serves);

  return (
    <div className="mt-4 pt-4 border-t border-brand-muted/10">
      <p className="text-[11px] text-brand-muted/40 uppercase tracking-wide mb-1">
        Per meal · {linked}/{total} ingredients tracked
        {recipe.variants.length > 0 && ' · base only'}
      </p>
      <MacroChips n={perServing} />
    </div>
  );
}

// ── Tag editor ────────────────────────────────────────────────

function TagEditor({ recipe }: { recipe: Recipe }) {
  const updateRecipeTags = useAppStore(s => s.updateRecipeTags);
  const [customInput, setCustomInput] = useState('');
  const current = recipe.tags ?? [];
  // Keep all custom tags visible (active or inactive) so they can be re-toggled
  // without having to retype them. Inactive custom tags stay in the chip list
  // until explicitly removed via the × button.
  const [localCustomTags, setLocalCustomTags] = useState<string[]>(
    current.filter(t => !(PRESET_TAGS as readonly string[]).includes(t))
  );
  const allChips = [...PRESET_TAGS, ...localCustomTags];

  function toggle(tag: string) {
    if (current.includes(tag)) {
      updateRecipeTags(recipe.id, current.filter(t => t !== tag));
    } else {
      updateRecipeTags(recipe.id, [...current, tag]);
    }
  }

  function addCustom() {
    const t = customInput.trim().toLowerCase();
    if (!t) return;
    if (!localCustomTags.includes(t)) setLocalCustomTags(prev => [...prev, t]);
    if (!current.includes(t)) updateRecipeTags(recipe.id, [...current, t]);
    setCustomInput('');
  }

  function removeCustom(tag: string) {
    setLocalCustomTags(prev => prev.filter(t => t !== tag));
    updateRecipeTags(recipe.id, current.filter(t => t !== tag));
  }

  return (
    <div className="bg-brand-surface rounded-lg border border-brand-muted/15 p-4 mb-4">
      <p className="text-xs font-semibold text-brand-muted/50 uppercase tracking-wide mb-3">Tags</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {allChips.map(tag => {
          const active = current.includes(tag);
          const isCustom = !(PRESET_TAGS as readonly string[]).includes(tag);
          return (
            <span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
              active
                ? 'bg-brand-accent text-white border-brand-accent'
                : 'bg-brand-bg text-brand-muted/50 border-brand-muted/15'
            }`}>
              <button onClick={() => toggle(tag)} className="hover:opacity-80 transition-opacity">
                {tag}
              </button>
              {isCustom && (
                <button
                  onClick={() => removeCustom(tag)}
                  className="opacity-60 hover:opacity-100 transition-opacity leading-none"
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
      </div>
      <div className="flex gap-2 items-center">
        <input
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          placeholder="Add custom tag…"
          className="flex-1 bg-brand-bg border border-brand-muted/20 rounded-md px-2.5 py-1.5 text-xs text-brand-muted placeholder:text-brand-muted/30 focus:outline-none focus:border-brand-accent/60"
        />
        <button onClick={addCustom} disabled={!customInput.trim()}
          className="text-xs text-brand-accent font-medium disabled:opacity-30 px-2 py-1.5">
          Add
        </button>
      </div>
    </div>
  );
}

// ── Recipe detail / edit view ─────────────────────────────────

function ComposedCalSummary({ recipe }: { recipe: Recipe }) {
  const range = composedCalRange(recipe);
  if (!range) return null;

  return (
    <div className="bg-brand-surface rounded-lg border border-brand-muted/15 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-brand-muted/50 uppercase tracking-wide">Calorie range per plate</p>
        <p className="text-[11px] text-brand-muted/30">one pick per slot</p>
      </div>
      <div className="flex items-stretch gap-3">
        <div className="flex-1 bg-brand-raised rounded-lg px-3 py-2.5 text-center">
          <p className="text-[10px] text-brand-muted/40 uppercase tracking-wide mb-1">Low</p>
          <p className="text-xl font-semibold text-brand-muted leading-none">{range.min}</p>
          <p className="text-[10px] text-brand-muted/40 mt-1">cal</p>
        </div>
        <div className="flex items-center text-brand-muted/25 text-sm font-light">–</div>
        <div className="flex-1 bg-brand-raised rounded-lg px-3 py-2.5 text-center">
          <p className="text-[10px] text-brand-muted/40 uppercase tracking-wide mb-1">High</p>
          <p className="text-xl font-semibold text-brand-muted leading-none">{range.max}</p>
          <p className="text-[10px] text-brand-muted/40 mt-1">cal</p>
        </div>
      </div>
    </div>
  );
}

function RecipeDetail({ recipe, onBack }: { recipe: Recipe; onBack: () => void }) {
  const store = useAppStore();
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(recipe.name);
  const [editingDesc, setEditingDesc] = useState(recipe.description);
  const [newVariantName, setNewVariantName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingVariantNames, setEditingVariantNames] = useState<Record<string, string>>({});

  const liveRecipe = useAppStore((s) => s.recipes.find((r) => r.id === recipe.id))!;
  if (!liveRecipe) { onBack(); return null; }

  function saveHeader() {
    if (editingName.trim()) store.updateRecipe(liveRecipe.id, editingName.trim(), editingDesc.trim());
  }

  function addVariant() {
    if (!newVariantName.trim()) return;
    const id = store.addVariant(liveRecipe.id, newVariantName.trim());
    setNewVariantName('');
    setExpandedVariant(id);
  }

  function handleDeleteRecipe() {
    store.deleteRecipe(liveRecipe.id);
    onBack();
  }

  return (
    <div>
      {/* Nav row — back on left, delete on right, no type badge competing for space */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-brand-accent hover:text-brand-accent/70 transition-colors min-w-[44px] min-h-[44px] -ml-1 pr-3"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-sm font-medium">Recipes</span>
        </button>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-brand-muted/35 hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-red-400/10 -mr-2"
            aria-label="Delete recipe"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-brand-muted/50">Delete recipe?</span>
            <button
              onClick={handleDeleteRecipe}
              className="px-3 py-1.5 text-sm font-medium text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-colors"
            >Delete</button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-sm text-brand-muted/50 border border-brand-muted/20 rounded-lg hover:text-brand-muted transition-colors"
            >Cancel</button>
          </div>
        )}
      </div>

      {/* Name & description */}
      <div className="bg-brand-surface rounded-lg border border-brand-muted/15 p-4 mb-4">
        {/* Type badge — lives in the card, not competing with nav buttons */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium text-brand-muted/40 bg-brand-bg border border-brand-muted/15 px-2.5 py-1 rounded-full uppercase tracking-wide">
            {liveRecipe.type === 'composed' ? 'Build-Your-Own' : liveRecipe.variants.length > 0 ? 'With Variants' : 'Simple'}
          </span>
        </div>
        <input value={editingName} onChange={(e) => setEditingName(e.target.value)} onBlur={saveHeader}
          className="w-full bg-transparent text-brand-muted font-semibold text-base focus:outline-none border-b border-transparent focus:border-brand-muted/30 pb-1 mb-2" />
        <input value={editingDesc} onChange={(e) => setEditingDesc(e.target.value)} onBlur={saveHeader}
          placeholder="Description"
          className="w-full bg-transparent text-brand-muted/60 text-sm focus:outline-none" />

        {/* Serves — shown for all recipes; composed recipes are locked to 1 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-muted/10">
          <div>
            <p className="text-xs font-medium text-brand-muted/70">Meals per prep</p>
            <p className="text-[11px] text-brand-muted/35 mt-0.5">
              {liveRecipe.type === 'composed'
                ? 'Each build is one meal'
                : 'How many meals this batch makes'}
            </p>
          </div>
          {liveRecipe.type === 'composed' ? (
            <span className="text-sm font-semibold text-brand-muted/50">1</span>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => store.updateRecipeServings(liveRecipe.id, (liveRecipe.serves ?? 4) - 1)}
                className="w-7 h-7 rounded border border-brand-muted/20 text-brand-muted/50 hover:border-brand-accent hover:text-brand-accent flex items-center justify-center text-sm transition-colors"
              >−</button>
              <span className="text-sm font-semibold text-brand-muted w-6 text-center">{liveRecipe.serves ?? 4}</span>
              <button
                onClick={() => store.updateRecipeServings(liveRecipe.id, (liveRecipe.serves ?? 4) + 1)}
                className="w-7 h-7 rounded border border-brand-muted/20 text-brand-muted/50 hover:border-brand-accent hover:text-brand-accent flex items-center justify-center text-sm transition-colors"
              >+</button>
            </div>
          )}
        </div>
      </div>

      <TagEditor recipe={liveRecipe} />

      {liveRecipe.type === 'composed' ? (
        <>
          <SlotManager recipe={liveRecipe} />
          <ComposedCalSummary recipe={liveRecipe} />
        </>
      ) : (
        <>
          {/* Core ingredients */}
          <div className="bg-brand-surface rounded-lg border border-brand-muted/15 p-4 mb-4">
            <p className="text-xs font-semibold text-brand-muted/50 uppercase tracking-wide mb-3">Core Ingredients</p>
            {liveRecipe.coreIngredients.length === 0 && (
              <p className="text-xs text-brand-muted/30 mb-2">No core ingredients yet.</p>
            )}
            <div className="divide-y divide-brand-muted/10">
              {liveRecipe.coreIngredients.map((ing) => (
                <IngredientRow
                  key={ing.id}
                  name={ing.name}
                  quantity={ing.quantity}
                  category={ing.category}
                  nutrition={ing.nutrition}
                  onSetNutrition={(n) => store.setIngredientNutrition(liveRecipe.id, ing.id, n)}
                  onDelete={() => store.deleteCoreIngredient(liveRecipe.id, ing.id)}
                />
              ))}
            </div>
            <AddIngredientForm onAdd={(name, qty, cat, nutrition) => store.addCoreIngredient(liveRecipe.id, name, qty, cat, nutrition)} />
            <RecipeMacroSummary recipe={liveRecipe} />
          </div>

          {/* Variants */}
          <div className="bg-brand-surface rounded-lg border border-brand-muted/15 p-4 mb-4">
            <p className="text-xs font-semibold text-brand-muted/50 uppercase tracking-wide mb-3">Variants</p>
            <p className="text-xs text-brand-muted/40 mb-4">
              Optional — add variants to offer different flavour profiles of the same recipe base.
            </p>

            {liveRecipe.variants.length === 0 && (
              <p className="text-xs text-brand-muted/30 mb-3">No variants yet.</p>
            )}

            <div className="space-y-2">
              {liveRecipe.variants.map((variant) => {
                const isExpanded = expandedVariant === variant.id;
                const editName = editingVariantNames[variant.id] ?? variant.name;

                return (
                  <div key={variant.id} className="rounded-lg border border-brand-muted/15 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2.5 bg-brand-bg/30">
                      <button className="flex-1 text-left" onClick={() => setExpandedVariant(isExpanded ? null : variant.id)}>
                        <span className="text-sm font-medium text-brand-muted">{variant.name}</span>
                        <span className="text-xs text-brand-muted/40 ml-2">
                          {variant.additionalIngredients.length} ingredient{variant.additionalIngredients.length !== 1 ? 's' : ''}
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-brand-muted/30 text-xs">{isExpanded ? '▲' : '▼'}</span>
                        <button onClick={() => store.deleteVariant(liveRecipe.id, variant.id)}
                          className="text-brand-muted/30 hover:text-red-400 transition-colors text-lg leading-none ml-1">×</button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-3 py-3 border-t border-brand-muted/10 space-y-3">
                        <div>
                          <label className="text-xs text-brand-muted/40 uppercase tracking-wide">Variant name</label>
                          <input
                            value={editName}
                            onChange={(e) => setEditingVariantNames((prev) => ({ ...prev, [variant.id]: e.target.value }))}
                            onBlur={() => {
                              if (editName.trim() && editName !== variant.name)
                                store.updateVariantName(liveRecipe.id, variant.id, editName.trim());
                            }}
                            className="block w-full bg-brand-bg border border-brand-muted/20 rounded-md px-2 py-1.5 text-sm text-brand-muted mt-1 focus:outline-none focus:border-brand-accent/60"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-brand-muted/40 uppercase tracking-wide mb-1">Additional ingredients</p>
                          {variant.additionalIngredients.length === 0 && (
                            <p className="text-xs text-brand-muted/30 mb-1">None added.</p>
                          )}
                          <div className="divide-y divide-brand-muted/10">
                            {variant.additionalIngredients.map((ing) => (
                              <IngredientRow
                                key={ing.id}
                                name={ing.name}
                                quantity={ing.quantity}
                                category={ing.category}
                                nutrition={ing.nutrition}
                                onSetNutrition={(n) => store.setVariantIngredientNutrition(liveRecipe.id, variant.id, ing.id, n)}
                                onDelete={() => store.deleteVariantIngredient(liveRecipe.id, variant.id, ing.id)}
                              />
                            ))}
                          </div>
                          <AddIngredientForm
                            onAdd={(name, qty, cat, nutrition) => store.addVariantIngredient(liveRecipe.id, variant.id, name, qty, cat, nutrition)} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2 items-center">
              <input value={newVariantName} onChange={(e) => setNewVariantName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addVariant()}
                placeholder="New variant name"
                className="flex-1 bg-brand-bg border border-brand-muted/20 rounded-md px-2 py-1.5 text-sm text-brand-muted placeholder:text-brand-muted/30 focus:outline-none focus:border-brand-accent/60"
              />
              <button onClick={addVariant} disabled={!newVariantName.trim()}
                className="text-sm text-brand-accent font-medium disabled:opacity-30">Add</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Recipe list view ──────────────────────────────────────────

function RecipeList({ onSelect }: { onSelect: (id: string) => void }) {
  const recipes   = useAppStore((s) => s.recipes);
  const addRecipe = useAppStore((s) => s.addRecipe);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName]     = useState('');
  const [newDesc, setNewDesc]     = useState('');
  const [newType, setNewType]     = useState<'standard' | 'composed'>('standard');
  const [newServes, setNewServes] = useState(4);

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter,   setTagFilter]   = useState<string | null>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const r of recipes) for (const t of r.tags ?? []) s.add(t);
    return [...s].sort();
  }, [recipes]);

  const visibleRecipes = useMemo(() => {
    let r = recipes;
    if (searchQuery.trim()) r = searchRecipes(r, searchQuery.trim());
    if (tagFilter) r = r.filter(rc => rc.tags?.includes(tagFilter));
    return r;
  }, [recipes, searchQuery, tagFilter]);

  function createRecipe() {
    if (!newName.trim()) return;
    const serves = newType === 'composed' ? 1 : newServes;
    const id = addRecipe(newName.trim(), newDesc.trim(), newType, serves);
    setNewName(''); setNewDesc(''); setNewType('standard'); setNewServes(4); setShowNewForm(false);
    onSelect(id);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery('');
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center gap-2 mb-4">
        {!searchOpen && (
          <h2 className="text-lg font-semibold text-brand-muted flex-1">Recipes</h2>
        )}
        {searchOpen && (
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && closeSearch()}
            placeholder="Search recipes, ingredients…"
            className="flex-1 bg-brand-bg border border-brand-accent/40 rounded-lg px-3 py-1.5 text-sm text-brand-muted placeholder:text-brand-muted/30 focus:outline-none"
          />
        )}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { if (searchOpen) { closeSearch(); } else { setSearchOpen(true); } }}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-brand-muted/20 text-brand-muted/50 hover:text-brand-accent hover:border-brand-accent/40 transition-colors"
            aria-label={searchOpen ? 'Close search' : 'Search recipes'}
          >
            {searchOpen ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            )}
          </button>
          <button onClick={() => setShowNewForm(true)}
            className="text-sm bg-brand-accent text-white px-3 py-1.5 rounded-lg font-medium hover:bg-brand-accent/80 transition-colors">
            + New
          </button>
        </div>
      </div>

      {/* Tag filter bar — shown when tags exist */}
      {allTags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-4">
          {allTags.map(tag => (
            <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                tagFilter === tag
                  ? 'bg-brand-accent text-white border-brand-accent'
                  : 'bg-brand-bg text-brand-muted/50 border-brand-muted/15 hover:border-brand-accent/40 hover:text-brand-muted'
              }`}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Active filter summary */}
      {(searchQuery.trim() || tagFilter) && (
        <p className="text-xs text-brand-muted/40 mb-3">
          {visibleRecipes.length} result{visibleRecipes.length !== 1 ? 's' : ''}
          {searchQuery.trim() && <> for "<span className="text-brand-muted/60">{searchQuery}</span>"</>}
          {tagFilter && <> tagged <span className="text-brand-accent">{tagFilter}</span></>}
          {' · '}
          <button onClick={() => { setSearchQuery(''); setTagFilter(null); closeSearch(); }}
            className="text-brand-accent hover:text-brand-accent/80 transition-colors">
            Clear
          </button>
        </p>
      )}


      {showNewForm && (
        <div className="bg-brand-surface rounded-lg border border-brand-muted/15 p-4 mb-4 space-y-4">
          <p className="text-xs font-semibold text-brand-muted/50 uppercase tracking-wide">New Recipe</p>

          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createRecipe()}
            placeholder="Recipe name"
            className="w-full bg-brand-bg border border-brand-muted/20 rounded-md px-3 py-2 text-sm text-brand-muted placeholder:text-brand-muted/30 focus:outline-none focus:border-brand-accent/60"
          />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Short description (optional)"
            className="w-full bg-brand-bg border border-brand-muted/20 rounded-md px-3 py-2 text-sm text-brand-muted placeholder:text-brand-muted/30 focus:outline-none focus:border-brand-accent/60"
          />

          <div className="space-y-2">
            <p className="text-xs font-semibold text-brand-muted/50 uppercase tracking-wide">Recipe Type</p>
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${newType === 'standard' ? 'border-brand-accent bg-brand-accent/10' : 'border-brand-muted/15 hover:border-brand-accent/40'}`}>
              <input type="radio" name="rtype" checked={newType === 'standard'} onChange={() => setNewType('standard')} className="accent-brand-accent mt-0.5" />
              <div>
                <p className="text-sm font-medium text-brand-muted">Recipe</p>
                <p className="text-xs text-brand-muted/50 mt-0.5">
                  A fixed list of core ingredients. Optionally add variants for different styles
                  (e.g. Greek, Mexican, Japanese BBQ) — like Rice Bowl.
                </p>
              </div>
            </label>
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${newType === 'composed' ? 'border-brand-accent bg-brand-accent/10' : 'border-brand-muted/15 hover:border-brand-accent/40'}`}>
              <input type="radio" name="rtype" checked={newType === 'composed'} onChange={() => setNewType('composed')} className="accent-brand-accent mt-0.5" />
              <div>
                <p className="text-sm font-medium text-brand-muted">Build-Your-Own</p>
                <p className="text-xs text-brand-muted/50 mt-0.5">
                  Define component categories (Protein, Carb, Vegetable) with selectable options.
                  Users pick one or more per category when planning — like Protein Plate.
                </p>
              </div>
            </label>
          </div>

          {newType === 'standard' && (
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-xs font-medium text-brand-muted/70">Meals per batch</p>
                <p className="text-[11px] text-brand-muted/35">How many meals this recipe makes when prepped</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setNewServes(s => Math.max(1, s - 1))}
                  className="w-7 h-7 rounded border border-brand-muted/20 text-brand-muted/50 hover:border-brand-accent hover:text-brand-accent flex items-center justify-center text-sm transition-colors">−</button>
                <span className="text-sm font-semibold text-brand-muted w-6 text-center">{newServes}</span>
                <button onClick={() => setNewServes(s => s + 1)}
                  className="w-7 h-7 rounded border border-brand-muted/20 text-brand-muted/50 hover:border-brand-accent hover:text-brand-accent flex items-center justify-center text-sm transition-colors">+</button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={createRecipe} disabled={!newName.trim()}
              className="flex-1 bg-brand-accent text-white py-2 rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-brand-accent/80 transition-colors">
              Create & Edit
            </button>
            <button onClick={() => { setShowNewForm(false); setNewName(''); setNewDesc(''); setNewType('standard'); setNewServes(4); }}
              className="px-4 py-2 text-sm text-brand-muted/50 hover:text-brand-muted transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {recipes.length === 0 && !showNewForm && (
        <div className="text-center py-16">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted/20 mx-auto mb-4">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <p className="font-medium text-brand-muted/60">No recipes yet</p>
          <p className="text-sm mt-1 text-brand-muted/40">Tap + New to add your first recipe</p>
        </div>
      )}

      {recipes.length > 0 && visibleRecipes.length === 0 && (
        <p className="text-sm text-brand-muted/40 text-center py-10">No recipes match your search.</p>
      )}

      <div className="space-y-3">
        {visibleRecipes.map((recipe) => {
          const { linked, total } = recipe.type === 'standard' ? ingredientNutritionCoverage(recipe) : { linked: 0, total: 0 };
          const displayTags = recipe.tags?.slice(0, 3) ?? [];
          const extraTags   = (recipe.tags?.length ?? 0) - 3;
          return (
            <button key={recipe.id} onClick={() => onSelect(recipe.id)}
              className="w-full bg-brand-surface rounded-lg border border-brand-muted/15 p-4 text-left hover:bg-brand-muted/5 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-brand-muted text-sm">{recipe.name}</p>
                  {recipe.description && (
                    <p className="text-xs text-brand-muted/50 mt-0.5 truncate">{recipe.description}</p>
                  )}
                </div>
                <span className="text-brand-muted/30 text-xs shrink-0">→</span>
              </div>

              {/* Tags row */}
              {displayTags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {displayTags.map(tag => (
                    <span key={tag}
                      className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                        tagFilter === tag
                          ? 'bg-brand-accent/20 border-brand-accent/40 text-brand-accent'
                          : 'bg-brand-bg border-brand-muted/15 text-brand-muted/50'
                      }`}>
                      {tag}
                    </span>
                  ))}
                  {extraTags > 0 && (
                    <span className="text-[11px] text-brand-muted/35">+{extraTags}</span>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-2 flex-wrap">
                <span className="text-xs text-brand-muted/40">
                  {recipe.type === 'composed'
                    ? `${recipe.slots?.length || 0} slot${(recipe.slots?.length || 0) !== 1 ? 's' : ''}`
                    : `${recipe.coreIngredients.length} core ingredient${recipe.coreIngredients.length !== 1 ? 's' : ''}`}
                </span>
                {recipe.type === 'standard' && recipe.variants.length > 0 && (
                  <span className="text-xs text-brand-muted/40">
                    {recipe.variants.length} variant{recipe.variants.length !== 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-xs text-brand-muted/30">
                  {recipe.type === 'composed'
                    ? 'Build-Your-Own · 1 meal per build'
                    : `Makes ${recipe.serves ?? 4} meals`}
                </span>
                {recipe.type === 'composed' && (() => {
                  const range = composedCalRange(recipe);
                  if (!range) return null;
                  return (
                    <span className="text-xs text-emerald-400/70">
                      {range.min}–{range.max} cal
                    </span>
                  );
                })()}
                {total > 0 && (
                  <span className={`text-xs ${linked === total ? 'text-emerald-400/70' : 'text-brand-muted/30'}`}>
                    {linked === total ? '● nutrition' : `○ ${linked}/${total} nutrition`}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────

export default function RecipesScreen() {
  const selectedId = useAppStore((s) => s.recipesSelectedId);
  const setSelectedId = useAppStore((s) => s.setRecipesSelectedId);
  const recipes = useAppStore((s) => s.recipes);
  const selectedRecipe = recipes.find((r) => r.id === selectedId);

  if (selectedRecipe) {
    return <RecipeDetail recipe={selectedRecipe} onBack={() => setSelectedId(null)} />;
  }

  return <RecipeList onSelect={setSelectedId} />;
}
