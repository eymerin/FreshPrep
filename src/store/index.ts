import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Recipe, RecipeVariant, Ingredient, ComponentSlot, SlotOption, PreparedMeal, PrepEvent, ScheduledMeal, MealTime, PlanEntry, PendingPrep, StorageType, UserPrefs, IngredientNutrition, FoodRecord, NotificationSettings, AppNotification, UserProfile, NutritionGoals, PendingCelebration } from '../types';
import { SEED_RECIPES, SHELF_LIFE_DAYS } from '../data/seed';
import { addDays, format, getMondayOfWeek, parseISO, differenceInDays, computePrepWeekStreak } from '../utils/dates';
import { computeRecipeNutrientsPerServing } from '../utils/nutrition';
import { ALL_MESSAGES, SET_CONFIG, STREAK_MILESTONES, MessageSet } from '../data/messages';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Ingredient library helpers ────────────────────────────────────────────────

function normName(name: string): string {
  return name.toLowerCase().trim();
}

function recordFromNutrition(n: IngredientNutrition): FoodRecord {
  return { fdcId: n.fdcId, foodDescription: n.foodDescription, per100g: n.per100g };
}

// Propagate per100g / fdcId / foodDescription to every ingredient with the same

// Build the initial library from seed recipe data so it's populated on first load.
function buildLibraryFromRecipes(recipes: Recipe[]): Record<string, FoodRecord> {
  const lib: Record<string, FoodRecord> = {};
  for (const r of recipes) {
    const items = [
      ...r.coreIngredients,
      ...r.variants.flatMap(v => v.additionalIngredients),
      ...(r.slots ?? []).flatMap(s => s.options),
    ];
    for (const item of items) {
      const key = normName(item.name);
      if (item.nutrition && !lib[key]) lib[key] = recordFromNutrition(item.nutrition);
    }
  }
  return lib;
}

interface AppState {
  // ── Recipes ────────────────────────────────────────────────
  recipes: Recipe[];
  addRecipe: (name: string, description: string, type?: 'standard' | 'composed', serves?: number) => string;
  updateRecipe: (id: string, name: string, description: string) => void;
  updateRecipeServings: (id: string, serves: number) => void;
  updateRecipeTags: (id: string, tags: string[]) => void;
  deleteRecipe: (id: string) => void;

  addCoreIngredient: (recipeId: string, name: string, quantity: string, category?: string, nutrition?: IngredientNutrition) => void;
  updateCoreIngredient: (recipeId: string, ingId: string, name: string, quantity: string) => void;
  deleteCoreIngredient: (recipeId: string, ingId: string) => void;
  setIngredientNutrition: (recipeId: string, ingId: string, nutrition: IngredientNutrition | undefined) => void;
  setVariantIngredientNutrition: (recipeId: string, variantId: string, ingId: string, nutrition: IngredientNutrition | undefined) => void;
  setSlotOptionNutrition: (recipeId: string, slotId: string, optionName: string, nutrition: IngredientNutrition | undefined) => void;

  addVariant: (recipeId: string, name: string) => string;
  updateVariantName: (recipeId: string, variantId: string, name: string) => void;
  deleteVariant: (recipeId: string, variantId: string) => void;

  addVariantIngredient: (recipeId: string, variantId: string, name: string, quantity: string, category?: string, nutrition?: IngredientNutrition) => void;
  updateVariantIngredient: (recipeId: string, variantId: string, ingId: string, name: string, quantity: string, category?: string) => void;
  deleteVariantIngredient: (recipeId: string, variantId: string, ingId: string) => void;

  // Composed recipe slot management
  addSlot: (recipeId: string, label: string) => void;
  updateSlotLabel: (recipeId: string, slotId: string, label: string) => void;
  deleteSlot: (recipeId: string, slotId: string) => void;
  addSlotOption: (recipeId: string, slotId: string, name: string, quantity: string, category?: string, nutrition?: IngredientNutrition) => void;
  deleteSlotOption: (recipeId: string, slotId: string, optionName: string) => void;

  // ── Plan entries ──────────────────────────────────────────
  planEntries: PlanEntry[];
  addPlanEntry: (recipeId: string) => void;
  removePlanEntry: (entryId: string) => void;
  updatePlanServings: (entryId: string, servings: number) => void;
  togglePlanVariant: (entryId: string, variantId: string) => void;
  togglePlanSlotOption: (entryId: string, slotId: string, option: string) => void;
  clearPlan: () => void;

  collapsedEntries: Record<string, boolean>;
  toggleEntryCollapsed: (entryId: string) => void;

