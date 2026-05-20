import { Recipe, IngredientNutrition } from '../types';

// Shorthand constructor — keeps the ingredient rows concise
function n(
  fdcId: number,
  foodDescription: string,
  calories: number, protein: number, carbs: number, fat: number,
  gramsPerUnit: number,
  portionLabel: string,
): IngredientNutrition {
  return { fdcId, foodDescription, per100g: { calories, protein, carbs: Math.max(0, carbs), fat }, gramsPerUnit, portionLabel };
}

// ── Shared nutrition objects ──────────────────────────────────────────────────

const NUT = {
  // ── Proteins ──────────────────────────────────────────────────────────────
  chickenBreast:  n(2646170, 'Chicken, breast, boneless, skinless, raw',         112, 22.53,  0,      1.93,  174,    '1 breast'),
  steak:          n(2727574, 'Beef, top sirloin steak, raw',                      146, 21.98,  0.22,   5.71,  170,    '1 steak'),
  porkChop:       n(2727575, 'Pork, chop, center cut, raw',                       145, 22.81,  0,      5.48,  113,    '1 chop'),
  salmon:         n(173688,  'Fish, salmon, chinook, raw',                         179, 19.93,  0,     10.43,  198,    '1 fillet'),
  groundTurkey:   n(171505,  'Turkey, Ground, raw',                                148, 19.66,  0,      7.66,  28.35,  '1 oz'),
  shrimp:         n(175180,  'Crustaceans, shrimp, cooked',                         99, 23.98,  0.20,   0.28,  28.35,  '1 oz'),

  // ── Legumes ───────────────────────────────────────────────────────────────
  blackBeans:     n(173735,  'Beans, black, mature seeds, cooked, boiled, without salt',  132,  8.86, 23.71,  0.54,  172,    '1 cup'),
  chickpeas:      n(173757,  'Chickpeas, mature seeds, cooked, boiled, without salt',     164,  8.86, 27.42,  2.59,  164,    '1 cup'),
  edamame:        n(168411,  'Edamame, frozen, prepared',                                 121, 11.91,  8.91,  5.20,  155,    '1 cup'),

  // ── Grains & starches ─────────────────────────────────────────────────────
  whiteRice:      n(2512381, 'Rice, white, long grain, unenriched, raw',          370,  7.04, 80.31,  1.03,  185,    '1 cup dry'),
  brownRice:      n(2512380, 'Rice, brown, long grain, unenriched, raw',          368,  7.25, 76.69,  3.31,  185,    '1 cup dry'),
  wildRice:       n(2710821, 'Wild rice, dry, raw',                               359, 12.79, 75.67,  1.70,  170,    '1 cup dry'),
  quinoa:         n(168874,  'Quinoa, uncooked',                                  368, 14.12, 64.16,  6.07,  170,    '1 cup dry'),
  pasta:          n(2758998, 'Pasta, dry, enriched, spaghetti',                   369,  7.04, 80.31,  1.03,  28.35,  '1 oz'),
  orzo:           n(169736,  'Pasta, dry, enriched',                              371, 13.00, 74.70,  1.51,  210,    '1 cup dry'),
  rolledOats:     n(173904,  'Cereals, oats, regular and quick, not fortified, dry', 379, 13.15, 67.70, 6.52,  81,     '1 cup dry'),
  potato:         n(170026,  'Potatoes, flesh and skin, raw',                      77,  2.05, 17.49,  0.09,  213,    '1 medium'),
  sweetPotato:    n(2346404, 'Sweet potatoes, orange flesh, without skin, raw',    77,  1.58, 17.33,  0.38,  130,    '1 medium'),
  flourTortilla:  n(175037,  'Tortillas, ready-to-bake or -fry, flour, refrigerated', 306, 8.20, 49.38, 7.99,  49,     '1 large (7-8")'),

  // ── Vegetables ────────────────────────────────────────────────────────────
  broccoli:         n(170379,  'Broccoli, raw',                                  34,  2.82,  6.64,  0.37,   91,    '1 cup florets'),
  asparagus:        n(2710823, 'Asparagus, green, raw',                           24,  1.44,  5.10,  0.22,   16,    '1 spear (~5")'),
  brusselsSprouts:  n(2685575, 'Brussels sprouts, raw',                           34,  1.97,  7.41,  0.28,   88,    '1 cup halved'),
  greenBeans:       n(2346400, 'Beans, snap, green, raw',                         16,  0.98,  3.27,  0.21,  100,    '1 cup'),
  zucchini:         n(169291,  'Squash, summer, zucchini, includes skin, raw',    17,  1.21,  3.11,  0.32,  196,    '1 medium'),
  spinach:          n(168462,  'Spinach, raw',                                    23,  2.86,  3.63,  0.39,   30,    '1 cup fresh'),
  cucumber:         n(2346406, 'Cucumber, with peel, raw',                        14,  0.63,  2.95,  0.18,  201,    '1 cucumber'),
  cherryTomatoes:   n(170457,  'Tomatoes, red, ripe, raw, year round average',    18,  0.88,  3.89,  0.20,  149,    '1 cup'),
  carrots:          n(170393,  'Carrots, raw',                                    41,  0.93,  9.58,  0.24,  110,    '1 cup'),
  celery:           n(169988,  'Celery, raw',                                     14,  0.69,  2.97,  0.17,  101,    '1 stalk'),
  onion:            n(790646,  'Onions, yellow, raw',                             38,  0.83,  8.61,  0.05,  143,    '1 medium'),
  redOnion:         n(790577,  'Onions, red, raw',                                44,  0.94,  9.93,  0.10,  197,    '1 whole'),
  garlic:           n(169230,  'Garlic, raw',                                    149,  6.36, 33.10,  0.50,    3,    '1 clove'),
  scallion:         n(2727585, 'Green onion, (scallion), bulb and greens, raw',   32,  1.83,  7.34,  0.19,   15,    '1 medium scallion'),
  bokChoy:          n(170390,  'Cabbage, chinese (pak-choi), raw',                13,  1.50,  2.18,  0.20,   70,    '1 cup shredded'),
  beanSprouts:      n(169957,  'Mung beans, mature seeds, sprouted, raw',         30,  3.04,  5.94,  0.18,  104,    '1 cup'),
  jalapeno:         n(168576,  'Peppers, jalapeno, raw',                          29,  0.91,  6.50,  0.37,   14,    '1 pepper'),
  gingerRoot:       n(169231,  'Ginger root, raw',                                80,  1.82, 17.77,  0.75,    6,    '1 tbsp grated'),
  corn:             n(169998,  'Corn, sweet, yellow, raw',                        86,  3.27, 18.70,  1.35,  145,    '1 cup'),
  springMix:        n(2346391, 'Lettuce, leaf, green, raw',                               19,  1.10,  4.10,  0.20,   36,    '1 cup'),
  avocado:          n(2710824, 'Avocado, Hass, peeled, raw',                     206,  1.81,  8.32, 20.31,  136,    '1 avocado'),
  mango:            n(169910,  'Mangos, raw',                                     60,  0.82, 14.98,  0.38,  165,    '1 cup pieces'),
  banana:           n(173944,  'Bananas, raw',                                    89,  1.09, 22.80,  0.33,  118,    '1 medium'),
  lemon:            n(167746,  'Lemons, raw, without peel',                       29,  1.10,  9.32,  0.30,   84,    '1 lemon'),
  lime:             n(168155,  'Limes, raw',                                      30,  0.70, 10.54,  0.20,   67,    '1 lime'),
  cilantro:         n(169997,  'Coriander (cilantro) leaves, raw',                23,  2.13,  3.67,  0.52,   16,    '1 cup fresh'),
  basil:            n(172232,  'Basil, fresh',                                    23,  3.15,  2.65,  0.64,   24,    '1 cup leaves'),

  // ── Dairy & eggs ──────────────────────────────────────────────────────────
  eggs:           n(171287,  'Egg, whole, raw, fresh',                           143, 12.56,  0.72,  9.51,   50,    '1 large egg'),
  cheddarCheese:  n(173414,  'Cheese, cheddar',                                  403, 22.87,  3.37, 33.31,  113,    '1 cup shredded'),
  fetaCheese:     n(2259796, 'Cheese, feta, whole milk, crumbled',                273, 19.71,  5.58, 19.08,  28.35,  '1 oz'),
  mozzarella:     n(170847,  'Cheese, mozzarella, part skim milk',                254, 24.26,  2.77, 15.92,  28.35,  '1 oz'),
  parmesan:       n(171247,  'Cheese, parmesan, grated',                          420, 38.46,  3.22, 27.84,    5,    '1 tbsp'),
  cottageCheese:  n(172182,  'Cheese, cottage, lowfat, 2% milkfat',               81, 10.40,  4.76,  2.27,  226,    '1 cup'),
  greekYogurt:    n(170894,  'Yogurt, Greek, plain, nonfat',                      59, 10.19,  3.60,  0.39,  227,    '1 cup'),
  almondMilk:     n(2257045, 'Almond milk, unsweetened, plain, refrigerated',      19,  0.66,  0.67,  1.56,  240,    '1 cup'),

  // ── Fats, seeds & nut butters ──────────────────────────────────────────────
  oliveOil:       n(171413,  'Oil, olive, salad or cooking',                     884,  0,      0,    100,    13.5,  '1 tbsp'),
  sesameSeeds:    n(170150,  'Seeds, sesame seeds, whole, dried',                 573, 17.73, 23.45, 49.67,    3,    '1 tsp'),
  chiaSeeds:      n(170554,  'Seeds, chia seeds, dried',                          486, 16.50, 42.10, 30.70,   10,    '1 tbsp'),
  peanutButter:   n(2262072, 'Peanut butter, creamy',                             589, 23.99, 22.70, 49.43,   16,    '1 tbsp'),
  peanutRaw:      n(2515376, 'Peanuts, raw',                                      567, 25.80, 16.13, 49.24,    9,    '1 tbsp'),

  // ── Pantry & condiments ───────────────────────────────────────────────────
  dicedTomatoes:  n(333281,  'Tomatoes, canned, red, ripe, diced',                18,  0.84,  3.32,  0.50,  411,    '1 can 14.5oz'),
  hummus:         n(174289,  'Hummus, commercial',                                237,  7.78, 15.00, 17.80,  246,    '1 cup'),
  salsa:          n(746777,  'Sauce, salsa, ready-to-serve',                       29,  1.44,  6.74,  0.19,  143,    '1 cup'),
  teriyakiSauce:  n(171167,  'Sauce, teriyaki, ready-to-serve',                    89,  5.93, 15.60,  0.02,   18,    '1 tbsp'),
  pickledGinger:  n(169765,  'Ginger root, pickled, canned, with artificial sweetener', 20, 0.33, 4.83, 0.10, 12.5, '1 tbsp'),
  olives:         n(169094,  'Olives, ripe, canned (small-extra large)',           116,  0.84,  6.04, 10.90,  134,    '1 cup'),
  chickBroth:     n(171609,  'Soup, chicken broth, low sodium, canned',            16,  2.00,  1.20,  0.60,  240,    '1 cup'),
};

