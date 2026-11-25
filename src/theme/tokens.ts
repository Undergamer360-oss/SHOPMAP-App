export type ThemeName = 'light' | 'dark';
export type ThemePreference = ThemeName | 'system';

export type AppColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  /** Sparse wayfinding accent; the app itself stays black, white and grey. */
  accent: string;
  accentSoft: string;
  success: string;
  danger: string;
  dangerSoft: string;
};

export const palettes: Record<ThemeName, AppColors> = {
  light: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceMuted: '#F2F2F2',
    border: '#E5E5E5',
    text: '#000000',
    textSecondary: '#5A5A5A',
    textTertiary: '#8A8A8A',
    primary: '#000000',
    onPrimary: '#FFFFFF',
    primarySoft: '#F2F2F2',
    accent: '#0A84FF',
    accentSoft: '#E8F2FF',
    success: '#111111',
    danger: '#B00020',
    dangerSoft: '#FCE8E6',
  },
  dark: {
    background: '#000000',
    surface: '#111111',
    surfaceMuted: '#1C1C1C',
    border: '#2E2E2E',
    text: '#FFFFFF',
    textSecondary: '#B3B3B3',
    textTertiary: '#808080',
    primary: '#FFFFFF',
    onPrimary: '#000000',
    primarySoft: '#1C1C1C',
    accent: '#5E9EFF',
    accentSoft: '#10233D',
    success: '#FFFFFF',
    danger: '#FF6B6B',
    dangerSoft: '#2A1111',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const FontSize = {
  display: 34,
  title: 26,
  headline: 20,
  body: 16,
  callout: 15,
  caption: 13,
} as const;
