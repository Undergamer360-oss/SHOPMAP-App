import * as SecureStore from 'expo-secure-store';

const PASSWORD_KEY = 'shopmap.password.v1';

export async function savePassword(password: string) {
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
}

export async function readPassword() {
  return SecureStore.getItemAsync(PASSWORD_KEY);
}

export async function clearPassword() {
  await SecureStore.deleteItemAsync(PASSWORD_KEY);
}
