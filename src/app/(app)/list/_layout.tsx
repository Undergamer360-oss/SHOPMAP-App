import { Stack } from 'expo-router';

import { useAppTheme } from '@/theme/theme-provider';

/** The List tab owns a small stack so route and navigation feel like a flow. */
export default function ListLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="index" options={{ title: 'Shopping list' }} />
      <Stack.Screen name="route" options={{ title: 'Your route' }} />
      <Stack.Screen name="navigate" options={{ title: 'Navigation' }} />
    </Stack>
  );
}
