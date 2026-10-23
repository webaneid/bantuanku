'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n/provider';

const items = [
  {
    key: 'home',
    href: '/account',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    key: 'history',
    href: '/account/transactions',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
  {
    key: 'qurban',
    href: '/account/qurban-savings',
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    key: 'profile',
    href: '/account/profile',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
] as const;

/**
 * Bar navigasi bawah mengambang untuk halaman akun di mobile. Aktif = lingkaran primary.
 * Z-index 1030 (skala bar/sheet bawah, lihat arsitektur-mobile-single-shell.md).
 */
export function AccountBottomNav() {
  const pathname = usePathname() || '';
  const { t } = useI18n();

  const isActive = (href: string) => (href === '/account' ? pathname === '/account' : pathname.startsWith(href));

  return (
    <nav
      aria-label="Menu akun"
      className="lg:hidden fixed bottom-3 left-[15px] right-[15px] z-[1030] mx-auto max-w-sm rounded-full bg-white shadow-[0_6px_24px_rgba(0,0,0,0.16)] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <ul className="m-0 flex list-none items-center justify-between p-0">
        {items.map((item) => {
          const active = isActive(item.href);
          const label = t(`account.layout.tab.${item.key}`);
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-0.5 py-1"
              >
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                    active ? 'bg-primary-600 text-white' : 'text-gray-500'
                  )}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </span>
                <span className={cn('text-[10px] font-medium leading-none', active ? 'text-primary-700' : 'text-gray-500')}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
