/**
 * Turns the Instacart-style CSV export in `data/store` into a single compact
 * catalog that the app can import directly.
 *
 * Run with: node scripts/build-store-catalog.mjs
 *
 * Why a generated catalog instead of parsing CSV at runtime:
 * - the app runs in Expo Go, so no native build step is needed
 * - the JSON is bundled by Metro, so there is no asset/file IO to get wrong
 * - `products.csv` has 3,330 quoted names containing commas, which a naive
 *   `split(',')` would corrupt, so parsing happens exactly once, here
 *
 * The source export is a market-basket sample: it lists tens of thousands of
 * products per aisle with no stock information. That is not what a shelf looks
 * like, so this script models the physical store instead:
 *
 * - every product gets a stock quantity, derived deterministically from its
 *   name so the catalog is reproducible
 * - every shelf section has a finite capacity in facing slots
 * - products are picked per aisle until the shelf is full, preferring the
 *   generic, recognisable items and capping how much of the shelf one brand
 *   can take
 *
 * The result is a catalog small enough to search instantly and shaped like a
 * real set of shelves.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'data', 'store');
const outputFile = join(root, 'src', 'data', 'store-catalog.json');

/** How many units of a product fit in one facing slot. */
const UNITS_PER_SLOT = 6;
/** How many facing slots a single shelf section holds. */
const SHELF_SLOTS = 40;
/** Most of one brand's products may take up at most this many slots. */
const MAX_BRAND_SHARE = 0.25;
/** Products of one type ("Bananas") a single shelf may carry. */
const MAX_VARIANTS_PER_TYPE = 3;
/** A shelf always carries at least this many products, even if they overflow. */
const MIN_PRODUCTS_PER_SHELF = 6;

/** Minimal RFC 4180 parser: handles quotes, escaped quotes, CRLF and a BOM. */
function parseCsv(text) {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }

  return rows;
}

function readTable(name) {
  const [header, ...rows] = parseCsv(readFileSync(join(sourceDir, name), 'utf8'));
  return rows.map((row) => Object.fromEntries(header.map((key, index) => [key, row[index] ?? ''])));
}

/** Stable 32-bit string hash, so the catalog is identical on every build. */
function hashString(value) {
  let hash = 0x811c9dc5;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

/** A random-looking fraction in [0, 1) derived from a string. */
function hashUnit(value) {
  return hashString(value) / 0x100000000;
}

const STOP_WORDS = new Set([
  'and',
  'with',
  'the',
  'for',
  'in',
  'of',
  'a',
  'to',
  'organic',
  'free',
  'from',
]);

/** Words that identify a product family, used to group a shelf by brand. */
function familyOf(name) {
  const word = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .find((part) => part.length > 2 && !STOP_WORDS.has(part));

  return word ?? name.toLowerCase();
}

/** Trailing packaging words that are not part of the product itself. */
const PACKAGE_WORDS = new Set([
  'bag',
  'bags',
  'box',
  'boxes',
  'bunch',
  'bundle',
  'bottles',
  'can',
  'cans',
  'case',
  'cases',
  'count',
  'ct',
  'each',
  'jar',
  'jars',
  'lb',
  'lbs',
  'oz',
  'pack',
  'packs',
  'package',
  'pk',
  'pound',
  'lbs',
  'tub',
  'tubs',
]);

/**
 * The head noun of a product name: what the thing actually is.
 *
 * "Green Bananas, Bag" and "Organic Bananas" are both bananas, and a shelf
 * should not be filled with six near-identical bananas while the apple
 * section gets nothing.
 */
function headNoun(name) {
  const words = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));

  while (words.length > 1 && PACKAGE_WORDS.has(words[words.length - 1])) {
    words.pop();
  }

  const head = words[words.length - 1] ?? name.toLowerCase();
  return head.endsWith('s') && head.length > 3 ? head.slice(0, -1) : head;
}

/**
 * How core a product is to its section.
 *
 * A store stocks the plain, recognisable version of something, so short names
 * that still say what the product is ("Bananas", "Green Bananas") win over
 * elaborate ones ("Organic Russian Banana Fingerling Potato"). Names that
 * mention the section are a bonus.
 *
 * The exception is a name that is only the section's own category word: a
 * shelf labelled "Candy" does not contain a product called "Candy".
 */
