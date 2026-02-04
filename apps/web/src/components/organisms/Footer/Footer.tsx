'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { useSettings } from '@/hooks/useSettings';
import { QrCodeIcon, CreditCardIcon, BanknotesIcon } from '@heroicons/react/24/outline';

// Props now optional - Footer will fetch settings if not provided
export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  logo?: string;
  organizationName?: string;
  organizationAbout?: string;
  organizationAboutUrl?: string;
  organizationAboutUrlLabel?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  programLinks?: Array<{ label: string; href: string }>;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    twitter?: string;
    linkedin?: string;
    threads?: string;
    tiktok?: string;
  };
}

const defaultProgramLinks = [
  { label: 'Zakat', href: '/zakat' },
  { label: 'Qurban', href: '/qurban' },
  { label: 'Infaq/Sedekah', href: '/infaq' },
  { label: 'Wakaf', href: '/wakaf' },
];

const aboutLinks = [
  { label: 'Tentang Kami', href: '/tentang' },
  { label: 'Kontak', href: '/kontak' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Syarat & Ketentuan', href: '/syarat-ketentuan' },
  { label: 'Kebijakan Privasi', href: '/kebijakan-privasi' },
];

// Social media icon configurations
const socialMediaIcons = {
  facebook: {
    label: 'Facebook',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  youtube: {
    label: 'YouTube',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  twitter: {
    label: 'Twitter / X',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  linkedin: {
    label: 'LinkedIn',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  threads: {
    label: 'Threads',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.29a13.853 13.853 0 013.02.142l-.126 1.974a11.881 11.881 0 00-2.588-.116c-1.014.055-1.846.326-2.472.805-.595.454-.915 1.045-.878 1.618.033.547.281.991.738 1.323.498.363 1.146.544 1.925.54 1.146-.05 1.975-.437 2.538-1.187.452-.6.739-1.42.853-2.437a10.221 10.221 0 00-.853-.031c-2.017.016-3.635.51-4.81 1.468-1.326 1.082-2.018 2.632-1.943 4.36.071 1.637.913 3.056 2.37 3.992 1.135.729 2.59 1.081 4.33 1.047 2.079-.097 3.732-.918 4.91-2.441.914-1.183 1.477-2.664 1.678-4.407.017-.15.028-.301.034-.454 1.126.638 1.976 1.493 2.525 2.546.79 1.514.841 4.088-1.172 6.155-1.798 1.846-4.046 2.754-6.883 2.774z"/>
      </svg>
    ),
  },
  tiktok: {
    label: 'TikTok',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
  },
};

export const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({
    logo: logoProp,
    organizationName: nameProp,
    organizationAbout: aboutProp,
    organizationAboutUrl: aboutUrlProp,
    organizationAboutUrlLabel: aboutUrlLabelProp,
    phone: phoneProp,
    whatsapp: whatsappProp,
    email: emailProp,
    address: addressProp,
    programLinks: programLinksProp,
    socialMedia: socialMediaProp,
    className,
    ...props
  }, ref) => {
    const currentYear = new Date().getFullYear();
    const { settings, isLoading, error } = useSettings();

    // Use props or fallback to settings
    const logo = logoProp || settings.organization_logo || '/logo.svg';
    const organizationName = nameProp || settings.organization_name || 'Bantuanku';
    const organizationAbout = aboutProp || settings.organization_about || 'Platform donasi terpercaya untuk membantu sesama yang membutuhkan';
    const organizationAboutUrl = aboutUrlProp ?? settings.organization_about_url;
    const organizationAboutUrlLabel = aboutUrlLabelProp || settings.organization_about_url_label || 'Selengkapnya';
    const phone = phoneProp ?? settings.organization_phone;
    const whatsapp = whatsappProp ?? settings.organization_whatsapp;
    const email = emailProp ?? settings.organization_email;
    const address = addressProp || settings.organization_address || settings.organization_detail_address;

    // Parse service categories for footer program links
    const programLinks = useMemo(() => {
      if (programLinksProp) return programLinksProp;

      if (settings.frontend_service_categories) {
        try {
          const parsedCategories = JSON.parse(settings.frontend_service_categories);
          if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
            return parsedCategories.map((cat: any) => ({
              label: cat.name,
              href: cat.slug.startsWith('/') ? cat.slug : `/${cat.slug}`,
            }));
          }
        } catch (error) {
          console.error('Failed to parse service categories:', error);
        }
      }

      return defaultProgramLinks;
    }, [programLinksProp, settings.frontend_service_categories]);

    // Parse footer columns from settings
    const footerColumns = useMemo(() => {
      if (settings.frontend_footer_menu) {
        try {
          const parsedColumns = JSON.parse(settings.frontend_footer_menu);
          if (Array.isArray(parsedColumns) && parsedColumns.length > 0) {
            return parsedColumns.map((col: any) => ({
              ...col,
              items: col.items.map((item: any) => ({
                ...item,
                href: item.url.startsWith('/') ? item.url : `/${item.url}`,
              })),
            }));
          }
        } catch (error) {
          console.error('Failed to parse footer columns:', error);
        }
      }
      return null;
    }, [settings.frontend_footer_menu]);

    // Social media from props or settings
    const socialMedia = socialMediaProp || {
      facebook: settings.social_media_facebook,
      instagram: settings.social_media_instagram,
      youtube: settings.social_media_youtube,
      twitter: settings.social_media_twitter,
      linkedin: settings.social_media_linkedin,
      threads: settings.social_media_threads,
      tiktok: settings.social_media_tiktok,
    };

    // Build social links array from socialMedia
    const activeSocialLinks = useMemo(() => {
      if (!socialMedia) return [];

      return Object.entries(socialMedia)
        .filter(([_, url]) => url && url.trim() !== '') // Only include if URL exists and not empty
        .map(([platform, url]) => ({
          platform: platform as keyof typeof socialMediaIcons,
          href: url as string,
          label: socialMediaIcons[platform as keyof typeof socialMediaIcons]?.label || platform,
          icon: socialMediaIcons[platform as keyof typeof socialMediaIcons]?.icon,
        }));
    }, [socialMedia]);

    return (
      <footer ref={ref} className={cn('footer', className)} {...props}>
          <div className="footer__container">
            {/* Top Section */}
            <div className="footer__top">
              {/* Brand */}
              <div className="footer__brand">
                <Link href="/" className="footer__logo">
                  <img src={logo} alt={organizationName} className="footer__logo-img" />
                </Link>
                <p className="footer__tagline">
                  {organizationAbout}
                </p>
                {organizationAboutUrl && (
                  <Link href={organizationAboutUrl} className="inline-flex items-center text-sm text-primary-300 hover:text-primary-100 transition-colors mt-3">
                    {organizationAboutUrlLabel} →
                  </Link>
                )}
                {activeSocialLinks.length > 0 && (
                  <div className="footer__social">
                    {activeSocialLinks.map((social) => (
                      <a
                        key={social.platform}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer__social-link"
                        aria-label={social.label}
                      >
                        {social.icon}
                      </a>
                    ))}
                  </div>
                )}
              </div>

            {/* Links */}
            <div className="footer__links">
              {footerColumns && footerColumns.length > 0 ? (
                // Dynamic columns from settings
                <>
                  {footerColumns.map((column: any) => (
                    <div key={column.id} className="footer__link-group">
                      <h3 className="footer__link-title">{column.title}</h3>
                      <ul className="footer__link-list">
                        {column.items.map((item: any) => (
                          <li key={item.id}>
                            <Link href={item.href} className="footer__link">
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {/* Keep Kontak column */}
                  <div className="footer__link-group">
                    <h3 className="footer__link-title">Kontak</h3>
                    <ul className="footer__link-list">
                      {email && (
                        <li>
                          <a href={`mailto:${email}`} className="footer__link">
                            {email}
                          </a>
                        </li>
                      )}
                      {phone && (
                        <li>
                          <a href={`tel:${phone}`} className="footer__link">
                            {phone}
                          </a>
                        </li>
                      )}
                      {whatsapp && (
                        <li>
                          <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="footer__link">
                            WhatsApp: {whatsapp}
                          </a>
                        </li>
                      )}
                      {address && (
                        <li className="footer__address">
                          {address}
                        </li>
                      )}
                    </ul>
                  </div>
                </>
              ) : (
                // Fallback to default columns
                <>
                  <div className="footer__link-group">
                    <h3 className="footer__link-title">Program</h3>
                    <ul className="footer__link-list">
                      {programLinks.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href} className="footer__link">
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="footer__link-group">
                    <h3 className="footer__link-title">Informasi</h3>
                    <ul className="footer__link-list">
                      {aboutLinks.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href} className="footer__link">
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="footer__link-group">
                    <h3 className="footer__link-title">Kontak</h3>
                    <ul className="footer__link-list">
                      {email && (
                        <li>
                          <a href={`mailto:${email}`} className="footer__link">
                            {email}
                          </a>
                        </li>
                      )}
                      {phone && (
                        <li>
                          <a href={`tel:${phone}`} className="footer__link">
                            {phone}
                          </a>
                        </li>
                      )}
                      {whatsapp && (
                        <li>
                          <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="footer__link">
                            WhatsApp: {whatsapp}
                          </a>
                        </li>
                      )}
                      {address && (
                        <li className="footer__address">
                          {address}
                        </li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="footer__bottom">
            <p className="footer__copyright">
              &copy; {currentYear} {organizationName}. Semua hak cipta dilindungi.
            </p>
            <div className="footer__payment">
              <span className="footer__payment-label">Metode Pembayaran:</span>
              <div className="footer__payment-icons">
                <span className="footer__payment-icon">
                  <QrCodeIcon className="w-5 h-5" />
                </span>
                <span className="footer__payment-icon">
                  <CreditCardIcon className="w-5 h-5" />
                </span>
                <span className="footer__payment-icon">
                  <BanknotesIcon className="w-5 h-5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    );
  }
);

Footer.displayName = 'Footer';
