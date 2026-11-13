import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { departmentDisplayName } from '@/data/catalog';
import { getAisleNode } from '@/data/layout';
import { groupByShelf, searchProducts } from '@/data/search';
import { departmentColor } from '@/theme/department-colors';
import { useAppTheme } from '@/theme/theme-provider';
import { Radius, Spacing } from '@/theme/tokens';

const RECENT_LIMIT = 5;

type RecentSearch = {
  query: string;
};

/**
 * Product search.
 *
 * Results are grouped by the shelf they sit on, because that is the thing a
 * shopper actually wants: not twenty kinds of milk, but "milk is in aisle 3,
 * on the dairy wall". Tapping a shelf opens the map on it.
 */
export default function SearchScreen() {
  const { name: themeName, colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  const results = useMemo(() => searchProducts(query, 60), [query]);
  const shelves = useMemo(() => groupByShelf(results), [results]);

  const showEmpty = query.trim().length >= 2 && shelves.length === 0;

  const openShelf = (aisleId: number) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    setRecent((current) => [
      { query: trimmed },
      ...current.filter((entry) => entry.query !== trimmed),
    ].slice(0, RECENT_LIMIT));

    router.push({ pathname: '/map', params: { aisle: String(aisleId) } });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon sf="magnifyingglass" md="search" size={18} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search products"
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={[styles.input, { color: colors.text }]}
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={10}
            onPress={() => setQuery('')}
            style={[styles.clear, { backgroundColor: colors.surfaceMuted }]}>
            <Icon sf="xmark.circle.fill" md="cancel" size={16} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {query.trim().length < 2 ? (
        <View style={styles.suggestions}>
          {recent.length > 0 ? (
            <>
              <AppText variant="label" color="textSecondary" style={styles.sectionLabel}>
                RECENT
              </AppText>
              {recent.map((entry) => (
                <Pressable
                  key={entry.query}
                  accessibilityRole="button"
                  onPress={() => setQuery(entry.query)}
                  style={styles.suggestionRow}>
                  <Icon sf="clock" md="history" size={16} color={colors.textTertiary} />
                  <AppText variant="callout" color="textSecondary">
                    {entry.query}
                  </AppText>
                </Pressable>
              ))}
            </>
          ) : (
            <View style={styles.suggestionsEmpty}>
              <AppText variant="caption" color="textTertiary" style={styles.centered}>
                Search for a product to find the aisle it is in.
              </AppText>
            </View>
          )}
        </View>
      ) : showEmpty ? (
        <View style={styles.suggestionsEmpty}>
          <AppText variant="headline" style={styles.centered}>
            No matches
          </AppText>
          <AppText variant="caption" color="textTertiary" style={styles.centered}>
            Nothing on the shelf matches “{query.trim()}”.
          </AppText>
        </View>
      ) : (
        <FlatList
          data={shelves}
          keyExtractor={(item) => String(item.aisleId)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
          ListHeaderComponent={
            <AppText variant="label" color="textSecondary" style={styles.sectionLabel}>
              {shelves.length} {shelves.length === 1 ? 'SHELF' : 'SHELVES'} · {results.length}{' '}
              {results.length === 1 ? 'PRODUCT' : 'PRODUCTS'}
            </AppText>
          }
          renderItem={({ item }) => {
            const color = departmentColor(item.departmentId, themeName);
            const node = getAisleNode(item.aisleId);
            const location =
              node?.aisleNumber != null ? `aisle ${node.aisleNumber}` : 'perimeter';

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.aisleName}, ${item.matches.length} matches, ${location}`}
                onPress={() => openShelf(item.aisleId)}
                style={[
                  styles.shelfCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <View style={[styles.shelfStripe, { backgroundColor: color.stroke }]} />

                <View style={styles.shelfHeader}>
                  <AppText variant="callout" style={styles.shelfName} numberOfLines={1}>
                    {item.aisleName}
                  </AppText>
                  <View style={[styles.badge, { backgroundColor: color.fill }]}>
                    <AppText variant="caption" style={{ color: color.stroke }}>
                      {departmentDisplayName(item.departmentName)}
                    </AppText>
                  </View>
                </View>

                <View style={styles.shelfMeta}>
                  <AppText variant="caption" color="textTertiary">
                    {item.matches.length} {item.matches.length === 1 ? 'match' : 'matches'} ·{' '}
                    {location}
                  </AppText>
                </View>

                <View style={styles.matches}>
                  {item.matches.slice(0, 4).map((match) => (
                    <AppText
                      key={match.product.name}
                      variant="caption"
                      color="textSecondary"
                      numberOfLines={1}>
                      {match.product.name}
                    </AppText>
                  ))}
                  {item.matches.length > 4 ? (
                    <AppText variant="caption" color="textTertiary">
                      +{item.matches.length - 4} more
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    margin: Spacing.lg,
    marginBottom: Spacing.sm,
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
  sectionLabel: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    letterSpacing: 0.6,
  },
  suggestions: {
    paddingHorizontal: Spacing.lg,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  suggestionsEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
  shelfCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
    gap: Spacing.sm,
  },
  shelfStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  shelfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  shelfName: {
    flex: 1,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  shelfMeta: {
    flexDirection: 'row',
    gap: 4,
  },
  matches: {
    gap: 2,
  },
});
