import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { ProductThumbnail } from '@/components/product-thumbnail';
import { StoreMap } from '@/components/store-map';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/text';
import { directionsForLeg } from '@/data/directions';
import { formatDistance, type RoutePoint, type RouteStop } from '@/data/route';
import {
  clearNavigation,
  nextStep,
  skipStep,
  stepCount,
  useNavigation,
} from '@/state/route-store';
import { useAppTheme } from '@/theme/theme-provider';
import { Radius, Spacing } from '@/theme/tokens';

function shelfFocusPoints(shelf: RouteStop['shelf']): RoutePoint[] {
  return [
    { x: shelf.x, y: shelf.y },
    { x: shelf.x + shelf.width, y: shelf.y + shelf.height },
  ];
}

const HERO_ENTERING = FadeInDown.duration(240).reduceMotion(ReduceMotion.System);
const DIRECTIONS_ENTERING = FadeInDown.duration(200)
  .delay(40)
  .reduceMotion(ReduceMotion.System);

/**
 * Turn-by-turn guide. Each press advances exactly one stop, then checkout.
 * The trip begins with an explicit entrance instruction, the first direction
 * after a pickup is based on the shopper facing the shelf, and the map is fitted
 * to the leg they are walking. Step changes use reduced-motion-aware transitions.
 */
