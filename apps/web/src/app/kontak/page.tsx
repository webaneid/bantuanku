import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Header } from '@/components/organisms/Header';
import { Footer } from '@/components/organisms/Footer';
import { Breadcrumb } from '@/components/organisms/Breadcrumb';
import { fetchPublicSettings } from '@/services/settings';
import { fetchSeoSettings, resolveOgImageUrl, pageTitle } from '@/lib/seo';
import { normalizeLocale, translate } from '@/lib/i18n';

const SOCIAL_LABELS: Record<string, string> = {
  social_media_facebook: 'Facebook',
  social_media_instagram: 'Instagram',
  social_media_youtube: 'YouTube',
  social_media_twitter: 'Twitter / X',
  social_media_linkedin: 'LinkedIn',
  social_media_threads: 'Threads',
  social_media_tiktok: 'TikTok',
};

function currentLocale() {
  return normalizeLocale(cookies().get('locale')?.value);
}

/** Hanya http(s) yang boleh jadi href dari nilai settings (cegah javascript:). */
function safeUrl(value?: string): string | null {
  const v = (value || '').trim();
  if (!v) return null;
  const withProtocol = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProtocol);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

const GOOGLE_MAP_HOSTS = new Set(['www.google.com', 'google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl']);

/**
 * URL peta dari settings: hanya https dan domain Google. `embed` true bila URL memang bentuk embed
 * (kode iframe "Sematkan peta" juga diterima; diambil src-nya).
 */
function parseMapUrl(raw?: string): { url: string; embed: boolean } | null {
  const v = (raw || '').trim();
  const fromIframe = v.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  try {
    const u = new URL(fromIframe ? fromIframe[1] : v);
    if (u.protocol !== 'https:' || !GOOGLE_MAP_HOSTS.has(u.hostname)) return null;
    const embed = u.pathname.startsWith('/maps/embed') || u.searchParams.get('output') === 'embed';
    return { url: u.toString(), embed };
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = currentLocale();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const settings = await fetchSeoSettings();
  const siteName = settings.site_name || '';
  const canonical = `${appUrl}/kontak`;
  const title = translate(locale, 'kontak.title');
  const description = translate(locale, 'kontak.description', { organizationName: siteName });
  const ogImageUrl = resolveOgImageUrl(appUrl, [settings.og_image], '/og');

  return {
    title: pageTitle(title, siteName),
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      siteName,
      locale: 'id_ID',
      ...(ogImageUrl ? { images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

interface ContactItem {
  key: string;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  action?: { label: string; href: string };
  icon: React.ReactNode;
}

const iconProps = {
  className: 'w-6 h-6',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const;

const icons = {
  address: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  phone: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.3a1 1 0 01.95.68l1.1 3.3a1 1 0 01-.5 1.2l-1.5.75a11 11 0 005.4 5.4l.75-1.5a1 1 0 011.2-.5l3.3 1.1a1 1 0 01.68.95V19a2 2 0 01-2 2A16 16 0 013 5z" />
    </svg>
  ),
  whatsapp: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 11.5a8 8 0 01-11.8 7L4 20l1.6-4.1A8 8 0 1120 11.5z" />
    </svg>
  ),
  email: (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9 6 9-6" />
    </svg>
  ),
  website: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
    </svg>
  ),
};

export default async function KontakPage() {
  const locale = currentLocale();
  const t = (key: string, params?: Record<string, string>) => translate(locale, `kontak.${key}`, params);
  const settings = await fetchPublicSettings();

  const organizationName = settings.organization_name || settings.site_name || '';
  const phone = settings.organization_phone?.trim();
  const whatsapp = settings.organization_whatsapp?.trim();
  const email = settings.organization_email?.trim();
  const website = safeUrl(settings.organization_website);
  const address = (settings.organization_address || settings.organization_detail_address || '').trim();

  const map = parseMapUrl(settings.organization_map_url);
  const mapsLink = map?.url ?? (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null);
  const mapEmbedSrc = map?.embed
    ? map.url
    : address
      ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
      : null;

  const items: ContactItem[] = [];
  if (address) {
    items.push({
      key: 'address',
      label: t('address'),
      value: address,
      action: mapsLink ? { label: t('openInMaps'), href: mapsLink } : undefined,
      icon: icons.address,
    });
  }
  if (phone) {
    items.push({ key: 'phone', label: t('phone'), value: phone, href: `tel:${phone.replace(/[^\d+]/g, '')}`, icon: icons.phone });
  }
  if (whatsapp) {
    const waNumber = whatsapp.replace(/\D/g, '').replace(/^0/, '62');
    items.push({
      key: 'whatsapp',
      label: t('whatsapp'),
      value: whatsapp,
      action: { label: t('chatWhatsapp'), href: `https://wa.me/${waNumber}` },
      icon: icons.whatsapp,
    });
  }
  if (email) {
    items.push({ key: 'email', label: t('email'), value: email, href: `mailto:${email}`, icon: icons.email });
  }
  if (website) {
    items.push({ key: 'website', label: t('website'), value: website.replace(/^https?:\/\//, '').replace(/\/$/, ''), href: website, external: true, icon: icons.website });
  }

  const socials = Object.entries(SOCIAL_LABELS)
    .map(([key, label]) => ({ label, href: safeUrl((settings as Record<string, any>)[key]) }))
    .filter((s): s is { label: string; href: string } => !!s.href);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Breadcrumb items={[{ label: translate(locale, 'common.home'), href: '/' }, { label: t('title') }]} />
      <main className="flex-1">
        <section className="py-10 bg-gradient-to-br from-primary-50 to-white border-b border-primary-100">
          <div className="container mx-auto px-4">
            <h1 className="section-title text-dark">{t('title')}</h1>
            <p className="section-description text-gray-600 mt-1">
              {organizationName ? t('subtitle', { organizationName }) : t('subtitleDefault')}
            </p>
          </div>
        </section>

        <section className="py-6 md:py-10">
          <div className="container mx-auto px-[15px] md:px-4">
            {items.length === 0 && socials.length === 0 && !mapEmbedSrc ? (
              <p className="text-center py-16 text-gray-500">{t('empty')}</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {items.map((item) => (
                    <div key={item.key} className="flex gap-4 p-5 bg-white border border-gray-200 rounded-xl">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-medium text-gray-500">{item.label}</h2>
                        {item.href ? (
                          <a
                            href={item.href}
                            {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            className="block mt-0.5 font-semibold text-dark hover:text-primary-600 break-words"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p className="mt-0.5 font-semibold text-dark break-words">{item.value}</p>
                        )}
                        {item.action && (
                          <a
                            href={item.action.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                          >
                            {item.action.label} →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {mapEmbedSrc && (
                  <div className="mt-8 overflow-hidden border border-gray-200 rounded-xl">
                    <iframe
                      title={t('address')}
                      src={mapEmbedSrc}
                      className="w-full h-72 md:h-96 border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>
                )}

                {!address && mapsLink && (
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    {t('openInMaps')} →
                  </a>
                )}

                {socials.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold text-dark">{t('socialMedia')}</h2>
                    <div className="flex flex-wrap gap-3 mt-3">
                      {socials.map((s) => (
                        <a
                          key={s.label}
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:border-primary-400 hover:text-primary-600 transition-colors"
                        >
                          {s.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
