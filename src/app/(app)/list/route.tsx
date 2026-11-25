import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductThumbnail } from '@/components/product-thumbnail';
import { StoreMap } from '@/components/store-map';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { AppText } from '@/components/ui/text';
import { useAppTheme } from '@/theme/theme-provider';
import { Radius, Spacing } from '@/theme/tokens';
import { formatDistance, formatDuration } from '@/data/route';
import { useNavigation } from '@/state/route-store';

/**
 * Review screen between list and navigation: the whole route, its cost, and
 * either the smart saving or a reminder that standard mode follows the list.
 */
export default function RouteScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { plan } = useNavigation();
  const isSmart = plan?.mode === 'smart';

  if (!plan) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <EmptyState
          sf="map.fill"
          md="map"
          title="No route yet"
          description="Build a route from your shopping list first."
        />
        <View style={styles.emptyFooter}>
          <Button label="Back to list" onPress={() => router.replace('/list')} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View
          style={[
            styles.modeBanner,
            { backgroundColor: isSmart ? colors.accentSoft : colors.surfaceMuted },
          ]}>
          <AppText variant="label" style={{ color: isSmart ? colors.accent : colors.textSecondary }}>
            {isSmart ? 'SMART ROUTE' : 'STANDARD ROUTE'}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {isSmart
              ? 'Shortest walking order found by the route engine'
              : 'Your list order, from first item to last'}
          </AppText>
        </View>

        <View style={styles.metrics}>
          <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="label" color="textSecondary">
              DISTANCE
            </AppText>
            <AppText variant="headline">{formatDistance(plan.totalMetres)}</AppText>
          </View>
          <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="label" color="textSecondary">
              TIME
            </AppText>
            <AppText variant="headline">{formatDuration(plan.totalSeconds)}</AppText>
          </View>
          <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="label" color="textSecondary">
              STOPS
            </AppText>
            <AppText variant="headline">{plan.stops.length}</AppText>
          </View>
        </View>

        {isSmart ? (
          <View style={[styles.saving, { backgroundColor: colors.primarySoft }]}>
            <AppText variant="label" style={{ color: colors.primary }}>
              SMART ORDER
            </AppText>
            <AppText color="text" style={styles.savingText}>
              Saves about {formatDistance(plan.savedMetres)} (
              {Math.round(plan.savedPercent)}%) compared with your list order.
            </AppText>
          </View>
        ) : (
          <View style={[styles.saving, { backgroundColor: colors.surfaceMuted }]}>
            <AppText variant="label" color="textSecondary">
              LIST ORDER
            </AppText>
            <AppText color="text" style={styles.savingText}>
              No reordering. You start at the entrance, follow your list, then finish at checkout.
            </AppText>
          </View>
        )}

        <View style={styles.mapWrap}>
          <StoreMap
            highlightedDepartmentId={null}
            selectedAisleId={null}
            onSelectAisle={() => {}}
            resetKey={0}
            route={plan}
            activeLegIndex={null}
            activeStopNumber={null}
          />
        </View>

        <AppText variant="label" color="textSecondary" style={styles.sectionLabel}>
          WALKING ORDER
        </AppText>
        <View style={styles.stops}>
          <View style={[styles.stop, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <View style={[styles.stopNumber, { backgroundColor: colors.accent }]}>
              <AppText variant="caption" style={{ color: colors.onPrimary }}>
                S
              </AppText>
            </View>
            <View style={styles.stopText}>
              <AppText variant="callout" style={styles.stopName}>
                Entrance
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Start here
              </AppText>
            </View>
          </View>

          {plan.stops.map((stop) => {
            return (
              <View
                key={stop.number}
                style={[
                  styles.stop,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <ProductThumbnail
                  name={stop.items[0]}
                  departmentName={stop.departmentName}
                  size={38}
                  index={stop.number}
                />
                <View style={styles.stopText}>
                  <AppText variant="callout" style={styles.stopName} numberOfLines={1}>
                    {stop.departmentName}
                  </AppText>
                  <AppText variant="caption" color="textSecondary" numberOfLines={2}>
                    {stop.items.join(', ')}
                  </AppText>
                </View>
                <AppText variant="caption" color="textTertiary">
                  {formatDistance(plan.legs[stop.number - 1].distanceMetres)}
                </AppText>
              </View>
            );
          })}
          <View style={[styles.stop, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <View style={[styles.stopNumber, { backgroundColor: colors.primary }]}>
              <AppText variant="caption" style={{ color: colors.onPrimary }}>
                ✓
              </AppText>
            </View>
            <View style={styles.stopText}>
              <AppText variant="callout" style={styles.stopName}>
                Checkout
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Finish your trip
              </AppText>
            </View>
          </View>
        </View>

        <Button
          label="Start navigation"
          onPress={() => router.push('/list/navigate')}
          testID="start-navigation"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modeBanner: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    gap: Spacing.xs,
  },
  metrics: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metric: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    gap: 2,
  },
  saving: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    gap: 2,
  },
  savingText: {
    fontWeight: '500',
  },
  mapWrap: {
    height: 460,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  sectionLabel: {
    letterSpacing: 0.6,
    marginTop: Spacing.sm,
  },
  stops: {
    gap: Spacing.sm,
  },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  stopNumber: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopText: {
    flex: 1,
    gap: 1,
  },
  stopName: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyFooter: {
    padding: Spacing.lg,
  },
});
