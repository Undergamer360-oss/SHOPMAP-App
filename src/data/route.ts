import { departments, type Department } from '@/data/catalog';
import { METRES_PER_MAP_UNIT, storeLayout } from '@/data/layout';

/**
 * Route planning for the virtual store.
 *
 * The floor plan in `layout.ts` is made of rectangles. For routing we
 * rasterise it once into a one-map-unit grid: shelving is blocked, everything
 * else is walkable. Breadth-first search then gives true walking paths (never
 * a straight line through a gondola) and exact distances between any two
 * points.
 *
 * Stops are departments, not individual products: a shopper walks to the
 * department once and picks up everything on the list that lives there. Every
 * plan starts at the store entrance and ends at checkout.
 *
 * `standard` mode keeps the shopper's list order. `smart` mode reorders those
 * stops with an exact solver for small lists and 2-opt for larger ones. The
 * smart solver starts from the list-order candidate and only accepts strictly
 * shorter candidates, so the smart route can never be longer than standard.
 */

/** One map unit is half a metre (see layout.ts). */
export const METRES_PER_UNIT = METRES_PER_MAP_UNIT;
export const WALKING_METRES_PER_SECOND = 1.2;
export const SECONDS_PER_STOP = 20;
/** Above this many departments, switch from the exact solver to 2-opt. */
const EXACT_LIMIT = 12;

export type RoutePoint = { x: number; y: number };

/** How the department stops are ordered. */
export type RouteMode = 'standard' | 'smart';

export type PlanRouteOptions = { mode?: RouteMode };

export type RouteItem = {
  name: string;
  departmentId: number;
  /** Catalog shelf the product lives on, used for its aisle number. */
  aisleId?: number;
};

export type RouteStop = {
  departmentId: number;
  departmentName: string;
  /** Catalog shelf id, always numeric so it can be shown while navigating. */
  aisleId: number;
  /** Numbered centre-store aisle, or null for a perimeter shelf. */
  aisleNumber: number | null;
  aisleName: string;
  /** Shelf rectangle this stop is anchored to, for shelf-relative directions. */
  shelf: { x: number; y: number; width: number; height: number };
  point: RoutePoint;
  items: string[];
  /** 1-based position in the walking route. */
  number: number;
};

export type RouteLeg = {
  from: RoutePoint;
  to: RoutePoint;
  /** Polyline points in map units, ready for SVG. */
  points: RoutePoint[];
  distanceMetres: number;
  seconds: number;
  /** Which stop this leg walks to; null for the final leg to checkout. */
  stopNumber: number | null;
  /** True for the first leg, which always begins at the store entrance. */
  fromEntrance?: boolean;
};

export type RoutePlan = {
  /** Planning mode used to order the stops. */
  mode: RouteMode;
  stops: RouteStop[];
  legs: RouteLeg[];
  start: RoutePoint;
  checkout: RoutePoint;
  totalMetres: number;
  totalSeconds: number;
  /** Distance if the list were walked in the order it was written. */
  listMetres: number;
  savedMetres: number;
  savedPercent: number;
};

const GRID_WIDTH = Math.ceil(storeLayout.width);
const GRID_HEIGHT = Math.ceil(storeLayout.height);
const cellIndex = (x: number, y: number) => y * GRID_WIDTH + x;

const blocked = new Uint8Array(GRID_WIDTH * GRID_HEIGHT);

for (const shelf of storeLayout.aisles) {
  const x0 = Math.max(0, Math.floor(shelf.x));
  const x1 = Math.min(GRID_WIDTH, Math.ceil(shelf.x + shelf.width));
  const y0 = Math.max(0, Math.floor(shelf.y));
  const y1 = Math.min(GRID_HEIGHT, Math.ceil(shelf.y + shelf.height));

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) blocked[cellIndex(x, y)] = 1;
  }
}

function isWalkable(x: number, y: number) {
  return x >= 0 && y >= 0 && x < GRID_WIDTH && y < GRID_HEIGHT && !blocked[cellIndex(x, y)];
}

/**
 * Shelves are rectangles, so the geometric centre of a department is inside
 * a blocked cell. Search outwards for the nearest spot a shopper can stand.
 */
function nearestWalkableCell(x: number, y: number): number {
  const cx = Math.round(x);
  const cy = Math.round(y);

  if (isWalkable(cx, cy)) return cellIndex(cx, cy);

  for (let radius = 1; radius < Math.max(GRID_WIDTH, GRID_HEIGHT); radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        if (isWalkable(cx + dx, cy + dy)) return cellIndex(cx + dx, cy + dy);
      }
    }
  }

  throw new Error('The store has no walkable cells');
}

