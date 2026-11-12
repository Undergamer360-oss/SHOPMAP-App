import { StyleSheet, Text, type TextProps } from 'react-native';

import { useAppTheme } from '@/theme/theme-provider';
import type { AppColors } from '@/theme/tokens';

export type TextVariant = 'display' | 'title' | 'headline' | 'body' | 'callout' | 'caption' | 'label';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: keyof AppColors;
};

export function AppText({
  variant = 'body',
  color = 'text',
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useAppTheme();

  return <Text style={[styles[variant], { color: colors[color] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headline: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  callout: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
