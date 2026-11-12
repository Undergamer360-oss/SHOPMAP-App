import { Stack } from 'expo-router';

import { useAppTheme } from '@/theme/theme-provider';

export function TabStack({ title }: { title: string }) {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerLargeStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
