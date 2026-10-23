'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n/provider';
import { MobileMenuPanel } from '@/components/organisms/MobileMenuPanel';

export interface MobileTopBarProps {
  /** Tujuan cadangan bila tidak ada riwayat browser (mis. dibuka dari tautan share) */
  backHref: string;
  /**
   * true: melayang transparan di atas gambar halaman (sembunyi saat scroll turun, muncul saat
   * scroll naik). false: bar putih biasa dengan spacer, untuk halaman tanpa gambar di atas.
   */
  overlay?: boolean;
}

/**
 * Top bar mobile untuk halaman single: back di kiri, titik tiga (menu) di kanan.
 * Hanya tampil di bawah lg. Lihat docs/arsitektur-mobile-single-shell.md.
 */
export function MobileTopBar({ backHref, overlay = false }: MobileTopBarProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [revealed, setRevealed] = useState(true);
  const [scrolledPastTop, setScrolledPastTop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastScrollY.current;

        if (Math.abs(delta) > 8) {
          setRevealed(delta < 0 || y < 40);
          lastScrollY.current = y;
        }
        setScrolledPastTop(y > 40);
        ticking.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(backHref);
  };

  // Overlay: transparan di atas gambar, berlatar setelah scroll. Solid: selalu berlatar.
  const solid = !overlay || scrolledPastTop;

  return (
    <>
      {!overlay && <div className="h-14 lg:hidden" aria-hidden="true" />}

      <div
        className={cn(
          'fixed left-0 right-0 top-0 z-[1020] flex items-center justify-between px-4 py-3 transition-transform duration-300 lg:hidden',
          revealed || !overlay ? 'translate-y-0' : '-translate-y-full',
          solid && 'border-b border-gray-200 bg-white/95 backdrop-blur-md'
        )}
      >
        <button
          type="button"
          onClick={handleBack}
          aria-label={t('common.back')}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
            solid ? 'bg-gray-100 text-gray-900' : 'bg-black/40 text-white backdrop-blur-sm'
          )}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={t('common.openMenu')}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
            solid ? 'bg-gray-100 text-gray-900' : 'bg-black/40 text-white backdrop-blur-sm'
          )}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <>
          <div className="header__overlay header__overlay--top" onClick={() => setMenuOpen(false)} />
          <div className="header__mobile-menu header__mobile-menu--full">
            <div className="flex justify-end px-4 pt-3">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label={t('common.closeMenu')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-900"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <MobileMenuPanel />
          </div>
        </>
      )}
    </>
  );
}
