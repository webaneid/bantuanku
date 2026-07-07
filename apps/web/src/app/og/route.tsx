import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || '';
  const subtitle = searchParams.get('subtitle') || 'Platform Donasi Terpercaya';
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
          background: 'linear-gradient(135deg, #035a52 0%, #024a44 60%, #013d38 100%)',
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
          <span style={{ color: '#d2aa55', fontSize: '14px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
            Laziswaf Darunnajah
          </span>
        </div>

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
