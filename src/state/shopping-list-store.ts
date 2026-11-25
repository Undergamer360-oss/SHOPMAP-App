import { useSyncExternalStore } from 'react';

import { departmentsById, departmentDisplayName } from '@/data/catalog';
import { buildSampleItems } from '@/data/sample-list';
import { readJSON, writeJSON } from '@/lib/storage';

/** A product the shopper wants to pick up. */
export type ListItem = {
  id: string;
  name: string;
  departmentId: number;
  aisleId: number;
};

export type NewItem = Omit<ListItem, 'id'>;

const STORAGE_KEY = 'shopping-list.v1';

/** Unique ids are generated per load so a repeated demo list looks fresh. */
let nextId = 0;

function withIds(items: NewItem[]): ListItem[] {
  return items.map((item) => ({ ...item, id: `item-${Date.now()}-${nextId++}` }));
}

function loadStored(): ListItem[] {
  const stored = readJSON<ListItem[]>(STORAGE_KEY, []);
  if (!Array.isArray(stored)) return [];

  // Rebuild ids defensively: older versions of the list had none.
  return stored
    .filter(
      (item) =>
        item &&
        typeof item.name === 'string' &&
        typeof item.departmentId === 'number' &&
        typeof item.aisleId === 'number'
    )
    .map((item, index) => ({ ...item, id: item.id || `stored-${index}` }));
}

let state: ListItem[] = loadStored();
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

function setState(next: ListItem[]) {
  state = next;
  writeJSON(STORAGE_KEY, state);
  listeners.forEach((listener) => listener());
}

export function useShoppingList() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function addListItem(item: NewItem) {
  if (state.some((existing) => existing.name === item.name && existing.aisleId === item.aisleId)) {
    return;
  }
  setState([...state, ...withIds([item])]);
}

export function removeListItem(id: string) {
  setState(state.filter((item) => item.id !== id));
}

export function clearList() {
  setState([]);
}

/** Resolves a fresh ten-item demo list without changing the shopping list. */
export function buildSampleListItems(random?: () => number): NewItem[] {
  return buildSampleItems(random);
}

/** Replaces the list with a new ten-item demo order every time. */
export function loadSampleList() {
  setState(withIds(buildSampleItems()));
}

/** Display label used by list and navigation cards. */
export function listItemDepartmentName(item: ListItem): string {
  const department = departmentsById.get(item.departmentId);
  return departmentDisplayName(department?.name ?? 'Unknown');
}