function pointForCell(cell: number): RoutePoint {
  return {
    x: (cell % GRID_WIDTH) + 0.5,
    y: Math.floor(cell / GRID_WIDTH) + 0.5,
  };
}

type Graph = {
  /** One node per department, plus entrance at 0 and checkout at the end. */
  cells: number[];
  points: RoutePoint[];
  distances: Int32Array[];
  previous: Int32Array[];
  departmentNode: Map<number, number>;
  /** The shelf each department stop is anchored to. */
  departmentShelf: Map<number, (typeof storeLayout.aisles)[number]>;
  entranceNode: number;
  checkoutNode: number;
};

let graph: Graph | null = null;

function getGraph(): Graph {
  if (graph) return graph;

  const cells: number[] = [];
  const departmentNode = new Map<number, number>();
  const departmentShelf = new Map<number, (typeof storeLayout.aisles)[number]>();

  const entranceCell = nearestWalkableCell(
    storeLayout.entrance.x,
    storeLayout.entrance.y
  );
  cells.push(entranceCell);

  // One stop per department: the centre of its largest shelf run.
  for (const department of departments) {
    const shelves = storeLayout.aisles.filter(
      (aisle) => aisle.departmentId === department.id
    );
    if (shelves.length === 0) continue;

    const largest = shelves.reduce((best, shelf) =>
      shelf.width * shelf.height > best.width * best.height ? shelf : best
    );

    departmentNode.set(department.id, cells.length);
    departmentShelf.set(department.id, largest);
    cells.push(
      nearestWalkableCell(
        largest.x + largest.width / 2,
        largest.y + largest.height / 2
      )
    );
  }

  const lane = storeLayout.checkouts[Math.floor(storeLayout.checkouts.length / 2)];
  cells.push(
    nearestWalkableCell(lane.x + lane.width / 2, lane.y + lane.height / 2)
  );

  const checkoutNode = cells.length - 1;
  const totalCells = GRID_WIDTH * GRID_HEIGHT;

  const distances: Int32Array[] = [];
  const previous: Int32Array[] = [];

  for (const start of cells) {
    const distance = new Int32Array(totalCells).fill(-1);
    const previousCell = new Int32Array(totalCells).fill(-1);
    const queue = new Int32Array(totalCells);
    let head = 0;
    let tail = 0;

    distance[start] = 0;
    queue[tail] = start;
    tail += 1;

    while (head < tail) {
      const at = queue[head];
      head += 1;

      const x = at % GRID_WIDTH;
      const y = Math.floor(at / GRID_WIDTH);
      const nextDistance = distance[at] + 1;

      const neighbours = [
        x + 1 < GRID_WIDTH ? at + 1 : -1,
        x - 1 >= 0 ? at - 1 : -1,
        y + 1 < GRID_HEIGHT ? at + GRID_WIDTH : -1,
        y - 1 >= 0 ? at - GRID_WIDTH : -1,
      ];

      for (const neighbour of neighbours) {
        if (neighbour < 0 || blocked[neighbour] || distance[neighbour] !== -1) continue;
        distance[neighbour] = nextDistance;
        previousCell[neighbour] = at;
        queue[tail] = neighbour;
        tail += 1;
      }
    }

    distances.push(distance);
    previous.push(previousCell);
  }

  graph = {
    cells,
    points: cells.map(pointForCell),
    distances,
    previous,
    departmentNode,
    departmentShelf,
    entranceNode: 0,
    checkoutNode,
  };

  return graph;
}

function distanceBetween(from: number, to: number) {
  const current = getGraph();
  return current.distances[from][current.cells[to]];
}

/** Removes points that are just steps along a straight corridor. */
function simplify(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= 2) return points;

  const result = [points[0]];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = result[result.length - 1];
    const current = points[index];
    const next = points[index + 1];

    const sameDirection =
      (current.x - previous.x) * (next.y - current.y) ===
      (current.y - previous.y) * (next.x - current.x);

    if (!sameDirection) result.push(current);
  }

  result.push(points[points.length - 1]);
  return result;
}

function pathBetween(from: number, to: number): RoutePoint[] {
  const current = getGraph();
  const targetCell = current.cells[to];
  const startCell = current.cells[from];

  if (from === to) return [current.points[from]];

  const previous = current.previous[from];
  const cells: number[] = [];

  let at = targetCell;
  let guard = 0;
  while (at !== startCell && at !== -1 && guard < previous.length) {
    cells.push(at);
    at = previous[at];
    guard += 1;
  }

  if (at === -1) return [current.points[from], current.points[to]];

  cells.push(startCell);
  cells.reverse();

  return simplify(cells.map(pointForCell));
}

