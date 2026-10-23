'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export interface MobileActionSheetProps {
  /** Baris ringkas yang selalu tampil; seluruh barisnya jadi tombol buka/tutup */
  collapsedBar: (expanded: boolean) => React.ReactNode;
  /** Isi penuh saat sheet terbuka (tidak di-unmount saat ditutup, supaya isian tidak reset) */
  children: React.ReactNode;
  /** Set true untuk menutup sheet dari luar, mis. sebelum membuka modal lain di atasnya */
  collapseSignal?: boolean;
  /** Label aksesibilitas tombol buka/tutup */
  toggleLabel: string;
}

/**
 * Bottom sheet generik untuk halaman single mobile (donasi, qurban). Bar ringkas menempel di
 * bawah layar; ketuk untuk membuka sheet. Animasi memakai max-height (bukan translate) sehingga
 * sisi atas yang naik. Hanya tampil di bawah lg. Spacer TIDAK ada di sini: pemanggil wajib
 * menaruh spacer `h-20 lg:hidden` sebagai elemen paling terakhir di halaman
 * (docs/arsitektur-mobile-single-shell.md).
 */
export function MobileActionSheet({ collapsedBar, children, collapseSignal, toggleLabel }: MobileActionSheetProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (collapseSignal) setExpanded(false);
  }, [collapseSignal]);

  return (
    <div className="lg:hidden">
      {expanded && (
        <div className="fixed inset-0 z-[1029] bg-black/40" onClick={() => setExpanded(false)} />
      )}

      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[1030] overflow-hidden pb-[env(safe-area-inset-bottom)] rounded-t-[20px] bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.1)] transition-[max-height] duration-300 ease-out',
          expanded ? 'max-h-[85vh]' : 'max-h-[calc(4rem+env(safe-area-inset-bottom))]'
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={toggleLabel}
          className="flex h-16 w-full items-center gap-3 px-4 text-left"
        >
          {collapsedBar(expanded)}
          <svg
            className={cn('h-5 w-5 shrink-0 text-gray-500 transition-transform duration-300', expanded && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        <div
          className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          style={{ maxHeight: 'calc(85vh - 4rem - env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