export default function NavigateScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { plan, step, skipped, done } = navigation;
  const total = stepCount(navigation);
  const progressRatio =
    plan && total > 0 ? Math.min(1, Math.max(0, (step + 1) / total)) : 0;
  const progressStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scaleX: withTiming(progressRatio, {
          duration: 260,
          reduceMotion: ReduceMotion.System,
        }),
      },
    ],
  }));

  if (!plan) {
    return (
      <View style={[styles.centeredScreen, { backgroundColor: colors.background }]}>
        <AppText variant="headline">No active trip</AppText>
        <AppText color="textSecondary" style={styles.centered}>
          Start a route before opening navigation.
        </AppText>
        <Button label="Back to list" onPress={() => router.replace('/list')} />
      </View>
    );
  }

  if (done) {
    return (
      <View style={[styles.centeredScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.doneBadge, { backgroundColor: colors.accentSoft }]}>
          <AppText variant="display" style={{ color: colors.accent }}>
            ✓
          </AppText>
        </View>
        <AppText variant="title" style={styles.centered}>
          Trip complete
        </AppText>
        <AppText color="textSecondary" style={[styles.centered, styles.doneCopy]}>
          You visited {plan.stops.length - skipped.length} departments and made it to
          checkout in {formatDistance(plan.totalMetres)} of walking.
        </AppText>
        <Button
          label="Back to list"
          onPress={() => {
            clearNavigation();
            router.replace('/list');
          }}
        />
      </View>
    );
  }

  const currentStop = step < plan.stops.length ? plan.stops[step] : null;
  const isCheckout = currentStop === null;
  const currentLeg = plan.legs[step];
  const originShelf = step > 0 ? plan.stops[step - 1].shelf : null;
  const directions = directionsForLeg(
    currentLeg,
    isCheckout ? 'checkout' : currentStop.departmentName,
    originShelf
  );
  const progress = progressRatio * 100;
  const aisleLabel = currentStop
    ? currentStop.aisleNumber ?? currentStop.aisleId
    : null;

  const focusPoints = [
    ...currentLeg.points,
    ...(originShelf ? shelfFocusPoints(originShelf) : []),
    ...(currentStop ? shelfFocusPoints(currentStop.shelf) : []),
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.topRow}>
          <AppText variant="label">NAVIGATION</AppText>
          <View style={[styles.stepPill, { backgroundColor: colors.surfaceMuted }]}>
            <AppText variant="caption" style={{ color: colors.textSecondary }}>
              {step + 1} / {total}
            </AppText>
          </View>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.accent,
                transformOrigin: 'left center',
              },
              progressStyle,
            ]}
          />
        </View>

        <View style={styles.tripMeta}>
          <AppText variant="caption" color="textTertiary">
            {plan.mode === 'smart' ? 'SMART ROUTE' : 'STANDARD ROUTE'}
          </AppText>
          {step === 0 ? (
            <AppText variant="caption" style={{ color: colors.accent }}>
              FROM ENTRANCE
            </AppText>
          ) : null}
        </View>

        <Animated.View
          key={`hero-${plan.mode}-${step}`}
          entering={HERO_ENTERING}
          style={[
            styles.hero,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <View style={styles.heroTop}>
            {isCheckout ? (
              <View style={[styles.heroBadge, { backgroundColor: colors.accentSoft }]}>
                <AppText variant="callout" style={{ color: colors.accent }}>
                  ✓
                </AppText>
              </View>
            ) : (
              <ProductThumbnail
                name={currentStop.items[0]}
                departmentName={currentStop.departmentName}
                size={48}
                index={currentStop.number}
              />
            )}

            <View style={styles.heroCopy}>
              <AppText variant="caption" color="textTertiary">
                {isCheckout ? 'FINAL STEP' : `STOP ${currentStop.number} OF ${plan.stops.length}`}
              </AppText>
              <AppText variant="title" style={styles.itemTitle} selectable numberOfLines={2}>
                {isCheckout ? 'Head to checkout' : currentStop.items[0]}
              </AppText>
              {!isCheckout ? (
                <>
                  <AppText variant="body" color="textSecondary">
                    in aisle {aisleLabel}
                  </AppText>
                  <AppText variant="body" color="textSecondary">
                    located in {currentStop.departmentName}
                  </AppText>
                </>
              ) : (
                <AppText variant="body" color="textSecondary">
                  Pay for your items and you’re done.
                </AppText>
              )}
            </View>
          </View>

          {!isCheckout && currentStop.items.length > 1 ? (
            <View style={styles.extraItems}>
              <AppText variant="caption" color="textTertiary">
                ALSO IN THIS AISLE
              </AppText>
              {currentStop.items.slice(1).map((item) => (
                <AppText key={item} variant="callout" color="textSecondary" selectable>
                  {item}
                </AppText>
              ))}
            </View>
          ) : null}

          <View style={[styles.heroFooter, { borderTopColor: colors.border }]}>
            <AppText variant="caption" color="textSecondary">
              WALK {formatDistance(currentLeg.distanceMetres)}
            </AppText>
            <AppText variant="caption" color="textTertiary">
              {Math.round(progress)}% COMPLETE
            </AppText>
          </View>
        </Animated.View>

        <Animated.View key={`directions-${step}`} entering={DIRECTIONS_ENTERING} style={styles.directionsCard}>
          <View style={styles.sectionHeader}>
            <AppText variant="label">DIRECTIONS</AppText>
            <AppText variant="caption" color="textTertiary">
              {directions.length} steps
            </AppText>
          </View>

          {directions.map((direction, index) => (
            <View key={direction.id} style={styles.directionRow}>
              <View style={styles.timeline}>
                <View
                  style={[
                    styles.timelineDot,
                    { borderColor: index === 0 ? colors.accent : colors.border },
                    index === 0 && { backgroundColor: colors.accent },
                  ]}>
                  {index === 0 ? (
                    <View style={[styles.dotCore, { backgroundColor: colors.surface }]} />
                  ) : null}
                </View>
                {index < directions.length - 1 ? (
                  <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                ) : null}
              </View>

              <View style={styles.directionCopy}>
                <AppText
                  variant="callout"
                  style={{ color: index === 0 ? colors.text : colors.textSecondary }}>
                  {direction.action}
                </AppText>
                {direction.detail ? (
                  <AppText variant="caption" color="textTertiary">
                    {direction.detail}
                  </AppText>
                ) : null}
              </View>

              <AppText
                variant="label"
                style={{ color: index === 0 ? colors.text : colors.textSecondary }}>
                {direction.metres > 0 ? formatDistance(direction.metres) : '—'}
              </AppText>
            </View>
          ))}
        </Animated.View>

        <View
          style={[
            styles.mapCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <View style={styles.sectionHeader}>
            <AppText variant="label">CURRENT LEG</AppText>
            <AppText variant="caption" color="textTertiary">
              focused view
            </AppText>
          </View>
          <View style={styles.mapWrap}>
            <StoreMap
              highlightedDepartmentId={currentStop?.departmentId ?? null}
              selectedAisleId={null}
              onSelectAisle={() => {}}
              resetKey={step}
              route={plan}
              activeLegIndex={step}
              activeStopNumber={isCheckout ? null : currentStop.number}
              focusPoints={focusPoints}
            />
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + Spacing.md,
          },
        ]}>
        <View style={styles.buttons}>
          <Button
            label={isCheckout ? 'Finish trip' : 'Got it, next'}
            onPress={nextStep}
            testID="next-step"
            style={styles.primaryButton}
          />
          {!isCheckout ? (
            <Button
              label="Skip"
              variant="secondary"
              onPress={skipStep}
              testID="skip-step"
              style={styles.skipButton}
            />
          ) : null}
        </View>
      </View>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  progressTrack: {
    height: 5,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '100%',
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hero: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    gap: Spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  heroBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: 1,
  },
  itemTitle: {
    marginBottom: Spacing.xs,
  },
  extraItems: {
    gap: 2,
    paddingLeft: 56,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  directionsCard: {
    gap: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    minHeight: 46,
  },
  timeline: {
    width: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dotCore: {
    width: 4,
    height: 4,
    borderRadius: Radius.pill,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  directionCopy: {
    flex: 1,
    gap: 1,
  },
  mapCard: {
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    gap: Spacing.sm,
  },
  mapWrap: {
    height: 340,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  footer: {
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryButton: {
    flex: 2,
  },
  skipButton: {
    flex: 1,
  },
  centeredScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  centered: {
    textAlign: 'center',
  },
  doneBadge: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCopy: {
    maxWidth: 300,
  },
});
