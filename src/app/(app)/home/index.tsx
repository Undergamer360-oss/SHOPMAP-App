import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductThumbnail } from '@/components/product-thumbnail';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { departmentsById, storeStats } from '@/data/catalog';
import {
  AISLE_PITCH_METRES,
  STORE_HEIGHT_METRES,
  STORE_WIDTH_METRES,
  WALKING_AISLE_METRES,
} from '@/data/layout';
import { SAMPLE_ORDERS, sampleItemsForOrder } from '@/data/sample-list';
import { useAppTheme } from '@/theme/theme-provider';
import { Radius, Spacing } from '@/theme/tokens';

/** The first five demo items, used as a quiet preview of what the app can do. */
const PREVIEW_ITEMS = sampleItemsForOrder(SAMPLE_ORDERS[0]).slice(0, 5);

/** Home is the jumping-off point for the shopping prototype. */
export default function HomeScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + Spacing.md,
        },
      ]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.surfaceMuted }]}>
          <View style={styles.heroHeader}>
            <View style={[styles.mark, { backgroundColor: colors.primary }]}>
              <Icon sf="list.bullet" md="list" size={22} color={colors.onPrimary} />
            </View>
            <AppText variant="caption" color="textTertiary">
              SHOPPING, SIMPLIFIED
            </AppText>
          </View>

          <AppText
            variant="display"
            style={styles.wordmark}
            numberOfLines={1}
            adjustsFontSizeToFit>
            SHOPMAP <AppText style={{ color: colors.accent }}>DEMO</AppText>
          </AppText>
          <AppText color="textSecondary" style={styles.tagline}>
            Turn a shopping list into the shortest walk through the store.
          </AppText>

          <View style={styles.preview}>
            <View style={styles.previewHeader}>
              <AppText variant="label" color="textSecondary">
                DEMO ITEMS
              </AppText>
              <AppText variant="caption" color="textTertiary">
                10 items · 17 orders
              </AppText>
            </View>
            <View style={styles.thumbnailRow}>
              {PREVIEW_ITEMS.map((item) => (
                <ProductThumbnail
                  key={item.name}
                  name={item.name}
                  departmentName={departmentsById.get(item.departmentId)?.name}
                  fill
                  style={{ backgroundColor: colors.surface }}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label="Start a shopping list"
            onPress={() => router.push('/list')}
            testID="start-list"
          />
          <Button
            label="Browse the store map"
            variant="secondary"
            onPress={() => router.push('/map')}
          />
        </View>

        <View style={[styles.stats, { borderTopColor: colors.border }]}>
          <View style={styles.stat}>
            <AppText variant="headline" style={styles.statNumber}>
              {storeStats.productCount.toLocaleString()}
            </AppText>
            <AppText variant="caption" color="textTertiary">
              products
            </AppText>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <AppText variant="headline" style={styles.statNumber}>
              {storeStats.departmentCount}
            </AppText>
            <AppText variant="caption" color="textTertiary">
              departments
            </AppText>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <AppText variant="headline" style={styles.statNumber}>
              {storeStats.aisleCount}
            </AppText>
            <AppText variant="caption" color="textTertiary">
              shelves
            </AppText>
          </View>
        </View>

        <AppText variant="caption" color="textTertiary" style={styles.storeSize}>
          {STORE_WIDTH_METRES} × {STORE_HEIGHT_METRES} m store · {WALKING_AISLE_METRES} m aisles on a{' '}
          {AISLE_PITCH_METRES} m pitch
        </AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  hero: {
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1.4,
    fontWeight: '700',
  },
  tagline: {
    marginTop: Spacing.sm,
    maxWidth: 300,
  },
  preview: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumbnailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  actions: {
    gap: Spacing.sm,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: {
    flex: 1,
    gap: 1,
  },
  statNumber: {
    fontSize: 22,
    lineHeight: 26,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    marginHorizontal: Spacing.md,
  },
  storeSize: {
    marginTop: -Spacing.sm,
  },
});
