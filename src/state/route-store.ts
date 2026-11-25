import { useSyncExternalStore } from 'react';

import type { RoutePlan } from '@/data/route';

/**
 * Live navigation state for one shopping trip.
 *
 * A "step" is one thing the shopper advances past: each department stop, then
 * checkout. For a ten-item list spread over ten departments that is exactly
 * eleven advances, matching the prototype's walkthrough script.
 */
export type NavigationState = {
  plan: RoutePlan | null;
  /** 0-based index into `plan.stops`, with `stops.length` meaning checkout. */
  step: number;
  /** Stop numbers the shopper chose to skip. */
  skipped: number[];
  done: boolean;
};

const initialState: NavigationState = {
  plan: null,
  step: 0,
  skipped: [],
  done: false,
};

let state: NavigationState = initialState;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function setState(next: NavigationState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function useNavigation() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Current snapshot for headless checks and non-React callers. */
export function getNavigationSnapshot(): NavigationState {
  return getSnapshot();
}

export function startNavigation(plan: RoutePlan) {
  setState({ plan, step: 0, skipped: [], done: false });
}

/** Advance to the next stop, or finish after checkout. */
export function nextStep() {
  if (!state.plan || state.done) return;

  const lastStep = state.plan.stops.length;
  if (state.step >= lastStep) {
    setState({ ...state, done: true });
  } else {
    setState({ ...state, step: state.step + 1 });
  }
}

/** Skip the current stop and advance. The stop stays in the list history. */
export function skipStep() {
  if (!state.plan || state.done || state.step >= state.plan.stops.length) return;

  const number = state.plan.stops[state.step].number;
  setState({
    ...state,
    skipped: state.skipped.includes(number) ? state.skipped : [...state.skipped, number],
    step: state.step + 1,
  });
}

export function clearNavigation() {
  setState(initialState);
}

/** Total number of advances in the current trip, including checkout. */
export function stepCount(state: NavigationState): number {
  return state.plan ? state.plan.stops.length + 1 : 0;
}
