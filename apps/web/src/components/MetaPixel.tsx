'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import * as fbPixel from '@/lib/fbPixel';

/**
 * MetaPixel — loads the Meta Pixel script and fires PageView on every route change.
 * Pixel ID (`meta_pixel_id`) dioper dari server (layout), tanpa request tambahan dari browser.
 * Renders nothing visible.
 */
export default function MetaPixel({ pixelId }: { pixelId?: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  // Initialize pixel script once when pixelId is available
  useEffect(() => {
    if (!pixelId || initialized.current) return;

    // Inject fbevents.js
    const f = window as any;
    const b = document;

    if (f.fbq) return; // already loaded

    const n: any = (f.fbq = function (...args: any[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];

    const t = b.createElement('script');
    t.async = true;
    t.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const s = b.getElementsByTagName('script')[0];
    s.parentNode?.insertBefore(t, s);

    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');

    initialized.current = true;
  }, [pixelId]);

  // Fire PageView on route changes (SPA navigation)
  useEffect(() => {
    if (!initialized.current) return;
    fbPixel.pageView();
  }, [pathname, searchParams]);

  // Render noscript fallback
  if (!pixelId) return null;

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
