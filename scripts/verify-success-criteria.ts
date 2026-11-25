/**
 * Headless verification for the SHOPMAP demo success criteria.
 *
 * Run with: npx tsx scripts/verify-success-criteria.ts
 */
import { allProducts, departmentsById } from '@/data/catalog';
import { directionsForLeg } from '@/data/directions';
import { storeLayout } from '@/data/layout';
import { thumbnailKeyForProduct, type ThumbnailKey } from '@/data/thumbnail-keys';
import {
  planRoute,
  type RouteItem,
  type RouteMode,
  type RoutePoint,
} from '@/data/route';
import {
  SAMPLE_ORDERS,
  buildSampleItems,
  sampleItemsForOrder,
  type SampleItem,
} from '@/data/sample-list';
import {
  getNavigationSnapshot,
  nextStep,
  skipStep,
  startNavigation,
  stepCount,
} from '@/state/route-store';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAILED: ${message}`);
}

function toRouteItems(items: SampleItem[]): RouteItem[] {
  return items;
}

function insideShelf(point: RoutePoint, shelf: (typeof storeLayout.aisles)[number]) {
  return (
    point.x > shelf.x &&
    point.x < shelf.x + shelf.width &&
    point.y > shelf.y &&
    point.y < shelf.y + shelf.height
  );
}

function assertNoShelfCrossing(items: RouteItem[], label: string, mode: RouteMode = 'smart') {
  const plan = planRoute(items, { mode });
  assert(plan, `${label}: plan exists`);

  for (const [legIndex, leg] of plan.legs.entries()) {
    for (let index = 0; index < leg.points.length - 1; index += 1) {
      const a = leg.points[index];
      const b = leg.points[index + 1];
      const horizontal = Math.abs(a.y - b.y) < 1e-9;
      const vertical = Math.abs(a.x - b.x) < 1e-9;
      assert(horizontal || vertical, `${label}: leg ${legIndex} segment ${index} is axis-aligned`);

      const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 20;
      for (let sample = 0; sample <= steps; sample += 1) {
        const ratio = steps === 0 ? 0 : sample / steps;
        const point = { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
        for (const shelf of storeLayout.aisles) {
          assert(!insideShelf(point, shelf), `${label}: leg ${legIndex} crosses shelf ${shelf.id}`);
        }
      }
    }
  }
}

// 1. Every demo item has a department, and each demo order visits it once.
assert(SAMPLE_ORDERS.length >= 10, 'at least ten demo orders are available');
let worstSaving = Number.POSITIVE_INFINITY;

SAMPLE_ORDERS.forEach((order, orderIndex) => {
  const items = sampleItemsForOrder(order);
  for (const item of items) {
    assert(departmentsById.has(item.departmentId), `order ${orderIndex}: ${item.name} has a department`);
  }

  const smart = planRoute(toRouteItems(items), { mode: 'smart' });
  const standard = planRoute(toRouteItems(items), { mode: 'standard' });
  assert(smart, `order ${orderIndex}: smart plan exists`);
  assert(standard, `order ${orderIndex}: standard plan exists`);
  assert(smart.mode === 'smart', `order ${orderIndex}: smart mode recorded`);
  assert(standard.mode === 'standard', `order ${orderIndex}: standard mode recorded`);
  assert(smart.stops.length === 10, `order ${orderIndex}: ten smart stops`);
  assert(standard.stops.length === 10, `order ${orderIndex}: ten standard stops`);
  assert(
    new Set(smart.stops.map((stop) => stop.departmentId)).size === 10,
    `order ${orderIndex}: smart visits each department once`
  );
  assert(
    standard.stops.map((stop) => stop.departmentId).join(',') ===
      items.map((item) => item.departmentId).join(','),
    `order ${orderIndex}: standard follows list order exactly`
  );
  assert(
    smart.savedPercent >= 15,
    `order ${orderIndex}: saves at least 15% (${smart.savedPercent.toFixed(1)}%)`
  );
  assert(
    standard.savedMetres === 0 && standard.savedPercent === 0,
    `order ${orderIndex}: standard reports no saving`
  );
  assert(
    Math.abs(standard.totalMetres - standard.listMetres) < 1e-9,
    `order ${orderIndex}: standard distance is the list baseline`
  );
  assert(
    Math.abs(smart.listMetres - standard.totalMetres) < 1e-9,
    `order ${orderIndex}: smart compares against standard distance`
  );
  assert(
    smart.totalMetres <= smart.listMetres + 1e-9,
    `order ${orderIndex}: smart route is never longer than standard`
  );

  worstSaving = Math.min(worstSaving, smart.savedPercent);
  assertNoShelfCrossing(toRouteItems(items), `order ${orderIndex} smart`, 'smart');
  assertNoShelfCrossing(toRouteItems(items), `order ${orderIndex} standard`, 'standard');
});

// 2. Repeating the demo gives a different, still-valid order.
const first = buildSampleItems(() => 0).map((item) => item.name);
const second = buildSampleItems(() => 0).map((item) => item.name);
assert(first.join('|') !== second.join('|'), 'Load 10 items randomises the list');
assert(new Set(second).size === 10, 'randomised list still has ten items');

// 3. Both modes start at the entrance and end at checkout.
const samplePlan = planRoute(toRouteItems(sampleItemsForOrder(SAMPLE_ORDERS[0])), {
  mode: 'smart',
});
const standardSamplePlan = planRoute(toRouteItems(sampleItemsForOrder(SAMPLE_ORDERS[0])), {
  mode: 'standard',
});
assert(samplePlan, 'smart sample route exists');
assert(standardSamplePlan, 'standard sample route exists');
for (const [label, plan] of [
  ['smart', samplePlan],
  ['standard', standardSamplePlan],
] as const) {
  assert(plan.legs[0].fromEntrance === true, `${label}: first leg is marked from the entrance`);
  assert(plan.legs[0].from.x === plan.start.x, `${label}: route starts at the entrance`);
  assert(plan.legs[0].from.y === plan.start.y, `${label}: route starts at the entrance`);
  assert(
    plan.legs[plan.legs.length - 1].to.x === plan.checkout.x &&
      plan.legs[plan.legs.length - 1].to.y === plan.checkout.y,
    `${label}: route ends at checkout`
  );
  assert(plan.legs[0].stopNumber === 1, `${label}: first leg walks to stop 1`);
  assert(
    plan.legs[plan.legs.length - 1].stopNumber === null,
    `${label}: last leg walks to checkout`
  );
}

// 4. Every leg has turn-by-turn directions whose distances match the walk.
for (const [legIndex, leg] of samplePlan.legs.entries()) {
  const directions = directionsForLeg(leg, legIndex === samplePlan.legs.length - 1 ? 'checkout' : `stop ${legIndex + 1}`);
  assert(directions.length >= 2, `leg ${legIndex}: has directions and arrival`);
  if (leg.fromEntrance) {
    assert(directions[0].action === 'Start at the entrance', 'first leg starts at the entrance');
    assert(directions[1].action === 'Go straight', 'entrance leg continues straight');
  } else {
    assert(directions[0].action === 'Go straight', `leg ${legIndex}: starts with Go straight`);
  }
  assert(
    directions[directions.length - 1].action.startsWith('Arrive'),
    `leg ${legIndex}: ends with Arrive`
  );
  const total = directions.reduce((sum, direction) => sum + direction.metres, 0);
  assert(
    Math.abs(total - leg.distanceMetres) < 0.5,
    `leg ${legIndex}: direction distances ${total.toFixed(1)}m match ${leg.distanceMetres.toFixed(1)}m`
  );
}

// After a pickup, left/right are calculated from the shopper facing the shelf.
const pickupLeg = samplePlan.legs[1];
const pickupShelf = samplePlan.stops[0].shelf;
const faceDirections = directionsForLeg(
  pickupLeg,
  samplePlan.stops[1].departmentName,
  pickupShelf
);
const facing = {
  x: pickupShelf.x + pickupShelf.width / 2 - pickupLeg.from.x,
  y: pickupShelf.y + pickupShelf.height / 2 - pickupLeg.from.y,
};
const firstMovement = {
  x: pickupLeg.points[1].x - pickupLeg.points[0].x,
  y: pickupLeg.points[1].y - pickupLeg.points[0].y,
};
const expectedTurn = facing.y * firstMovement.x - facing.x * firstMovement.y >= 0 ? 'left' : 'right';
assert(
  faceDirections[0].action === `Turn ${expectedTurn} from the shelf`,
  'first direction after a pickup turns from the shopper’s point of view'
);
assert(
  !faceDirections.some((direction) => /north|south|east|west/i.test(direction.action)),
  'directions avoid compass headings'
);

// 5. Three different list orders: standard stays literal and smart never
//    makes the walk longer.
const rotatedItems = sampleItemsForOrder([
  ...SAMPLE_ORDERS[0].slice(3),
  ...SAMPLE_ORDERS[0].slice(0, 3),
]);
const reversedItems = sampleItemsForOrder([...SAMPLE_ORDERS[0]].reverse());
const interleavedItems = sampleItemsForOrder(
  SAMPLE_ORDERS[0].filter((_, index) => index % 2 === 0).concat(
    SAMPLE_ORDERS[0].filter((_, index) => index % 2 === 1)
  )
);

[rotatedItems, reversedItems, interleavedItems].forEach((items, index) => {
  const smart = planRoute(toRouteItems(items), { mode: 'smart' });
  const standard = planRoute(toRouteItems(items), { mode: 'standard' });
  assert(smart, `list ${index + 1}: smart plan exists`);
  assert(standard, `list ${index + 1}: standard plan exists`);
  assert(
    standard.stops.map((stop) => stop.departmentId).join(',') ===
      items.map((item) => item.departmentId).join(','),
    `list ${index + 1}: standard follows the entries exactly`
  );
  assert(
    smart.totalMetres <= smart.listMetres + 1e-9,
    `list ${index + 1}: ${smart.totalMetres.toFixed(1)}m <= ${smart.listMetres.toFixed(1)}m`
  );
  assertNoShelfCrossing(toRouteItems(items), `list ${index + 1} smart`, 'smart');
  assertNoShelfCrossing(toRouteItems(items), `list ${index + 1} standard`, 'standard');
});

// A custom list that repeats a department proves standard does not silently
// reorder or fold entries, while smart folds and improves the same walk.
const repeatedItems = sampleItemsForOrder(SAMPLE_ORDERS[0]).slice(0, 3);
const repeatedWithDuplicate = [
  repeatedItems[0],
  repeatedItems[1],
  repeatedItems[0],
  repeatedItems[2],
];
const repeatedStandard = planRoute(toRouteItems(repeatedWithDuplicate), { mode: 'standard' });
const repeatedSmart = planRoute(toRouteItems(repeatedWithDuplicate), { mode: 'smart' });
assert(repeatedStandard, 'repeated list: standard plan exists');
assert(repeatedSmart, 'repeated list: smart plan exists');
assert(
  repeatedStandard.stops.map((stop) => stop.departmentId).join(',') ===
    repeatedWithDuplicate.map((item) => item.departmentId).join(','),
  'repeated list: standard revisits the department in list order'
);
assert(repeatedStandard.stops.length === 4, 'repeated list: standard keeps all four entries');
assert(
  repeatedSmart.stops.length === 3,
  'repeated list: smart folds the department into one stop'
);
assert(
  repeatedSmart.totalMetres <= repeatedSmart.listMetres + 1e-9,
  'repeated list: smart is never longer than standard'
);

// 6. Navigation has 11 advances, Skip advances, and every instruction changes.
startNavigation(samplePlan);
const totalSteps = stepCount(getNavigationSnapshot());
assert(totalSteps === 11, 'navigation has 11 steps for 10 items');

const instructionLabels = samplePlan.stops.map((stop) => stop.departmentName);
instructionLabels.push('Head to checkout');
for (let index = 0; index < instructionLabels.length - 1; index += 1) {
  assert(instructionLabels[index] !== instructionLabels[index + 1], `step ${index + 1} label changes`);
}

for (let advance = 1; advance <= totalSteps; advance += 1) {
  nextStep();
  const state = getNavigationSnapshot();
  if (advance < totalSteps) {
    assert(state.step === advance, `advance ${advance} moves to step ${advance}`);
    assert(!state.done, `advance ${advance} is not done`);
  } else {
    assert(state.done, 'advance 11 finishes the trip');
  }
}

startNavigation(samplePlan);
skipStep();
assert(getNavigationSnapshot().step === 1, 'Skip advances one step');
assert(
  getNavigationSnapshot().skipped.includes(samplePlan.stops[0].number),
  'Skip records the skipped stop'
);

// 7. Thumbnails: the demo items have curated images, and the keyword/department
//    resolver gives nearly the entire catalog a specific image offline.
const DEMO_THUMBNAILS: Record<string, ThumbnailKey> = {
  Bananas: 'banana',
  'Ice Cream Vanilla': 'iceCream',
  Bagels: 'bagel',
  'Chicken Breast': 'chicken',
  'Paper Towel': 'paper',
  'Milk Whole': 'milk',
  'Corn Chips': 'chips',
  'Coffee Mexican Vanilla': 'coffee',
  'Sesame Oil': 'oil',
  Ham: 'ham',
};
for (const item of sampleItemsForOrder(SAMPLE_ORDERS[0])) {
  assert(
    thumbnailKeyForProduct(item.name) === DEMO_THUMBNAILS[item.name],
    `${item.name} resolves to its demo thumbnail`
  );
}

let genericThumbnails = 0;
for (const entry of allProducts) {
  const key = thumbnailKeyForProduct(
    entry.product.name,
    departmentsById.get(entry.departmentId)?.name
  );
  if (key === 'cart') genericThumbnails += 1;
}
const genericPercent = (genericThumbnails / allProducts.length) * 100;
assert(
  genericPercent < 5,
  `at least 95% of ${allProducts.length} products have a specific thumbnail ` +
    `(${genericPercent.toFixed(1)}% generic)`
);

console.log('SHOPMAP success criteria: PASS');
console.log(
  `${SAMPLE_ORDERS.length} demo orders checked; worst saving ${worstSaving.toFixed(1)}%`
);
console.log(
  `Sample: ${samplePlan.stops.length} stops, ${samplePlan.listMetres.toFixed(1)}m list order -> ` +
    `${samplePlan.totalMetres.toFixed(1)}m optimised (${samplePlan.savedMetres.toFixed(1)}m saved)`
);
console.log(`Navigation: ${totalSteps} advances, Skip advances, turn directions distances verified`);
console.log('Modes: Standard keeps list order; Smart folds repeats and never exceeds Standard');
console.log(
  `Thumbnails: 10/10 demo items curated; ${(100 - genericPercent).toFixed(1)}% of ` +
    `${allProducts.length} catalog products have a specific local image`
);
