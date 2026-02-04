"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { formatRupiahFull } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

interface QurbanOrder {
  id: string;
  orderNumber: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: string;
  paidAmount: number;
  paymentStatus: string;
  orderStatus: string;
  onBehalfOf: string;
  orderDate: string;
  confirmedAt: string | null;
  executedAt: string | null;
  notes: string | null;
  package?: {
    id: string;
    name: string;
    animalType: string;
    description: string;
  };
  sharedGroup?: {
    id: string;
    groupNumber: string;
  };
}

interface Payment {
  id: string;
  transactionNumber: string;
  amount: number;
  paymentMethod: string;
  paymentChannel: string;
  paymentProof: string | null;
  paymentStatus: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
}

const orderStatusConfig = {
  pending: { label: "Menunggu", color: "bg-warning-50 text-warning-700 border-warning-200" },
  confirmed: { label: "Dikonfirmasi", color: "bg-blue-50 text-blue-700 border-blue-200" },
  cancelled: { label: "Dibatalkan", color: "bg-danger-50 text-danger-700 border-danger-200" },
  executed: { label: "Disembelih", color: "bg-success-50 text-success-700 border-success-200" },
};

const paymentStatusConfig = {
  pending: { label: "Menunggu", color: "bg-warning-50 text-warning-700 border-warning-200" },
  partial: { label: "Sebagian", color: "bg-blue-50 text-blue-700 border-blue-200" },
  paid: { label: "Lunas", color: "bg-success-50 text-success-700 border-success-200" },
  overdue: { label: "Terlambat", color: "bg-danger-50 text-danger-700 border-danger-200" },
};

const verificationStatusConfig = {
  pending: { label: "Menunggu Verifikasi", color: "bg-warning-50 text-warning-700 border-warning-200" },
  verified: { label: "Terverifikasi", color: "bg-success-50 text-success-700 border-success-200" },
  rejected: { label: "Ditolak", color: "bg-danger-50 text-danger-700 border-danger-200" },
};

export default function QurbanOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const [order, setOrder] = useState<QurbanOrder | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated || !user) {
      if (isHydrated && !user) {
        router.push('/login');
      }
      return;
    }

    fetchOrderDetail();
  }, [isHydrated, user, params.id]);

  const fetchOrderDetail = async () => {
    try {
      const [orderRes, paymentsRes] = await Promise.all([
        api.get(`/qurban/orders/${params.id}`),
        api.get(`/qurban/payments/order/${params.id}`).catch(() => ({ data: { success: true, data: [] } })),
      ]);

      if (orderRes.data.success) {
        setOrder(orderRes.data.data);
      }

      if (paymentsRes.data.success) {
        setPayments(paymentsRes.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching order detail:", error);
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

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Order tidak ditemukan</p>
          <Link href="/account/donations" className="mt-4 inline-block">
            <Button>Kembali ke Riwayat</Button>
          </Link>
        </div>
      </div>
    );
  }

  const orderStatus = orderStatusConfig[order.orderStatus as keyof typeof orderStatusConfig] || orderStatusConfig.pending;
  const paymentStatus = paymentStatusConfig[order.paymentStatus as keyof typeof paymentStatusConfig] || paymentStatusConfig.pending;
  const needsPayment = order.paymentStatus === 'pending' || (order.paymentStatus === 'partial' && order.paidAmount < order.totalAmount);

  const handlePayNow = () => {
    if (!order) return;

    // Store donation data in sessionStorage for payment flow
    const donationData = [{
      id: order.id,
      program: 'qurban',
    }];

    sessionStorage.setItem('pendingDonations', JSON.stringify(donationData));
    sessionStorage.setItem('donationReturnUrl', `/account/qurban/${order.id}`);

    // Navigate to payment method selection
    router.push(`/account/qurban/${order.id}/payment-method`);
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
            Detail Order Qurban
          </h1>
          <p className="text-sm text-gray-600 mt-1">{order.orderNumber}</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Status Order</p>
          <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border", orderStatus.color)}>
            {orderStatus.label}
          </span>
        </div>
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
      </div>

      {/* Order Information */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Informasi Order</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Paket Qurban</p>
              <p className="font-semibold text-gray-900">{order.package?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Jenis Hewan</p>
              <p className="font-semibold text-gray-900">{order.package?.animalType || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Atas Nama</p>
              <p className="font-semibold text-gray-900">{order.onBehalfOf}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tanggal Order</p>
              <p className="font-semibold text-gray-900">
                {new Date(order.orderDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {order.sharedGroup && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">Nomor Group (Pantungan)</p>
              <p className="font-semibold text-gray-900">{order.sharedGroup.groupNumber}</p>
            </div>
          )}

          {order.notes && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">Catatan</p>
              <p className="text-gray-900">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Informasi Pembayaran</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Metode Pembayaran</p>
              <p className="font-semibold text-gray-900">
                {order.paymentMethod === 'full' ? 'Lunas' : 'Cicilan'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Harga</p>
              <p className="font-semibold text-gray-900 text-xl">
                {formatRupiahFull(order.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Sudah Dibayar</p>
              <p className="font-semibold text-success-600 text-xl">
                {formatRupiahFull(order.paidAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Sisa Pembayaran</p>
              <p className="font-semibold text-warning-600 text-xl">
                {formatRupiahFull(order.totalAmount - order.paidAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Riwayat Pembayaran</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {payments.map((payment) => {
              const verificationStatus = verificationStatusConfig[payment.paymentStatus as keyof typeof verificationStatusConfig] || verificationStatusConfig.pending;

              return (
                <div key={payment.id} className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{payment.transactionNumber}</p>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", verificationStatus.color)}>
                          {verificationStatus.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {new Date(payment.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatRupiahFull(payment.amount)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Metode</p>
                      <p className="font-medium text-gray-900">{payment.paymentChannel}</p>
                    </div>
                    {payment.verifiedAt && (
                      <div>
                        <p className="text-gray-600">Diverifikasi</p>
                        <p className="font-medium text-gray-900">
                          {new Date(payment.verifiedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {payment.rejectionReason && (
                    <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
                      <p className="text-sm text-danger-700">
                        <strong>Alasan Penolakan:</strong> {payment.rejectionReason}
                      </p>
                    </div>
                  )}

                  {payment.paymentProof && (
                    <div className="mt-4">
                      <a
                        href={payment.paymentProof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Lihat Bukti Transfer
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Execution Information */}
      {order.executedAt && (
        <div className="bg-success-50 border border-success-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-success-900 mb-1">Qurban Telah Disembelih</h3>
              <p className="text-sm text-success-700">
                Tanggal penyembelihan:{" "}
                {new Date(order.executedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
