'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getBusinessSettings } from '@/lib/firestore';
import type { BusinessSettings } from '@/types/website';

type BusinessSettingsContextValue = {
  settings: BusinessSettings | null;
  loading: boolean;
  error: string | null;
};

const BusinessSettingsContext = createContext<BusinessSettingsContextValue | null>(null);

export default function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getBusinessSettings()
      .then((value) => {
        if (!active) return;
        setSettings(value);
        setError(null);
      })
      .catch(() => {
        if (active) setError('Business settings could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  return (
    <BusinessSettingsContext.Provider value={{ settings, loading, error }}>
      {children}
    </BusinessSettingsContext.Provider>
  );
}

export function useBusinessSettings() {
  const context = useContext(BusinessSettingsContext);
  if (!context) throw new Error('useBusinessSettings must be used inside BusinessSettingsProvider.');
  return context;
}
