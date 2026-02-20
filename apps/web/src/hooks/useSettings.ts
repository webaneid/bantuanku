'use client';

import { useState, useEffect } from 'react';
import { fetchPublicSettings, PublicSettings } from '@/services/settings';

function isIgnorableSettingsError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (typeof error !== "object" || error === null) return false;

  const err = error as any;
  const name = String(err.name || "");
  const message = String(err.message || "");

  if (name === "AbortError") return true;
  if (name === "TypeError" && (message.includes("NetworkError") || message.includes("Failed to fetch"))) {
    return true;
  }

  return false;
}

export function useSettings() {
  const [settings, setSettings] = useState<PublicSettings>({
    site_name: 'Bantuanku',
    site_tagline: 'Platform Donasi Terpercaya',
    organization_logo: '/logo.svg',
    organization_favicon: '/logo.svg',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        setIsLoading(true);
        const data = await fetchPublicSettings();

        if (isMounted) {
          setSettings(data);
          setError(null);
        }
      } catch (err) {
        if (!isIgnorableSettingsError(err)) {
          console.error('Failed to load settings:', err);
        }
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to load settings'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  return { settings, isLoading, error };
}
