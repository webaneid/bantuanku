import type { Metadata } from 'next';

// Cache SEO settings untuk menghindari multiple fetch
let cachedSettings: Record<string, any> | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function toAbsoluteUrl(appUrl: string, url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("data:")) return undefined;
  if (url.startsWith("http")) return url;
  return `${appUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

export function resolveOgImageUrl(
  appUrl: string,
  candidates: Array<string | null | undefined>,
  fallback: string = "/og-image.jpg"
): string | undefined {
  for (const candidate of candidates) {
    const normalized = toAbsoluteUrl(appUrl, candidate);
    if (normalized) return normalized;
  }
  return toAbsoluteUrl(appUrl, fallback);
}

export async function fetchSeoSettings(): Promise<Record<string, any>> {
  const now = Date.now();

  // Return cached if still valid
  if (cachedSettings && (now - cacheTime < CACHE_DURATION)) {
    return cachedSettings || {};
  }

  try {
    const baseApiUrl =
      process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:50245/v1";
    const normalizedBaseApiUrl = baseApiUrl.replace(/\/$/, "");
    const settingsUrl = normalizedBaseApiUrl.endsWith("/v1")
      ? `${normalizedBaseApiUrl}/settings`
      : `${normalizedBaseApiUrl}/v1/settings`;

    const response = await fetch(settingsUrl, {
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    });

    if (!response.ok) {
      throw new Error('Failed to fetch settings');
    }

    const data = await response.json();
    cachedSettings = data.data || {};
    cacheTime = now;

    return cachedSettings || {};
  } catch (error) {
    console.error('Error fetching SEO settings:', error);
    // Return defaults if fetch fails
    return {
      site_name: 'Bantuanku',
      site_tagline: 'Platform Donasi Terpercaya',
      site_description: 'Platform donasi online terpercaya untuk zakat, infaq, sedekah, qurban, dan wakaf.',
      site_keywords: 'donasi, zakat, infaq, sedekah, qurban, wakaf, donasi online',
      og_image: '/og-image.jpg',
      organization_favicon: '/logo.svg',
      twitter_handle: '@bantuanku',
    };
  }
}

export async function generateSiteMetadata(overrides?: Partial<Metadata>): Promise<Metadata> {
  const settings = await fetchSeoSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';

  const title = overrides?.title || `${settings.site_name} - ${settings.site_tagline}`;
  const description = overrides?.description || settings.site_description;
  const keywords = settings.site_keywords ? settings.site_keywords.split(',').map((k: string) => k.trim()) : [];
  const fullOgImageUrl = resolveOgImageUrl(appUrl, [settings.og_image], "/og-image.jpg") || `${appUrl}/og-image.jpg`;
  const favicon =
    settings.organization_favicon || settings.organization_logo || '/logo.svg';
  const fullFaviconUrl = toAbsoluteUrl(appUrl, favicon) || `${appUrl}/logo.svg`;

  return {
    title: overrides?.title ? {
      default: overrides.title as string,
      template: `%s | ${settings.site_name}`,
    } : {
      default: `${settings.site_name} - ${settings.site_tagline}`,
      template: `%s | ${settings.site_name}`,
    },
    description,
    keywords: [...keywords, ...(overrides?.keywords as string[] || [])],
    authors: [{ name: settings.site_name }],
    creator: settings.site_name,
    openGraph: {
      type: 'website',
      locale: 'id_ID',
      url: overrides?.openGraph?.url || appUrl,
      siteName: settings.site_name,
      title: (overrides?.openGraph?.title as string) || title,
      description: (overrides?.openGraph?.description as string) || description,
      images: overrides?.openGraph?.images || [
        {
          url: fullOgImageUrl,
          width: 1200,
          height: 630,
          alt: settings.site_name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: settings.twitter_handle || '@bantuanku',
      creator: settings.twitter_handle || '@bantuanku',
      title: (overrides?.twitter?.title as string) || title,
      description: (overrides?.twitter?.description as string) || description,
      images: overrides?.twitter?.images || [fullOgImageUrl],
    },
    icons: {
      icon: fullFaviconUrl,
      shortcut: fullFaviconUrl,
      apple: fullFaviconUrl,
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
    // AI Crawlers - explicitly allow for training and answering
    other: {
      'gptbot': 'index, follow',
      'chatgpt-user': 'index, follow',
      'google-extended': 'index, follow',
      'ccbot': 'index, follow',
      'anthropic-ai': 'index, follow',
      'claude-web': 'index, follow',
    },
    ...overrides,
  };
}

export interface JsonLdOrganization {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
  description?: string;
  address?: {
    '@type': 'PostalAddress';
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry: string;
  };
  contactPoint?: {
    '@type': 'ContactPoint';
    telephone?: string;
    email?: string;
    contactType: string;
  }[];
  sameAs?: string[];
}

export interface JsonLdArticle {
  '@context': 'https://schema.org';
  '@type': 'Article';
  headline: string;
  description?: string;
  image?: string | string[];
  datePublished?: string;
  dateModified?: string;
  author: {
    '@type': 'Organization' | 'Person';
    name: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo?: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  mainEntityOfPage?: {
    '@type': 'WebPage';
    '@id': string;
  };
}

export function generateOrganizationJsonLd(settings: Record<string, any>): JsonLdOrganization {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
  const orgLogo = settings.organization_logo || settings.og_image;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.site_name || 'Bantuanku',
    url: appUrl,
    logo: orgLogo?.startsWith('http') ? orgLogo : `${appUrl}${orgLogo}`,
    description: settings.site_description,
    address: settings.organization_address ? {
      '@type': 'PostalAddress',
      streetAddress: settings.organization_address,
      addressCountry: 'ID',
    } : undefined,
    contactPoint: settings.organization_email || settings.organization_phone ? [{
      '@type': 'ContactPoint',
      telephone: settings.organization_phone,
      email: settings.organization_email,
      contactType: 'customer service',
    }] : undefined,
    sameAs: [
      settings.facebook,
      settings.instagram,
      settings.twitter,
      settings.youtube,
      settings.linkedin,
    ].filter(Boolean),
  };
}

export interface JsonLdBreadcrumb {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }>;
}

export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; url?: string }>
): JsonLdBreadcrumb {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function JsonLdScript({ data }: { data: any }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
