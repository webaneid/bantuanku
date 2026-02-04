import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.scss';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Bantuanku - Platform Donasi Online Terpercaya',
    template: '%s | Bantuanku',
  },
  description:
    'Platform donasi online terpercaya untuk zakat, infaq, sedekah, qurban, dan wakaf. Transparansi penuh dan laporan real-time.',
  keywords: [
    'donasi',
    'zakat',
    'infaq',
    'sedekah',
    'qurban',
    'wakaf',
    'donasi online',
    'platform donasi',
  ],
  authors: [{ name: 'Bantuanku' }],
  creator: 'Bantuanku',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'Bantuanku',
    title: 'Bantuanku - Platform Donasi Online Terpercaya',
    description:
      'Platform donasi online terpercaya untuk zakat, infaq, sedekah, qurban, dan wakaf.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Bantuanku',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bantuanku - Platform Donasi Online Terpercaya',
    description:
      'Platform donasi online terpercaya untuk zakat, infaq, sedekah, qurban, dan wakaf.',
    images: ['/og-image.jpg'],
  },
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
  verification: {
    // Add Google Search Console verification here
    // google: 'your-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body>
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
