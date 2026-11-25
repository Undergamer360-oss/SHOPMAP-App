import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductThumbnail } from '@/components/product-thumbnail';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { departmentDisplayName } from '@/data/catalog';
import { getAisleNode } from '@/data/layout';
import { planRoute, type RouteMode } from '@/data/route';
import { searchProducts } from '@/data/search';
import { departmentColor } from '@/theme/department-colors';
import { useAppTheme } from '@/theme/theme-provider';
import { Radius, Spacing } from '@/theme/tokens';
import {
  addListItem,
  clearList,
  listItemDepartmentName,
  loadSampleList,
  removeListItem,
  useShoppingList,
} from '@/state/shopping-list-store';
import { startNavigation } from '@/state/route-store';

const MAX_SUGGESTIONS = 6;

/**
 * Shopping list entry point. Products come from the same ranked catalog search
 * as the Search tab, but here each result is added to the list instead of
 * opening the map. Smart and Standard buttons compile the list into department
 * stops; both begin at the store entrance.
 */
export default function ListScreen() {
  const { name: themeName, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const list = useShoppingList();
  const [query, setQuery] = useState('');

  const suggestions = useMemo(
    () => searchProducts(query, MAX_SUGGESTIONS),
    [query]
  );

  const buildRoute = (mode: RouteMode) => {
    const plan = planRoute(
      list.map((item) => ({
        name: item.name,
        departmentId: item.departmentId,
        aisleId: item.aisleId,
      })),
      { mode }
    );
    if (!plan) return;

    startNavigation(plan);
    router.push('/list/route');
  };

  const add = (result: (typeof suggestions)[number]) => {
    addListItem({
      name: result.product.name,
      departmentId: result.departmentId,
      aisleId: result.aisleId,
    });
    setQuery('');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}>
        <AppText variant="title">Shopping list</AppText>
        <AppText color="textSecondary" style={styles.intro}>
          Add what you need, then choose Smart for the shortest route or Standard to follow your list.
        </AppText>

        <View style={styles.actions}>
          <Button
            label="Load 10 items"
            variant="secondary"
            onPress={loadSampleList}
            testID="load-sample"
            style={styles.actionButton}
          />
          <Button
            label="Clear"
            variant="ghost"
            onPress={clearList}
            disabled={list.length === 0}
            testID="clear-list"
            style={styles.actionButton}
          />
        </View>

        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Icon sf="magnifyingglass" md="search" size={18} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Add a product"
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.primary}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
            style={[styles.input, { color: colors.text }]}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={10}
              onPress={() => setQuery('')}
              style={[styles.clear, { backgroundColor: colors.surfaceMuted }]}>
              <Icon sf="xmark" md="close" size={14} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {query.trim().length >= 2 ? (
          <View style={styles.suggestions}>
            <AppText variant="label" color="textSecondary" style={styles.sectionLabel}>
              MATCHING PRODUCTS
            </AppText>
            {suggestions.length === 0 ? (
              <AppText variant="caption" color="textTertiary" style={styles.noMatches}>
                No products match “{query.trim()}”.
              </AppText>
            ) : (
              suggestions.map((result) => {
                const color = departmentColor(result.departmentId, themeName);

                return (
                  <Pressable
                    key={`${result.aisleId}-${result.product.name}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${result.product.name}`}
                    testID="add-product"
                    onPress={() => add(result)}
                    style={[
                      styles.suggestion,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}>
                    <View style={[styles.suggestionStripe, { backgroundColor: color.stroke }]} />
                    <ProductThumbnail
                      name={result.product.name}
                      departmentName={result.departmentName}
                      size={40}
                    />
                    <View style={styles.suggestionText}>
                      <AppText variant="callout" numberOfLines={1}>
                        {result.product.name}
                      </AppText>
                      <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                        {departmentDisplayName(result.departmentName)} · {result.aisleName}
                      </AppText>
                    </View>
                    <View style={[styles.plus, { backgroundColor: colors.primarySoft }]}>
                      <Icon sf="plus" md="add" size={16} color={colors.primary} />
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        ) : null}

        <View style={styles.listHeader}>
          <AppText variant="label" color="textSecondary">
            YOUR ITEMS
          </AppText>
          <View style={[styles.countBadge, { backgroundColor: colors.primarySoft }]}>
            <AppText variant="caption" style={{ color: colors.primary }}>
              {list.length}
            </AppText>
          </View>
        </View>

        {list.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon sf="list.bullet" md="list" size={24} color={colors.primary} />
            <AppText variant="headline" style={styles.emptyTitle}>
              Nothing here yet
            </AppText>
            <AppText variant="caption" color="textSecondary" style={styles.centered}>
              Search above, or load the ten-item demo list to see the route in action.
            </AppText>
          </View>
        ) : (
          <View style={styles.items}>
            {list.map((item, index) => {
              const color = departmentColor(item.departmentId, themeName);
              const node = getAisleNode(item.aisleId);
              const location =
                node?.aisleNumber != null ? `Aisle ${node.aisleNumber}` : 'Perimeter';

              return (
                <View
                  key={item.id}
                  style={[
                    styles.item,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}>
                  <View style={[styles.itemStripe, { backgroundColor: color.stroke }]} />
                  <ProductThumbnail
                    name={item.name}
                    departmentName={listItemDepartmentName(item)}
                    size={40}
                    index={index + 1}
                  />
                  <View style={styles.itemText}>
                    <AppText variant="callout" numberOfLines={1}>
                      {item.name}
                    </AppText>
                    <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                      {listItemDepartmentName(item)} · {location}
                    </AppText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name}`}
                    testID="remove-item"
                    hitSlop={8}
                    onPress={() => removeListItem(item.id)}
                    style={styles.remove}>
                    <Icon sf="xmark" md="close" size={15} color={colors.textTertiary} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
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
        <AppText variant="caption" color="textTertiary" style={styles.footerHint}>
          {list.length > 0
            ? `${list.length} item${list.length === 1 ? '' : 's'} · both routes start at the entrance and end at checkout`
            : 'Both routes start at the entrance and end at checkout'}
        </AppText>
        <View style={styles.routeButtons}>
          <Button
            label="Smart route"
            onPress={() => buildRoute('smart')}
            disabled={list.length === 0}
            testID="smart-route"
            style={styles.routeButton}
          />
          <Button
            label="Standard route"
            variant="secondary"
            onPress={() => buildRoute('standard')}
            disabled={list.length === 0}
            testID="standard-route"
            style={styles.routeButton}
          />
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
  },
  intro: {
    marginTop: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    height: 46,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 0,
  },
  clear: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestions: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  sectionLabel: {
    letterSpacing: 0.6,
  },
  noMatches: {
    paddingVertical: Spacing.md,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  suggestionText: {
    flex: 1,
    gap: 1,
  },
  plus: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  countBadge: {
    minWidth: 24,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  emptyTitle: {
    marginTop: Spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
  items: {
    gap: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  itemText: {
    flex: 1,
    gap: 1,
  },
  remove: {
    padding: Spacing.sm,
  },
  footer: {
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  footerHint: {
    textAlign: 'center',
  },
  routeButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  routeButton: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
});