function coreScore(name, aisleKeywords, aisleName) {
  const words = name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const meaningful = words.filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  const matches = meaningful.filter((word) => aisleKeywords.has(word)).length;

  let score = 100 - name.length * 0.8 + matches * 14;

  // The name is just the section's own label, not a product.
  if (meaningful.length <= 1 && matches >= 1) score -= 80;
  if (name.toLowerCase() === aisleName.toLowerCase()) score -= 80;

  // Very long names are niche products buried at the back of the shelf.
  score -= Math.max(0, name.length - 40) * 1.5;

  return score;
}

/**
 * How common a product type is across the whole store.
 *
 * Bananas turn up in the produce section, in bread, in granola and in baby
 * food, so they are a thing people actually buy. Kumkuats turn up once. A
 * shelf stocked by how common its types are therefore looks like a real
 * produce section, and it keeps the words people search for on the shelf.
 */
function typeFrequency(aisleProductNames) {
  const frequency = new Map();

  for (const names of aisleProductNames.values()) {
    for (const name of names) {
      const head = headNoun(name);
      frequency.set(head, (frequency.get(head) ?? 0) + 1);
    }
  }

  return frequency;
}

/**
 * Stock quantity for a product. Core items of the section are stocked deeper,
 * which is what makes a shelf look like a shelf rather than a sample.
 */
function quantityFor(name, aisleKeywords) {
  const words = name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const matches = words.filter((word) => aisleKeywords.has(word)).length;
  const roll = hashUnit(`qty:${name}`);

  let quantity = 1 + Math.floor(roll * 11);
  if (matches > 0) quantity += 2 + matches * 2;
  if (name.length <= 18) quantity += 3;

  return Math.min(24, quantity);
}

/** Facing slots a product takes up on the shelf. */
function slotsFor(quantity) {
  return Math.max(1, Math.ceil(quantity / UNITS_PER_SLOT));
}

const departmentRows = readTable('departments.csv');
const aisleRows = readTable('aisles.csv');
const productRows = readTable('products.csv');

const departmentNames = new Map(departmentRows.map((row) => [Number(row.department_id), row.department]));

const aisleDepartments = new Map();
const aisleNames = new Map();
for (const row of aisleRows) {
  aisleNames.set(Number(row.aisle_id), row.aisle);
}

const productsByAisle = new Map();
for (const row of productRows) {
  const aisleId = Number(row.aisle_id);
  const departmentId = Number(row.department_id);

  const known = aisleDepartments.get(aisleId);
  if (known !== undefined && known !== departmentId) {
    throw new Error(
      `aisle ${aisleId} appears in departments ${known} and ${departmentId}; the layout assumes one department per aisle`
    );
  }
  aisleDepartments.set(aisleId, departmentId);

  if (!productsByAisle.has(aisleId)) productsByAisle.set(aisleId, []);
  productsByAisle.get(aisleId).push(row.product_name);
}

/**
 * Fill one shelf section.
 *
 * The shelf is filled type by type: every distinct product type gets one
 * facing first, and only then do the best types earn a second. That is what
 * stops a produce shelf from being nothing but six kinds of apple, and it is
 * why the plain "Bananas" survives next to the apples and the mangoes.
 *
 * On top of that:
 *
 * - a single brand may claim at most `MAX_BRAND_SHARE` of the slots
 * - a single product type may claim at most `MAX_VARIANTS_PER_TYPE` facings
 * - a shelf always keeps at least `MIN_PRODUCTS_PER_SHELF` products, so thin
 *   sections are not left nearly empty
 */
