import { departmentsById } from '@/data/catalog';
import { searchProducts } from '@/data/search';

export type SampleItem = {
  name: string;
  departmentId: number;
  aisleId: number;
};

type SampleSpec = { department: string; query: string };

/** Ten departments, deliberately spread across the front, back and sides. */
const SAMPLE_SPECS: SampleSpec[] = [
  { department: 'produce', query: 'Bananas' },
  { department: 'frozen', query: 'Ice Cream' },
  { department: 'bakery', query: 'Bagels' },
  { department: 'meat seafood', query: 'Chicken Breast' },
  { department: 'household', query: 'Paper Towel' },
  { department: 'dairy eggs', query: 'Milk Whole' },
  { department: 'snacks', query: 'Chips' },
  { department: 'beverages', query: 'Coffee' },
  { department: 'pantry', query: 'Oil' },
  { department: 'deli', query: 'Ham' },
];

/**
 * Pre-checked zig-zag orders. Every order saves at least 25% against walking
 * the list as written, so a random demo still shows a meaningful improvement.
 * Indices refer to SAMPLE_SPECS above.
 */
export const SAMPLE_ORDERS: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [9, 5, 6, 8, 1, 0, 7, 4, 3, 2],
  [3, 9, 7, 6, 0, 8, 5, 1, 4, 2],
  [3, 0, 1, 7, 8, 9, 5, 6, 4, 2],
  [9, 1, 7, 6, 3, 0, 8, 4, 5, 2],
  [3, 9, 0, 8, 7, 4, 5, 1, 6, 2],
  [5, 1, 4, 3, 0, 9, 6, 8, 7, 2],
  [3, 9, 5, 1, 7, 0, 6, 4, 8, 2],
  [8, 1, 7, 5, 3, 4, 6, 9, 0, 2],
  [4, 3, 5, 6, 1, 9, 8, 7, 0, 2],
  [4, 8, 3, 9, 7, 6, 0, 5, 1, 2],
  [1, 3, 7, 6, 5, 4, 0, 8, 9, 2],
  [6, 8, 1, 4, 5, 9, 7, 0, 3, 2],
  [9, 7, 8, 3, 6, 0, 1, 5, 4, 2],
  [5, 9, 7, 6, 0, 8, 1, 3, 4, 2],
  [8, 7, 6, 3, 4, 9, 1, 0, 5, 2],
  [4, 7, 3, 5, 9, 0, 1, 8, 6, 2],
];

let lastOrderIndex = -1;

/** Resolves a known order into catalogue products. */
export function sampleItemsForOrder(order: readonly number[]): SampleItem[] {
  if (order.length !== SAMPLE_SPECS.length) {
    throw new Error('A sample order must contain all ten items');
  }

  return order.map((specIndex) => {
    const spec = SAMPLE_SPECS[specIndex];
    if (!spec) throw new Error(`Unknown sample item ${specIndex}`);

    const match = searchProducts(spec.query, 30).find(
      (result) => departmentsById.get(result.departmentId)?.name === spec.department
    );
    if (!match) throw new Error(`No sample product for ${spec.department} / ${spec.query}`);

    return {
      name: match.product.name,
      departmentId: match.departmentId,
      aisleId: match.aisleId,
    };
  });
}

/**
 * Builds a fresh ten-item list for each demo. The random source is injectable
 * so the verification script can reproduce a specific order.
 */
export function buildSampleItems(random: () => number = Math.random): SampleItem[] {
  let index = Math.min(SAMPLE_ORDERS.length - 1, Math.floor(random() * SAMPLE_ORDERS.length));
  if (index === lastOrderIndex) {
    index = (index + 1 + Math.floor(random() * (SAMPLE_ORDERS.length - 1))) % SAMPLE_ORDERS.length;
  }
  lastOrderIndex = index;
  return sampleItemsForOrder(SAMPLE_ORDERS[index]);
}
