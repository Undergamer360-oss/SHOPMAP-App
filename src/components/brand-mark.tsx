import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { useAppTheme } from '@/theme/theme-provider';

export function BrandMark({ size = 72 }: { size?: number }) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: size / 4,
          backgroundColor: colors.primarySoft,
        },
      ]}>
      <Icon sf="map.fill" md="map" size={size / 2.2} color={colors.primary} />
    </View>
  );
}

export function BrandWordmark() {
  const { colors } = useAppTheme();

  return (
    <AppText variant="caption" style={[styles.wordmark, { color: colors.textSecondary }]}>
      SHOPMAP
    </AppText>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  wordmark: {
    letterSpacing: 4,
    fontWeight: '700',
    fontSize: 12,
  },
});
