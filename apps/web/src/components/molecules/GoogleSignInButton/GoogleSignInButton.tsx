'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

export interface GoogleSignInButtonProps {
  /** Path relatif tujuan setelah login berhasil (divalidasi lagi di API). */
  returnTo?: string;
  /** Teks tombol; default "Lanjutkan dengan Google". */
  label?: string;
}

// Tombol Google: hanya tampil bila API melaporkan Google dikonfigurasi (GET /auth/methods).
// Navigasi penuh (bukan fetch) karena alur OAuth berpindah halaman ke Google dan kembali lewat API.
export function GoogleSignInButton({ returnTo = '/account', label }: GoogleSignInButtonProps) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get('/auth/methods')
      .then((res) => {
        if (active) setEnabled(res.data?.data?.google === true);
      })
      .catch(() => {
        if (active) setEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-gray-400">
        <span className="flex-1 border-t border-gray-200" />
        {t('auth.google.or')}
        <span className="flex-1 border-t border-gray-200" />
      </div>
      <a
        href={`${API_URL}/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`}
        className="flex items-center justify-center gap-3 w-full py-2.5 px-4 border border-gray-300 rounded-md bg-white text-gray-700 font-medium hover:bg-gray-50"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
          <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {label || t('auth.google.continue')}
      </a>
    </div>
  );
}
