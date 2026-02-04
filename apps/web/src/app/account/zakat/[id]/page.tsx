"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { formatRupiahFull } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms";

interface ZakatDonation {
  id: string;
  referenceId: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  amount: number;
  calculatorData: any;
  paymentStatus: string;
  paymentReference: string | null;
  paidAt: string | null;
  message: string | null;
  createdAt: string;
  campaign: {
    id: string | null;
    title: string;
    pillar: string;
    categoryId: string | null;
    category: {
      id: string | null;
      name: string;
      slug: string;
    };
  };
}

const paymentStatusConfig = {
  pending: { label: "Menunggu Verifikasi", color: "bg-warning-50 text-warning-700 border-warning-200" },
  success: { label: "Terverifikasi", color: "bg-success-50 text-success-700 border-success-200" },
  failed: { label: "Gagal", color: "bg-danger-50 text-danger-700 border-danger-200" },
};

export default function ZakatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const [donation, setDonation] = useState<ZakatDonation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated || !user) {
      if (isHydrated && !user) {
        router.push('/login');
      }
      return;
    }

    fetchDonationDetail();
  }, [isHydrated, user, params.id]);

  const fetchDonationDetail = async () => {
    try {
      const response = await api.get(`/account/donations/${params.id}`);

      if (response.data.success) {
        setDonation(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching donation detail:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Donasi tidak ditemukan</p>
          <Link href="/account/donations" className="mt-4 inline-block">
            <Button>Kembali ke Riwayat</Button>
          </Link>
        </div>
      </div>
    );
  }

  const paymentStatus = paymentStatusConfig[donation.paymentStatus as keyof typeof paymentStatusConfig] || paymentStatusConfig.pending;
  const needsPayment = donation.paymentStatus === 'pending';

  const handlePayNow = () => {
    if (!donation) return;

    // Store donation data in sessionStorage for payment flow
    const donationData = [{
      id: donation.id,
      program: 'zakat',
    }];

    sessionStorage.setItem('pendingDonations', JSON.stringify(donationData));
    sessionStorage.setItem('donationReturnUrl', `/account/zakat/${donation.id}`);

    // Navigate to payment method selection
    router.push(`/account/zakat/${donation.id}/payment-method`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/account/donations"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Riwayat
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
            Detail Donasi Zakat
          </h1>
          <p className="text-sm text-gray-600 mt-1">{donation.referenceId}</p>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-2">Status Pembayaran</p>
            <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border", paymentStatus.color)}>
              {paymentStatus.label}
            </span>
          </div>
          {needsPayment && (
            <Button onClick={handlePayNow} size="sm">
              Bayar Sekarang
            </Button>
          )}
        </div>
      </div>

      {/* Donation Information */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Informasi Donasi</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Jenis Zakat</p>
              <p className="font-semibold text-gray-900">{donation.campaign.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Jumlah</p>
              <p className="font-semibold text-gray-900 text-xl">
                {formatRupiahFull(donation.amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Nama Donatur</p>
              <p className="font-semibold text-gray-900">{donation.donorName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tanggal Donasi</p>
              <p className="font-semibold text-gray-900">
                {new Date(donation.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {donation.paidAt && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">Tanggal Verifikasi</p>
              <p className="font-semibold text-gray-900">
                {new Date(donation.paidAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          {donation.message && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">Pesan</p>
              <p className="text-gray-900">{donation.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Success Message */}
      {donation.paymentStatus === 'success' && (
        <div className="bg-success-50 border border-success-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-success-900 mb-1">Pembayaran Terverifikasi</h3>
              <p className="text-sm text-success-700">
                Terima kasih atas zakat Anda. Semoga menjadi berkah dan pahala yang berlimpah.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
