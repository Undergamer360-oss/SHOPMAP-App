import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SetupScreen } from '@/components/ui/setup-screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useSetupDraft } from '@/state/setup-draft';
import { Spacing } from '@/theme/tokens';

type Errors = {
  username?: string;
  password?: string;
};

const usernamePattern = /^[a-zA-Z0-9._-]+$/;

export default function AccountScreen() {
  const router = useRouter();
  const { draft, update } = useSetupDraft();

  const [username, setUsername] = useState(draft.username);
  const [password, setPassword] = useState(draft.password);
  const [errors, setErrors] = useState<Errors>({});

  function handleContinue() {
    const nextErrors: Errors = {};
    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3) {
      nextErrors.username = 'Use at least 3 characters.';
    } else if (!usernamePattern.test(trimmedUsername)) {
      nextErrors.username = 'Use letters, numbers, dots, dashes or underscores only.';
    }

    if (password.length < 8) {
      nextErrors.password = 'Use at least 8 characters.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    update({ username: trimmedUsername, password });
    router.push('/address');
  }

  return (
    <SetupScreen
      step={3}
      total={4}
      title="Create your account"
      subtitle="This account lives on this device only. Your password is stored in the device keychain."
      onBack={() => router.back()}
      footer={<Button label="Continue" onPress={handleContinue} />}>
      <View style={{ gap: Spacing.lg }}>
        <TextField
          label="Username"
          value={username}
          onChangeText={(value) => {
            setUsername(value);
            if (errors.username) {
              setErrors((current) => ({ ...current, username: undefined }));
            }
          }}
          placeholder="e.g. alex"
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
          error={errors.username}
          hint="At least 3 characters."
        />

        <TextField
          label="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (errors.password) {
              setErrors((current) => ({ ...current, password: undefined }));
            }
          }}
          placeholder="At least 8 characters"
          secure
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          error={errors.password}
          hint="At least 8 characters."
        />
      </View>

      <AppText variant="caption" color="textTertiary">
        SHOPMAP never sends your details anywhere. Everything you enter stays on this phone.
      </AppText>
    </SetupScreen>
  );
}
