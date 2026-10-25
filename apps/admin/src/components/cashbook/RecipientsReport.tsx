"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import ReportFilters from "@/components/reports/ReportFilters";
import ReportTable from "@/components/reports/ReportTable";
import ExportButton from "@/components/reports/ExportButton";
import StatusBadge, { transferStatus } from "@/components/cashbook/StatusBadge";
import { exportToExcel } from "@/utils/export-excel";
import { formatRupiah } from "@/lib/format";
import { formatDateTimeWIB, formatDateWIB, todayWIBDateInput } from "@/lib/timezone";
import { qs, useCashbookRange } from "@/lib/cashbook";

type Recipient = { recipientId: string; name: string | null; code: string | null; hak: number; dibayar: number; sisa: number; transaksi: number };
type Party = "mitra" | "fundraiser";

const COPY: Record<Party, { title: string; subtitle: string; noun: string }> = {
  mitra: {
    title: "Per Mitra",
    subtitle: "Hak bagi hasil tiap mitra, berapa yang sudah ditransfer, dan sisanya (hanya transaksi yang sudah dibayar).",
    noun: "mitra",
  },
  fundraiser: {
    title: "Per Influencer",
    subtitle: "Komisi tiap influencer, berapa yang sudah ditransfer, dan sisanya (hanya transaksi yang sudah dibayar).",
    noun: "influencer",
  },
};

const PAGE_SIZE = 20;

