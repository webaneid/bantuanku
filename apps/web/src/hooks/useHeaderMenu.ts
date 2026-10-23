'use client';

import { useMemo } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useI18n } from '@/lib/i18n/provider';
import type { MenuItem } from '@/services/settings';

export interface HeaderMenuItem {
  label: string;
  href: string;
}

function normalizePublicHref(href: string): string {
  const normalized = href.trim();

  switch (normalized) {
    case '/tentang':
      return '/page/tentang-kami';
    case '/infaq':
      return '/program';
    default:
      return normalized;
  }
}

/** Menu header dari pengaturan front-end; dipakai Header dan MobileMenuPanel agar selalu sama. */
export function useHeaderMenuItems(): HeaderMenuItem[] {
  const { settings } = useSettings();
  const { t } = useI18n();

  return useMemo(() => {
    if (settings.frontend_header_menu) {
      try {
        const parsed = JSON.parse(settings.frontend_header_menu) as MenuItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => ({
            label: item.label,
            href: normalizePublicHref(item.url),
          }));
        }
      } catch (error) {
        console.error('Failed to parse header menu:', error);
      }
    }
    return [
      { label: t('common.menuHome'), href: '/' },
      { label: t('common.program'), href: '/program' },
      { label: t('common.menuZakat'), href: '/zakat' },
      { label: t('common.menuQurban'), href: '/qurban' },
      { label: t('common.menuWakaf'), href: '/wakaf' },
      { label: t('common.menuLaporan'), href: '/laporan' },
      { label: t('common.menuAbout'), href: '/page/tentang-kami' },
    ];
  }, [settings.frontend_header_menu, t]);
}