  // ── Plan sub-tab + shopping sort ──────────────────────────
  planSubTab: 'picks' | 'shopping';
  setPlanSubTab: (tab: 'picks' | 'shopping') => void;
  shoppingSortMode: 'recipe' | 'category';
  setShoppingSortMode: (mode: 'recipe' | 'category') => void;

  // ── Calendar ───────────────────────────────────────────────
  calendarSubTab: 'daily' | 'weekly';
  setCalendarSubTab: (tab: 'daily' | 'weekly') => void;
  eatenScheduledIds: string[];
  markScheduledEaten: (scheduledId: string) => void;

  // ── Recipes navigation ─────────────────────────────────────
  recipesSelectedId: string | null;
  setRecipesSelectedId: (id: string | null) => void;

  // ── Shopping list UI state ─────────────────────────────────
  shoppingGrabbed: string[];
  shoppingChosen: Record<string, string>;
  shoppingCollapsed: Record<string, boolean>;
  setShoppingGrabbed: (keys: string[]) => void;
  setShoppingChosen: (chosen: Record<string, string>) => void;
  setShoppingCollapsed: (collapsed: Record<string, boolean>) => void;
  resetShoppingState: () => void;

  // ── Prep queue ─────────────────────────────────────────────
  pendingPreps: PendingPrep[];
  addPendingPreps: (preps: PendingPrep[]) => void;
  queuePlanEntries: () => void;
  markPrepComplete: (pendingId: string, storage: StorageType, finalSlotPicks?: Record<string, string>, finalVariantId?: string) => void;
  removePendingPrep: (pendingId: string) => void;

  // ── Prep ───────────────────────────────────────────────────
  preparedMeals: PreparedMeal[];
  logPrepEvent: (event: PrepEvent) => void;
  consumeServing: (mealId: string) => void;
  removePreparedMeal: (mealId: string) => void;

  // ── Schedule ───────────────────────────────────────────────
  scheduledMeals: ScheduledMeal[];
  scheduleMeal: (date: string, mealTime: MealTime, preparedMealId: string) => void;
  unscheduleMeal: (scheduledMealId: string) => void;
  swapScheduledMeal: (scheduledMealId: string, newPreparedMealId: string) => void;

  // ── Freshness helpers ──────────────────────────────────────
  getFreshnessStatus: (meal: PreparedMeal) => 'fresh' | 'expiring' | 'expired';
  getExpirationDate: (meal: PreparedMeal) => string;
  getDaysRemaining: (meal: PreparedMeal) => number;

  // ── Profile & goals ────────────────────────────────────────
  userProfile: UserProfile;
  updateUserProfile: (p: Partial<UserProfile>) => void;
  nutritionGoals: NutritionGoals;
  updateNutritionGoals: (g: Partial<NutritionGoals>) => void;

  // ── Onboarding ─────────────────────────────────────────────
  onboardingComplete: boolean;
  userPrefs: UserPrefs | null;
  completeOnboarding: (prefs: UserPrefs) => void;
  updateUserPrefs: (p: Partial<UserPrefs>) => void;

  // ── Stats ──────────────────────────────────────────────────
  mealsEatenAllTime: number;
  prepSessionsLogged: number;
  mealEatenDates: string[];

  // ── Notifications ──────────────────────────────────────────
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (s: Partial<NotificationSettings>) => void;
  appNotifications: AppNotification[];
  addAppNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  lastNotifiedAt: Record<'expiry' | 'inventory', number | null>;
  setLastNotifiedAt: (type: 'expiry' | 'inventory', ts: number) => void;

  // ── Ingredient library ─────────────────────────────────────
  // Maps normalised ingredient name → shared food record.
  // Ensures the same ingredient always references the same USDA food
  // across all recipes, while each recipe keeps its own portion data.
  ingredientLibrary: Record<string, FoodRecord>;
  setLibraryEntry: (name: string, record: FoodRecord) => void;
  removeLibraryEntry: (name: string) => void;

  // ── Measurement preference ─────────────────────────────────
  measurementUnit: 'metric' | 'imperial';
  setMeasurementUnit: (unit: 'metric' | 'imperial') => void;

  // ── Collection ────────────────────────────────────────────────
  unlockedMessageIds: string[];
  pendingCelebrations: PendingCelebration[];
  prepEventDates: string[];
  dismissCelebration: () => void;

  // ── UI hints ───────────────────────────────────────────────
  insightsTipSeen: boolean;
  markInsightsTipSeen: () => void;
}

