import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StoreMap } from '@/components/store-map';
import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import {
  aislesById,
  departmentDisplayName,
  departments,
  getAisleProducts,
  getAisleProductCount,
  storeStats,
  type Aisle,
} from '@/data/catalog';
import { getAisleNode, storeLayout } from '@/data/layout';
import { departmentColor } from '@/theme/department-colors';
import { useAppTheme } from '@/theme/theme-provider';
import { Radius, Spacing } from '@/theme/tokens';

const PRODUCT_PREVIEW_COUNT = 10;

export default function MapScreen() {
  const { name: themeName, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { aisle: aisleParam } = useLocalSearchParams<{ aisle?: string }>();

  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);

  // Opening a search result jumps straight to that shelf. Deriving the
  // selection from the param keeps it in step with the URL.
  const paramAisle = aisleParam ? aislesById.get(Number(aisleParam)) : undefined;
  const [manualAisle, setManualAisle] = useState<Aisle | null>(null);
  const selectedAisle = paramAisle ?? manualAisle;

  const selectAisle = (aisle: Aisle | null) => setManualAisle(aisle);

  const visibleDepartments = useMemo(
    () => departments.filter((department) => department.aisleCount > 0),
    []
  );

  const preview = selectedAisle
    ? getAisleProducts(selectedAisle.id, PRODUCT_PREVIEW_COUNT)
    : [];
  const totalInAisle = selectedAisle ? getAisleProductCount(selectedAisle.id) : 0;
  const department = selectedAisle
    ? visibleDepartments.find((entry) => entry.id === selectedAisle.departmentId)
    : undefined;
  const aisleNode = selectedAisle ? getAisleNode(selectedAisle.id) : undefined;
  const location =
    aisleNode?.aisleNumber != null ? `aisle ${aisleNode.aisleNumber}` : 'perimeter counter';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: departmentId === null }}
            onPress={() => setDepartmentId(null)}
            style={[
              styles.chip,
              {
                backgroundColor: departmentId === null ? colors.primary : colors.surface,
                borderColor: departmentId === null ? colors.primary : colors.border,
              },
            ]}>
            <AppText
              variant="caption"
              style={{ color: departmentId === null ? colors.onPrimary : colors.textSecondary }}>
              All
            </AppText>
          </Pressable>

          {visibleDepartments.map((entry) => {
            const active = departmentId === entry.id;
            const color = departmentColor(entry.id, themeName);

            return (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setDepartmentId(active ? null : entry.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? color.fill : colors.surface,
                    borderColor: active ? color.stroke : colors.border,
                  },
                ]}>
                <View style={[styles.dot, { backgroundColor: color.stroke }]} />
                <AppText
                  variant="caption"
                  style={{ color: active ? color.stroke : colors.textSecondary }}>
                  {departmentDisplayName(entry.name)}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View
        style={[
          styles.mapWrap,
          { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
        ]}>
        <StoreMap
          highlightedDepartmentId={departmentId}
          selectedAisleId={selectedAisle?.id ?? null}
          onSelectAisle={selectAisle}
          resetKey={resetKey}
        />

      </View>

      {!selectedAisle ? (
        <>
          <View style={styles.hintRow}>
            <AppText variant="caption" color="textTertiary" style={styles.hint}>
              Tap a shelf to browse · pinch to zoom
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset map view"
              onPress={() => setResetKey((value) => value + 1)}
              style={[
                styles.fitButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}>
              <Icon
                sf="arrow.up.left.and.arrow.down.right"
                md="zoom-out-map"
                size={16}
                color={colors.text}
              />
            </Pressable>
          </View>

          <View
            style={[
              styles.overview,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <View style={styles.overviewHeader}>
              <AppText variant="label">STORE OVERVIEW</AppText>
              <AppText variant="caption" color="textTertiary">
                at a glance
              </AppText>
            </View>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <AppText variant="headline">{storeStats.aisleCount}</AppText>
                <AppText variant="caption" color="textTertiary">
                  shelves
                </AppText>
              </View>
              <View style={styles.stat}>
                <AppText variant="headline">{storeLayout.aisleCount}</AppText>
                <AppText variant="caption" color="textTertiary">
                  numbered aisles
                </AppText>
              </View>
              <View style={styles.stat}>
                <AppText variant="headline">{storeStats.productCount.toLocaleString()}</AppText>
                <AppText variant="caption" color="textTertiary">
                  products
                </AppText>
              </View>
            </View>
          </View>
        </>
      ) : null}

      {selectedAisle ? (
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitle}>
              <AppText variant="headline" numberOfLines={1}>
                {selectedAisle.name}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {department ? departmentDisplayName(department.name) : 'Unknown'} ·{' '}
                {totalInAisle.toLocaleString()} products · {location}
              </AppText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close shelf details"
              hitSlop={10}
              onPress={() => selectAisle(null)}
              style={[styles.close, { backgroundColor: colors.surfaceMuted }]}>
              <Icon sf="xmark" md="close" size={14} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.productScroll}
            contentContainerStyle={styles.products}
            showsVerticalScrollIndicator={false}>
            {preview.map((product) => (
              <View key={product.name} style={styles.productRow}>
                <AppText variant="callout" color="textSecondary" numberOfLines={1} style={styles.productName}>
                  {product.name}
                </AppText>
                <AppText variant="caption" color="textTertiary">
                  ×{product.quantity}
                </AppText>
              </View>
            ))}
          </ScrollView>

          {totalInAisle > preview.length ? (
            <AppText variant="caption" color="textTertiary">
              + {totalInAisle - preview.length} more in this shelf
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  toolbar: {
    paddingVertical: Spacing.sm,
  },
  chips: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
  },
  mapWrap: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    aspectRatio: storeLayout.width / storeLayout.height,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  fitButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    flex: 1,
  },
  overview: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    gap: Spacing.md,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  sheet: {
    flexShrink: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderCurve: 'continuous',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  sheetTitle: {
    flex: 1,
    gap: 2,
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productScroll: {
    flexShrink: 1,
  },
  products: {
    gap: 3,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  productName: {
    flex: 1,
  },
});
