const CATEGORY_ORDER = [
  'Produce',
  'Proteins',
  'Grains & Carbs',
  'Dairy',
  'Canned & Dry Goods',
  'Condiments & Spices',
  'Frozen',
  'Other',
];

export function categorizeIngredient(name: string): string {
  const n = name.toLowerCase();

  if (/broccoli|asparagus|brussels|green bean|zucchini|spinach|cucumber|tomato|spring mix|avocado|lime|lemon|cilantro|parsley|rosemary|thyme|oregano|scallion|ginger|garlic|onion|pepper|mushroom|lettuce|jalape|red onion|bell pepper|banana|mango|berry|apple|fruit|bok choy|sprout|carrot|corn|celery|basil/.test(n))
    return 'Produce';

  if (/chicken|steak|pork|salmon|turkey|egg|sausage|beef|fish|meat|fillet|breast|chop|shrimp|tuna|ground/.test(n))
    return 'Proteins';

  if (/rice|pasta|quinoa|potato|sweet potato|tortilla|hash brown|bread|flour|oat|orzo|grain|barley|farro|couscous|bulgur/.test(n))
    return 'Grains & Carbs';

  if (/cheese|butter|milk|cream|yogurt|tzatziki|feta|cottage/.test(n))
    return 'Dairy';

  if (/bean|lentil|chickpea|olive|edamame|pickle|salsa|teriyaki|soy sauce|sesame oil|red wine vinegar|dijon|hummus|tahini|broth|stock|canned|coconut milk/.test(n))
    return 'Canned & Dry Goods';

  if (/oil|vinegar|sauce|mustard|salt|spice|seasoning|seed|flake|herb|warm|honey|maple|hot sauce|gold/.test(n))
    return 'Condiments & Spices';

  if (/frozen/.test(n))
    return 'Frozen';

  return 'Other';
}

// Map Protein Plate slot labels to categories
export function categorizeSlotLabel(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('protein')) return 'Proteins';
  if (l.includes('carb')) return 'Grains & Carbs';
  if (l.includes('vegetable') || l.includes('veg')) return 'Produce';
  return 'Other';
}

export { CATEGORY_ORDER };
