import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { OptionRow } from '@/components/ui/option-row';
import { SetupScreen } from '@/components/ui/setup-screen';
import { AppText } from '@/components/ui/text';

const comingSoon = [
  { title: 'Español', description: 'Coming soon' },
  { title: 'Français', description: 'Coming soon' },
  { title: 'Deutsch', description: 'Coming soon' },
];

export default function LanguageScreen() {
  const router = useRouter();

  return (
    <SetupScreen
      step={1}
      total={4}
      title="Choose your language"
      subtitle="SHOPMAP is available in English for now. More languages are coming soon."
      onBack={() => router.back()}
      footer={<Button label="Continue" onPress={() => router.push('/theme')} />}>
      <OptionRow
        title="English"
        description="English (United States)"
        selected
        onPress={() => {}}
      />

      {comingSoon.map((language) => (
        <OptionRow
          key={language.title}
          title={language.title}
          description={language.description}
          disabled
        />
      ))}

      <AppText variant="caption" color="textTertiary">
        We will let you know as soon as another language is ready.
      </AppText>
    </SetupScreen>
  );
}
