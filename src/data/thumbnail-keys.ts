/**
 * Pure thumbnail matching logic, kept separate from the bundled PNG assets so
 * it can be verified headlessly against every product in the catalog.
 *
 * Resolution order: exact demo name → specific keyword → department → cart.
 * A compact icon set covers thousands of products without network requests.
 */
export type ThumbnailKey =
  | 'apple'
  | 'bagel'
  | 'banana'
  | 'beer'
  | 'bottle'
  | 'bread'
  | 'broom'
  | 'cake'
  | 'carrot'
  | 'cart'
  | 'canned'
  | 'cheese'
  | 'chicken'
  | 'chips'
  | 'chocolate'
  | 'coffee'
  | 'cookie'
  | 'croissant'
  | 'cupcake'
  | 'egg'
  | 'fish'
  | 'gift'
  | 'ham'
  | 'honey'
  | 'hotDog'
  | 'ice'
  | 'iceCream'
  | 'juice'
  | 'leafy'
  | 'milk'
  | 'oil'
  | 'orange'
  | 'paper'
  | 'pasta'
  | 'pet'
  | 'peanuts'
  | 'pizza'
  | 'popcorn'
  | 'rice'
  | 'salt'
  | 'sandwich'
  | 'shrimp'
  | 'soap'
  | 'sponge'
  | 'strawberry'
  | 'tomato'
  | 'water';

/** Exact names used by the ten-item demo and by the sample-list generator. */
const EXACT: Record<string, ThumbnailKey> = {
  bananas: 'banana',
  'ice cream vanilla': 'iceCream',
  bagels: 'bagel',
  'chicken breast': 'chicken',
  'paper towel': 'paper',
  'milk whole': 'milk',
  'corn chips': 'chips',
  'coffee mexican vanilla': 'coffee',
  'sesame oil': 'oil',
  ham: 'ham',
};

/** More specific matches come first so "chicken breast" beats "bread". */
const KEYWORDS: [RegExp, ThumbnailKey][] = [
  [/ice cream|sorbet|gelato|frozen yogurt/, 'iceCream'],
  [/beer|wine|vodka|whiskey|bourbon|tequila|rum|alcohol/, 'beer'],
  [/canned|can of|soup|stew/, 'canned'],
  [/baby|infant|diaper|formula/, 'bottle'],
  [/pet|dog food|cat food/, 'pet'],
  [/paper towel|tissue|napkin|toilet paper/, 'paper'],
  [/chicken|turkey|poultry/, 'chicken'],
  [/coffee|espresso|latte|cappuccino/, 'coffee'],
  [/bagel/, 'bagel'],
  [/banana/, 'banana'],
  [/milk|creamer/, 'milk'],
  [/chips|crisps|nacho/, 'chips'],
  [/oil|olive/, 'oil'],
  [/ham|bacon|pork|salami/, 'ham'],
  [/strawberr/, 'strawberry'],
  [/orange|tangerine|clementine/, 'orange'],
  [/apple/, 'apple'],
  [/carrot/, 'carrot'],
  [/tomato/, 'tomato'],
  [/lettuce|spinach|greens|salad|leafy/, 'leafy'],
  [/shrimp|prawn/, 'shrimp'],
  [/fish|salmon|tuna|cod/, 'fish'],
  [/egg/, 'egg'],
  [/cheese/, 'cheese'],
  [/butter|salt|pepper|spice|season/, 'salt'],
  [/honey/, 'honey'],
  [/peanut|almond|walnut|nut/, 'peanuts'],
  [/croissant/, 'croissant'],
  [/cupcake|muffin/, 'cupcake'],
  [/bread|roll|bun|baguette/, 'bread'],
  [/pizza/, 'pizza'],
  [/pasta|spaghetti|macaroni|noodle/, 'pasta'],
  [/rice|cereal|grain|oat/, 'rice'],
  [/cookie|biscuit/, 'cookie'],
  [/chocolate|candy/, 'chocolate'],
  [/cake/, 'cake'],
  [/popcorn/, 'popcorn'],
  [/sandwich|sub|wrap/, 'sandwich'],
  [/hot dog/, 'hotDog'],
  [/water|soda|sparkling/, 'water'],
  [/juice|lemonade|drink mix/, 'juice'],
  [/bottle|shampoo|detergent/, 'bottle'],
  [/soap|shampoo|cleaner/, 'soap'],
  [/broom|mop|brush/, 'broom'],
  [/sponge|scrub/, 'sponge'],
  [/ice|frozen/, 'ice'],
];

const DEPARTMENTS: [RegExp, ThumbnailKey][] = [
  [/produce/i, 'leafy'],
  [/frozen/i, 'iceCream'],
  [/bakery|breakfast/i, 'bread'],
  [/meat|seafood/i, 'ham'],
  [/household/i, 'paper'],
  [/dairy|eggs/i, 'milk'],
  [/snacks|bulk/i, 'popcorn'],
  [/beverages|alcohol/i, 'beer'],
  [/pantry|canned goods|international/i, 'canned'],
  [/deli/i, 'sandwich'],
  [/personal care/i, 'soap'],
  [/babies/i, 'bottle'],
  [/dry goods pasta/i, 'pasta'],
  [/pets/i, 'pet'],
];

function normalized(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Chooses a thumbnail key for any catalog product, with a stable fallback. */
export function thumbnailKeyForProduct(
  name: string,
  departmentName?: string | null
): ThumbnailKey {
  const lower = normalized(name);
  const exact = EXACT[lower];
  if (exact) return exact;

  for (const [pattern, key] of KEYWORDS) {
    if (pattern.test(lower)) return key;
  }

  if (departmentName) {
    const department = normalized(departmentName);
    for (const [pattern, key] of DEPARTMENTS) {
      if (pattern.test(department)) return key;
    }
  }

  return 'cart';
}
