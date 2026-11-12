import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { useAppTheme } from '@/theme/theme-provider';
import { Radius, Spacing } from '@/theme/tokens';

type EmptyStateProps = {
  sf: Parameters<typeof Icon>[0]['sf'];
  md: Parameters<typeof Icon>[0]['md'];
  title: string;
  description: string;
};

export function EmptyState({ sf, md, title, description }: EmptyStateProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
        <Icon sf={sf} md={md} size={26} color={colors.primary} />
      </View>
      <AppText variant="headline" style={styles.centered}>
        {title}
      </AppText>
      <AppText color="textSecondary" style={[styles.centered, styles.description]}>
        {description}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
  description: {
    maxWidth: 280,
  },
});
