export type StorageType = 'refrigerated' | 'frozen';
export type MealTime = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type FreshnessStatus = 'fresh' | 'expiring' | 'expired';

export interface NutrientInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IngredientNutrition {
  fdcId: number;
  foodDescription: string;
  source?: 'usda' | 'manual';
  per100g: NutrientInfo;
  gramsPerUnit: number;
  portionLabel: string;
}

// The food-record portion of IngredientNutrition — shared across all uses of the same ingredient name.
// Portion data (gramsPerUnit, portionLabel) stays per-recipe; per100g is always library-sourced.
export interface FoodRecord {
  fdcId: number;
  foodDescription: string;
  per100g: NutrientInfo;
}

export interface UserPrefs {
  mealsPerWeek: number;
  mealTypes: ('breakfast' | 'lunch' | 'dinner')[];
  prepFrequency: '1x' | '2x' | 'flexible';
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  category?: string;
  nutrition?: IngredientNutrition;
}

export interface SlotOption {
  name: string;
  quantity: string;
  category?: string;
  nutrition?: IngredientNutrition;
}

export interface ComponentSlot {
  id: string;
  label: string;
  options: SlotOption[];
}

export interface RecipeVariant {
  id: string;
  name: string;
  additionalIngredients: Ingredient[];
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  type: 'standard' | 'composed';
  serves: number; // meals produced per prep. Composed recipes are always 1; standard recipes reflect batch size.
  tags?: string[];
  // standard recipes
  coreIngredients: Ingredient[];
  variants: RecipeVariant[];
  // composed recipes
  slots?: ComponentSlot[];
}

// A single entry in the user's active prep plan
export interface PlanEntry {
  id: string;
  recipeId: string;
  servings: number;
  selectedVariantIds: string[];           // standard: 1=decided, 2+=flexible
  slotPicks: Record<string, string[]>;    // composed: slotId → selected options
}

export interface PrepEvent {
  id: string;
  recipeId: string;
  variantId?: string;
  slotPicks?: Record<string, string>;     // composed: slotId → single chosen option
  servings: number;
  prepDate: string;
  storage: StorageType;
}

export interface PreparedMeal {
  id: string;
  prepEventId: string;
  recipeId: string;
  variantId?: string;
  recipeName: string;
  variantName: string;
  servingsTotal: number;
  servingsRemaining: number;
  prepDate: string;
  storage: StorageType;
  nutrientsPerServing?: NutrientInfo;
}

export interface PendingPrep {
  id: string;
  recipeId: string;
  recipeName: string;
  servings: number;
  // standard recipe
  variantId?: string;
  variantName?: string;
  pendingVariants?: { id: string; name: string }[];   // present if multiple variants selected
  // composed recipe
  slotPicks?: Record<string, string[]>;               // slotId → options (may need resolution)
}

export interface UserProfile {
  name:     string;
  joinedAt: number;  // timestamp
}

export interface NutritionGoals {
  calories: number | null;
  protein:  number | null;  // g
  carbs:    number | null;  // g
  fat:      number | null;  // g
}

export type NotificationDelivery = 'inapp' | 'push' | 'both';

export interface NotificationSettings {
  enabled:               boolean;
  delivery:              NotificationDelivery;
  expiryEnabled:         boolean;
  expiryThresholdDays:   1 | 2 | 3;
  inventoryEnabled:      boolean;
  inventoryThreshold:    2 | 3 | 5;
  preferredHour:         number;   // 0–23: earliest hour to fire push that day
  minIntervalHours:      4 | 8 | 24;
}

export interface AppNotification {
  id:        string;
  type:      'expiry' | 'inventory';
  title:     string;
  body:      string;
  timestamp: number;
  read:      boolean;
}

export interface ScheduledMeal {
  id: string;
  date: string;
  mealTime: MealTime;
  preparedMealId: string;
}

export interface PendingCelebration {
  id: string;
  set: string;
  setLabel: string;
  emoji: string;
  text: string;
  cardNumber: number;
  totalUnlocked: number;
}