function unlockNextForSet(
  set: (partial: any) => void,
  get: () => any,
  setName: MessageSet,
) {
  const s = get() as { unlockedMessageIds: string[]; pendingCelebrations: PendingCelebration[] };
  const msgs = ALL_MESSAGES.filter(m => m.set === setName);
  const next = msgs.find(m => !s.unlockedMessageIds.includes(m.id));
  if (!next) return;
  const cardNumber = msgs.findIndex(m => m.id === next.id) + 1;
  const newUnlocked = [...s.unlockedMessageIds, next.id];
  const cfg = SET_CONFIG[setName];
  set({
    unlockedMessageIds: newUnlocked,
    pendingCelebrations: [
      ...s.pendingCelebrations,
      {
        id: next.id,
        set: next.set,
        setLabel: cfg.label,
        emoji: cfg.emoji,
        text: next.text,
        cardNumber,
        totalUnlocked: newUnlocked.length,
      } as PendingCelebration,
    ],
  });
}

function unlockSpecific(
  set: (partial: any) => void,
  get: () => any,
  messageId: string,
) {
  const s = get() as { unlockedMessageIds: string[]; pendingCelebrations: PendingCelebration[] };
  if (s.unlockedMessageIds.includes(messageId)) return;
  const msg = ALL_MESSAGES.find(m => m.id === messageId);
  if (!msg) return;
  const setMsgs = ALL_MESSAGES.filter(m => m.set === msg.set);
  const cardNumber = setMsgs.findIndex(m => m.id === messageId) + 1;
  const newUnlocked = [...s.unlockedMessageIds, messageId];
  const cfg = SET_CONFIG[msg.set];
  set({
    unlockedMessageIds: newUnlocked,
    pendingCelebrations: [
      ...s.pendingCelebrations,
      {
        id: msg.id,
        set: msg.set,
        setLabel: cfg.label,
        emoji: cfg.emoji,
        text: msg.text,
        cardNumber,
        totalUnlocked: newUnlocked.length,
      } as PendingCelebration,
    ],
  });
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  // ── Recipes ────────────────────────────────────────────────
  recipes: SEED_RECIPES,

  addRecipe: (name, description, type = 'standard', serves) => {
    const id = uid();
    const defaultServes = serves ?? (type === 'composed' ? 1 : 4);
    set((s) => ({ recipes: [...s.recipes, { id, name, description, type, serves: defaultServes, coreIngredients: [], variants: [], slots: type === 'composed' ? [] : undefined }] }));
    return id;
  },

  updateRecipe: (id, name, description) => {
    set((s) => ({ recipes: s.recipes.map((r) => r.id === id ? { ...r, name, description } : r) }));
  },

  updateRecipeServings: (id, serves) => {
    set((s) => ({ recipes: s.recipes.map((r) => r.id === id ? { ...r, serves: Math.max(1, serves) } : r) }));
  },

  updateRecipeTags: (id, tags) => {
    set((s) => ({ recipes: s.recipes.map((r) => r.id === id ? { ...r, tags } : r) }));
  },

  deleteRecipe: (id) => {
    set((s) => ({
      recipes: s.recipes.filter((r) => r.id !== id),
      preparedMeals: s.preparedMeals.filter((m) => m.recipeId !== id),
      recipesSelectedId: s.recipesSelectedId === id ? null : s.recipesSelectedId,
    }));
  },

  addCoreIngredient: (recipeId, name, quantity, category, nutrition) => {
    const ing: Ingredient = { id: uid(), name, quantity, ...(category ? { category } : {}), ...(nutrition ? { nutrition } : {}) };
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === recipeId ? { ...r, coreIngredients: [...r.coreIngredients, ing] } : r
      ),
    }));
  },

  updateCoreIngredient: (recipeId, ingId, name, quantity) => {
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === recipeId
          ? { ...r, coreIngredients: r.coreIngredients.map((i) => i.id === ingId ? { ...i, name, quantity } : i) }
          : r
      ),
    }));
  },

  deleteCoreIngredient: (recipeId, ingId) => {
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === recipeId ? { ...r, coreIngredients: r.coreIngredients.filter((i) => i.id !== ingId) } : r
      ),
    }));
  },

  setIngredientNutrition: (recipeId, ingId, nutrition) => {
    set((s) => {
      const ingName = s.recipes.find(r => r.id === recipeId)
        ?.coreIngredients.find(i => i.id === ingId)?.name ?? '';
      // First apply the change, then sync the food record across all matching ingredient names
      const patched = s.recipes.map((r) =>
        r.id === recipeId
          ? { ...r, coreIngredients: r.coreIngredients.map((i) => i.id === ingId ? { ...i, nutrition } : i) }
          : r
      );
      if (!nutrition || !ingName) return { recipes: patched };
      const record = recordFromNutrition(nutrition);
      // Update library for suggestions only — do NOT sync back to other recipes
      return {
        recipes: patched,
        ingredientLibrary: { ...s.ingredientLibrary, [normName(ingName)]: record },
      };
    });
    if (nutrition && nutrition.fdcId > 0) {
      const s = get();
      if (!s.unlockedMessageIds.includes('fs-4')) unlockSpecific(set, get, 'fs-4');
    }
  },

  setVariantIngredientNutrition: (recipeId, variantId, ingId, nutrition) => {
    set((s) => {
      const ingName = s.recipes.find(r => r.id === recipeId)
        ?.variants.find(v => v.id === variantId)
        ?.additionalIngredients.find(i => i.id === ingId)?.name ?? '';
      const patched = s.recipes.map((r) =>
        r.id === recipeId
          ? {
              ...r,
              variants: r.variants.map((v) =>
                v.id === variantId
                  ? { ...v, additionalIngredients: v.additionalIngredients.map((i) => i.id === ingId ? { ...i, nutrition } : i) }
                  : v
              ),
            }
          : r
      );
      if (!nutrition || !ingName) return { recipes: patched };
      const record = recordFromNutrition(nutrition);
      return {
        recipes: patched,
        ingredientLibrary: { ...s.ingredientLibrary, [normName(ingName)]: record },
      };
    });
  },

  setSlotOptionNutrition: (recipeId, slotId, optionName, nutrition) => {
    set((s) => {
      const patched = s.recipes.map((r) =>
        r.id === recipeId
          ? {
              ...r,
              slots: (r.slots ?? []).map((slot) =>
                slot.id === slotId
                  ? { ...slot, options: slot.options.map((o) => o.name === optionName ? { ...o, nutrition } : o) }
                  : slot
              ),
            }
          : r
      );
      if (!nutrition || !optionName) return { recipes: patched };
      const record = recordFromNutrition(nutrition);
      return {
        recipes: patched,
        ingredientLibrary: { ...s.ingredientLibrary, [normName(optionName)]: record },
      };
    });
  },

  addVariant: (recipeId, name) => {
    const id = uid();
    const variant: RecipeVariant = { id, name, additionalIngredients: [] };
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === recipeId ? { ...r, variants: [...r.variants, variant] } : r
      ),
    }));
    return id;
  },

  updateVariantName: (recipeId, variantId, name) => {
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === recipeId
          ? { ...r, variants: r.variants.map((v) => v.id === variantId ? { ...v, name } : v) }
          : r
      ),
    }));
  },

  deleteVariant: (recipeId, variantId) => {
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === recipeId ? { ...r, variants: r.variants.filter((v) => v.id !== variantId) } : r
      ),
    }));
  },

  addVariantIngredient: (recipeId, variantId, name, quantity, category, nutrition) => {
    const ing: Ingredient = { id: uid(), name, quantity, ...(category ? { category } : {}), ...(nutrition ? { nutrition } : {}) };
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === recipeId
          ? {
              ...r,
              variants: r.variants.map((v) =>
                v.id === variantId ? { ...v, additionalIngredients: [...v.additionalIngredients, ing] } : v
              ),
            }
          : r
      ),
    }));
  },

  updateVariantIngredient: (recipeId, variantId, ingId, name, quantity) => {
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === recipeId
          ? {
              ...r,
              variants: r.variants.map((v) =>
                v.id === variantId
                  ? { ...v, additionalIngredients: v.additionalIngredients.map((i) => i.id === ingId ? { ...i, name, quantity } : i) }
                  : v
              ),
            }
          : r
      ),
    }));
  },

  deleteVariantIngredient: (recipeId, variantId, ingId) => {
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === recipeId
          ? {
              ...r,
              variants: r.variants.map((v) =>
                v.id === variantId
                  ? { ...v, additionalIngredients: v.additionalIngredients.filter((i) => i.id !== ingId) }
                  : v
              ),
            }
          : r
      ),
    }));
  },

  // ── Composed recipe slot management ───────────────────────
  addSlot: (recipeId, label) => {
    const slot: ComponentSlot = { id: uid(), label, options: [] };
    set((s) => ({ recipes: s.recipes.map((r) => r.id === recipeId ? { ...r, slots: [...(r.slots || []), slot] } : r) }));
  },

  updateSlotLabel: (recipeId, slotId, label) => {
    set((s) => ({
      recipes: s.recipes.map((r) => r.id === recipeId
        ? { ...r, slots: (r.slots || []).map((s) => s.id === slotId ? { ...s, label } : s) }
        : r),
    }));
  },

  deleteSlot: (recipeId, slotId) => {
    set((s) => ({ recipes: s.recipes.map((r) => r.id === recipeId ? { ...r, slots: (r.slots || []).filter((s) => s.id !== slotId) } : r) }));
  },

  addSlotOption: (recipeId, slotId, name, quantity, category, nutrition) => {
    const opt: SlotOption = { name, quantity, ...(category ? { category } : {}), ...(nutrition ? { nutrition } : {}) };
    set((s) => ({
      recipes: s.recipes.map((r) => r.id === recipeId
        ? { ...r, slots: (r.slots || []).map((s) => s.id === slotId ? { ...s, options: [...s.options, opt] } : s) }
        : r),
    }));
  },

  deleteSlotOption: (recipeId, slotId, optionName) => {
    set((s) => ({
      recipes: s.recipes.map((r) => r.id === recipeId
        ? { ...r, slots: (r.slots || []).map((s) => s.id === slotId ? { ...s, options: s.options.filter((o) => o.name !== optionName) } : s) }
        : r),
    }));
  },

  // ── Plan entries ──────────────────────────────────────────
  planEntries: [],

  addPlanEntry: (recipeId) => {
    set((s) => {
      const serves = s.recipes.find(r => r.id === recipeId)?.serves ?? 1;
      return { planEntries: [...s.planEntries, { id: uid(), recipeId, servings: serves, selectedVariantIds: [], slotPicks: {} }] };
    });
  },

  removePlanEntry: (entryId) => {
    set((s) => {
      const collapsedEntries = { ...s.collapsedEntries };
      delete collapsedEntries[entryId];
      return { planEntries: s.planEntries.filter((e) => e.id !== entryId), collapsedEntries };
    });
  },

  updatePlanServings: (entryId, servings) => {
    set((s) => ({
      planEntries: s.planEntries.map((e) => e.id === entryId ? { ...e, servings } : e),
    }));
  },

  togglePlanVariant: (entryId, variantId) => {
    set((s) => ({
      planEntries: s.planEntries.map((e) => {
        if (e.id !== entryId) return e;
        const ids = e.selectedVariantIds;
        return {
          ...e,
          selectedVariantIds: ids.includes(variantId) ? ids.filter((id) => id !== variantId) : [...ids, variantId],
        };
      }),
    }));
  },

  togglePlanSlotOption: (entryId, slotId, option) => {
    set((s) => ({
      planEntries: s.planEntries.map((e) => {
        if (e.id !== entryId) return e;
        const current = e.slotPicks[slotId] || [];
        return {
          ...e,
          slotPicks: {
            ...e.slotPicks,
            [slotId]: current.includes(option) ? current.filter((o) => o !== option) : [...current, option],
          },
        };
      }),
    }));
  },

  clearPlan: () => set({ planEntries: [], collapsedEntries: {} }),

  collapsedEntries: {},

  toggleEntryCollapsed: (entryId) => {
    set((s) => ({
      collapsedEntries: { ...s.collapsedEntries, [entryId]: !s.collapsedEntries[entryId] },
    }));
  },

  // ── Plan sub-tab ───────────────────────────────────────────
  planSubTab: 'picks',
  setPlanSubTab: (tab) => set({ planSubTab: tab }),
  shoppingSortMode: 'recipe',
  setShoppingSortMode: (mode) => set({ shoppingSortMode: mode }),

  calendarSubTab: 'daily',
  setCalendarSubTab: (tab) => set({ calendarSubTab: tab }),
  eatenScheduledIds: [],
  markScheduledEaten: (id) => {
    set((s) => ({
      eatenScheduledIds: [...s.eatenScheduledIds, id],
      mealsEatenAllTime: s.mealsEatenAllTime + 1,
      mealEatenDates: [...s.mealEatenDates, format(new Date())],
    }));
    // Check milestone triggers with updated state
    const s = get();
    const today = format(new Date());
    const weekMonday = getMondayOfWeek(today);
    const weekMeals = s.scheduledMeals.filter(m => getMondayOfWeek(m.date) === weekMonday);
    const weekDone = weekMeals.length > 0 && weekMeals.every(m => s.eatenScheduledIds.includes(m.id));
    if (weekDone) {
      unlockNextForSet(set, get, 'week-champion');
      return;
    }
    const sm = s.scheduledMeals.find(m => m.id === id);
    if (sm) {
      const dayMeals = s.scheduledMeals.filter(m => m.date === sm.date);
      const dayDone = dayMeals.length > 0 && dayMeals.every(m => s.eatenScheduledIds.includes(m.id));
      if (dayDone) {
        if (!s.unlockedMessageIds.includes('fs-2')) {
          unlockSpecific(set, get, 'fs-2');
        } else {
          unlockNextForSet(set, get, 'clean-plate');
        }
      }
    }
  },

  recipesSelectedId: null,
  setRecipesSelectedId: (id) => set({ recipesSelectedId: id }),

  // ── Shopping list UI state ─────────────────────────────────
  shoppingGrabbed: [],
  shoppingChosen: {},
  shoppingCollapsed: {},
  setShoppingGrabbed: (keys) => set({ shoppingGrabbed: keys }),
  setShoppingChosen: (chosen) => set({ shoppingChosen: chosen }),
  setShoppingCollapsed: (collapsed) => set({ shoppingCollapsed: collapsed }),
  resetShoppingState: () => set({ shoppingGrabbed: [], shoppingChosen: {}, shoppingCollapsed: {} }),

  // ── Prep queue ─────────────────────────────────────────────
  pendingPreps: [],

  addPendingPreps: (preps) => {
    set((s) => ({ pendingPreps: [...s.pendingPreps, ...preps] }));
  },

  queuePlanEntries: () => {
    const { planEntries, recipes } = get();
    const queued: PendingPrep[] = [];

    for (const entry of planEntries) {
      const recipe = recipes.find((r) => r.id === entry.recipeId);
      if (!recipe) continue;

      if (recipe.type === 'composed') {
        const anyPick = recipe.slots?.some((s) => (entry.slotPicks[s.id] || []).length > 0);
        if (!anyPick) continue;
        queued.push({
          id: uid(),
          recipeId: entry.recipeId,
          recipeName: recipe.name,
          servings: entry.servings,
          slotPicks: entry.slotPicks,
        });
      } else {
        if (entry.selectedVariantIds.length === 0 && recipe.variants.length > 0) continue;
        const selected = recipe.variants.filter((v) => entry.selectedVariantIds.includes(v.id));
        if (selected.length === 1) {
          queued.push({
            id: uid(),
            recipeId: entry.recipeId,
            recipeName: recipe.name,
            servings: entry.servings,
            variantId: selected[0].id,
            variantName: selected[0].name,
          });
        } else if (selected.length > 1) {
          queued.push({
            id: uid(),
            recipeId: entry.recipeId,
            recipeName: recipe.name,
            servings: entry.servings,
            pendingVariants: selected.map((v) => ({ id: v.id, name: v.name })),
          });
        } else {
          // No variants on recipe (e.g. Breakfast Burrito)
          queued.push({
            id: uid(),
            recipeId: entry.recipeId,
            recipeName: recipe.name,
            servings: entry.servings,
          });
        }
      }
    }

    if (queued.length === 0) return;
    set((s) => ({ pendingPreps: [...s.pendingPreps, ...queued] }));
    // fs-3: first time a plan is queued for prep
    if (!get().unlockedMessageIds.includes('fs-3')) {
      unlockSpecific(set, get, 'fs-3');
    }
  },

  markPrepComplete: (pendingId, storage, finalSlotPicks, finalVariantId) => {
    const { pendingPreps, recipes } = get();
    const pending = pendingPreps.find((p) => p.id === pendingId);
    if (!pending) return;

    const recipe = recipes.find((r) => r.id === pending.recipeId);
    if (!recipe) return;

    let variantName: string;
    let variantId: string | undefined;

    if (recipe.type === 'composed') {
      const picks = finalSlotPicks || {};
      variantName = (recipe.slots || [])
        .map((s) => picks[s.id] || (pending.slotPicks?.[s.id]?.[0] ?? ''))
        .filter(Boolean)
        .join(' · ');
    } else {
      const vid = finalVariantId || pending.variantId;
      const variant = recipe.variants.find((v) => v.id === vid);
      variantId = vid;
      variantName = variant?.name || pending.variantName || '';
    }

    const resolvedSlotPicks: Record<string, string> | undefined =
      recipe.type === 'composed'
        ? Object.fromEntries(
            Object.entries(finalSlotPicks || pending.slotPicks || {}).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          )
        : undefined;

    const meal: PreparedMeal = {
      id: uid(),
      prepEventId: uid(),
      recipeId: pending.recipeId,
      variantId,
      recipeName: pending.recipeName,
      variantName,
      servingsTotal: pending.servings,
      servingsRemaining: pending.servings,
      prepDate: format(new Date()),
      storage,
      nutrientsPerServing: computeRecipeNutrientsPerServing(recipe, pending.servings, variantId, resolvedSlotPicks) ?? undefined,
    };

    set((s) => ({
      preparedMeals: [meal, ...s.preparedMeals],
      pendingPreps: s.pendingPreps.filter((p) => p.id !== pendingId),
      prepSessionsLogged: s.prepSessionsLogged + 1,
    }));
  },

  removePendingPrep: (pendingId) => {
    set((s) => ({ pendingPreps: s.pendingPreps.filter((p) => p.id !== pendingId) }));
  },

  // ── Prep ───────────────────────────────────────────────────
  preparedMeals: [],

  logPrepEvent: (event) => {
    const recipe = get().recipes.find((r) => r.id === event.recipeId);
    if (!recipe) return;

    let variantName: string;
    if (recipe.type === 'composed' && event.slotPicks) {
      variantName = (recipe.slots || [])
        .map((s) => event.slotPicks![s.id])
        .filter(Boolean)
        .join(' · ');
    } else {
      const variant = recipe.variants.find((v) => v.id === event.variantId);
      if (!variant && recipe.variants.length > 0) return;
      variantName = variant?.name || '';
    }

    const meal: PreparedMeal = {
      id: uid(),
      prepEventId: event.id,
      recipeId: event.recipeId,
      variantId: event.variantId,
      recipeName: recipe.name,
      variantName,
      servingsTotal: event.servings,
      servingsRemaining: event.servings,
      prepDate: event.prepDate,
      storage: event.storage,
      nutrientsPerServing: computeRecipeNutrientsPerServing(recipe, event.servings, event.variantId, event.slotPicks) ?? undefined,
    };
    const today = format(new Date());
    set((s) => ({
      preparedMeals: [meal, ...s.preparedMeals],
      prepSessionsLogged: s.prepSessionsLogged + 1,
      prepEventDates: s.prepEventDates.includes(today) ? s.prepEventDates : [...s.prepEventDates, today],
    }));

    // Milestone checks
    const s = get();
    if (!s.unlockedMessageIds.includes('fs-1')) {
      unlockSpecific(set, get, 'fs-1');
      return;
    }
    // Check streak milestones (priority over regular prep-day)
    const streak = computePrepWeekStreak(s.prepEventDates);
    const streakMsgIds = ALL_MESSAGES.filter(m => m.set === 'streak').map(m => m.id);
    const earnedStreakCount = s.unlockedMessageIds.filter(id => streakMsgIds.includes(id)).length;
    const nextMilestone = STREAK_MILESTONES[earnedStreakCount];
    if (nextMilestone !== undefined && streak >= nextMilestone) {
      unlockNextForSet(set, get, 'streak');
      return;
    }
    unlockNextForSet(set, get, 'prep-day');
  },

  consumeServing: (mealId) => {
    set((s) => ({
      preparedMeals: s.preparedMeals.map((m) =>
        m.id === mealId ? { ...m, servingsRemaining: Math.max(0, m.servingsRemaining - 1) } : m
      ),
    }));
  },

  removePreparedMeal: (mealId) => {
    set((s) => ({
      preparedMeals: s.preparedMeals.filter((m) => m.id !== mealId),
      scheduledMeals: s.scheduledMeals.filter((s) => s.preparedMealId !== mealId),
    }));
  },

  // ── Schedule ───────────────────────────────────────────────
  scheduledMeals: [],

  scheduleMeal: (date, mealTime, preparedMealId) => {
    const existing = get().scheduledMeals.find((s) => s.date === date && s.mealTime === mealTime);
    if (existing) {
      set((s) => ({
        scheduledMeals: s.scheduledMeals.map((s) => s.id === existing.id ? { ...s, preparedMealId } : s),
      }));
    } else {
      set((s) => ({
        scheduledMeals: [...s.scheduledMeals, { id: uid(), date, mealTime, preparedMealId }],
      }));
    }
  },

  unscheduleMeal: (scheduledMealId) => {
    set((s) => ({
      scheduledMeals: s.scheduledMeals.filter((m) => m.id !== scheduledMealId),
      eatenScheduledIds: s.eatenScheduledIds.filter((id) => id !== scheduledMealId),
    }));
  },

  swapScheduledMeal: (scheduledMealId, newPreparedMealId) => {
    set((s) => ({
      scheduledMeals: s.scheduledMeals.map((s) =>
        s.id === scheduledMealId ? { ...s, preparedMealId: newPreparedMealId } : s
      ),
    }));
  },

  // ── Freshness helpers ──────────────────────────────────────
  getFreshnessStatus: (meal) => {
    const days = get().getDaysRemaining(meal);
    const total = SHELF_LIFE_DAYS[meal.storage];
    if (days <= 0) return 'expired';
    if (days / total <= 0.25) return 'expiring';
    return 'fresh';
  },

  getExpirationDate: (meal) => {
    return format(addDays(parseISO(meal.prepDate), SHELF_LIFE_DAYS[meal.storage]));
  },

  getDaysRemaining: (meal) => {
    return differenceInDays(addDays(parseISO(meal.prepDate), SHELF_LIFE_DAYS[meal.storage]), new Date());
  },

  // ── Profile & goals ────────────────────────────────────────
  userProfile: { name: '', joinedAt: Date.now() },
  updateUserProfile: (p) => set((s) => ({ userProfile: { ...s.userProfile, ...p } })),
  nutritionGoals: { calories: null, protein: null, carbs: null, fat: null },
  updateNutritionGoals: (g) => {
    const wasEmpty = Object.values(get().nutritionGoals).every(v => v === null);
    set((s) => ({ nutritionGoals: { ...s.nutritionGoals, ...g } }));
    const hasGoal = Object.values(get().nutritionGoals).some(v => v !== null);
    if (wasEmpty && hasGoal) {
      const s = get();
      if (!s.unlockedMessageIds.includes('fs-5')) unlockSpecific(set, get, 'fs-5');
    }
  },

  // ── Onboarding ─────────────────────────────────────────────
  onboardingComplete: false,
  userPrefs: null,
  completeOnboarding: (prefs) => set({ onboardingComplete: true, userPrefs: prefs }),
  updateUserPrefs: (p) => set((s) => s.userPrefs ? { userPrefs: { ...s.userPrefs, ...p } } : {}),

  // ── Stats (start empty — earned by real user actions) ──────
  mealsEatenAllTime: 0,
  prepSessionsLogged: 0,
  mealEatenDates: [],

  // ── Notifications ──────────────────────────────────────────
  notificationSettings: {
    enabled: true,
    delivery: 'both',
    expiryEnabled: true,
    expiryThresholdDays: 2,
    inventoryEnabled: true,
    inventoryThreshold: 3,
    preferredHour: 8,
    minIntervalHours: 24,
  },
  updateNotificationSettings: (s) => set((state) => ({
    notificationSettings: { ...state.notificationSettings, ...s },
  })),
  appNotifications: [],
  addAppNotification: (n) => set((s) => ({
    appNotifications: [
      { ...n, id: uid(), timestamp: Date.now(), read: false },
      ...s.appNotifications,
    ].slice(0, 50), // keep last 50
  })),
  markNotificationRead: (id) => set((s) => ({
    appNotifications: s.appNotifications.map((n) => n.id === id ? { ...n, read: true } : n),
  })),
  markAllNotificationsRead: () => set((s) => ({
    appNotifications: s.appNotifications.map((n) => ({ ...n, read: true })),
  })),
  clearNotifications: () => set({ appNotifications: [] }),
  lastNotifiedAt: { expiry: null, inventory: null },
  setLastNotifiedAt: (type, ts) => set((s) => ({
    lastNotifiedAt: { ...s.lastNotifiedAt, [type]: ts },
  })),

  // ── Ingredient library ─────────────────────────────────────
  ingredientLibrary: buildLibraryFromRecipes(SEED_RECIPES),
  setLibraryEntry: (name, record) => set((s) => ({
    ingredientLibrary: { ...s.ingredientLibrary, [normName(name)]: record },
  })),
  removeLibraryEntry: (name) => set((s) => {
    const lib = { ...s.ingredientLibrary };
    delete lib[normName(name)];
    return { ingredientLibrary: lib };
  }),

  // ── Measurement preference ─────────────────────────────────
  measurementUnit: 'imperial',
  setMeasurementUnit: (unit) => set({ measurementUnit: unit }),

  // ── Collection ────────────────────────────────────────────────
  unlockedMessageIds: [],
  pendingCelebrations: [],
  prepEventDates: [],
  dismissCelebration: () => set((s) => ({ pendingCelebrations: s.pendingCelebrations.slice(1) })),

  // ── UI hints ───────────────────────────────────────────────
  insightsTipSeen: false,
  markInsightsTipSeen: () => set({ insightsTipSeen: true }),
    }),
    {
      name: 'freshprep-store',
      version: 4,
      migrate: (persisted: any, storedVersion: number) => {
        if (storedVersion < 3) {
          return {
            ...persisted,
            recipes: SEED_RECIPES,
            ingredientLibrary: buildLibraryFromRecipes(SEED_RECIPES),
          };
        }
        if (storedVersion < 4) {
          // Remove seeded demo data — users now start with a clean slate
          return {
            ...persisted,
            preparedMeals: [],
            scheduledMeals: [],
            eatenScheduledIds: [],
            mealEatenDates: [],
            mealsEatenAllTime: 0,
            prepSessionsLogged: 0,
            unlockedMessageIds: [],
            pendingCelebrations: [],
            prepEventDates: [],
          };
        }
        return persisted;
      },
    }
  )
);
