'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CartProvider } from '@/contexts/CartContext';
import { saveReferralCode } from '@/lib/referral';
import FeedbackToastHost from '@/components/FeedbackToastHost';
import MetaPixel from '@/components/MetaPixel';
import GoogleTagManager from '@/components/GoogleTagManager';
import { I18nProvider } from '@/lib/i18n/provider';

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
}: {
  children: React.ReactNode;
  locale?: string;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale}>
        <CartProvider>
          <ReferralCapture />
          <MetaPixel />
          <GoogleTagManager />
          {children}
          <FeedbackToastHost />
        </CartProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
