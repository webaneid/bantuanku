'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { formatRupiahFull } from '@/lib/format';
import { cn } from '@/lib/cn';

interface Transaction {
  id: string;
  transactionNumber: string;
  productType: string;
  productName: string;
  totalAmount: number;
  paymentStatus: string;
  paidAt: string | null;
  createdAt: string;
}

const statusConfig = {
  pending: { label: 'Menunggu Pembayaran', color: 'bg-warning-50 text-warning-700 border-warning-200' },
  processing: { label: 'Diproses', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid: { label: 'Berhasil', color: 'bg-success-50 text-success-700 border-success-200' },
  cancelled: { label: 'Dibatalkan', color: 'bg-danger-50 text-danger-700 border-danger-200' },
};

const productTypeLabel = {
  campaign: 'Donasi',
  zakat: 'Zakat',
  qurban: 'Qurban',
};

export default function TransactionsPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }

    loadTransactions();
  }, [isHydrated, user, filter]);

  const loadTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await api.get(`/transactions/my?${params.toString()}`);

      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riwayat Transaksi</h1>
          <p className="text-gray-600 mt-1">Lihat semua transaksi Anda</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          )}
        >
          Semua
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
            filter === 'pending'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          )}
        >
          Menunggu
        </button>
        <button
          onClick={() => setFilter('processing')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
            filter === 'processing'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          )}
        >
          Diproses
        </button>
        <button
          onClick={() => setFilter('paid')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
            filter === 'paid'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          )}
        >
          Berhasil
        </button>
      </div>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-2">Belum Ada Transaksi</h3>
          <p className="text-sm text-gray-500 mb-6">
            {filter === 'all' ? 'Mulai berbagi kebaikan dengan berdonasi sekarang' : 'Tidak ada transaksi dengan status ini'}
          </p>
          {filter === 'all' && (
            <Link href="/">
              <button className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Mulai Berdonasi
              </button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>No. Transaksi</th>
                  <th>Produk</th>
                  <th>Tipe</th>
                  <th>Nominal</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const status = statusConfig[transaction.paymentStatus as keyof typeof statusConfig] || statusConfig.pending;
                  const productLabel = productTypeLabel[transaction.productType as keyof typeof productTypeLabel] || transaction.productType;

                  return (
                    <tr key={transaction.id}>
                      <td>
                        <div className="font-medium text-gray-900">{transaction.transactionNumber}</div>
                      </td>
                      <td>
                        <div className="text-sm text-gray-900">{transaction.productName}</div>
                      </td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {productLabel}
                        </span>
                      </td>
                      <td className="mono text-sm">
                        {formatRupiahFull(transaction.totalAmount)}
                      </td>
                      <td>
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', status.color)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="text-gray-600 text-sm">
                        {new Date(transaction.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <div className="table-actions">
                          <Link href={`/invoice/${transaction.id}`}>
                            <button className="action-btn action-view" title="Lihat Detail">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="table-mobile-cards">
            {transactions.map((transaction) => {
              const status = statusConfig[transaction.paymentStatus as keyof typeof statusConfig] || statusConfig.pending;
              const productLabel = productTypeLabel[transaction.productType as keyof typeof productTypeLabel] || transaction.productType;

              return (
                <div key={transaction.id} className="table-card">
                  <div className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title">{transaction.transactionNumber}</div>
                      <div className="table-card-header-subtitle">{transaction.productName}</div>
                    </div>
                    <span className={cn('table-card-header-badge', status.color)}>
                      {status.label}
                    </span>
                  </div>

                  <div className="table-card-row">
                    <span className="table-card-row-label">Tipe</span>
                    <span className="table-card-row-value">{productLabel}</span>
                  </div>

                  <div className="table-card-row">
                    <span className="table-card-row-label">Nominal</span>
                    <span className="table-card-row-value mono">{formatRupiahFull(transaction.totalAmount)}</span>
                  </div>

                  <div className="table-card-row">
                    <span className="table-card-row-label">Tanggal</span>
                    <span className="table-card-row-value">
                      {new Date(transaction.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="table-card-footer">
                    <Link href={`/invoice/${transaction.id}`}>
                      <button className="action-btn action-view" title="Lihat Detail">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