function fillShelf(names, aisleName, frequency) {
  const aisleKeywords = new Set(
    aisleName
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  );

  const candidates = names.map((name, order) => {
    const quantity = quantityFor(name, aisleKeywords);
    const head = headNoun(name);

    return {
      name,
      quantity,
      slots: slotsFor(quantity),
      family: familyOf(name),
      head,
      // How common the product type is across the store, so the shelf carries
      // the things people actually buy.
      common: Math.log2(1 + (frequency.get(head) ?? 0)) * 18,
      score: coreScore(name, aisleKeywords, aisleName) + hashUnit(`tie:${name}`) * 4,
      order,
    };
  });

  const rank = (a, b) =>
    b.common + b.score - (a.common + a.score) || a.order - b.order;

  // Group by product type, best candidate of each type first.
  const byType = new Map();
  for (const candidate of candidates) {
    const group = byType.get(candidate.head);
    if (!group) {
      byType.set(candidate.head, [candidate]);
    } else {
      group.push(candidate);
      group.sort(rank);
    }
  }

  const types = [...byType.values()].sort((a, b) => rank(a[0], b[0]));

  const brandSlots = new Map();
  const typeCount = new Map();
  const chosen = [];
  let usedSlots = 0;

  const take = (candidate) => {
    const typeUsed = typeCount.get(candidate.head) ?? 0;
    if (typeUsed >= MAX_VARIANTS_PER_TYPE) return false;

    const familyUsed = brandSlots.get(candidate.family) ?? 0;
    if (
      chosen.length >= MIN_PRODUCTS_PER_SHELF &&
      familyUsed + candidate.slots > SHELF_SLOTS * MAX_BRAND_SHARE
    ) {
      return false;
    }

    if (usedSlots + candidate.slots > SHELF_SLOTS) return false;

    chosen.push(candidate);
    brandSlots.set(candidate.family, familyUsed + candidate.slots);
    typeCount.set(candidate.head, typeUsed + 1);
    usedSlots += candidate.slots;
    return true;
  };

  // Round one: one of every product type, most common types first.
  for (const group of types) take(group[0]);

  // Rounds two and three: the best types earn extra facings.
  for (let variant = 1; variant < MAX_VARIANTS_PER_TYPE; variant += 1) {
    for (const group of types) {
      if (variant < group.length) take(group[variant]);
    }
  }

  // Nothing fit (all items are bulk sized): keep the top items regardless.
  if (chosen.length === 0) {
    for (const candidate of candidates.slice(0, MIN_PRODUCTS_PER_SHELF)) {
      chosen.push(candidate);
      usedSlots += candidate.slots;
    }
  }

  // Lay the shelf out in brand order, the way a merchandiser would.
  chosen.sort((a, b) => a.family.localeCompare(b.family) || a.name.localeCompare(b.name));

  return { products: chosen, usedSlots };
}

const departments = [...departmentNames.entries()]
  .map(([id, name]) => [id, name])
  .sort((a, b) => a[0] - b[0]);

const shelves = new Map();
const frequency = typeFrequency(productsByAisle);
for (const [id, names] of productsByAisle) {
  shelves.set(id, fillShelf(names, aisleNames.get(id) ?? '', frequency));
}

const aisles = [...aisleNames.entries()]
  .map(([id, name]) => {
    const departmentId = aisleDepartments.get(id);
    if (departmentId === undefined) {
      throw new Error(`aisle ${id} ("${name}") has no products, so its department is unknown`);
    }

    const shelf = shelves.get(id);
    return [
      id,
      name,
      departmentId,
      shelf?.products.length ?? 0,
      shelf?.usedSlots ?? 0,
    ];
  })
  .sort((a, b) => a[0] - b[0]);

const products = Object.fromEntries(
  [...shelves.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, shelf]) => [
      id,
      shelf.products.map((product) => [product.name, product.quantity]),
    ])
);

const catalog = {
  version: 2,
  source: 'Instacart market basket sample (departments.csv, aisles.csv, products.csv)',
  departments,
  aisles,
  products,
};

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, JSON.stringify(catalog));

const bytes = Buffer.byteLength(JSON.stringify(catalog));
const kept = aisles.reduce((total, aisle) => total + aisle[3], 0);
const slots = aisles.reduce((total, aisle) => total + aisle[4], 0);

console.log(`wrote ${outputFile}`);
console.log(`  departments:  ${departments.length}`);
console.log(`  aisles:       ${aisles.length}`);
console.log(`  products:     ${productRows.length} -> ${kept}`);
console.log(`  shelf slots:  ${slots} (${(slots / aisles.length).toFixed(1)} per aisle)`);
console.log(`  size:         ${(bytes / 1024 / 1024).toFixed(2)} MB`);
