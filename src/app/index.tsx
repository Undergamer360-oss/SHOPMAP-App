import { Redirect } from 'expo-router';

import { useSetup } from '@/state/setup-store';

export default function Index() {
  const { setupComplete } = useSetup();

  return <Redirect href={setupComplete ? '/home' : '/welcome'} />;
}
