import { aislesByDepartment, departments, type Aisle } from '@/data/catalog';

/**
 * Deterministic floor plan for the virtual store, shaped like a real
 * supermarket rather than a generic grid.
 *
 * The catalog is a taxonomy, not geometry, so the map is *generated*: the same
 * input always produces the same floor plan. One map unit is 0.5 m, so the
 * finished store is a wide 56 x 43 m floor plan. Shelves are 1 m deep and the
 * shopping aisles are 2.25 m wide, leaving room for trolleys to pass.
 *
 * Shape of the store, based on the paper-map reference:
 * - a full-width row of service departments along the back wall
 * - frozen and drinks counters down the left, produce and bulk down the right
 * - long, unbroken vertical gondola runs through the middle
 * - one long checkout counter across the front
 * - the entrance at the front-right, so every route starts at the bottom-right
 *   and finishes at the checkout
 */

/** Merchandising order for the centre-store aisles; unknown names fall to the end. */
const DEPARTMENT_ORDER = [
  'produce',
  'bakery',
  'deli',
  'meat seafood',
  'dairy eggs',
  'frozen',
  'pantry',
  'canned goods',
  'dry goods pasta',
  'international',
  'breakfast',
  'beverages',
  'snacks',
  'alcohol',
  'household',
  'personal care',
  'babies',
  'pets',
  'bulk',
  'other',
  'missing',
];

/** One map unit represents half a metre of real walking distance. */
export const METRES_PER_MAP_UNIT = 0.5;

export const GONDOLA_WIDTH = 2;
export const CORRIDOR_WIDTH = 4.5;
export const AISLE_PITCH = GONDOLA_WIDTH + CORRIDOR_WIDTH;
export const COUNTER_DEPTH = 6;
export const WALKWAY = 4;
export const MARGIN = 3;

/** One continuous gondola run per numbered aisle, with no cross-aisle cuts. */
const BLOCK_COUNT = 1;
const BLOCK_HEIGHT = 55;
const CROSS_AISLE = 5;
const ACTION_ALLEY = 5;
const FRONT_COUNTER_HEIGHT = 0;
const CHECKOUT_BAND = 5;
const ENTRANCE_BAND = 4;
const ENTRANCE_GAP = 12;
/** Route the shopper starts inside the doors, clear of the bottom corner. */
const ENTRANCE_INSET = 3;
/** Target number of shelf sections in a whole aisle. */
const SECTIONS_PER_AISLE = 6;
/** One slot is the smallest addressable point on a shelf. */
const PRODUCTS_PER_SLOT = 25;

const SIGN_SIZE = 1.9;
const SIGN_CHAR_WIDTH = 0.66;
const PERIMETER_SIGN_SIZE = 2.2;

type Rect = { x: number; y: number; width: number; height: number };

export type AisleNode = Aisle & {
  /** Top-left corner of the shelf section, in map units. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** How many addressable shelf slots the section is split into. */
  slotCount: number;
  /** Numbered centre-store aisle this shelf belongs to; null on the perimeter. */
  aisleNumber: number | null;
  /** Tap target that also covers half of the corridor on either side. */
  hit: Rect;
};

/** A continuous run of shelving, the way a gondola looks from above. */
export type RunNode = {
  departmentId: number;
  aisleNumber: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Shelf sections inside the run, in walking order. */
  sections: { aisleId: number; x: number; y: number; width: number; height: number }[];
  /** Which way the run is divided into sections. */
  splitAxis: 'x' | 'y';
  /** Department name printed along the run, sized to fit it. */
  label: { text: string; size: number; vertical: boolean } | null;
};

