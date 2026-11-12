import 'expo-sqlite/localStorage/install';

const PREFIX = 'shopmap.';

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[storage] could not persist "${key}"`, error);
  }
}

export function removeValue(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Ignore: nothing to clean up.
  }
}
