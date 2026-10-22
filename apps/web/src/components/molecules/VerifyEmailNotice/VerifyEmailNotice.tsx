'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from '@/lib/feedback-toast';
import { useI18n } from '@/lib/i18n/provider';
import { Button } from '@/components/atoms';

export interface VerifyEmailNoticeProps {
  email: string;
  /** Hasil pengiriman email verifikasi dari API ("failed" = Resend gagal/belum dikonfigurasi). */
  sendStatus?: 'sent' | 'cooldown' | 'failed';
}

// Panel "cek email Anda" — dipakai setelah daftar dan saat login ditolak EMAIL_NOT_VERIFIED.
export function VerifyEmailNotice({ email, sendStatus }: VerifyEmailNoticeProps) {
  const { t } = useI18n();
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    try {
      await api.post('/auth/email/resend', { email });
      toast.success(t('auth.verifyEmail.resent'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('auth.verifyEmail.resendFailed'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="text-center space-y-4">
      <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900">{t('auth.verifyEmail.title')}</h2>
      <p className="text-gray-600">
        {t('auth.verifyEmail.sentTo')} <span className="font-semibold text-gray-900 break-all">{email}</span>
      </p>
      <p className="text-sm text-gray-500">{t('auth.verifyEmail.instruction')}</p>
      {sendStatus === 'failed' && (
        <p className="text-sm text-danger-600">{t('auth.verifyEmail.sendFailed')}</p>
      )}
      <Button type="button" variant="outline" fullWidth loading={isResending} onClick={handleResend}>
        {t('auth.verifyEmail.resend')}
      </Button>
      <Link href="/login" className="block text-sm text-gray-500 hover:text-gray-700">
        {t('auth.verifyEmail.backToLogin')}
      </Link>
    </div>
  );
}