/** Total walking distance of a sequence of node indices. */
function sequenceDistance(sequence: number[]) {
  let total = 0;
  for (let index = 0; index < sequence.length - 1; index += 1) {
    total += distanceBetween(sequence[index], sequence[index + 1]);
  }
  return total;
}

/**
 * Exact travelling-salesperson order (Held-Karp dynamic programming).
 * Returns department ids in walking order.
 */
function exactOrder(
  seed: number[],
  nodeFor: (departmentId: number) => number
): number[] {
  const count = seed.length;
  if (count === 0) return [];

  const graphRef = getGraph();
  const size = 1 << count;
  const costs = Array.from(
    { length: size },
    () => new Float64Array(count).fill(Number.POSITIVE_INFINITY)
  );
  const parents = Array.from(
    { length: size },
    () => new Int8Array(count).fill(-1)
  );

  for (let index = 0; index < count; index += 1) {
    costs[1 << index][index] = distanceBetween(
      graphRef.entranceNode,
      nodeFor(seed[index])
    );
  }

  for (let mask = 1; mask < size; mask += 1) {
    for (let last = 0; last < count; last += 1) {
      if ((mask & (1 << last)) === 0) continue;

      const before = mask ^ (1 << last);
      if (before === 0) continue;

      let best = Number.POSITIVE_INFINITY;
      let bestPrevious = -1;

      for (let previous = 0; previous < count; previous += 1) {
        if ((before & (1 << previous)) === 0) continue;

        const cost =
          costs[before][previous] +
          distanceBetween(nodeFor(seed[previous]), nodeFor(seed[last]));

        if (cost < best) {
          best = cost;
          bestPrevious = previous;
        }
      }

      costs[mask][last] = best;
      parents[mask][last] = bestPrevious;
    }
  }

  let bestCost = Number.POSITIVE_INFINITY;
  let bestLast = -1;

  for (let last = 0; last < count; last += 1) {
    const cost =
      costs[size - 1][last] +
      distanceBetween(nodeFor(seed[last]), graphRef.checkoutNode);

    if (cost < bestCost) {
      bestCost = cost;
      bestLast = last;
    }
  }

  const order: number[] = [];
  let mask = size - 1;

  while (mask !== 0 && bestLast >= 0) {
    order.push(seed[bestLast]);
    const previous = parents[mask][bestLast];
    mask ^= 1 << bestLast;
    bestLast = previous;
  }

  order.reverse();
  return order;
}

/**
 * 2-opt improvement for longer lists. Starting from the shopper's own order
 * and only accepting improvements keeps the "never longer than list order"
 * guarantee.
 */
function twoOptOrder(
  seed: number[],
  nodeFor: (departmentId: number) => number
): number[] {
  const graphRef = getGraph();

  const cost = (order: number[]) => {
    const sequence = [
      graphRef.entranceNode,
      ...order.map(nodeFor),
      graphRef.checkoutNode,
    ];
    return sequenceDistance(sequence);
  };

  let best = [...seed];
  let bestCost = cost(best);
  let improved = true;

  while (improved && best.length > 2) {
    improved = false;

    for (let first = 0; first < best.length - 1; first += 1) {
      for (let last = first + 1; last < best.length; last += 1) {
        const candidate = [
          ...best.slice(0, first),
          ...best.slice(first, last + 1).reverse(),
          ...best.slice(last + 1),
        ];
        const candidateCost = cost(candidate);

        if (candidateCost < bestCost - 0.001) {
          best = candidate;
          bestCost = candidateCost;
          improved = true;
        }
      }
    }
  }

  return best;
}

/**
 * Builds a walking route for a shopping list.
 *
 * Standard mode keeps every list entry in order, so repeated departments are
 * visited again. Smart mode folds items sharing a department into one stop and
 * reorders those stops for the shortest walk. Both modes always enter through
 * the entrance and finish at checkout. Returns null for an empty list.
 */
