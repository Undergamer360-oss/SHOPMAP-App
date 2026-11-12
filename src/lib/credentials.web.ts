const PASSWORD_KEY = 'shopmap.password.v1';

// The browser has no Keychain/Keystore equivalent, so the web build falls back to
// localStorage. Native builds always use expo-secure-store.
export async function savePassword(password: string) {
  globalThis.localStorage?.setItem(PASSWORD_KEY, password);
}

export async function readPassword() {
  return globalThis.localStorage?.getItem(PASSWORD_KEY) ?? null;
}

export async function clearPassword() {
  globalThis.localStorage?.removeItem(PASSWORD_KEY);
}
