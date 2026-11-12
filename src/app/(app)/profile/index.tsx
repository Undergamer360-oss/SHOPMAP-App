import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { resetSetup, setThemePreference, useSetup, type Address } from '@/state/setup-store';
import { useAppTheme } from '@/theme/theme-provider';
import { Radius, Spacing, type ThemePreference } from '@/theme/tokens';

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function formatAddress(address: Address) {
  const cityLine = [address.city, address.postalCode].filter(Boolean).join(', ');

  return [address.line1, address.line2, cityLine, address.country].filter(Boolean).join('\n');
}

export default function ProfileScreen() {
  const { profile, settings } = useSetup();
  const { colors } = useAppTheme();
  const router = useRouter();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!profile) {
    return null;
  }

  const initial = profile.username.slice(0, 1).toUpperCase();
  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  async function handleReset() {
    setResetting(true);
    try {
      await resetSetup();
      router.replace('/welcome');
    } finally {
      setResetting(false);
      setConfirmingReset(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <Card style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <AppText variant="headline" color="primary">
            {initial}
          </AppText>
        </View>
        <View style={styles.identityCopy}>
          <AppText variant="headline">{profile.username}</AppText>
          <AppText variant="caption" color="textSecondary">
            Member since {memberSince}
          </AppText>
        </View>
      </Card>

      <Card>
        <AppText variant="label" color="textSecondary">
          Personal information
        </AppText>

        <View style={styles.infoRow}>
          <AppText variant="caption" color="textSecondary">
            Address
          </AppText>
          <AppText variant="body" selectable>
            {formatAddress(profile.address)}
          </AppText>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.infoRow}>
          <AppText variant="caption" color="textSecondary">
            Language
          </AppText>
          <AppText variant="body">English</AppText>
        </View>
      </Card>

      <Card>
        <AppText variant="label" color="textSecondary">
          Appearance
        </AppText>

        <View style={[styles.segment, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          {themeOptions.map((option) => {
            const active = settings.theme === option.value;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setThemePreference(option.value)}
                style={[
                  styles.segmentItem,
                  active && { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <AppText
                  variant="caption"
                  style={{ color: active ? colors.primary : colors.textSecondary, fontWeight: '600' }}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {confirmingReset ? (
        <Card>
          <AppText variant="headline">Reset setup?</AppText>
          <AppText color="textSecondary">
            This removes your profile, your address and your saved password, then returns you to the
            welcome screen.
          </AppText>
          <View style={styles.confirmActions}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => setConfirmingReset(false)}
              style={styles.confirmButton}
            />
            <Button
              label="Reset"
              variant="danger"
              onPress={handleReset}
              loading={resetting}
              style={styles.confirmButton}
            />
          </View>
        </Card>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset setup"
          onPress={() => setConfirmingReset(true)}
          style={({ pressed }) => [
            styles.reset,
            { backgroundColor: colors.dangerSoft },
            pressed && styles.pressed,
          ]}>
          <AppText variant="label" color="danger">
            Reset setup
          </AppText>
        </Pressable>
      )}

      <AppText variant="caption" color="textTertiary" style={styles.version}>
        SHOPMAP 1.0.0
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCopy: {
    flex: 1,
    gap: 2,
  },
  infoRow: {
    gap: Spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    minHeight: 36,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reset: {
    minHeight: 52,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  confirmButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  version: {
    textAlign: 'center',
  },
});
