import { ImageResponse } from 'next/og';

import { resolveBrand, scaleFor } from '@/lib/brand';

export const runtime = 'edge';

// Nama lembaga & tagline dari settings (bukan hardcode tenant). Gagal ambil → kosong, bukan nama bawaan.
async function fetchBrand(): Promise<{ name: string; tagline: string; settings: Record<string, any> }> {
  try {
    const base = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1').replace(/\/$/, '');
    const res = await fetch(`${base.endsWith('/v1') ? base : `${base}/v1`}/settings`, {
      next: { revalidate: 300, tags: ['settings'] },
    });
    if (!res.ok) return { name: '', tagline: '', settings: {} };
    const settings = (await res.json()).data || {};
    return {
      name: settings.organization_name || settings.site_name || '',
      tagline: settings.site_tagline || '',
      settings,
    };
  } catch {
    return { name: '', tagline: '', settings: {} };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand = await fetchBrand();
  const colors = resolveBrand(brand.settings);
  const primary = scaleFor('primary', colors);
  const secondary = scaleFor('secondary', colors);
  const title = searchParams.get('title') || '';
  const subtitle = searchParams.get('subtitle') || brand.tagline;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const domain = appUrl ? new URL(appUrl).hostname : searchParams.get('domain') || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: `linear-gradient(135deg, ${primary[500]} 0%, ${primary[600]} 60%, ${primary[700]} 100%)`,
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Decorative circle top-right */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-40px',
            left: '60px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
          }}
        />

        {/* Badge */}
        {brand.name ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '100px',
              padding: '8px 20px',
              marginBottom: '28px',
            }}
          >
            <span style={{ color: secondary[500], fontSize: '14px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
              {brand.name}
            </span>
          </div>
        ) : null}

        {/* Title */}
        <div
          style={{
            color: '#ffffff',
            fontSize: title.length > 50 ? '40px' : title.length > 30 ? '52px' : '64px',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '20px',
            maxWidth: '900px',
            letterSpacing: '-1px',
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: '26px',
            fontWeight: 400,
            lineHeight: 1.4,
            maxWidth: '700px',
          }}
        >
          {subtitle}
        </div>

        {/* Bottom domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '80px',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '18px',
            fontWeight: 500,
          }}
        >
          {domain}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
