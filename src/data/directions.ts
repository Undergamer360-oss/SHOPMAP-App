import type { RouteLeg } from '@/data/route';
import { METRES_PER_UNIT } from '@/data/route';

type Heading = 'north' | 'south' | 'east' | 'west';

export type ShelfRect = { x: number; y: number; width: number; height: number };

export type DirectionInstruction = {
  id: string;
  /** Plain-language instruction, e.g. "Turn left from the shelf". */
  action: string;
  /** Optional secondary line shown under the action. */
  detail?: string;
  /** Metres covered by this instruction. Zero for turn and arrival steps. */
  metres: number;
};

const RIGHT_TURN: Record<Heading, Heading> = {
  north: 'east',
  east: 'south',
  south: 'west',
  west: 'north',
};

const LEFT_TURN: Record<Heading, Heading> = {
  north: 'west',
  west: 'south',
  south: 'east',
  east: 'north',
};

function headingBetween(from: { x: number; y: number }, to: { x: number; y: number }): Heading {
  if (Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)) {
    return to.x >= from.x ? 'east' : 'west';
  }
  return to.y >= from.y ? 'south' : 'north';
}

function turnAction(previous: Heading, next: Heading): string {
  if (previous === next) return 'Go straight';
  if (RIGHT_TURN[previous] === next) return 'Turn right';
  if (LEFT_TURN[previous] === next) return 'Turn left';
  return 'Turn around';
}

/**
 * Which way the shopper should turn after picking up an item.
 *
 * The shopper is assumed to be facing the shelf centre at the moment of pickup,
 * so left and right come from the person's point of view, not the shelf's. In
 * screen coordinates y grows downward, which makes `(facing.y, -facing.x)` the
 * vector to the person's left.
 */
function pickupTurn(
  shelf: ShelfRect,
  point: { x: number; y: number },
  movement: { x: number; y: number }
): Pick<DirectionInstruction, 'action' | 'detail'> {
  const facing = {
    x: shelf.x + shelf.width / 2 - point.x,
    y: shelf.y + shelf.height / 2 - point.y,
  };
  const leftScore = facing.y * movement.x - facing.x * movement.y;
  const forwardScore = facing.x * movement.x + facing.y * movement.y;
  const movementLength = Math.hypot(movement.x, movement.y);

  // A tiny sideways component means the next step is essentially straight
  // ahead or behind the shopper, so a left/right turn would be misleading.
  if (Math.abs(leftScore) < movementLength * 0.12) {
    return forwardScore >= 0
      ? {
          action: 'Walk straight from the shelf',
          detail: 'You’re already facing this way',
        }
      : {
          action: 'Turn around from the shelf',
          detail: 'The next aisle is behind you',
        };
  }

  return leftScore > 0
    ? {
        action: 'Turn left from the shelf',
        detail: 'You’re facing the shelf — head this way',
      }
    : {
        action: 'Turn right from the shelf',
        detail: 'You’re facing the shelf — head this way',
      };
}

/**
 * Turns a walking leg into egocentric directions. The routing grid is made of
 * axis-aligned corridors, so every direction change in the simplified polyline
 * is a real turn and its length is the distance to the next turn.
 */
export function directionsForLeg(
  leg: RouteLeg,
  destinationLabel?: string,
  originShelf?: ShelfRect | null
): DirectionInstruction[] {
  const segments = leg.points.slice(0, -1).map((from, index) => {
    const to = leg.points[index + 1];
    return {
      heading: headingBetween(from, to),
      metres: Math.round(
        (Math.abs(to.x - from.x) + Math.abs(to.y - from.y)) * METRES_PER_UNIT * 10
      ) / 10,
      movement: { x: to.x - from.x, y: to.y - from.y },
    };
  });

  const instructions: DirectionInstruction[] = [];

  // The first leg always begins outside the store, so say so explicitly. This
  // keeps custom lists just as entrance-first as the ten-item demo.
  if (leg.fromEntrance) {
    instructions.push({
      id: 'entrance',
      action: 'Start at the entrance',
      detail: 'Come in through the front doors',
      metres: 0,
    });
  }

  if (originShelf && segments.length > 0) {
    instructions.push({
      id: 'face',
      ...pickupTurn(originShelf, leg.from, segments[0].movement),
      metres: 0,
    });
  }

  segments.forEach((segment, index) => {
    instructions.push({
      id: `${index}`,
      action:
        index === 0
          ? 'Go straight'
          : turnAction(segments[index - 1].heading, segment.heading),
      metres: segment.metres,
    });
  });

  instructions.push({
    id: 'arrive',
    action: destinationLabel ? `Arrive at ${destinationLabel}` : 'Arrive',
    metres: 0,
  });

  return instructions;
}
