import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/ui/text';
import { useAppTheme } from '@/theme/theme-provider';
import { Radius, Spacing } from '@/theme/tokens';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  hint?: string;
  secure?: boolean;
};

export function TextField({
  label,
  error,
  hint,
  secure = false,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>

      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor,
          },
        ]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          secureTextEntry={secure && !revealed}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />

        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={8}
            onPress={() => setRevealed((value) => !value)}>
            <AppText variant="caption" color="primary" style={styles.toggle}>
              {revealed ? 'Hide' : 'Show'}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <AppText variant="caption" color="danger" selectable>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="textTertiary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
  },
  field: {
    minHeight: 52,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: Spacing.md,
  },
  toggle: {
    fontWeight: '600',
  },
});
