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
  success: string;
  danger: string;
  dangerSoft: string;
};

export const palettes: Record<ThemeName, AppColors> = {
  light: {
    background: '#F5F7F8',
    surface: '#FFFFFF',
    surfaceMuted: '#EDF0F2',
    border: '#E1E6E9',
    text: '#0F1417',
    textSecondary: '#59636B',
    textTertiary: '#8A949C',
    primary: '#0E7C66',
    onPrimary: '#FFFFFF',
    primarySoft: '#E2F2ED',
    success: '#1A7F37',
    danger: '#C0392B',
    dangerSoft: '#FBECEA',
  },
  dark: {
    background: '#0A0E10',
    surface: '#14191C',
    surfaceMuted: '#1B2226',
    border: '#293135',
    text: '#F1F5F6',
    textSecondary: '#A2ADB4',
    textTertiary: '#748087',
    primary: '#3ED6B4',
    onPrimary: '#03231C',
    primarySoft: '#113129',
    success: '#4ADE80',
    danger: '#FF7A6E',
    dangerSoft: '#2B1715',
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
