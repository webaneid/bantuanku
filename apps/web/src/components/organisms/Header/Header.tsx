'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Button, IconButton } from '@/components/atoms';
import { SearchBox } from '@/components/molecules';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/lib/auth';
import type { MenuItem } from '@/services/settings';
import { useI18n } from '@/lib/i18n/provider';
import type { Locale } from '@/lib/i18n/types';

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  logo?: string;
  showSearch?: boolean;
}

export const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ logo: logoProp, showSearch = true, className, ...props }, ref) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const router = useRouter();
    const { settings, isLoading, error } = useSettings();
    const { getCartCount } = useCart();
    const { user, logout } = useAuth();
    const { t, locale, setLocale } = useI18n();

    // Use application logo from settings
    const logo = settings.organization_logo || logoProp || '/logo.svg';
    const siteName = settings.site_name || 'Bantuanku';

    // Parse menu items from settings
    const menuItems = useMemo(() => {
      if (settings.frontend_header_menu) {
        try {
          const parsed = JSON.parse(settings.frontend_header_menu) as MenuItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Convert MenuItem format to menu format with href
            return parsed.map((item) => ({
              label: item.label,
              href: item.url,
            }));
          }
        } catch (error) {
          console.error('Failed to parse header menu:', error);
        }
      }
      return [
        { label: t('common.menuHome'), href: '/' },
        { label: t('common.menuZakat'), href: '/zakat' },
        { label: t('common.menuQurban'), href: '/qurban' },
        { label: t('common.menuInfaq'), href: '/infaq' },
        { label: t('common.menuWakaf'), href: '/wakaf' },
        { label: t('common.menuAbout'), href: '/tentang' },
      ];
    }, [settings.frontend_header_menu, t]);

    useEffect(() => {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 20);
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
      // Close mobile menu on route change
      setMobileMenuOpen(false);
      setSearchOpen(false);
    }, [pathname]);

    const handleLocaleChange = (nextLocale: Locale) => {
      if (nextLocale === locale) return;
      setLocale(nextLocale);
      document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    };

    useEffect(() => {
      // Prevent scroll when mobile menu is open
      if (mobileMenuOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }

      return () => {
        document.body.style.overflow = '';
      };
    }, [mobileMenuOpen]);

    useEffect(() => {
      // Close user menu on click outside
      const handleClickOutside = (event: MouseEvent) => {
        if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
          setUserMenuOpen(false);
        }
      };

      if (userMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [userMenuOpen]);

    return (
      <header
        ref={ref}
        className={cn(
          'header',
          isScrolled && 'header--scrolled',
          mobileMenuOpen && 'header--menu-open',
          className
        )}
        {...props}
      >
        <div className="header__container">
          {/* Logo */}
          <Link href="/" className="header__logo">
            <img src={logo} alt={siteName} className="header__logo-img" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="header__nav">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'header__nav-link',
                  pathname === item.href && 'header__nav-link--active'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="header__actions">
            {showSearch && (
              <>
                {/* Desktop Search */}
                <div className="header__search header__search--desktop">
                  <SearchBox
                    size="sm"
                    placeholder={t('common.searchProgram')}
                    variant="filled"
                  />
                </div>

                {/* Mobile Search Toggle */}
                <button
                  className="header__search-toggle"
                  onClick={() => setSearchOpen(!searchOpen)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </>
            )}

            {/* Language Selector */}
            <div className="hidden md:flex items-center">
              <select
                aria-label={t('common.language')}
                value={locale}
                onChange={(e) => handleLocaleChange(e.target.value as Locale)}
                className="h-9 px-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="id">{t('common.languageIndonesia')}</option>
                <option value="en">{t('common.languageEnglish')}</option>
              </select>
            </div>

            {/* Cart */}
            <Link href="/keranjang-bantuan" className="header__cart">
              <div className="header__cart-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {getCartCount() > 0 && (
                  <span className="header__cart-badge">{getCartCount()}</span>
                )}
              </div>
            </Link>

            {/* User Menu / Login */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <svg className="w-4 h-4 text-gray-600 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Desktop & Mobile Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/account"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {t('common.dashboard')}
                    </Link>
                    <Link
                      href="/account/transactions"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {t('common.transactionHistory')}
                    </Link>
                    <Link
                      href="/qurban/savings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {t('common.qurbanSavings')}
                    </Link>
                    <Link
                      href="/account/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {t('common.profile')}
                    </Link>
                    <div className="border-t border-gray-200 mt-1"></div>
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {t('common.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm" className="header__login">
                  {t('common.login')}
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="header__menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={t('common.toggleMenu')}
            >
              <span className="header__menu-toggle-line" />
              <span className="header__menu-toggle-line" />
              <span className="header__menu-toggle-line" />
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        {searchOpen && (
          <div className="header__search header__search--mobile">
            <SearchBox
              placeholder={t('common.searchProgram')}
              variant="filled"
              autoFocus
            />
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <>
            <div
              className="header__overlay"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="header__mobile-menu">
              <nav className="header__mobile-nav">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'header__mobile-nav-link',
                      pathname === item.href && 'header__mobile-nav-link--active'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="header__mobile-actions">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm text-gray-600">{t('common.language')}:</span>
                  <button
                    type="button"
                    onClick={() => handleLocaleChange('id')}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-md border',
                      locale === 'id'
                        ? 'bg-primary-50 border-primary-500 text-primary-700'
                        : 'bg-white border-gray-200 text-gray-700'
                    )}
                  >
                    {t('common.languageIndonesia')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLocaleChange('en')}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-md border',
                      locale === 'en'
                        ? 'bg-primary-50 border-primary-500 text-primary-700'
                        : 'bg-white border-gray-200 text-gray-700'
                    )}
                  >
                    {t('common.languageEnglish')}
                  </button>
                </div>
                {user ? (
                  <>
                    <div className="px-4 py-3 bg-gray-50 rounded-lg mb-3">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <Link href="/account">
                      <Button fullWidth variant="outline">{t('common.dashboard')}</Button>
                    </Link>
                    <Link href="/account/transactions">
                      <Button fullWidth variant="outline">{t('common.transactionHistory')}</Button>
                    </Link>
                    <Link href="/qurban/savings">
                      <Button fullWidth variant="outline">{t('common.qurbanSavings')}</Button>
                    </Link>
                    <Link href="/account/profile">
                      <Button fullWidth variant="outline">{t('common.profile')}</Button>
                    </Link>
                    <Button variant="outline" fullWidth onClick={logout} className="text-danger-600 border-danger-300 hover:bg-danger-50">
                      {t('common.logout')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button fullWidth>{t('common.login')}</Button>
                    </Link>
                    <Link href="/register">
                      <Button variant="outline" fullWidth>{t('common.register')}</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </header>
    );
  }
);

Header.displayName = 'Header';
