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

  // Unduh QRIS sebagai gambar (resolusi tinggi + margin lebar) supaya mudah disimpan lalu dipindai/diunggah dari galeri
  const handleDownloadQr = async () => {
    if (!payment?.qrCode) return;
    try {
      const dataUrl = await QRCode.toDataURL(payment.qrCode, { width: 800, margin: 4 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `QRIS-${payment.amount}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t('payment.instruction.qrDownloaded'));
    } catch (error) {
      console.error('Error downloading QR:', error);
      toast.error(t('payment.instruction.qrDownloadFailed'));
    }
  };

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

  // Kartu putih: mobile penuh sampai tepi layar (menembus padding container), md ke atas kartu biasa
  const cardClass =
    'bg-white shadow-sm -mx-4 sm:-mx-6 md:mx-0 rounded-none md:rounded-lg px-[15px] py-5 md:p-6 md:border md:border-gray-100';
  const textLinkClass = 'block w-full py-2.5 text-center text-sm text-gray-500 hover:text-gray-700 transition-colors';

  return (
    <div className="container mx-auto px-[15px] md:px-4 py-4 md:py-8">
      <div className="max-w-2xl mx-auto space-y-2 md:space-y-4">
        {/* Ringkasan: latar primary, teks putih (seragam dengan keranjang dan checkout) */}
        <section className="rounded-[24px] bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-sm px-5 py-5">
          <h1 className="text-xl font-bold leading-tight">{t('payment.instruction.title')}</h1>

          <div className="mt-4 flex items-center gap-3">
            {channelInfo?.logo && (
              <img src={channelInfo.logo} alt={channelName} className="w-11 h-11 flex-shrink-0 object-contain rounded-lg bg-white p-1" />
            )}
            <p className="text-sm text-white/80 min-w-0 truncate">{channelName}</p>
          </div>

          <div className="mt-5 pt-4 border-t border-white/20">
            <p className="text-sm text-white/80">{t('payment.instruction.totalLabel')}</p>
            <p className="text-3xl font-bold tracking-tight mt-1">{formatRupiahFull(payment.amount)}</p>
          </div>

          {!isExpired && expiresAt !== null && (
            <div className="mt-4 pt-4 border-t border-white/20 flex items-end justify-between gap-3">
              <p className="text-xs text-white/70 leading-snug min-w-0">
                {t('payment.instruction.payBefore', { time: expiryLabel })}
              </p>
              <p className="font-mono text-xl font-semibold flex-shrink-0">{formatCountdown(expiresAt - now)}</p>
            </div>
          )}
        </section>

        {/* Instruksi pembayaran */}
        <div className={cardClass}>
          {isExpired ? (
            <div className="space-y-3">
              <p className="font-semibold text-danger-700">{t('payment.instruction.expired')}</p>
              <p className="text-sm text-gray-600">{t('payment.instruction.expiredHint')}</p>
              <Link
                href={`/invoice/${transactionId}/payment-method`}
                className="flex w-full h-12 items-center justify-center rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors"
              >
                {t('payment.instruction.changeMethod')}
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {(kind === 'va' || kind === 'cstore') && payment.paymentCode && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    {kind === 'va'
                      ? t('payment.instruction.vaNumber', { channel: channelName })
                      : t('payment.instruction.payCode')}
                  </p>
                  <p className="font-mono text-2xl font-bold text-dark break-all">{payment.paymentCode}</p>
                  <button
                    onClick={() => copy(payment.paymentCode!)}
                    className="mt-3 w-full h-12 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors"
                  >
                    {t('payment.instruction.copy')}
                  </button>
                </div>
              )}

              {kind === 'qris' && (
                <div className="text-center">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QRIS" className="mx-auto w-64 h-64 max-w-full" />
                  ) : (
                    <div className="mx-auto w-64 h-64 max-w-full bg-gray-100 rounded-lg animate-pulse" />
                  )}
                  <p className="mt-3 text-sm text-gray-600">{t('payment.instruction.scanQr')}</p>
                  <button
                    onClick={handleDownloadQr}
                    disabled={!qrDataUrl}
                    className="mt-4 w-full h-12 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                    </svg>
                    {t('payment.instruction.downloadQr')}
                  </button>
                  <p className="mt-2 text-xs text-gray-500">{t('payment.instruction.qrSaveHint')}</p>
                </div>
              )}

              {kind === 'ewallet' && (
                <div className="space-y-3">
                  {payment.paymentCode && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{t('payment.instruction.paymentNumber')}</p>
                      <p className="font-mono text-lg font-bold text-dark">{payment.paymentCode}</p>
                    </div>
                  )}
                  {payment.paymentUrl && /^https?:\/\//i.test(payment.paymentUrl) && (
                    <a
                      href={payment.paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full h-12 items-center justify-center rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors"
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
            </div>
          )}
        </div>

        {!isExpired && steps.length > 0 && (
          <div className={cardClass}>
            <h2 className="text-base font-semibold text-dark mb-4">{t('payment.instruction.guideTitle')}</h2>
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

        {/* Tautan teks (tanpa border) */}
        <div className="pt-2">
          {!isExpired && (
            <Link href={`/invoice/${transactionId}/payment-method`} className={textLinkClass}>
              {t('payment.instruction.changeMethod')}
            </Link>
          )}
          <Link href={`/invoice/${transactionId}`} className={textLinkClass}>
            {t('payment.instruction.viewInvoice')}
          </Link>
        </div>
      </div>
    </div>
  );
}
