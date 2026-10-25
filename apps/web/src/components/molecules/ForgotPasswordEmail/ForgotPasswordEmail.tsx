'use client';

import React, { useState } from 'react';
import api from '@/lib/api';
import toast from '@/lib/feedback-toast';
import { useI18n } from '@/lib/i18n/provider';
import { Input, Button, Label } from '@/components/atoms';

// Minta tautan reset password lewat email — alternatif OTP WhatsApp saat gateway WA tidak aktif.
export function ForgotPasswordEmail() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password/email/request', { email });
      setSent(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('auth.forgotPassword.emailRequestFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-3">
        <h2 className="text-lg font-bold text-dark">{t('auth.forgotPassword.emailSentTitle')}</h2>
        <p className="text-gray-600">{t('auth.forgotPassword.emailSentDesc')}</p>
        <p className="text-sm text-gray-500">{t('auth.forgotPassword.emailSentHint')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="reset-email">{t('auth.forgotPassword.email')}</Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.forgotPassword.emailPlaceholder')}
          required
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? t('auth.forgotPassword.processing') : t('auth.forgotPassword.sendEmailLink')}
      </Button>
    </form>
  );
}
