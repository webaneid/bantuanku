'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * GoogleTagManager — loads GTM script dynamically when `gtm_container_id` is set in settings.
 * Fires a virtual pageview on every SPA route change via dataLayer push.
 * Renders the noscript fallback iframe.
 */
export default function GoogleTagManager({ gtmId }: { gtmId?: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  // Initialize GTM script once when gtmId is available
  useEffect(() => {
    if (!gtmId || initialized.current) return;

    // Initialize dataLayer
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    });

    // Inject gtm.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(script, firstScript);

    initialized.current = true;
  }, [gtmId]);

  // Push virtual pageview on SPA route changes
  useEffect(() => {
    if (!initialized.current) return;
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({
      event: 'virtualPageview',
      pagePath: pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''),
      pageTitle: document.title,
    });
  }, [pathname, searchParams]);

  if (!gtmId) return null;

  // Render noscript fallback
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="GTM"
      />
    </noscript>
  );
}
