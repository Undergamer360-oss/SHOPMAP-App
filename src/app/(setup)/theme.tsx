import { useRouter } from 'expo-router';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { OptionRow } from '@/components/ui/option-row';
import { SetupScreen } from '@/components/ui/setup-screen';
import { useSetupDraft } from '@/state/setup-draft';
import { palettes, Radius, type ThemePreference } from '@/theme/tokens';

const options: { value: ThemePreference; title: string; description: string }[] = [
  { value: 'system', title: 'System', description: 'Match your device appearance' },
  { value: 'light', title: 'Light', description: 'Always use the light theme' },
  { value: 'dark', title: 'Dark', description: 'Always use the dark theme' },
];

function ThemeSwatch({ mode }: { mode: ThemePreference }) {
  if (mode === 'system') {
    return (
      <View style={[styles.swatch, { borderColor: palettes.light.border }]}>
        <View style={[styles.half, { backgroundColor: palettes.light.background }]}>
          <View style={[styles.halfCard, { backgroundColor: palettes.light.surface }]} />
        </View>
        <View style={[styles.half, { backgroundColor: palettes.dark.background }]}>
          <View style={[styles.halfCard, { backgroundColor: palettes.dark.surface }]} />
        </View>
      </View>
    );
  }

  const palette = palettes[mode];

  return (
    <View style={[styles.swatch, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.dot, { backgroundColor: palette.primary }]} />
      </View>
    </View>
  );
}

export default function ThemeScreen() {
  const router = useRouter();
  const { draft, update } = useSetupDraft();
  // Re-render the system swatch when the device appearance changes.
  useColorScheme();

  return (
    <SetupScreen
      step={2}
      total={4}
      title="Pick a theme"
      subtitle="Choose how SHOPMAP looks. You can switch at any time from your profile."
      onBack={() => router.back()}
      footer={<Button label="Continue" onPress={() => router.push('/account')} />}>
      {options.map((option) => (
        <OptionRow
          key={option.value}
          title={option.title}
          description={option.description}
          selected={draft.theme === option.value}
          leading={<ThemeSwatch mode={option.value} />}
          onPress={() => update({ theme: option.value })}
        />
      ))}
    </SetupScreen>
  );
}

const styles = StyleSheet.create({
  swatch: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    padding: 4,
  },
  half: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfCard: {
    width: 12,
    height: 18,
    borderRadius: 3,
  },
  card: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
  },
});
