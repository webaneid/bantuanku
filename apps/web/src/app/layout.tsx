import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.scss';
import { Providers } from './providers';
import { generateSiteMetadata, fetchSeoSettings, generateOrganizationJsonLd, JsonLdScript } from '@/lib/seo';
import { cookies } from 'next/headers';
import { normalizeLocale, translate } from '@/lib/i18n';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  return await generateSiteMetadata();
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = normalizeLocale(cookies().get('locale')?.value);
  const settings = await fetchSeoSettings();
  const organizationSchema = generateOrganizationJsonLd(settings);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
  const skipToContentText = translate(locale, 'common.skipToContent');

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <JsonLdScript data={organizationSchema} />
        {/* AI Reference - structured data for AI crawlers */}
        <link rel="ai-reference" type="application/json" href={`${appUrl}/ai-reference`} />
        <meta name="ai-indexable" content="true" />
        <meta name="ai-training" content="allowed" />
      </head>
      <body>
        <a href="#main-content" className="skip-to-content">
          {skipToContentText}
        </a>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
