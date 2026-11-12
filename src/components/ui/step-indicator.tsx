import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme/theme-provider';
import { Radius } from '@/theme/tokens';

type StepIndicatorProps = {
  total: number;
  current: number;
};

export function StepIndicator({ total, current }: StepIndicatorProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: current }}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            { backgroundColor: index < current ? colors.primary : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: Radius.pill,
  },
});
