import { Stack } from 'expo-router';

import { SetupDraftProvider } from '@/state/setup-draft';

export default function SetupLayout() {
  return (
    <SetupDraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </SetupDraftProvider>
  );
}
