import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { createContext, use, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  palettes,
  type AppColors,
  type ThemeName,
  type ThemePreference,
} from '@/theme/tokens';

type ThemeValue = {
  name: ThemeName;
  colors: AppColors;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function AppThemeProvider({
  preference,
  children,
}: {
  preference: ThemePreference;
  children: ReactNode;
}) {
  const systemScheme = useColorScheme();
  const name: ThemeName =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const colors = palettes[name];

  const navigationTheme = useMemo(() => {
    const base = name === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [name, colors]);

  const value = useMemo(() => ({ name, colors }), [name, colors]);

  return (
    <ThemeContext value={value}>
      <ThemeProvider value={navigationTheme}>{children}</ThemeProvider>
    </ThemeContext>
  );
}

export function useAppTheme() {
  const value = use(ThemeContext);
  if (!value) {
    throw new Error('useAppTheme must be used inside <AppThemeProvider>');
  }
  return value;
}
