import {
  allProducts,
  aislesById,
  departmentsById,
  type Product,
} from '@/data/catalog';

/**
 * Product search.
 *
 * A naive `name.includes(query)` is useless here: searching "banana" returns
 * everything from banana bread to baby food, and the top hit is whichever
 * product happened to come first in the catalog. This module scores matches
 * instead, so that typing "banana" puts actual bananas at the top.
 *
 * The rules, in order of how much they matter:
 *
 * 1. every word of the query must appear somewhere in the product name
 * 2. a product whose name *starts* with the query beats one that merely
 *    contains it
 * 3. matching a whole word beats matching part of a word
 * 4. matching a word near the start of the name beats matching one at the end
 * 5. shorter names win ties, because "Bananas" is a better answer than
 *    "Organic Low Fat Banana Chips Deluxe"
 *
 * The index is built once, lazily, and reused for every keystroke.
 */

export type SearchResult = {
  product: Product;
  aisleId: number;
  departmentId: number;
  aisleName: string;
  departmentName: string;
  score: number;
};

type IndexedProduct = {
  product: Product;
  aisleId: number;
  departmentId: number;
  aisleName: string;
  departmentName: string;
  /** Lower-cased name, split into words. */
  words: string[];
  /** Lower-cased whole name, for starts-with checks. */
  lower: string;
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'the',
  'of',
  'with',
  'for',
  'in',
  'on',
  'to',
  'or',
  'at',
  'by',
  'from',
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
}

/** Strips a trailing plural so "bananas" and "banana" match. */
function singular(word: string): string {
  if (word.length > 3 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

let index: IndexedProduct[] | null = null;

function getIndex(): IndexedProduct[] {
  if (index) return index;

  index = allProducts.map((entry) => {
    const aisle = aislesById.get(entry.aisleId);
    const department = departmentsById.get(entry.departmentId);

    return {
      product: entry.product,
      aisleId: entry.aisleId,
      departmentId: entry.departmentId,
      aisleName: aisle?.name ?? '',
      departmentName: department?.name ?? '',
      words: tokenize(entry.product.name),
      lower: entry.product.name.toLowerCase(),
    };
  });

  return index;
}

/**
 * Scores one product against the query words. Returns 0 when the product does
 * not match at all.
 */
function scoreProduct(entry: IndexedProduct, query: string, queryWords: string[]): number {
  const lowerQuery = query.toLowerCase();

  // The whole query appearing as a phrase is the strongest signal.
  const phraseIndex = entry.lower.indexOf(lowerQuery);
  if (phraseIndex === -1) {
    // Every word still has to appear, otherwise this is not a match.
    for (const word of queryWords) {
      const stem = singular(word);
      if (!entry.words.some((candidate) => singular(candidate) === stem)) return 0;
    }
  }

  let score = 0;

  for (const queryWord of queryWords) {
    const stem = singular(queryWord);
    let best = 0;

    for (const [wordIndex, word] of entry.words.entries()) {
      const candidate = singular(word);
      let wordScore = 0;

      if (candidate === stem) {
        // Whole word match. Earlier words are worth more.
        wordScore = 100 - wordIndex * 4;
      } else if (candidate.startsWith(stem) && stem.length >= 3) {
        // Prefix match: "banan" still finds "banana".
        wordScore = 70 - wordIndex * 4;
      } else if (candidate.includes(stem) && stem.length >= 4) {
        // Substring match: weakest of the three.
        wordScore = 40 - wordIndex * 4;
      }

      if (wordScore > best) best = wordScore;
    }

    if (best === 0) return 0;
    score += best;
  }

  // A name that begins with the query is what the shopper meant.
  if (entry.lower.startsWith(lowerQuery)) score += 120;
  else if (phraseIndex > 0) score += 40;

  // Prefer the product whose whole name is short and plain.
  score -= Math.min(40, entry.words.length * 4);

  // Well-stocked items are the ones a store is known for.
  score += Math.min(12, entry.product.quantity);

  // A match in the aisle or department name is a useful fallback.
  if (entry.aisleName.toLowerCase().includes(lowerQuery)) score += 25;
  if (entry.departmentName.toLowerCase().includes(lowerQuery)) score += 15;

  return score;
}

/**
 * Searches the catalog for products matching `query`, best match first.
 *
 * Returns an empty list for queries shorter than two characters, since one
 * letter matches almost everything.
 */
export function searchProducts(query: string, limit = 30): SearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const queryWords = tokenize(trimmed).filter((word) => !STOP_WORDS.has(word));
  if (queryWords.length === 0) return [];

  const results: SearchResult[] = [];

  for (const entry of getIndex()) {
    const score = scoreProduct(entry, trimmed, queryWords);
    if (score <= 0) continue;

    results.push({
      product: entry.product,
      aisleId: entry.aisleId,
      departmentId: entry.departmentId,
      aisleName: entry.aisleName,
      departmentName: entry.departmentName,
      score,
    });
  }

  results.sort(
    (a, b) =>
      b.score - a.score ||
      a.product.name.length - b.product.name.length ||
      a.product.name.localeCompare(b.product.name)
  );

  return results.slice(0, limit);
}

/**
 * Groups results by the shelf they live on, keeping the best match per shelf
 * as the group's representative. This is what the map shows: one entry per
 * shelf, not one per product.
 */
export function groupByShelf(
  results: SearchResult[]
): { aisleId: number; departmentId: number; aisleName: string; departmentName: string; matches: SearchResult[] }[] {
  const groups = new Map<
    number,
    {
      aisleId: number;
      departmentId: number;
      aisleName: string;
      departmentName: string;
      matches: SearchResult[];
    }
  >();

  for (const result of results) {
    const existing = groups.get(result.aisleId);
    if (existing) {
      existing.matches.push(result);
    } else {
      groups.set(result.aisleId, {
        aisleId: result.aisleId,
        departmentId: result.departmentId,
        aisleName: result.aisleName,
        departmentName: result.departmentName,
        matches: [result],
      });
    }
  }

  return [...groups.values()];
}