export const SEED_RECIPES: Recipe[] = [

  // ── Protein Plate ────────────────────────────────────────────────────────
  {
    id: 'protein-plate',
    name: 'Protein Plate',
    description: 'Build your own balanced plate — pick a protein, carb, and vegetable.',
    type: 'composed', serves: 1,
    coreIngredients: [],
    variants: [],
    slots: [
      {
        id: 'protein', label: 'Protein',
        options: [
          { name: 'Chicken breast',  quantity: '1 breast',  nutrition: NUT.chickenBreast },
          { name: 'Steak',           quantity: '1 steak',   nutrition: NUT.steak },
          { name: 'Pork chop',       quantity: '1 chop',    nutrition: NUT.porkChop },
          { name: 'Salmon',          quantity: '1 fillet',  nutrition: NUT.salmon },
          { name: 'Ground turkey',   quantity: '6 oz',      nutrition: NUT.groundTurkey },
        ],
      },
      {
        id: 'carb', label: 'Carb',
        options: [
          { name: 'Brown rice',      quantity: '1/4 cup dry',  nutrition: NUT.brownRice },
          { name: 'Wild rice',       quantity: '1/4 cup dry',  nutrition: NUT.wildRice },
          { name: 'Potatoes',        quantity: '1 medium',     nutrition: NUT.potato },
          { name: 'Sweet potatoes',  quantity: '1 medium',     nutrition: NUT.sweetPotato },
          { name: 'Pasta',           quantity: '2 oz dry',     nutrition: NUT.pasta },
          { name: 'Quinoa',          quantity: '1/4 cup dry',  nutrition: NUT.quinoa },
        ],
      },
      {
        id: 'vegetable', label: 'Vegetable',
        options: [
          { name: 'Broccoli',         quantity: '1 cup florets',  nutrition: NUT.broccoli },
          { name: 'Asparagus',        quantity: '5 spears',        nutrition: NUT.asparagus },
          { name: 'Brussels sprouts', quantity: '1 cup halved',    nutrition: NUT.brusselsSprouts },
          { name: 'Green beans',      quantity: '1 cup',           nutrition: NUT.greenBeans },
          { name: 'Zucchini',         quantity: '1 medium',        nutrition: NUT.zucchini },
          { name: 'Spinach',          quantity: '2 cups fresh',    nutrition: NUT.spinach },
        ],
      },
    ],
  },

  // ── Rice Bowl ────────────────────────────────────────────────────────────
  {
    id: 'rice-bowl',
    name: 'Rice Bowl',
    description: 'A hearty rice bowl with globally inspired flavors.',
    type: 'standard', serves: 4,
    coreIngredients: [
      { id: 'rb-c1', name: 'White rice',      quantity: '1 cup dry',  nutrition: NUT.whiteRice },
      { id: 'rb-c2', name: 'Spring mix',      quantity: '4 cups',     nutrition: NUT.springMix },
      { id: 'rb-c3', name: 'Cucumber',        quantity: '1',          nutrition: NUT.cucumber },
      { id: 'rb-c4', name: 'Cherry tomatoes', quantity: '1 cup',      nutrition: NUT.cherryTomatoes },
      { id: 'rb-c5', name: 'Olive oil',       quantity: '1 tbsp',     nutrition: NUT.oliveOil },
    ],
    variants: [
      {
        id: 'rb-greek', name: 'Greek',
        additionalIngredients: [
          { id: 'rb-gr1', name: 'Feta cheese',     quantity: '4 oz',    nutrition: NUT.fetaCheese },
          { id: 'rb-gr2', name: 'Kalamata olives', quantity: '1/2 cup', nutrition: NUT.olives },
          { id: 'rb-gr3', name: 'Red onion',        quantity: '1/2',    nutrition: NUT.redOnion },
          { id: 'rb-gr4', name: 'Lemon',            quantity: '1',      nutrition: NUT.lemon },
          { id: 'rb-gr5', name: 'Tzatziki',         quantity: '1/2 cup' },
        ],
      },
      {
        id: 'rb-japanese', name: 'Japanese BBQ',
        additionalIngredients: [
          { id: 'rb-jp1', name: 'Edamame',        quantity: '1 cup',   nutrition: NUT.edamame },
          { id: 'rb-jp2', name: 'Pickled ginger', quantity: '2 tbsp',  nutrition: NUT.pickledGinger },
          { id: 'rb-jp3', name: 'Sesame seeds',   quantity: '1 tsp',   nutrition: NUT.sesameSeeds },
          { id: 'rb-jp4', name: 'Teriyaki sauce', quantity: '3 tbsp',  nutrition: NUT.teriyakiSauce },
          { id: 'rb-jp5', name: 'Scallions',      quantity: '2',       nutrition: NUT.scallion },
        ],
      },
      {
        id: 'rb-mexican', name: 'Mexican',
        additionalIngredients: [
          { id: 'rb-mx1', name: 'Black beans',   quantity: '1 can',    nutrition: NUT.blackBeans },
          { id: 'rb-mx2', name: 'Avocado',        quantity: '2',        nutrition: NUT.avocado },
          { id: 'rb-mx3', name: 'Salsa',          quantity: '1/2 cup',  nutrition: NUT.salsa },
          { id: 'rb-mx4', name: 'Lime',           quantity: '1',        nutrition: NUT.lime },
          { id: 'rb-mx5', name: 'Fresh cilantro', quantity: '1/4 cup',  nutrition: NUT.cilantro },
        ],
      },
      {
        id: 'rb-korean', name: 'Korean',
        additionalIngredients: [
          { id: 'rb-ko1', name: 'Bok choy',     quantity: '1 cup shredded', nutrition: NUT.bokChoy },
          { id: 'rb-ko2', name: 'Carrots',       quantity: '1 cup shredded', nutrition: NUT.carrots },
          { id: 'rb-ko3', name: 'Scallions',     quantity: '2',              nutrition: NUT.scallion },
          { id: 'rb-ko4', name: 'Sesame seeds',  quantity: '1 tsp',          nutrition: NUT.sesameSeeds },
          { id: 'rb-ko5', name: 'Jalapeño',      quantity: '1 pepper',       nutrition: NUT.jalapeno },
          { id: 'rb-ko6', name: 'Fresh ginger',  quantity: '1 tbsp',         nutrition: NUT.gingerRoot },
        ],
      },
      {
        id: 'rb-thai', name: 'Thai Peanut',
        additionalIngredients: [
          { id: 'rb-th1', name: 'Carrots',        quantity: '1 cup shredded', nutrition: NUT.carrots },
          { id: 'rb-th2', name: 'Bean sprouts',   quantity: '1 cup',          nutrition: NUT.beanSprouts },
          { id: 'rb-th3', name: 'Peanut butter',  quantity: '2 tbsp',         nutrition: NUT.peanutButter },
          { id: 'rb-th4', name: 'Peanuts',        quantity: '2 tbsp',         nutrition: NUT.peanutRaw },
          { id: 'rb-th5', name: 'Lime',           quantity: '1',              nutrition: NUT.lime },
          { id: 'rb-th6', name: 'Fresh cilantro', quantity: '1/4 cup',        nutrition: NUT.cilantro },
        ],
      },
      {
        id: 'rb-caprese', name: 'Italian Caprese',
        additionalIngredients: [
          { id: 'rb-cp1', name: 'Fresh mozzarella', quantity: '4 oz',    nutrition: NUT.mozzarella },
          { id: 'rb-cp2', name: 'Fresh basil',       quantity: '1/4 cup', nutrition: NUT.basil },
          { id: 'rb-cp3', name: 'Parmesan',          quantity: '4 tbsp',  nutrition: NUT.parmesan },
        ],
      },
      {
        id: 'rb-hawaiian', name: 'Hawaiian',
        additionalIngredients: [
          { id: 'rb-hw1', name: 'Shrimp',       quantity: '4 oz',    nutrition: NUT.shrimp },
          { id: 'rb-hw2', name: 'Mango',        quantity: '1 cup',   nutrition: NUT.mango },
          { id: 'rb-hw3', name: 'Edamame',      quantity: '1/2 cup', nutrition: NUT.edamame },
          { id: 'rb-hw4', name: 'Scallions',    quantity: '2',       nutrition: NUT.scallion },
          { id: 'rb-hw5', name: 'Sesame seeds', quantity: '1 tsp',   nutrition: NUT.sesameSeeds },
        ],
      },
      {
        id: 'rb-southwest', name: 'Southwest',
        additionalIngredients: [
          { id: 'rb-sw1', name: 'Corn',        quantity: '1 cup',    nutrition: NUT.corn },
          { id: 'rb-sw2', name: 'Black beans', quantity: '1/2 can',  nutrition: NUT.blackBeans },
          { id: 'rb-sw3', name: 'Avocado',     quantity: '1',        nutrition: NUT.avocado },
          { id: 'rb-sw4', name: 'Jalapeño',    quantity: '1 pepper', nutrition: NUT.jalapeno },
          { id: 'rb-sw5', name: 'Lime',        quantity: '1',        nutrition: NUT.lime },
        ],
      },
    ],
  },

  // ── Breakfast Burrito ────────────────────────────────────────────────────
  {
    id: 'breakfast-burrito',
    name: 'Breakfast Burrito',
    description: 'Classic breakfast burritos — easy to batch prep and reheat all week.',
    type: 'standard', serves: 6,
    coreIngredients: [
      { id: 'bb-c1', name: 'Flour tortillas',    quantity: '6 large',  nutrition: NUT.flourTortilla },
      { id: 'bb-c2', name: 'Eggs',               quantity: '6',        nutrition: NUT.eggs },
      { id: 'bb-c3', name: 'Shredded cheese',    quantity: '1 cup',    nutrition: NUT.cheddarCheese },
      { id: 'bb-c4', name: 'Breakfast sausage',  quantity: '1 lb' },
      { id: 'bb-c5', name: 'Frozen hash browns', quantity: '2 cups' },
      { id: 'bb-c6', name: 'Salt & pepper',      quantity: 'to taste' },
    ],
    variants: [],
  },

  // ── Ground Turkey Bolognese ───────────────────────────────────────────────
  {
    id: 'turkey-bolognese',
    name: 'Ground Turkey Bolognese',
    description: 'Lean turkey meat sauce slow-simmered with vegetables. Makes 6 generous servings — freeze half.',
    type: 'standard', serves: 6,
    coreIngredients: [
      { id: 'tb-1', name: 'Ground turkey',  quantity: '1 lb',          nutrition: NUT.groundTurkey },
      { id: 'tb-2', name: 'Pasta',          quantity: '12 oz dry',     nutrition: NUT.pasta },
      { id: 'tb-3', name: 'Diced tomatoes', quantity: '1 can',         nutrition: NUT.dicedTomatoes },
      { id: 'tb-4', name: 'Carrots',        quantity: '1 cup diced',   nutrition: NUT.carrots },
      { id: 'tb-5', name: 'Celery',         quantity: '2 stalks',      nutrition: NUT.celery },
      { id: 'tb-6', name: 'Onion',          quantity: '1 medium',      nutrition: NUT.onion },
      { id: 'tb-7', name: 'Garlic',         quantity: '4 cloves',      nutrition: NUT.garlic },
      { id: 'tb-8', name: 'Olive oil',      quantity: '1 tbsp',        nutrition: NUT.oliveOil },
      { id: 'tb-9', name: 'Italian seasoning', quantity: '1 tsp' },
    ],
    variants: [],
  },

  // ── Lemon Chicken Orzo ────────────────────────────────────────────────────
  {
    id: 'lemon-chicken-orzo',
    name: 'Lemon Chicken Orzo',
    description: 'Bright, comforting orzo with juicy chicken, wilted spinach, and parmesan. One skillet, 25 minutes.',
    type: 'standard', serves: 4,
    coreIngredients: [
      { id: 'lco-1', name: 'Chicken breast', quantity: '1 lb',      nutrition: NUT.chickenBreast },
      { id: 'lco-2', name: 'Orzo',          quantity: '1 cup dry',  nutrition: NUT.orzo },
      { id: 'lco-3', name: 'Spinach',       quantity: '2 cups',     nutrition: NUT.spinach },
      { id: 'lco-4', name: 'Lemon',         quantity: '2',          nutrition: NUT.lemon },
      { id: 'lco-5', name: 'Garlic',        quantity: '3 cloves',   nutrition: NUT.garlic },
      { id: 'lco-6', name: 'Parmesan',      quantity: '4 tbsp',     nutrition: NUT.parmesan },
      { id: 'lco-7', name: 'Chicken broth', quantity: '2 cups',     nutrition: NUT.chickBroth },
      { id: 'lco-8', name: 'Olive oil',     quantity: '1 tbsp',     nutrition: NUT.oliveOil },
    ],
    variants: [],
  },

  // ── Smashed Chickpea & Feta Salad ────────────────────────────────────────
  {
    id: 'smashed-chickpea-feta',
    name: 'Smashed Chickpea & Feta Salad',
    description: 'Protein-rich Mediterranean salad — no cooking required. Stays fresh for 4 days in the fridge.',
    type: 'standard', serves: 4,
    coreIngredients: [
      { id: 'scf-1', name: 'Chickpeas',      quantity: '3 cups',    nutrition: NUT.chickpeas },
      { id: 'scf-2', name: 'Feta cheese',    quantity: '4 oz',      nutrition: NUT.fetaCheese },
      { id: 'scf-3', name: 'Cucumber',       quantity: '1',         nutrition: NUT.cucumber },
      { id: 'scf-4', name: 'Cherry tomatoes',quantity: '1 cup',     nutrition: NUT.cherryTomatoes },
      { id: 'scf-5', name: 'Red onion',      quantity: '1/2',       nutrition: NUT.redOnion },
      { id: 'scf-6', name: 'Lemon',          quantity: '1',         nutrition: NUT.lemon },
      { id: 'scf-7', name: 'Olive oil',      quantity: '2 tbsp',    nutrition: NUT.oliveOil },
    ],
    variants: [],
  },

  // ── Overnight Oats ────────────────────────────────────────────────────────
  {
    id: 'overnight-oats',
    name: 'Overnight Oats',
    description: 'Prep 4 jars in 10 minutes. High-fiber, high-protein breakfast ready to grab every morning.',
    type: 'standard', serves: 4,
    coreIngredients: [
      { id: 'oo-1', name: 'Rolled oats',   quantity: '2 cups',   nutrition: NUT.rolledOats },
      { id: 'oo-2', name: 'Greek yogurt',  quantity: '1 cup',    nutrition: NUT.greekYogurt },
      { id: 'oo-3', name: 'Chia seeds',    quantity: '4 tbsp',   nutrition: NUT.chiaSeeds },
      { id: 'oo-4', name: 'Banana',        quantity: '2',        nutrition: NUT.banana },
      { id: 'oo-5', name: 'Almond milk',   quantity: '2 cups',   nutrition: NUT.almondMilk },
    ],
    variants: [],
  },

  // ── Cottage Cheese & Egg Scramble ────────────────────────────────────────
  {
    id: 'cottage-cheese-scramble',
    name: 'Cottage Cheese & Egg Scramble',
    description: 'Creamy high-protein scramble — cottage cheese melts into the eggs for extra richness without the calories.',
    type: 'standard', serves: 4,
    coreIngredients: [
      { id: 'ces-1', name: 'Eggs',           quantity: '8',       nutrition: NUT.eggs },
      { id: 'ces-2', name: 'Cottage cheese', quantity: '1 cup',   nutrition: NUT.cottageCheese },
      { id: 'ces-3', name: 'Spinach',        quantity: '2 cups',  nutrition: NUT.spinach },
      { id: 'ces-4', name: 'Cherry tomatoes',quantity: '1 cup',   nutrition: NUT.cherryTomatoes },
      { id: 'ces-5', name: 'Olive oil',      quantity: '1 tbsp',  nutrition: NUT.oliveOil },
    ],
    variants: [],
  },

  // ── Protein Hummus Plate ──────────────────────────────────────────────────
  {
    id: 'protein-hummus-plate',
    name: 'Protein Hummus Plate',
    description: 'No-cook snack-style plate packed with protein and fiber. Portion into containers for an easy grab-and-go lunch.',
    type: 'standard', serves: 4,
    coreIngredients: [
      { id: 'php-1', name: 'Hummus',          quantity: '1 cup',    nutrition: NUT.hummus },
      { id: 'php-2', name: 'Hard-boiled eggs',quantity: '4',        nutrition: NUT.eggs },
      { id: 'php-3', name: 'Cucumber',        quantity: '1',        nutrition: NUT.cucumber },
      { id: 'php-4', name: 'Cherry tomatoes', quantity: '1 cup',    nutrition: NUT.cherryTomatoes },
      { id: 'php-5', name: 'Carrots',         quantity: '1 cup',    nutrition: NUT.carrots },
    ],
    variants: [],
  },

];

export const SHELF_LIFE_DAYS: Record<'refrigerated' | 'frozen', number> = {
  refrigerated: 4,
  frozen: 90,
};
