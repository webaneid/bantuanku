import type { Metadata } from 'next';
import { fetchSeoSettings, resolveOgImageUrl } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.org';
  const settings = await fetchSeoSettings();
  const siteName = settings.site_name || 'Bantuanku';
  const canonical = `${appUrl}/daftar-mitra`;
  const title = `Daftar Mitra | ${siteName}`;
  const description = 'Daftarkan lembaga atau mitra Anda untuk bekerja sama dengan Bantuanku dalam program donasi, zakat, qurban, dan wakaf.';
  const ogImageUrl = resolveOgImageUrl(appUrl, [settings.og_image], '/og-image.jpg');

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      url: canonical,
      title: 'Daftar Mitra',
      description,
      siteName,
      locale: 'id_ID',
      ...(ogImageUrl ? { images: [{ url: ogImageUrl, width: 1200, height: 630, alt: 'Daftar Mitra' }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Daftar Mitra',
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

export default function DaftarMitraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
