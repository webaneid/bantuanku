'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { ShareButtons } from '@/components/molecules/ShareButtons';

export interface ShareBarProps {
  url: string;
  title: string;
}

/** "Bagikan" + ikon sosmed untuk halaman konten (page, laporan) yang tidak punya tombol donasi. */
export function ShareBar({ url, title }: ShareBarProps) {
  const { t } = useI18n();

  const buttons = (
    <ShareButtons
      url={url}
      title={title}
      variant="default"
      size="sm"
      showLabel={false}
      platforms={['whatsapp', 'facebook', 'twitter', 'telegram', 'copy']}
    />
  );

  return (
    <>
      {/* Desktop: kartu biasa di bawah konten */}
      <div className="hidden lg:flex bg-white rounded-lg shadow-sm p-4 items-center justify-between flex-wrap gap-3">
        <span className="text-sm font-semibold text-gray-900">{t('common.share')}</span>
        {buttons}
      </div>

      {/* Mobile: bar statis di bawah layar (seperti bar donasi campaign). Halaman pemanggil wajib
          memberi spacer `h-20 lg:hidden` sebagai elemen paling terakhir setelah Footer. */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-[1030] bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-gray-900">{t('common.share')}</span>
        {buttons}
      </div>
    </>
  );
}