export function planRoute(
  items: RouteItem[],
  options: PlanRouteOptions = {}
): RoutePlan | null {
  const mode = options.mode ?? 'smart';
  const current = getGraph();
  const validItems = items.filter((item) => current.departmentNode.has(item.departmentId));
  if (validItems.length === 0) return null;

  type StopGroup = { departmentId: number; items: string[]; aisleIds: number[] };

  // Standard is one stop per list entry, including repeated departments. It is
  // both the route shown in standard mode and the smart savings baseline.
  const standardGroups: StopGroup[] = validItems.map((item) => ({
    departmentId: item.departmentId,
    items: [item.name],
    aisleIds: item.aisleId != null ? [item.aisleId] : [],
  }));

  // Smart folds each department into one stop, keeping first-appearance order
  // as the optimiser's seed and only accepting strictly shorter candidates.
  const grouped = new Map<number, StopGroup>();
  for (const item of validItems) {
    const existing = grouped.get(item.departmentId);
    if (existing) {
      existing.items.push(item.name);
      if (item.aisleId != null) existing.aisleIds.push(item.aisleId);
    } else {
      grouped.set(item.departmentId, {
        departmentId: item.departmentId,
        items: [item.name],
        aisleIds: item.aisleId != null ? [item.aisleId] : [],
      });
    }
  }

  const seed = [...grouped.keys()];
  const nodeFor = (departmentId: number) => {
    const node = current.departmentNode.get(departmentId);
    if (node === undefined) throw new Error(`No location for department ${departmentId}`);
    return node;
  };

  const order =
    mode === 'standard'
      ? standardGroups.map((group) => group.departmentId)
      : seed.length <= EXACT_LIMIT
        ? exactOrder(seed, nodeFor)
        : twoOptOrder(seed, nodeFor);

  const groupsForOrder =
    mode === 'standard'
      ? standardGroups
      : order.map((departmentId) => grouped.get(departmentId)!);

  const listSequence = [
    current.entranceNode,
    ...standardGroups.map((group) => nodeFor(group.departmentId)),
    current.checkoutNode,
  ];
  const listUnits = sequenceDistance(listSequence);

  const stops: RouteStop[] = order.map((departmentId, index) => {
    const department: Department | undefined = departments.find(
      (entry) => entry.id === departmentId
    );
    const node = nodeFor(departmentId);
    const group = groupsForOrder[index];
    const departmentShelf = current.departmentShelf.get(departmentId);
    const itemShelves = group.aisleIds
      .map((aisleId) => storeLayout.aisles.find((aisle) => aisle.id === aisleId))
      .filter((aisle): aisle is (typeof storeLayout.aisles)[number] => aisle != null);
    // Prefer a numbered centre aisle, then the product's own shelf, then the
    // department anchor. Every stop ends up with a numeric aisle id.
    const locationShelf =
      itemShelves.find((aisle) => aisle.aisleNumber != null) ??
      itemShelves[0] ??
      departmentShelf;

    return {
      departmentId,
      departmentName: department?.name ?? 'Unknown',
      aisleId: locationShelf?.id ?? departmentId,
      aisleNumber: locationShelf?.aisleNumber ?? departmentShelf?.aisleNumber ?? null,
      aisleName: locationShelf?.name ?? departmentShelf?.name ?? 'aisle',
      shelf: departmentShelf ?? locationShelf ?? {
        x: current.points[node].x - 0.5,
        y: current.points[node].y - 0.5,
        width: 1,
        height: 1,
      },
      point: current.points[node],
      items: group.items,
      number: index + 1,
    };
  });

  const sequence = [
    current.entranceNode,
    ...order.map(nodeFor),
    current.checkoutNode,
  ];

  const legs: RouteLeg[] = [];
  for (let index = 0; index < sequence.length - 1; index += 1) {
    const from = sequence[index];
    const to = sequence[index + 1];
    const metres = distanceBetween(from, to) * METRES_PER_UNIT;

    legs.push({
      from: current.points[from],
      to: current.points[to],
      points: pathBetween(from, to),
      distanceMetres: metres,
      seconds: metres / WALKING_METRES_PER_SECOND,
      stopNumber: index === sequence.length - 2 ? null : index + 1,
      fromEntrance: index === 0,
    });
  }

  const totalMetres = legs.reduce((total, leg) => total + leg.distanceMetres, 0);
  const travelSeconds = legs.reduce((total, leg) => total + leg.seconds, 0);
  const listMetres = listUnits * METRES_PER_UNIT;
  const savedMetres = mode === 'smart' ? Math.max(0, listMetres - totalMetres) : 0;

  return {
    mode,
    stops,
    legs,
    start: current.points[current.entranceNode],
    checkout: current.points[current.checkoutNode],
    totalMetres,
    totalSeconds: travelSeconds + stops.length * SECONDS_PER_STOP,
    listMetres,
    savedMetres,
    savedPercent: listMetres > 0 ? (savedMetres / listMetres) * 100 : 0,
  };
}

/** Human-readable estimate, e.g. "6 min". */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

/** Human-readable distance, e.g. "193 m". */
export function formatDistance(metres: number): string {
  return `${Math.round(metres)} m`;
}
