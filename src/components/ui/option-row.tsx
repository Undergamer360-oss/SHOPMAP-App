import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { useAppTheme } from '@/theme/theme-provider';
import { Radius, Spacing } from '@/theme/tokens';

type OptionRowProps = {
  title: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  leading?: ReactNode;
  onPress?: () => void;
};

export function OptionRow({
  title,
  description,
  selected = false,
  disabled = false,
  leading,
  onPress,
}: OptionRowProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={description ? `${title}, ${description}` : title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {leading}

      <View style={styles.copy}>
        <AppText variant="body" style={styles.title}>
          {title}
        </AppText>
        {description ? (
          <AppText variant="caption" color="textSecondary">
            {description}
          </AppText>
        ) : null}
      </View>

      <View
        style={[
          styles.indicator,
          {
            borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected ? colors.primary : 'transparent',
          },
        ]}>
        {selected ? <Icon sf="checkmark" md="check" size={14} color={colors.onPrimary} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: '600',
  },
  indicator: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
