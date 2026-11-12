import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SetupScreen } from '@/components/ui/setup-screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useSetupDraft } from '@/state/setup-draft';
import { completeSetup, type Address } from '@/state/setup-store';
import { Spacing } from '@/theme/tokens';

type AddressErrors = Partial<Record<keyof Address, string>>;

export default function AddressScreen() {
  const router = useRouter();
  const { draft, updateAddress } = useSetupDraft();
  const { address } = draft;

  const [errors, setErrors] = useState<AddressErrors>({});
  const [saving, setSaving] = useState(false);

  function clearError(field: keyof Address) {
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function validate() {
    const nextErrors: AddressErrors = {};

    if (!address.line1.trim()) {
      nextErrors.line1 = 'Enter your street address.';
    }
    if (!address.city.trim()) {
      nextErrors.city = 'Enter your city.';
    }
    if (!address.postalCode.trim()) {
      nextErrors.postalCode = 'Enter your postal code.';
    }
    if (!address.country.trim()) {
      nextErrors.country = 'Enter your country.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleFinish() {
    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      await completeSetup({
        language: draft.language,
        theme: draft.theme,
        username: draft.username,
        password: draft.password,
        address: {
          line1: address.line1.trim(),
          line2: address.line2.trim(),
          city: address.city.trim(),
          postalCode: address.postalCode.trim(),
          country: address.country.trim(),
        },
      });
      router.replace('/home');
    } catch {
      Alert.alert('Could not finish setup', 'Your details could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SetupScreen
      step={4}
      total={4}
      title="Where should we deliver?"
      subtitle="We save this as your personal information so checkout is quicker next time."
      onBack={() => router.back()}
      footer={<Button label="Finish setup" onPress={handleFinish} loading={saving} />}>
      <View style={{ gap: Spacing.lg }}>
        <TextField
          label="Street address"
          value={address.line1}
          onChangeText={(value) => {
            updateAddress({ line1: value });
            clearError('line1');
          }}
          placeholder="123 Market Street"
          autoComplete="address-line1"
          textContentType="streetAddressLine1"
          error={errors.line1}
        />

        <TextField
          label="Apartment, suite, etc. (optional)"
          value={address.line2}
          onChangeText={(value) => updateAddress({ line2: value })}
          placeholder="Unit 4B"
          autoComplete="address-line2"
          textContentType="streetAddressLine2"
        />

        <TextField
          label="City"
          value={address.city}
          onChangeText={(value) => {
            updateAddress({ city: value });
            clearError('city');
          }}
          placeholder="San Francisco"
          autoComplete="postal-address-locality"
          textContentType="addressCity"
          error={errors.city}
        />

        <TextField
          label="Postal code"
          value={address.postalCode}
          onChangeText={(value) => {
            updateAddress({ postalCode: value });
            clearError('postalCode');
          }}
          placeholder="94103"
          autoComplete="postal-code"
          textContentType="postalCode"
          error={errors.postalCode}
        />

        <TextField
          label="Country"
          value={address.country}
          onChangeText={(value) => {
            updateAddress({ country: value });
            clearError('country');
          }}
          placeholder="United States"
          autoComplete="country"
          textContentType="countryName"
          error={errors.country}
        />
      </View>

      <AppText variant="caption" color="textTertiary">
        Your address is stored on this device and used only to fill in your personal information.
      </AppText>
    </SetupScreen>
  );
}
