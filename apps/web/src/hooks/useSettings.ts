'use client';

import { createContext, useContext } from 'react';
import type { PublicSettings } from '@/services/settings';

const DEFAULT_SETTINGS: PublicSettings = {
  site_name: '',
  site_tagline: 'Platform Donasi Terpercaya',
  organization_logo: '/logo.svg',
  organization_favicon: '/logo.svg',
};

const SettingsContext = createContext<PublicSettings>(DEFAULT_SETTINGS);

/**
 * Settings publik dari server (root layout, tercache di Next Data Cache dan dibuang oleh
 * revalidateTag('settings')). Dengan begitu Header/Footer tidak lagi memanggil API dari browser
 * di setiap halaman, dan HTML dari server sudah berisi logo, menu, dan footer yang benar.
 */
export const SettingsProvider = SettingsContext.Provider;

export function useSettings() {
  const settings = useContext(SettingsContext);
  return { settings, isLoading: false, error: null as Error | null };
}