export default function RecipientsReport({ party }: { party: Party }) {
  const copy = COPY[party];
  const { startDate, endDate, setStartDate, setEndDate } = useCashbookRange();
  const [selected, setSelected] = useState<Recipient | null>(null);
  const [page, setPage] = useState(1);

  const { data: recipients = [], isLoading, isError } = useQuery({
    queryKey: ["cashbook", "recipients", party, startDate, endDate],
    queryFn: async () => (await api.get(`/admin/cashbook/revenue-share/${party}/recipients?${qs({ startDate, endDate })}`)).data?.data as Recipient[],
  });

  const txQuery = useQuery({
    queryKey: ["cashbook", "recipient-tx", party, selected?.recipientId, startDate, endDate, page],
    queryFn: async () =>
      (await api.get(`/admin/cashbook/revenue-share/${party}/transactions?${qs({ startDate, endDate, recipientId: selected?.recipientId, page, limit: PAGE_SIZE })}`)).data,
    enabled: !!selected,
  });

  const payoutQuery = useQuery({
    queryKey: ["cashbook", "recipient-payouts", party, selected?.recipientId, startDate, endDate],
    queryFn: async () =>
      (await api.get(`/admin/cashbook/revenue-share/${party}/disbursements?${qs({ startDate, endDate, recipientId: selected?.recipientId })}`)).data?.data as Array<{ id: string; disbursementNumber: string; amount: number; purpose: string | null; paidAt: string | null }>,
    enabled: !!selected,
  });

  const totals = recipients.reduce(
    (acc, r) => ({ hak: acc.hak + r.hak, dibayar: acc.dibayar + r.dibayar, sisa: acc.sisa + r.sisa }),
    { hak: 0, dibayar: 0, sisa: 0 }
  );

  const displayName = (r: Recipient) => r.name || r.code || r.recipientId;

  const handleExport = () => {
    exportToExcel({
      data: recipients.map((r) => ({ name: displayName(r), code: r.code || "", transaksi: r.transaksi, hak: r.hak, dibayar: r.dibayar, sisa: r.sisa })),
      columns: [
        { header: party === "mitra" ? "Mitra" : "Influencer", key: "name", width: 30 },
        ...(party === "fundraiser" ? [{ header: "Kode", key: "code", width: 16 }] : []),
        { header: "Transaksi", key: "transaksi", width: 12, format: "number" as const },
        { header: "Hak", key: "hak", width: 18, format: "currency" as const },
        { header: "Sudah ditransfer", key: "dibayar", width: 18, format: "currency" as const },
        { header: "Belum ditransfer", key: "sisa", width: 18, format: "currency" as const },
      ],
      filename: `${copy.title.replace(/\s+/g, "-")}-${todayWIBDateInput()}`,
      title: copy.title,
    });
  };

  const choose = (r: Recipient) => {
    setSelected(r);
    setPage(1);
  };

  return (
    <div className="dashboard-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark">{copy.title}</h1>
        <p className="text-gray-600 mt-1">{copy.subtitle}</p>
      </div>

      <ReportFilters
        allTimePreset
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={(v) => { setStartDate(v); setPage(1); }}
        onEndDateChange={(v) => { setEndDate(v); setPage(1); }}
      >
        <ExportButton onExportExcel={handleExport} onPrint={() => window.print()} />
      </ReportFilters>

      {isError && <div className="card mb-6 border border-danger-200 bg-danger-50 text-sm text-danger-700">Gagal memuat data {copy.noun}.</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Jumlah {copy.noun}</p>
          <p className="mt-2 text-2xl font-bold text-dark mono">{recipients.length}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Total hak</p>
          <p className="mt-2 text-2xl font-bold text-primary-700 mono">Rp {formatRupiah(totals.hak)}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Sudah ditransfer</p>
          <p className="mt-2 text-2xl font-bold text-success-700 mono">Rp {formatRupiah(totals.dibayar)}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Belum ditransfer</p>
          <p className="mt-2 text-2xl font-bold text-warning-700 mono">Rp {formatRupiah(totals.sisa)}</p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-dark mb-3">Daftar {copy.noun}</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="text-left">Nama</th>
                {party === "fundraiser" && <th className="text-left">Kode</th>}
                <th className="text-right">Transaksi</th>
                <th className="text-right">Hak</th>
                <th className="text-right">Sudah ditransfer</th>
                <th className="text-right">Belum ditransfer</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="text-center text-gray-500 py-6">Memuat...</td></tr>}
              {!isLoading && recipients.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-500 py-6">Belum ada hak untuk periode ini.</td></tr>
              )}
              {recipients.map((r) => (
                <tr
                  key={r.recipientId}
                  className={`cursor-pointer hover:bg-light ${selected?.recipientId === r.recipientId ? "bg-primary-50" : ""}`}
                  onClick={() => choose(r)}
                >
                  <td className="font-medium">{displayName(r)}</td>
                  {party === "fundraiser" && <td className="text-sm mono">{r.code || "-"}</td>}
                  <td className="text-right mono">{r.transaksi}</td>
                  <td className="text-right mono">Rp {formatRupiah(r.hak)}</td>
                  <td className="text-right mono text-success-700">Rp {formatRupiah(r.dibayar)}</td>
                  <td className="text-right mono font-semibold">Rp {formatRupiah(r.sisa)}</td>
                  <td><StatusBadge status={transferStatus(r.hak, r.dibayar)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <>
          <div className="card mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-dark">
                Rincian per transaksi · {displayName(selected)}
              </h2>
              <button className="text-xs text-primary-600 hover:underline" onClick={() => setSelected(null)}>tutup</button>
            </div>
            <ReportTable
              loading={txQuery.isLoading}
              data={txQuery.data?.data || []}
              pagination={{ page, limit: PAGE_SIZE, total: txQuery.data?.pagination?.total || 0 }}
              onPageChange={setPage}
              emptyMessage="Belum ada transaksi untuk periode ini"
              columns={[
                { key: "date", header: "Tanggal (WIB)", render: (v) => <span className="whitespace-nowrap text-sm">{formatDateTimeWIB(v)}</span> },
                { key: "transactionNumber", header: "Transaksi", render: (v, r) => <span className="text-sm mono">{v}<span className="block text-xs text-gray-500 max-w-[260px] truncate font-sans">{r.productName}</span></span> },
                { key: "hak", header: "Hak", align: "right", format: "currency" },
                { key: "dibayar", header: "Ditransfer", align: "right", format: "currency" },
                { key: "sisa", header: "Belum", align: "right", format: "currency" },
                { key: "status", header: "Status", render: (v) => <StatusBadge status={v} /> },
              ]}
            />
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-dark mb-4">Riwayat transfer ({payoutQuery.data?.length ?? 0})</h2>
            <ReportTable
              loading={payoutQuery.isLoading}
              data={payoutQuery.data || []}
              emptyMessage="Belum ada transfer pada periode ini"
              columns={[
                { key: "paidAt", header: "Tanggal", render: (v) => <span className="whitespace-nowrap text-sm">{v ? formatDateWIB(v, "dd MMM yyyy") : "-"}</span> },
                { key: "disbursementNumber", header: "No. Pencairan", render: (v) => <span className="text-sm mono">{v}</span> },
                { key: "purpose", header: "Keterangan" },
                { key: "amount", header: "Jumlah", align: "right", format: "currency" },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
