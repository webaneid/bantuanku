'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n/provider';

export interface AccountPageHeaderProps {
  title: string;
  subtitle?: string;
  /** Mobile: tombol kembali di kiri atas (halaman dalam, mis. detail tabungan). */
  backHref?: string;
  /** Tombol/aksi di kanan judul (mis. "Mulai Menabung"). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Kepala halaman akun. Mobile (< lg): blok hero gradasi primary dengan sudut bawah membulat (seragam
 * dengan keranjang/checkout dan dashboard akun). Desktop: judul biasa di atas konten.
 */
export function AccountPageHeader({ title, subtitle, backHref, action, className }: AccountPageHeaderProps) {
  const { t } = useI18n();

  return (
    <>
      <header
        className={cn(
          'lg:hidden bg-gradient-to-br from-primary-600 to-primary-800 text-white rounded-b-[28px] px-[15px] pt-5 pb-7',
          className
        )}
      >
        {backHref && (
          <Link
            href={backHref}
            aria-label={t('common.back')}
            className="mb-3 inline-flex w-9 h-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-white/70 mt-1">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </header>

      <div className={cn('hidden lg:flex items-start justify-between gap-4 mb-6', className)}>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-dark">{title}</h1>
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </>
  );
}
