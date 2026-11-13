import { Link, Slot, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { useAppTheme } from '@/theme/theme-provider';
import { Spacing } from '@/theme/tokens';

const items = [
  { href: '/home', label: 'Home', sf: 'house.fill', md: 'home' },
  { href: '/map', label: 'Map', sf: 'map.fill', md: 'map' },
  { href: '/search', label: 'Search', sf: 'magnifyingglass', md: 'search' },
  { href: '/saved', label: 'Saved', sf: 'bookmark.fill', md: 'bookmark' },
  { href: '/profile', label: 'Profile', sf: 'person.fill', md: 'person' },
] as const;

export default function AppTabs() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Slot />

      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + Spacing.sm,
          },
        ]}>
        {items.map((item) => {
          const active = pathname === item.href;
          const color = active ? colors.primary : colors.textTertiary;

          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} style={styles.item}>
                <Icon sf={item.sf} md={item.md} size={22} color={color} />
                <AppText variant="caption" style={{ color }}>
                  {item.label}
                </AppText>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
  },
});
