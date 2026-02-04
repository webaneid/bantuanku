"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { formatRupiahFull } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Transaction {
  id: string;
  type: 'donation' | 'zakat' | 'qurban';
  referenceId: string;
  amount: number;
  totalAmount: number;
  paymentStatus: string;
  paidAt: string | null;
  createdAt: string;
  title: string;
  pillar?: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
}

const statusConfig = {
  pending: { label: "Menunggu", color: "bg-warning-50 text-warning-700 border-warning-200" },
  processing: { label: "Diproses", color: "bg-blue-50 text-blue-700 border-blue-200" },
  success: { label: "Berhasil", color: "bg-success-50 text-success-700 border-success-200" },
  failed: { label: "Gagal", color: "bg-danger-50 text-danger-700 border-danger-200" },
  expired: { label: "Kedaluwarsa", color: "bg-gray-50 text-gray-700 border-gray-200" },
};

export default function DonationsPage() {
  const { user, isHydrated } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for hydration and user before fetching data
    if (!isHydrated || !user) {
      if (isHydrated && !user) {
        // Hydration done but no user, stop loading
        setIsLoading(false);
      }
      return;
    }

    fetchTransactions(pagination.page);
  }, [isHydrated, user]);

  const fetchTransactions = async (page: number) => {
    setIsLoading(true);
    try {
      // Backend now returns combined donations + zakat + qurban
      const response = await api.get(`/account/donations?page=${page}&limit=${pagination.limit}`);

      if (response.data.success) {
        const transactions = response.data.data.map((item: any) => ({
          id: item.id,
          type: item.type || 'donation',
          referenceId: item.referenceId,
          amount: item.amount || item.totalAmount || 0,
          totalAmount: item.totalAmount || item.amount || 0,
          paymentStatus: item.paymentStatus,
          paidAt: item.paidAt,
          createdAt: item.createdAt,
          title: item.campaign?.title || 'Donasi',
          pillar: item.campaign?.pillar,
        }));

        setTransactions(transactions);
        setPagination({
          page: response.data.pagination?.page || page,
          limit: response.data.pagination?.limit || 10,
          total: response.data.pagination?.total || transactions.length,
        });
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Riwayat</h1>
          <p className="text-sm text-gray-600 mt-1">
            Total {pagination.total} transaksi
          </p>
        </div>
      </div>

      {/* Donations List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-2">Belum Ada Transaksi</h3>
          <p className="text-sm text-gray-500 mb-6">Mulai berbagi kebaikan dengan berdonasi sekarang</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            Mulai Berdonasi
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Referensi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nominal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => {
                    const status = statusConfig[transaction.paymentStatus as keyof typeof statusConfig] || statusConfig.pending;
                    const detailUrl =
                      transaction.type === 'qurban' ? `/account/qurban/${transaction.id}` :
                      transaction.type === 'zakat' ? `/account/zakat/${transaction.id}` :
                      `/account/donations/${transaction.id}`;

                    return (
                      <tr key={`${transaction.type}-${transaction.id}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">{transaction.referenceId}</div>
                            {transaction.type === 'qurban' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                Qurban
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {transaction.title}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatRupiahFull(transaction.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", status.color)}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={detailUrl}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Detail
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="sm:hidden divide-y divide-gray-200">
              {transactions.map((transaction) => {
                const status = statusConfig[transaction.paymentStatus as keyof typeof statusConfig] || statusConfig.pending;
                const detailUrl =
                  transaction.type === 'qurban' ? `/account/qurban/${transaction.id}` :
                  transaction.type === 'zakat' ? `/account/zakat/${transaction.id}` :
                  `/account/donations/${transaction.id}`;

                return (
                  <Link
                    key={`${transaction.type}-${transaction.id}`}
                    href={detailUrl}
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {transaction.referenceId}
                          </p>
                          {transaction.type === 'qurban' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                              Qurban
                            </span>
                          )}
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", status.color)}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1 truncate">
                          {transaction.title}
                        </p>
                        <p className="text-lg font-bold text-gray-900 mb-1">
                          {formatRupiahFull(transaction.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => fetchTransactions(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => fetchTransactions(pagination.page + 1)}
                  disabled={pagination.page === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Menampilkan{" "}
                    <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
                    {" "}-{" "}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>
                    {" "}dari{" "}
                    <span className="font-medium">{pagination.total}</span> hasil
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => fetchTransactions(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {[...Array(totalPages)].map((_, i) => {
                      const page = i + 1;
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= pagination.page - 1 && page <= pagination.page + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => fetchTransactions(page)}
                            className={cn(
                              "relative inline-flex items-center px-4 py-2 text-sm font-semibold",
                              page === pagination.page
                                ? "z-10 bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                            )}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === pagination.page - 2 || page === pagination.page + 2) {
                        return (
                          <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                    <button
                      onClick={() => fetchTransactions(pagination.page + 1)}
                      disabled={pagination.page === totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
