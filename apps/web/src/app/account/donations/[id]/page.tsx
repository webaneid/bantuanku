'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { formatRupiahFull, formatDate } from '@/lib/format';
import { Button } from '@/components/atoms';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

interface Campaign {
  id: string;
  title: string;
  pillar: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Donation {
  id: string;
  referenceId: string;
  campaignId: string;
  campaign?: Campaign;
  amount: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethodId?: string;
  paymentProofUrl?: string;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  message?: string;
  isAnonymous: boolean;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  donationId: string;
  amount: number;
  totalAmount: number;
  status: string;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
}

export default function DonationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isHydrated } = useAuth();
  const [donation, setDonation] = useState<Donation | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated || !user) {
      if (isHydrated && !user) {
        router.push('/login');
      }
      return;
    }

    loadData();
  }, [isHydrated, user, params.id]);

  const loadData = async () => {
    try {
      // Load donation first
      const donationRes = await api.get(`/account/donations/${params.id}`);

      if (donationRes.data.success) {
        setDonation(donationRes.data.data);

        // Try to load invoice, but don't fail if it doesn't exist
        try {
          const invoiceRes = await api.get(`/account/donations/${params.id}/invoice`);
          if (invoiceRes.data.success) {
            setInvoice(invoiceRes.data.data);
          }
        } catch (invoiceError: any) {
          console.log('Invoice not found or not yet created');
          // Invoice might not exist yet, which is ok
        }
      }
    } catch (error: any) {
      console.error('Error loading donation:', error);
      if (error.response?.status === 404) {
        toast.error('Donasi tidak ditemukan');
        router.push('/account/donations');
      } else {
        toast.error('Gagal memuat data donasi');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayNow = () => {
    if (!donation) return;

    // Store donation data in sessionStorage for payment flow
    // Use category slug as program (not pillar)
    const donationData = [
      {
        id: donation.id,
        program: donation.campaign?.category?.slug || 'general',
      },
    ];

    sessionStorage.setItem('pendingDonations', JSON.stringify(donationData));
    sessionStorage.setItem('donationReturnUrl', `/account/donations/${donation.id}`);

    // Navigate to payment method selection
    router.push(`/account/donations/${donation.id}/payment-method`);
  };

  if (!isHydrated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Donasi tidak ditemukan</p>
        <Link href="/account/donations" className="mt-4 inline-block">
          <Button variant="outline">Kembali</Button>
        </Link>
      </div>
    );
  }

  const isPending = donation.paymentStatus === 'pending';
  const isProcess = donation.paymentStatus === 'processing' || donation.paymentStatus === 'process';
  const isPaid = donation.paymentStatus === 'paid' || donation.paymentStatus === 'success';
  const isFailed = donation.paymentStatus === 'failed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detail Donasi</h1>
          <p className="text-gray-600 mt-1">
            {invoice ? `Invoice #${invoice.invoiceNumber}` : `ID: ${donation.referenceId}`}
          </p>
        </div>
        <Link href="/account/donations">
          <Button variant="outline" size="sm">Kembali</Button>
        </Link>
      </div>

      {/* Status Badge */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Status Pembayaran</p>
            <div className="flex items-center gap-2">
              {isPending && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Menunggu Pembayaran
                </span>
              )}
              {isProcess && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Sedang Diproses
                </span>
              )}
              {isPaid && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Pembayaran Berhasil
                </span>
              )}
              {isFailed && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Pembayaran Gagal
                </span>
              )}
            </div>
          </div>
          {isPending && (
            <Button onClick={handlePayNow} size="sm">
              Bayar Sekarang
            </Button>
          )}
        </div>

        {isProcess && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Pembayaran Anda sedang diverifikasi oleh tim kami. Proses verifikasi memakan waktu maksimal 1x24 jam.
            </p>
          </div>
        )}

        {isPaid && donation.paidAt && (
          <div className="mt-4 text-sm text-gray-600">
            Dibayar pada: {formatDate(donation.paidAt)}
          </div>
        )}
      </div>

      {/* Invoice Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail Donasi</h2>

        <div className="space-y-4">
          {invoice && (
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600">Nomor Invoice</span>
              <span className="font-mono font-semibold text-gray-900">{invoice.invoiceNumber}</span>
            </div>
          )}

          <div className="flex justify-between py-3 border-b border-gray-200">
            <span className="text-gray-600">ID Donasi</span>
            <span className="font-mono font-medium text-gray-900">{donation.referenceId}</span>
          </div>

          <div className="flex justify-between py-3 border-b border-gray-200">
            <span className="text-gray-600">Tanggal Donasi</span>
            <span className="font-medium text-gray-900">{formatDate(donation.createdAt)}</span>
          </div>

          {donation.campaign && (
            <>
              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="text-gray-600">Campaign</span>
                <span className="font-medium text-gray-900 text-right max-w-xs">
                  {donation.campaign.title}
                </span>
              </div>

              {donation.campaign.category && (
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Program</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {donation.campaign.category.name}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="text-gray-600">Pillar</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                  {donation.campaign.pillar}
                </span>
              </div>
            </>
          )}

          <div className="flex justify-between py-3 border-b border-gray-200">
            <span className="text-gray-600">Jumlah Donasi</span>
            <span className="font-semibold text-gray-900">{formatRupiahFull(donation.amount)}</span>
          </div>

          <div className="flex justify-between py-3 bg-primary-50 -mx-6 px-6 mt-4">
            <span className="font-semibold text-gray-900">Total Pembayaran</span>
            <span className="text-xl font-bold text-primary-600">{formatRupiahFull(donation.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Donor Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Donatur</h2>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Nama</span>
            <span className="font-medium text-gray-900">
              {donation.isAnonymous ? 'Hamba Allah' : donation.donorName}
            </span>
          </div>

          {!donation.isAnonymous && donation.donorEmail && (
            <div className="flex justify-between">
              <span className="text-gray-600">Email</span>
              <span className="font-medium text-gray-900">{donation.donorEmail}</span>
            </div>
          )}

          {!donation.isAnonymous && donation.donorPhone && (
            <div className="flex justify-between">
              <span className="text-gray-600">Nomor Telepon</span>
              <span className="font-medium text-gray-900">{donation.donorPhone}</span>
            </div>
          )}

          {donation.message && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-gray-600 text-sm mb-1">Pesan</p>
              <p className="text-gray-900 italic">&quot;{donation.message}&quot;</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Proof */}
      {donation.paymentProofUrl && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bukti Pembayaran</h2>

          <div className="border border-gray-200 rounded-lg p-4">
            <a
              href={donation.paymentProofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Lihat Bukti Pembayaran
            </a>
          </div>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Menunggu Pembayaran</h3>
              <p className="text-sm text-yellow-800 mb-4">
                Donasi Anda belum dibayar. Silakan pilih metode pembayaran untuk melanjutkan.
              </p>
              <Button onClick={handlePayNow} className="bg-yellow-600 hover:bg-yellow-700">
                Lanjut Pembayaran
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
