'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
import { CartProvider } from '@/contexts/CartContext';

export function Providers({ children }: { children: React.ReactNode }) {
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
      <CartProvider>
        {children}
        {/* @ts-ignore */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#111827',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              borderRadius: '8px',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: '#678f0c',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#8f132f',
                secondary: '#fff',
              },
            },
          }}
        />
      </CartProvider>
    </QueryClientProvider>
  );
}
