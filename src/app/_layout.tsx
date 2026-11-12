import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useSetup } from '@/state/setup-store';
import { AppThemeProvider, useAppTheme } from '@/theme/theme-provider';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash screen may already be hidden during fast refresh.
});

function RootNavigator() {
  const { colors } = useAppTheme();
  const { setupComplete } = useSetup();
  const segments = useSegments();
  const router = useRouter();
  const root = segments[0];

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    const inOnboarding = root === 'welcome' || root === '(setup)';

    if (!setupComplete && !inOnboarding) {
      router.replace('/welcome');
    } else if (setupComplete && inOnboarding) {
      router.replace('/home');
    }
  }, [setupComplete, root, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="(setup)" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="(app)" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const { settings } = useSetup();

  return (
    <AppThemeProvider preference={settings.theme}>
      <RootNavigator />
    </AppThemeProvider>
  );
}
