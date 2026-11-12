import { useSyncExternalStore } from 'react';

import { clearPassword, savePassword } from '@/lib/credentials';
import { readJSON, writeJSON } from '@/lib/storage';
import type { ThemePreference } from '@/theme/tokens';

export type Language = 'en';

export type Address = {
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
};

export type Profile = {
  username: string;
  address: Address;
  createdAt: string;
};

export type Settings = {
  language: Language;
  theme: ThemePreference;
};

export type SetupState = {
  setupComplete: boolean;
  settings: Settings;
  profile: Profile | null;
};

const STORAGE_KEY = 'setup.v1';

export const emptyAddress: Address = {
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  country: '',
};

const defaultSettings: Settings = {
  language: 'en',
  theme: 'system',
};

const defaultState: SetupState = {
  setupComplete: false,
  settings: defaultSettings,
  profile: null,
};

const stored = readJSON<Partial<SetupState>>(STORAGE_KEY, {});

let state: SetupState = {
  setupComplete: stored.setupComplete === true,
  settings: { ...defaultSettings, ...stored.settings },
  profile: stored.profile ?? null,
};

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

function setState(next: SetupState) {
  state = next;
  writeJSON(STORAGE_KEY, state);
  listeners.forEach((listener) => listener());
}

export function useSetup() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function setThemePreference(theme: ThemePreference) {
  if (state.settings.theme === theme) {
    return;
  }
  setState({ ...state, settings: { ...state.settings, theme } });
}

export async function completeSetup(input: {
  language: Language;
  theme: ThemePreference;
  username: string;
  password: string;
  address: Address;
}) {
  await savePassword(input.password);
  setState({
    setupComplete: true,
    settings: { language: input.language, theme: input.theme },
    profile: {
      username: input.username.trim(),
      address: input.address,
      createdAt: new Date().toISOString(),
    },
  });
}

export async function resetSetup() {
  try {
    await clearPassword();
  } catch (error) {
    console.warn('[setup] could not clear stored password', error);
  }
  setState({ ...defaultState, settings: { ...defaultSettings } });
}
