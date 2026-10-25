'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CartProvider } from '@/contexts/CartContext';
import { saveReferralCode } from '@/lib/referral';
import FeedbackToastHost from '@/components/FeedbackToastHost';
import MetaPixel from '@/components/MetaPixel';
import GoogleTagManager from '@/components/GoogleTagManager';
import { I18nProvider } from '@/lib/i18n/provider';
import { SettingsProvider } from '@/hooks/useSettings';
import type { PublicSettings } from '@/services/settings';
import type { Messages } from '@/lib/i18n/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

function ReferralCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      saveReferralCode(ref);
      // Set server-side cookie (30 hari) sebagai fallback untuk checkout
      fetch(`${API_URL}/fundraisers/track-referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: ref }),
      }).catch(() => {/* non-blocking, ignore error */});
    }
  }, [searchParams]);
  return null;
}

export function Providers({
  children,
  locale,
  messages,
  metaPixelId,
  gtmId,
  settings,
}: {
  children: React.ReactNode;
  /** Settings publik hasil pilihan server (lihat lib/settings-shell). */
  settings?: PublicSettings;
  locale?: string;
  /** Namespace dasar untuk locale aktif (lihat I18nProvider / ADR-0014). */
  messages: Messages;
  metaPixelId?: string | null;
  gtmId?: string | null;
}) {
  return (
    <SettingsProvider value={settings ?? {}}>
      <I18nProvider initialLocale={locale} messages={messages}>
        <CartProvider>
          <ReferralCapture />
          <MetaPixel pixelId={metaPixelId} />
          <GoogleTagManager gtmId={gtmId} />
          {children}
          <FeedbackToastHost />
        </CartProvider>
      </I18nProvider>
    </SettingsProvider>
  );
}
