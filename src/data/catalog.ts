import catalog from '@/data/store-catalog.json';

/**
 * Typed view over the generated `store-catalog.json`.
 *
 * The raw file keeps arrays instead of objects to stay small (0.12 MB for
 * ~2,900 products), so everything is decoded once here.
 */

type RawDepartment = [id: number, name: string];
type RawAisle = [id: number, name: string, departmentId: number, productCount: number, slotCount: number];
type RawProduct = [name: string, quantity: number];

export type Department = {
  id: number;
  name: string;
  aisleCount: number;
  productCount: number;
};

export type Aisle = {
  id: number;
  name: string;
  departmentId: number;
  productCount: number;
  /** Facing slots the section occupies on the shelf. */
  slotCount: number;
};

export type Product = {
  name: string;
  /** How many units the shelf holds of this product. */
  quantity: number;
};

const rawDepartments = catalog.departments as RawDepartment[];
const rawAisles = catalog.aisles as RawAisle[];
const rawProducts = catalog.products as unknown as Record<string, RawProduct[]>;

const productsByAisle = new Map<number, Product[]>();
for (const [aisleId, entries] of Object.entries(rawProducts)) {
  productsByAisle.set(Number(aisleId), entries.map(([name, quantity]) => ({ name, quantity })));
}

export const aisles: Aisle[] = rawAisles.map(
  ([id, name, departmentId, productCount, slotCount]) => ({
    id,
    name,
    departmentId,
    productCount,
    slotCount,
  })
);

export const aislesById = new Map<number, Aisle>(aisles.map((aisle) => [aisle.id, aisle]));

export const departments: Department[] = rawDepartments.map(([id, name]) => {
  const owned = aisles.filter((aisle) => aisle.departmentId === id);

  return {
    id,
    name,
    aisleCount: owned.length,
    productCount: owned.reduce((total, aisle) => total + aisle.productCount, 0),
  };
});

export const departmentsById = new Map<number, Department>(
  departments.map((department) => [department.id, department])
);

export const aislesByDepartment = new Map<number, Aisle[]>(
  departments.map((department) => [
    department.id,
    aisles.filter((aisle) => aisle.departmentId === department.id),
  ])
);

/**
 * A few catalog departments are internal buckets rather than real names;
 * these are the labels shoppers see.
 */
const DISPLAY_NAMES: Record<string, string> = {
  missing: 'General',
  other: 'Other',
};

export function departmentDisplayName(name: string): string {
  return DISPLAY_NAMES[name] ?? name;
}

export function getAisleProducts(aisleId: number, limit = 40): Product[] {
  const products = productsByAisle.get(aisleId);
  if (!products) return [];
  return limit >= products.length ? products : products.slice(0, limit);
}

export function getAisleProductCount(aisleId: number): number {
  return productsByAisle.get(aisleId)?.length ?? 0;
}

/** Every product in the store, flattened for search. */
export const allProducts: { product: Product; aisleId: number; departmentId: number }[] = [];

for (const aisle of aisles) {
  for (const product of productsByAisle.get(aisle.id) ?? []) {
    allProducts.push({ product, aisleId: aisle.id, departmentId: aisle.departmentId });
  }
}

export const storeStats = {
  departmentCount: departments.length,
  aisleCount: aisles.length,
  productCount: allProducts.length,
  unitCount: allProducts.reduce((total, entry) => total + entry.product.quantity, 0),
};
