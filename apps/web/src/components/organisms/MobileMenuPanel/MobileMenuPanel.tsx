'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Button } from '@/components/atoms';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n/provider';
import { useHeaderMenuItems } from '@/hooks/useHeaderMenu';
import type { Locale } from '@/lib/i18n/types';

/**
 * Isi menu mobile (menu, bahasa, akun/login). Satu sumber untuk Header dan MobileTopBar,
 * supaya menu keduanya selalu persis sama. Pembungkus (drawer/overlay) disediakan pemanggil.
 */
export function MobileMenuPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const menuItems = useHeaderMenuItems();
  const { user, logout } = useAuth();
  const { t, locale } = useI18n();

  const handleLocaleChange = (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <>
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
            <Link href="/account/fundraiser">
              <Button fullWidth variant="outline">{t('common.influencer')}</Button>
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
    </>
  );
}