export type ZoneNode = {
  departmentId: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AisleMarker = { number: number; x: number; y: number };

export type StoreLayout = {
  width: number;
  height: number;
  aisles: AisleNode[];
  runs: RunNode[];
  zones: ZoneNode[];
  /** Cross aisles, the action alley and the walkways around the counters. */
  walkways: Rect[];
  /** Aisle numbers repeated at the end of every block, like hanging signs. */
  aisleMarkers: AisleMarker[];
  checkouts: Rect[];
  checkoutLabels: { x: number; y: number }[];
  entrance: { x: number; y: number; width: number };
  /** Number of numbered centre-store aisles. */
  aisleCount: number;
};

type Wall = 'back' | 'left' | 'right' | 'front';

type PerimeterGroup = {
  department: string;
  wall: Wall;
  /** Slice of the wall this group occupies, as a fraction of its length. */
  from: number;
  to: number;
};

/** Where the perimeter departments live; everything else goes to the centre. */
const PERIMETER_GROUPS: PerimeterGroup[] = [
  { department: 'dairy eggs', wall: 'back', from: 0.01, to: 0.24 },
  { department: 'meat seafood', wall: 'back', from: 0.25, to: 0.49 },
  { department: 'deli', wall: 'back', from: 0.5, to: 0.74 },
  { department: 'bakery', wall: 'back', from: 0.76, to: 0.99 },
  { department: 'frozen', wall: 'left', from: 0.02, to: 0.62 },
  { department: 'alcohol', wall: 'left', from: 0.66, to: 0.98 },
  { department: 'produce', wall: 'right', from: 0.02, to: 0.58 },
  { department: 'bulk', wall: 'right', from: 0.62, to: 0.84 },
];

/** Short, shelf-sign sized names; long names shrink instead of wrapping. */
const LABEL_TEXT: Record<string, string> = {
  'dairy eggs': 'EGGS · BUTTER · MILK',
  'meat seafood': 'MEAT & SEAFOOD',
  alcohol: 'WINE & SPIRITS',
  produce: 'FRESH PRODUCE',
  beverages: 'BEVERAGES · WATER',
  breakfast: 'COFFEE · TEA · CEREAL',
  pantry: 'BAKING · SPICES · OIL',
  'canned goods': 'CANNED GOODS · GRAINS',
  'dry goods pasta': 'PASTA · GRAINS',
  snacks: 'CHIPS · SNACKS',
  'dry goods': 'DRY GOODS',
  'personal care': 'PERSONAL CARE',
  missing: 'GENERAL',
  other: 'OTHER',
};

function labelText(name: string) {
  return (LABEL_TEXT[name] ?? name).toUpperCase();
}

function orderedDepartments() {
  const rank = new Map(DEPARTMENT_ORDER.map((name, index) => [name, index]));

  return [...departments].sort((a, b) => {
    const rankA = rank.get(a.name) ?? Number.MAX_SAFE_INTEGER;
    const rankB = rank.get(b.name) ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB || a.name.localeCompare(b.name);
  });
}

function departmentAisles(departmentId: number): Aisle[] {
  return [...(aislesByDepartment.get(departmentId) ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/** Splits a rectangle into `count` equal pieces along one axis. */
function splitRect(rect: Rect, count: number, axis: 'x' | 'y', gap = 0): Rect[] {
  if (count <= 0) return [];

  const length = axis === 'x' ? rect.width : rect.height;
  const size = (length - gap * (count - 1)) / count;

  return Array.from({ length: count }, (_, index) => {
    const offset = index * (size + gap);

    return axis === 'x'
      ? { x: rect.x + offset, y: rect.y, width: size, height: rect.height }
      : { x: rect.x, y: rect.y + offset, width: rect.width, height: size };
  });
}

/**
 * Divides a run into sections sized by product count. Sections sit flush
 * against each other: a gondola is one continuous fixture, the sections are
 * just where the departments change.
 */
function sectionSizes(length: number, counts: number[]): number[] {
  const weights = counts.map((count) => Math.max(60, count) ** 0.55);
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);

  const sizes = weights.map((weight) => (weight / totalWeight) * length);
  const scale = length / sizes.reduce((total, value) => total + value, 0);

  return sizes.map((value) => value * scale);
}

/** Splits a list into `parts` chunks of near-equal size, in order. */
function splitEvenly<T>(items: T[], parts: number): T[][] {
  if (parts <= 0) return [];

  const chunks: T[][] = [];
  const base = Math.floor(items.length / parts);
  const remainder = items.length % parts;
  let cursor = 0;

  for (let part = 0; part < parts; part += 1) {
    const size = base + (part < remainder ? 1 : 0);
    chunks.push(items.slice(cursor, cursor + size));
    cursor += size;
  }

  return chunks;
}

/** Splits band sections into contiguous runs of a single department. */
function groupRuns(
  sections: { aisle: Aisle; rect: Rect }[]
): { departmentId: number; sections: { aisle: Aisle; rect: Rect }[] }[] {
  const groups: { departmentId: number; sections: { aisle: Aisle; rect: Rect }[] }[] = [];

  for (const section of sections) {
    const last = groups[groups.length - 1];
    if (last && last.departmentId === section.aisle.departmentId) {
      last.sections.push(section);
    } else {
      groups.push({
        departmentId: section.aisle.departmentId,
        sections: [section],
      });
    }
  }

  return groups;
}

function buildLayout(): StoreLayout {
  const perimeterNames = new Set(PERIMETER_GROUPS.map((group) => group.department));
  const ordered = orderedDepartments();
  const centreAisles = ordered
    .filter((department) => !perimeterNames.has(department.name))
    .flatMap((department) => departmentAisles(department.id));

  // One column is one numbered aisle, a single unbroken gondola run from the
  // back walkway to the action alley. The centre store is filled column by
  // column, so each aisle runs the full depth of the store and holds a
  // contiguous stretch of departments.
  const columns = Math.max(
    1,
    Math.round(centreAisles.length / (BLOCK_COUNT * SECTIONS_PER_AISLE))
  );
  const centreColumnChunks = splitEvenly(centreAisles, columns);
  const centreWidth = columns * AISLE_PITCH - CORRIDOR_WIDTH;
  const sideBand = MARGIN + COUNTER_DEPTH + WALKWAY;

  const width = centreWidth + sideBand * 2;
  const centreLeft = sideBand;

  const contentTop = MARGIN + COUNTER_DEPTH + WALKWAY;
  const contentBottom =
    contentTop + BLOCK_COUNT * BLOCK_HEIGHT + (BLOCK_COUNT - 1) * CROSS_AISLE;
  const frontCounterY = contentBottom + ACTION_ALLEY;
  const checkoutY = frontCounterY + FRONT_COUNTER_HEIGHT + WALKWAY;
  const height = checkoutY + CHECKOUT_BAND + ENTRANCE_BAND;

  /** Block 0 is the one nearest the entrance, so it sits lowest on the map. */
  const blockTop = (block: number) =>
    contentTop + (BLOCK_COUNT - 1 - block) * (BLOCK_HEIGHT + CROSS_AISLE);

  const aisles: AisleNode[] = [];
  const runNodes: RunNode[] = [];
  const zones: ZoneNode[] = [];

  const addAisle = (aisle: Aisle, rect: Rect, aisleNumber: number | null, hit?: Rect) => {
    const node: AisleNode = {
      ...aisle,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      slotCount: Math.max(1, Math.ceil(aisle.productCount / PRODUCTS_PER_SLOT)),
      aisleNumber,
      hit:
        hit ?? {
          x: rect.x - (AISLE_PITCH - rect.width) / 2,
          y: rect.y,
          width: AISLE_PITCH,
          height: rect.height,
        },
    };

    aisles.push(node);
    return node;
  };

  // Perimeter counters: one continuous fixture per wall section.
  for (const group of PERIMETER_GROUPS) {
    const department = ordered.find((entry) => entry.name === group.department);
    if (!department) continue;

    const owned = departmentAisles(department.id);
    if (owned.length === 0) continue;

    let rect: Rect;
    if (group.wall === 'back' || group.wall === 'front') {
      // The back wall is one full-width run of service departments, like the
      // coloured blocks across the top of a paper store map.
      const span = width - MARGIN * 2;
      rect = {
        x: MARGIN + span * group.from,
        y: group.wall === 'back' ? MARGIN : frontCounterY,
        width: span * (group.to - group.from),
        height: group.wall === 'back' ? COUNTER_DEPTH : FRONT_COUNTER_HEIGHT,
      };
    } else {
      const span = contentBottom - contentTop;
      rect = {
        x: group.wall === 'left' ? MARGIN : width - MARGIN - COUNTER_DEPTH,
        y: contentTop + span * group.from,
        width: COUNTER_DEPTH,
        height: span * (group.to - group.from),
      };
    }

    const horizontal = group.wall === 'back' || group.wall === 'front';
    const sections = splitRect(rect, owned.length, horizontal ? 'x' : 'y');

    owned.forEach((aisle, index) => addAisle(aisle, sections[index], null, sections[index]));

    // Wall sign, centred on the counter and sized to fit it.
    const text = labelText(department.name);
    const along = horizontal ? rect.width : rect.height;
    const size = Math.min(PERIMETER_SIGN_SIZE, along / (text.length * SIGN_CHAR_WIDTH));

    runNodes.push({
      departmentId: department.id,
      aisleNumber: null,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      sections: owned.map((aisle, index) => ({
        aisleId: aisle.id,
        ...sections[index],
      })),
      splitAxis: horizontal ? 'x' : 'y',
      label: { text, size, vertical: !horizontal },
    });

    zones.push({
      departmentId: department.id,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
  }

  // Centre store: numbered columns of gondolas running unbroken from the back
  // walkway to the action alley. A column is one numbered aisle, and its
  // number sits at the front where shoppers enter it.
  //
  // Aisles are filled column by column, front to back, so a department
  // occupies a tall stripe of shelving instead of being scattered around the
  // floor.
  centreColumnChunks.forEach((chunk, column) => {
    const x = centreLeft + column * AISLE_PITCH;
    const bands = splitEvenly(chunk, BLOCK_COUNT);

    bands.forEach((bandAisles, band) => {
      if (bandAisles.length === 0) return;

      const top = blockTop(band);
      const heights = sectionSizes(
        BLOCK_HEIGHT,
        bandAisles.map((aisle) => aisle.productCount)
      );

      // Group the sections into runs of one department inside this band.
      const groups: { departmentId: number; aisles: Aisle[] }[] = [];
      for (const aisle of bandAisles) {
        const last = groups[groups.length - 1];
        if (last && last.departmentId === aisle.departmentId) {
          last.aisles.push(aisle);
        } else {
          groups.push({ departmentId: aisle.departmentId, aisles: [aisle] });
        }
      }

      let cursor = top;
      const bandSections: { aisle: Aisle; rect: Rect }[] = [];

      for (const [index, aisle] of bandAisles.entries()) {
        const rect = {
          x,
          y: cursor,
          width: GONDOLA_WIDTH,
          height: heights[index],
        };
        cursor += heights[index];

        addAisle(aisle, rect, column + 1);
        bandSections.push({ aisle, rect });
      }

      // A run is one department's stretch of shelving within the band.
      groupRuns(bandSections).forEach((run) => {
        const first = run.sections[0].rect;
        const last = run.sections[run.sections.length - 1].rect;
        const height = last.y + last.height - first.y;

        runNodes.push({
          departmentId: run.departmentId,
          aisleNumber: column + 1,
          x,
          y: first.y,
          width: GONDOLA_WIDTH,
          height,
          sections: run.sections.map((section) => ({
            aisleId: section.aisle.id,
            ...section.rect,
          })),
          splitAxis: 'y',
          label: null,
        });

        zones.push({
          departmentId: run.departmentId,
          x: x - (AISLE_PITCH - GONDOLA_WIDTH) / 2,
          y: first.y - 0.4,
          width: AISLE_PITCH,
          height: height + 0.8,
        });
      });
    });
  });

  // One number per aisle, in the front action alley where shoppers enter the
  // centre store.
  const aisleMarkers: AisleMarker[] = [];
  for (let column = 0; column < columns; column += 1) {
    aisleMarkers.push({
      number: column + 1,
      x: centreLeft + column * AISLE_PITCH + GONDOLA_WIDTH / 2,
      y: contentBottom + ACTION_ALLEY / 2,
    });
  }

  const walkways: Rect[] = [];
  const walkwayLeft = MARGIN + COUNTER_DEPTH;
  const walkwayWidth = width - (MARGIN + COUNTER_DEPTH) * 2;

  // Walkways around the perimeter counters.
  walkways.push(
    {
      x: walkwayLeft,
      y: MARGIN + COUNTER_DEPTH,
      width: walkwayWidth,
      height: WALKWAY,
    },
    {
      x: walkwayLeft,
      y: frontCounterY + FRONT_COUNTER_HEIGHT,
      width: walkwayWidth,
      height: WALKWAY,
    }
  );

  // Cross aisles between the gondola blocks, then the wide action alley.
  for (let block = 0; block < BLOCK_COUNT - 1; block += 1) {
    walkways.push({
      x: walkwayLeft,
      y: contentTop + BLOCK_HEIGHT + block * (BLOCK_HEIGHT + CROSS_AISLE),
      width: walkwayWidth,
      height: CROSS_AISLE,
    });
  }
  walkways.push({
    x: walkwayLeft,
    y: contentBottom,
    width: walkwayWidth,
    height: ACTION_ALLEY,
  });

  // One long checkout counter across the front, offset slightly left so the
  // entrance stays clear on the right and the route can finish on the left.
  const checkoutWidth = centreWidth * 0.66;
  const checkoutX = centreLeft + (centreWidth - checkoutWidth) * 0.3;

  const checkouts: Rect[] = [
    {
      x: checkoutX,
      y: checkoutY,
      width: checkoutWidth,
      height: CHECKOUT_BAND,
    },
  ];

  const checkoutLabels = [
    {
      x: checkoutX + checkoutWidth / 2,
      y: checkoutY - 1.8,
    },
  ];

  // Name each department once, on the longest run it owns, so the name is
  // readable and the rest of the department's shelving stays plain.
  for (const department of ordered) {
    const candidates = runNodes.filter((run) => run.departmentId === department.id);
    if (candidates.length === 0) continue;

    const target = candidates.reduce((longest, run) =>
      run.height * run.width > longest.height * longest.width ? run : longest
    );

    const text = labelText(department.name);
    // A run that is split along its length reads vertically, the other way
    // round.
    const vertical = target.splitAxis === 'y';
    const along = vertical ? target.height : target.width;
    const size = Math.min(
      SIGN_SIZE,
      (along - 1) / Math.max(1, text.length * SIGN_CHAR_WIDTH)
    );

    if (size < 0.9) continue;

    target.label = { text, size, vertical };
  }

  const entranceWidth = ENTRANCE_GAP;

  return {
    width,
    height,
    aisles,
    runs: runNodes,
    zones,
    walkways,
    aisleMarkers,
    checkouts,
    checkoutLabels,
    entrance: {
      x: width - MARGIN - entranceWidth / 2,
      y: height - MARGIN - ENTRANCE_INSET,
      width: entranceWidth,
    },
    aisleCount: columns,
  };
}

export const storeLayout: StoreLayout = buildLayout();

/** Real-world dimensions used by the demo and the turn-by-turn directions. */
export const STORE_WIDTH_METRES = storeLayout.width * METRES_PER_MAP_UNIT;
export const STORE_HEIGHT_METRES = storeLayout.height * METRES_PER_MAP_UNIT;
export const SHELF_DEPTH_METRES = GONDOLA_WIDTH * METRES_PER_MAP_UNIT;
export const WALKING_AISLE_METRES = CORRIDOR_WIDTH * METRES_PER_MAP_UNIT;
export const AISLE_PITCH_METRES = AISLE_PITCH * METRES_PER_MAP_UNIT;

export const layoutAislesById = new Map<number, AisleNode>(
  storeLayout.aisles.map((aisle) => [aisle.id, aisle])
);

export function getAisleNode(aisleId: number): AisleNode | undefined {
  return layoutAislesById.get(aisleId);
}
