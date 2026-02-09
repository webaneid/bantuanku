'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms';
import { formatRupiahFull } from '@/lib/format';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/hooks/useSettings';

interface UniversalInvoiceProps {
  transactionId: string;
}

export default function UniversalInvoice({ transactionId }: UniversalInvoiceProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [transaction, setTransaction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      const response = await api.get(`/transactions/${transactionId}`);
      
      if (!response.data.success) {
        toast.error('Transaksi tidak ditemukan');
        router.push('/');
        return;
      }

      setTransaction(response.data.data);
    } catch (error) {
      console.error('Error loading transaction:', error);
      toast.error('Gagal memuat transaksi');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!transaction) {
    return null;
  }

  const data = transaction.data;
  const type = transaction.type;

  // Handle new transactions format
  const isNewTransaction = type === "transaction";
  const displayData = isNewTransaction ? data : data;

  const transactionNumber = isNewTransaction
    ? data.transactionNumber
    : (data.referenceNumber || data.referenceId || data.orderNumber);

  const totalAmount = isNewTransaction
    ? data.totalAmount
    : (data.totalAmount || data.amount);

  // Extract fields for new unified transactions
  const productName = isNewTransaction ? data.productName : null;
  const quantity = isNewTransaction ? data.quantity : null;
  const unitPrice = isNewTransaction ? data.unitPrice : null;
  const subtotal = isNewTransaction ? data.subtotal : null;
  const adminFee = isNewTransaction ? data.adminFee : null;
  const typeSpecificData = isNewTransaction ? data.typeSpecificData : null;
  const productType = isNewTransaction ? data.productType : null;

  // Payment status mapping
  const statusConfig = {
    pending: { label: 'Menunggu Pembayaran', color: 'bg-yellow-100 text-yellow-800' },
    processing: { label: 'Sedang Diverifikasi', color: 'bg-blue-100 text-blue-800' },
    paid: { label: 'Lunas', color: 'bg-green-100 text-green-800' },
    verified: { label: 'Terverifikasi', color: 'bg-green-100 text-green-800' },
    partial: { label: 'Pembayaran Sebagian', color: 'bg-amber-100 text-amber-800' },
    expired: { label: 'Kadaluarsa', color: 'bg-red-100 text-red-800' },
    cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-800' },
  };

  const currentStatus = statusConfig[displayData.paymentStatus as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm mb-4 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={user ? "/account/transactions" : "/"}>
                  <Button size="sm" variant="outline" className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Kembali
                  </Button>
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">
                  Invoice {transactionNumber}
                </h1>
              </div>
              <Button size="sm" className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </Button>
            </div>
          </div>

          {/* Main Invoice */}
          <div className="bg-white rounded-lg shadow-sm p-8 relative overflow-hidden">
            {/* PAID Stamp Overlay */}
            {(displayData.paymentStatus === 'paid' || displayData.paymentStatus === 'verified') && (
              <div className="absolute top-40 left-1/2 transform -translate-x-1/2 -rotate-12 pointer-events-none z-10">
                <div className="border-8 border-green-500 rounded-lg px-8 py-4 opacity-20">
                  <span className="text-7xl font-bold text-green-500">
                    {displayData.paymentStatus === 'verified' ? 'VERIFIED' : 'PAID'}
                  </span>
                </div>
              </div>
            )}

            {/* Organization and Donor Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* From: Organization */}
              <div>
                <div className="mb-4">
                  {settings.organization_logo ? (
                    <img
                      src={settings.organization_logo}
                      alt={settings.site_name || 'Bantuanku'}
                      className="h-12 w-auto mb-2"
                    />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-primary-600 mb-2">Bantuanku</div>
                      <p className="text-sm text-gray-600">Platform Donasi Digital</p>
                    </>
                  )}
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>Jl. Contoh Alamat No. 123</p>
                  <p>Jakarta, Indonesia 12345</p>
                  <p>Email: info@bantuanku.id</p>
                  <p>Telp: (021) 1234-5678</p>
                </div>
              </div>

              {/* To: Donor */}
              <div className="text-right">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Donatur</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-semibold text-gray-900">{displayData.donorName}</p>
                  {typeSpecificData?.on_behalf_of && typeSpecificData.on_behalf_of !== displayData.donorName && (
                    <p className="text-xs text-gray-600">Atas nama: {typeSpecificData.on_behalf_of}</p>
                  )}
                  <p>{displayData.donorEmail || '-'}</p>
                  {displayData.donorPhone && <p>{displayData.donorPhone}</p>}
                </div>
              </div>
            </div>

            {/* Invoice Metadata */}
            <div className="grid grid-cols-3 gap-4 mb-8 pb-6 border-b-2 border-gray-200">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Tanggal Invoice</label>
                <p className="font-semibold text-gray-900 mt-1">
                  {displayData.createdAt
                    ? new Date(displayData.createdAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${currentStatus.color}`}>
                    {currentStatus.label}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Total Tagihan</label>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatRupiahFull(totalAmount)}</p>
              </div>
            </div>

            {/* Invoice Items Table */}
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Item</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Deskripsi</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Harga</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {isNewTransaction ? (
                    <>
                      {/* Main Product */}
                      <tr className="border-b border-gray-100">
                        <td className="py-4 px-2 text-sm font-medium text-gray-900">
                          {productName || 'Donasi'}
                        </td>
                        <td className="py-4 px-2 text-sm text-gray-600">
                          {productType === 'qurban' && typeSpecificData?.animal_type && (
                            <span className="capitalize">
                              {typeSpecificData.animal_type === 'cow' ? 'Sapi' : 'Kambing'}
                              {typeSpecificData.package_type === 'shared' ? ' - Patungan' : ' - Individual'}
                            </span>
                          )}
                          {productType === 'zakat' && 'Zakat'}
                          {productType === 'campaign' && 'Donasi Kampanye'}
                        </td>
                        <td className="py-4 px-2 text-sm text-gray-900 text-center">
                          {quantity || 1}
                        </td>
                        <td className="py-4 px-2 text-sm text-gray-900 text-right">
                          {formatRupiahFull(unitPrice || 0)}
                        </td>
                        <td className="py-4 px-2 text-sm font-medium text-gray-900 text-right">
                          {formatRupiahFull(subtotal || unitPrice || 0)}
                        </td>
                      </tr>

                      {/* Admin Fee */}
                      {adminFee !== null && adminFee !== undefined && adminFee > 0 && (
                        <tr className="border-b border-gray-100">
                          <td className="py-4 px-2 text-sm font-medium text-gray-900">
                            Biaya Administrasi
                          </td>
                          <td className="py-4 px-2 text-sm text-gray-600">
                            Biaya admin pengelolaan
                          </td>
                          <td className="py-4 px-2 text-sm text-gray-900 text-center">
                            {quantity || 1}
                          </td>
                          <td className="py-4 px-2 text-sm text-gray-900 text-right">
                            {formatRupiahFull(adminFee / (quantity || 1))}
                          </td>
                          <td className="py-4 px-2 text-sm font-medium text-gray-900 text-right">
                            {formatRupiahFull(adminFee)}
                          </td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-2 text-sm font-medium text-gray-900">
                        {type === 'qurban' ? 'Qurban' : type === 'zakat' ? 'Zakat' : 'Donasi'}
                      </td>
                      <td className="py-4 px-2 text-sm text-gray-600">
                        Transaksi {type}
                      </td>
                      <td className="py-4 px-2 text-sm text-gray-900 text-center">1</td>
                      <td className="py-4 px-2 text-sm text-gray-900 text-right">
                        {formatRupiahFull(totalAmount)}
                      </td>
                      <td className="py-4 px-2 text-sm font-medium text-gray-900 text-right">
                        {formatRupiahFull(totalAmount)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="flex justify-end mb-8">
              <div className="w-80">
                <div className="space-y-2">
                  {isNewTransaction && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium text-gray-900">{formatRupiahFull(subtotal || unitPrice || 0)}</span>
                      </div>
                      {adminFee !== null && adminFee !== undefined && adminFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Biaya Admin:</span>
                          <span className="font-medium text-gray-900">{formatRupiahFull(adminFee)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between pt-3 border-t-2 border-gray-200">
                    <span className="text-base font-semibold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-gray-900">{formatRupiahFull(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Terbayar:</span>
                    <span className="font-medium text-green-600">
                      {displayData.paidAmount ? formatRupiahFull(displayData.paidAmount) : formatRupiahFull(0)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-base font-semibold text-gray-900">Saldo:</span>
                    <span className="text-lg font-bold text-primary-600">
                      {formatRupiahFull(
                        totalAmount - (displayData.paidAmount || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {displayData.message && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Catatan:</h4>
                <p className="text-sm text-gray-600">{displayData.message}</p>
              </div>
            )}

            {/* Action Buttons */}
            {displayData.paymentStatus === 'pending' && (
              <div className="mt-8 pt-6 border-t-2 border-gray-200">
                <Link href={`/invoice/${transactionId}/payment-method`}>
                  <Button size="lg" className="w-full">
                    Pilih Metode Pembayaran
                  </Button>
                </Link>
              </div>
            )}

            {displayData.paymentStatus === 'processing' && (
              <div className="mt-8 pt-6 border-t-2 border-gray-200">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-center font-bold mb-1">
                    Bukti Pembayaran Sedang Diverifikasi
                  </p>
                  <p className="text-blue-700 text-sm text-center">
                    Terima kasih telah mengirim bukti pembayaran. Tim kami sedang memverifikasi pembayaran Anda.
                    Anda akan menerima notifikasi setelah pembayaran diverifikasi.
                  </p>
                </div>
              </div>
            )}

            {(displayData.paymentStatus === 'paid' || displayData.paymentStatus === 'verified') && (
              <div className="mt-8 pt-6 border-t-2 border-gray-200">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-center font-bold text-lg mb-1">
                    Pembayaran Terverifikasi
                  </p>
                  <p className="text-green-700 text-sm text-center">
                    Transaksi Anda telah dikonfirmasi dan pembayaran telah diterima. Terima kasih atas kontribusi Anda!
                  </p>
                </div>
              </div>
            )}

            {/* Footer / Terms */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-2">Ketentuan</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Terima kasih atas donasi Anda melalui platform Bantuanku.</p>
                <p>Invoice ini adalah bukti transaksi yang sah dan dapat digunakan untuk keperluan administrasi.</p>
                <p>Untuk pertanyaan lebih lanjut, silakan hubungi kami di info@bantuanku.id</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
