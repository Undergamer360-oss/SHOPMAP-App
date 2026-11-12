import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark, BrandWordmark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { useAppTheme } from '@/theme/theme-provider';
import { Radius, Spacing } from '@/theme/tokens';

const features = [
  {
    sf: 'map.fill',
    md: 'map',
    title: 'Everything on one map',
    description: 'Find the shops around you and keep your favourites in one place.',
  },
  {
    sf: 'tag.fill',
    md: 'local-offer',
    title: 'Built for shopping',
    description: 'See what is nearby without the noise of a full marketplace.',
  },
  {
    sf: 'lock.shield.fill',
    md: 'verified-user',
    title: 'Private by default',
    description: 'Your account and address stay on this device.',
  },
] as const;

export default function WelcomeScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.xl },
      ]}>
      <View style={styles.hero}>
        <View style={styles.brand}>
          <BrandMark />
          <BrandWordmark />
        </View>

        <AppText variant="display">Shop smarter, wherever you are.</AppText>
        <AppText color="textSecondary">
          SHOPMAP keeps the shops you care about on one simple map.
        </AppText>
      </View>

      <View style={styles.features}>
        {features.map((feature) => (
          <View key={feature.title} style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primarySoft }]}>
              <Icon sf={feature.sf} md={feature.md} size={18} color={colors.primary} />
            </View>
            <View style={styles.featureCopy}>
              <AppText variant="label">{feature.title}</AppText>
              <AppText variant="caption" color="textSecondary">
                {feature.description}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Button label="Get started" onPress={() => router.push('/language')} />
        <AppText variant="caption" color="textTertiary" style={styles.centered}>
          Takes about a minute. You can change everything later.
        </AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    gap: Spacing.md,
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  features: {
    gap: Spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    flex: 1,
    gap: 2,
  },
  footer: {
    gap: Spacing.md,
  },
  centered: {
    textAlign: 'center',
  },
});
