import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';

import { emptyAddress, useSetup, type Address, type Language } from '@/state/setup-store';
import type { ThemePreference } from '@/theme/tokens';

export type SetupDraft = {
  language: Language;
  theme: ThemePreference;
  username: string;
  password: string;
  address: Address;
};

type DraftContextValue = {
  draft: SetupDraft;
  update: (patch: Partial<SetupDraft>) => void;
  updateAddress: (patch: Partial<Address>) => void;
};

const DraftContext = createContext<DraftContextValue | null>(null);

export function SetupDraftProvider({ children }: { children: ReactNode }) {
  const { settings, profile } = useSetup();

  const [draft, setDraft] = useState<SetupDraft>(() => ({
    language: settings.language,
    theme: settings.theme,
    username: profile?.username ?? '',
    password: '',
    address: profile?.address ?? emptyAddress,
  }));

  const update = useCallback((patch: Partial<SetupDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const updateAddress = useCallback((patch: Partial<Address>) => {
    setDraft((current) => ({
      ...current,
      address: { ...current.address, ...patch },
    }));
  }, []);

  const value = useMemo(() => ({ draft, update, updateAddress }), [draft, update, updateAddress]);

  return <DraftContext value={value}>{children}</DraftContext>;
}

export function useSetupDraft() {
  const value = use(DraftContext);
  if (!value) {
    throw new Error('useSetupDraft must be used inside <SetupDraftProvider>');
  }
  return value;
}
