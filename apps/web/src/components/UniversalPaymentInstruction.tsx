'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import toast from '@/lib/feedback-toast';
import api from '@/lib/api';
import { formatRupiahFull } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';

interface GatewayPayment {
  id: string;
  amount: number;
  gatewayCode: string | null;
  paymentChannel: string | null; // "va:bni", "qris:qris", "ewallet:dana", "cstore:indomaret"
  paymentCode: string | null;
  paymentUrl: string | null;
  qrCode: string | null;
  expiredAt: string | null;
  status: string;
}

interface ChannelInfo {
  name: string;
  logo?: string;
}

const POLL_INTERVAL_MS = 5000;

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

/**
 * Instruksi bayar untuk pembayaran gateway yang channel-nya dipilih di halaman metode
 * (nomor VA, QR, kode minimarket, atau tombol e-wallet). Status di-poll sampai lunas.
 */
export default function UniversalPaymentInstruction({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [payment, setPayment] = useState<GatewayPayment | null>(null);
  const [txnStatus, setTxnStatus] = useState<string>('pending');
  const [channels, setChannels] = useState<Record<string, ChannelInfo>>({});
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const loadPayment = async () => {
    try {
      const res = await api.get(`/payments/gateway-payment/${transactionId}`);
      if (res.data.success) {
        setPayment(res.data.data.payment);
        setTxnStatus(res.data.data.transactionPaymentStatus);
      }
    } catch (error) {
      console.error('Error loading gateway payment:', error);
    }
  };

  // Muat pembayaran + nama/logo channel (dari daftar metode) sekali saat dibuka
  useEffect(() => {
    (async () => {
      try {
        await loadPayment();
        const methods = await api.get('/payments/methods');
        const map: Record<string, ChannelInfo> = {};
        for (const method of methods.data?.data || []) {
          for (const group of method.details?.channelGroups || []) {
            for (const channel of group.channels || []) {
              map[channel.id] = { name: channel.name, logo: channel.logo };
            }
          }
        }
        setChannels(map);
      } catch (error) {
        console.error('Error loading payment instruction:', error);
        toast.error(t('payment.instruction.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [transactionId]);

  const isPaid = txnStatus === 'paid' || txnStatus === 'verified';
  const expiresAt = payment?.expiredAt ? new Date(payment.expiredAt).getTime() : null;
  const isExpired = !isPaid && expiresAt !== null && expiresAt <= now;

  // Hitung mundur
  useEffect(() => {
    if (isPaid || isExpired) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isPaid, isExpired]);

  // Poll status sampai lunas/kedaluwarsa
  useEffect(() => {
    if (!payment || isPaid || isExpired) return;
    const timer = setInterval(loadPayment, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [payment?.id, isPaid, isExpired]);

  // Lunas -> ke invoice
  useEffect(() => {
    if (!isPaid) return;
    toast.success(t('payment.instruction.paid'));
    const timer = setTimeout(() => router.replace(`/invoice/${transactionId}`), 1500);
    return () => clearTimeout(timer);
  }, [isPaid]);

  const kind = payment?.paymentChannel?.split(':')[0] || '';
  const channelCode = payment?.paymentChannel?.split(':')[1] || '';
  const channelInfo = payment?.paymentChannel ? channels[payment.paymentChannel] : undefined;
  const channelName = channelInfo?.name || channelCode.toUpperCase();

  // QR dibuat di browser dari string QRIS
  useEffect(() => {
    if (kind !== 'qris' || !payment?.qrCode) return;
    QRCode.toDataURL(payment.qrCode, { width: 280, margin: 1 })
      .then(setQrDataUrl)
      .catch(error => console.error('Error generating QR:', error));
  }, [kind, payment?.qrCode]);

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(t('payment.instruction.copied'));
  };

  const steps: string[] =
    kind === 'va' || kind === 'qris' || kind === 'cstore'
      ? [1, 2, 3].map(n => t(`payment.instruction.${kind}.s${n}`, { channel: channelName }))
      : kind === 'ewallet'
        ? [1, 2].map(n => t(`payment.instruction.ewallet.s${n}`))
        : [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <p className="text-gray-600">{t('payment.instruction.notFound')}</p>
          <Link href={`/invoice/${transactionId}/payment-method`} className="inline-block px-5 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700">
            {t('payment.instruction.changeMethod')}
          </Link>
        </div>
      </div>
    );
  }

  const expiryLabel = payment.expiredAt
    ? new Date(payment.expiredAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      })
    : '';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('payment.instruction.title')}</h1>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {channelInfo?.logo && (
                <img src={channelInfo.logo} alt={channelName} className="w-12 h-12 object-contain rounded-lg bg-gray-50 p-1" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-gray-500">{t('payment.instruction.totalLabel')}</p>
                <p className="text-2xl font-bold text-gray-900">{formatRupiahFull(payment.amount)}</p>
              </div>
            </div>
            {!isExpired && expiresAt !== null && (
              <div className="text-right flex-shrink-0">
                <p className="font-mono text-lg font-semibold text-primary-600">{formatCountdown(expiresAt - now)}</p>
                <p className="text-xs text-gray-500">{t('payment.instruction.payBefore', { time: expiryLabel })}</p>
              </div>
            )}
          </div>

          {isExpired ? (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-3">
              <p className="font-semibold text-red-700">{t('payment.instruction.expired')}</p>
              <p className="text-sm text-red-600">{t('payment.instruction.expiredHint')}</p>
              <Link href={`/invoice/${transactionId}/payment-method`} className="inline-block px-5 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700">
                {t('payment.instruction.changeMethod')}
              </Link>
            </div>
          ) : (
            <>
              {(kind === 'va' || kind === 'cstore') && payment.paymentCode && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    {kind === 'va'
                      ? t('payment.instruction.vaNumber', { channel: channelName })
                      : t('payment.instruction.payCode')}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-2xl font-bold text-gray-900 break-all">{payment.paymentCode}</p>
                    <button
                      onClick={() => copy(payment.paymentCode!)}
                      className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700 transition-colors flex-shrink-0"
                    >
                      {t('payment.instruction.copy')}
                    </button>
                  </div>
                </div>
              )}

              {kind === 'qris' && (
                <div className="text-center space-y-3">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QRIS" className="mx-auto w-64 h-64" />
                  ) : (
                    <div className="mx-auto w-64 h-64 bg-gray-100 rounded-lg animate-pulse" />
                  )}
                  <p className="text-sm text-gray-600">{t('payment.instruction.scanQr')}</p>
                </div>
              )}

              {kind === 'ewallet' && (
                <div className="space-y-3">
                  {payment.paymentCode && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">{t('payment.instruction.paymentNumber')}</p>
                      <p className="font-mono text-lg font-bold text-gray-900">{payment.paymentCode}</p>
                    </div>
                  )}
                  {payment.paymentUrl && /^https?:\/\//i.test(payment.paymentUrl) && (
                    <a
                      href={payment.paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-3 px-4 rounded-lg bg-primary-600 text-white text-center font-medium hover:bg-primary-700 transition-colors"
                    >
                      {t('payment.instruction.openPayment')}
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <span className="inline-block w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                {isPaid ? t('payment.instruction.paid') : t('payment.instruction.waiting')}
              </div>
            </>
          )}
        </div>

        {!isExpired && steps.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('payment.instruction.guideTitle')}</h2>
            <ol className="space-y-3">
              {steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-gray-700 text-sm">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {!isExpired && (
            <Link href={`/invoice/${transactionId}/payment-method`} className="flex-1 text-center px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              {t('payment.instruction.changeMethod')}
            </Link>
          )}
          <Link href={`/invoice/${transactionId}`} className="flex-1 text-center px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            {t('payment.instruction.viewInvoice')}
          </Link>
        </div>
      </div>
    </div>
  );
}
