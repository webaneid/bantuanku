"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";

type Transaction = {
  id: string;
  date: Date;
  description: string;
  category: string;
  debit: number;
  credit: number;
};

export default function ReportsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch donations (pemasukan)
  const { data: donationsData, isLoading: loadingDonations } = useQuery({
    queryKey: ["donations-for-report", startDate, endDate],
    queryFn: async () => {
      const params: any = { status: "success", page: 1, limit: 1000 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get("/admin/donations", { params });
      return response.data || { data: [] };
    },
  });

  // Fetch zakat donations (pemasukan)
  const { data: zakatDonationsData, isLoading: loadingZakatDonations } = useQuery({
    queryKey: ["zakat-donations-for-report", startDate, endDate],
    queryFn: async () => {
      const params: any = { paymentStatus: "success", page: 1, limit: 1000 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get("/admin/zakat/donations", { params });
      return response.data || { data: [] };
    },
  });

  // Fetch paid ledger entries (pengeluaran)
  const { data: ledgerData, isLoading: loadingLedger } = useQuery({
    queryKey: ["ledger-for-report", startDate, endDate],
    queryFn: async () => {
      const params: any = { status: "paid", page: 1, limit: 1000 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get("/admin/ledger", { params });
      return response.data || { data: [] };
    },
  });

  // Fetch zakat distributions (pengeluaran)
  const { data: zakatDistributionsData, isLoading: loadingZakatDistributions } = useQuery({
    queryKey: ["zakat-distributions-for-report", startDate, endDate],
    queryFn: async () => {
      const params: any = { status: "disbursed", page: 1, limit: 1000 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get("/admin/zakat/distributions", { params });
      return response.data || { data: [] };
    },
  });

  const donations = donationsData?.data || [];
  const zakatDonations = zakatDonationsData?.data || [];
  const ledgerEntries = (ledgerData?.data || []).filter((entry: any) => {
    // Filter out ledger entries yang merupakan auto-created dari zakat donations (data lama yang salah)
    return !entry.purpose?.startsWith('Penerimaan Zakat');
  });
  const zakatDistributions = zakatDistributionsData?.data || [];

  const isLoading = loadingDonations || loadingZakatDonations || loadingLedger || loadingZakatDistributions;

  // Combine and sort transactions
  const transactions: Transaction[] = [
    // Pemasukan dari donasi umum
    ...(donations || []).map((donation: any) => {
      let description = `Donasi untuk program ${donation.campaign?.title || 'umum'} dari ${donation.donorName || 'Anonim'}`;

      // Tambahkan info bank tujuan jika transfer bank
      if (donation.paymentMethodId?.startsWith('bank-') && donation.metadata?.bankName) {
        description += ` via Transfer Bank ${donation.metadata.bankName} (${donation.metadata.accountNumber})`;
      } else if (donation.paymentMethodId === 'cash') {
        description += ` via Tunai`;
      } else if (donation.paymentMethodId === 'qris') {
        description += ` via QRIS`;
      }

      return {
        id: donation.id,
        date: new Date(donation.createdAt),
        description,
        category: "Donasi",
        debit: donation.amount,
        credit: 0,
      };
    }),
    // Pemasukan dari pembayaran zakat
    ...(zakatDonations || []).map((donation: any) => {
      const zakatTypeName = donation.zakatType?.name || donation.zakatTypeName || 'Zakat';
      const description = `Pembayaran ${zakatTypeName} dari ${donation.donorName || 'Anonim'}`;

      return {
        id: donation.id,
        date: new Date(donation.paidAt || donation.createdAt),
        description,
        category: zakatTypeName, // Gunakan nama jenis zakat sebagai category
        debit: donation.amount,
        credit: 0,
      };
    }),
    // Pengeluaran dari ledger (hanya yang sudah paid)
    ...(ledgerEntries || []).map((entry: any) => {
      const programName = entry.campaign?.title || 'program umum';
      const approverName = entry.approver?.name || entry.payer?.name || entry.creator?.name || 'Admin';
      const recipientName = entry.recipientName;
      const accountType = entry.expenseAccount?.type || 'expense';

      // Cash Flow Report Logic (Fixed):
      // Fokus pada arah uang dari perspektif KAS/BANK, bukan normalBalance
      //
      // UANG KELUAR dari kas (Credit di cash flow):
      //   - Expense: penyaluran program, beban operasional
      //   - Asset: pembelian aset (uang kas keluar, aset masuk)
      //
      // UANG MASUK ke kas (Debit di cash flow):
      //   - Income: donasi, pendapatan
      //   - Liability: hutang/pinjaman masuk
      //   - Equity: modal masuk
      //
      // Jadi gunakan TYPE akun, bukan normalBalance
      const isCashOutflow = ['expense', 'asset'].includes(accountType);
      const isCashInflow = ['income', 'liability', 'equity'].includes(accountType);

      return {
        id: entry.id,
        date: new Date(entry.paidAt || entry.approvedAt || entry.createdAt),
        description: `${entry.purpose} untuk program ${programName}. Dikeluarkan oleh ${approverName}, dibayarkan kepada ${recipientName}`,
        category: entry.expenseAccount?.name || "Pengeluaran Program",
        debit: isCashInflow ? entry.amount : 0,
        credit: isCashOutflow ? entry.amount : 0,
      };
    }),
    // Pengeluaran dari penyaluran zakat
    ...(zakatDistributions || []).map((distribution: any) => {
      const zakatTypeName = distribution.zakatType?.name || distribution.zakatTypeName || 'Zakat';
      const description = `Penyaluran ${zakatTypeName} - ${distribution.purpose} ke ${distribution.recipientName}`;

      return {
        id: distribution.id,
        date: new Date(distribution.disbursedAt || distribution.createdAt),
        description,
        category: `Penyaluran ${zakatTypeName}`, // Gunakan nama jenis zakat dengan prefix
        debit: 0,
        credit: distribution.amount,
      };
    }),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Calculate totals
  const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
  const balance = totalDebit - totalCredit;

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catatan Mutasi</h1>
          <p className="text-gray-600 mt-1">Riwayat pemasukan dan pengeluaran</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Pemasukan</h3>
          <p className="text-3xl font-bold text-success-600 mono">
            Rp {formatRupiah(totalDebit)}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Pengeluaran</h3>
          <p className="text-3xl font-bold text-danger-600 mono">
            Rp {formatRupiah(totalCredit)}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Saldo</h3>
          <p className={`text-3xl font-bold mono ${balance >= 0 ? 'text-primary-600' : 'text-danger-600'}`}>
            Rp {formatRupiah(Math.abs(balance))}
          </p>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Deskripsi</th>
              <th>Kategori</th>
              <th className="text-right">Debit</th>
              <th className="text-right">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="text-sm text-gray-600">
                  {format(transaction.date, "dd MMM yyyy", { locale: idLocale })}
                </td>
                <td>
                  <div className="font-medium text-gray-900 text-sm">
                    {transaction.description}
                  </div>
                </td>
                <td>
                  <span className="text-sm text-gray-700">
                    {transaction.category}
                  </span>
                </td>
                <td className="text-right mono text-sm">
                  {transaction.debit > 0 ? (
                    <span className="text-success-600 font-medium">
                      Rp {formatRupiah(transaction.debit)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="text-right mono text-sm">
                  {transaction.credit > 0 ? (
                    <span className="text-danger-600 font-medium">
                      Rp {formatRupiah(transaction.credit)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada transaksi</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="table-mobile-cards">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="table-card">
            <div className="table-card-header">
              <div className="table-card-header-left">
                <div className="table-card-header-title">
                  {transaction.description}
                </div>
                <div className="table-card-header-subtitle">
                  {format(transaction.date, "dd MMM yyyy", { locale: idLocale })}
                </div>
              </div>
            </div>

            <div className="table-card-row">
              <span className="table-card-row-label">Kategori</span>
              <span className="table-card-row-value">{transaction.category}</span>
            </div>

            {transaction.debit > 0 && (
              <div className="table-card-row">
                <span className="table-card-row-label">Debit</span>
                <span className="table-card-row-value mono text-success-600 font-medium">
                  Rp {formatRupiah(transaction.debit)}
                </span>
              </div>
            )}

            {transaction.credit > 0 && (
              <div className="table-card-row">
                <span className="table-card-row-label">Kredit</span>
                <span className="table-card-row-value mono text-danger-600 font-medium">
                  Rp {formatRupiah(transaction.credit)}
                </span>
              </div>
            )}
          </div>
        ))}

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada transaksi</p>
          </div>
        )}
      </div>
    </div>
  );
}
