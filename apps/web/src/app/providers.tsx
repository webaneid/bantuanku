'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CartProvider } from '@/contexts/CartContext';
import { saveReferralCode } from '@/lib/referral';
import FeedbackToastHost from '@/components/FeedbackToastHost';
import { I18nProvider } from '@/lib/i18n/provider';

function ReferralCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      saveReferralCode(ref);
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
          {children}
          <FeedbackToastHost />
        </CartProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
