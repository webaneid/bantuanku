"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import ReportFilters from "@/components/reports/ReportFilters";
import ReportTable from "@/components/reports/ReportTable";
import { formatRupiah } from "@/lib/format";
import { formatDateTimeWIB } from "@/lib/timezone";
import StatusBadge from "@/components/cashbook/StatusBadge";
import { PARTY_LABEL, qs, useCashbookRange } from "@/lib/cashbook";

type Party = { party: string; label: string; hak: number; dibayar: number; sisa: number; keterangan: string; status: string | null };

const PAGE_SIZE = 20;

export default function CashbookRevenueSharePage() {
  const { startDate, endDate, setStartDate, setEndDate } = useCashbookRange();
  const [party, setParty] = useState<string>("developer");
  const [recipient, setRecipient] = useState<{ id: string; name: string } | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["cashbook", "revenue-share", startDate, endDate],
    queryFn: async () => (await api.get(`/admin/cashbook/revenue-share?${qs({ startDate, endDate })}`)).data?.data,
  });
  const parties: Party[] = data?.parties || [];

  const hasRecipients = party === "mitra" || party === "fundraiser";
  const { data: recipients = [] } = useQuery({
    queryKey: ["cashbook", "recipients", party, startDate, endDate],
    queryFn: async () => (await api.get(`/admin/cashbook/revenue-share/${party}/recipients?${qs({ startDate, endDate })}`)).data?.data as Array<any>,
    enabled: hasRecipients,
  });

  const txQuery = useQuery({
    queryKey: ["cashbook", "revenue-share-tx", party, recipient?.id, status, startDate, endDate, page],
    queryFn: async () =>
      (await api.get(`/admin/cashbook/revenue-share/${party}/transactions?${qs({ startDate, endDate, recipientId: recipient?.id, status, page, limit: PAGE_SIZE })}`)).data,
  });

  const choose = (p: string) => {
    setParty(p);
    setRecipient(null);
    setStatus("");
    setPage(1);
  };

  return (
    <div className="dashboard-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark">Bagi Hasil</h1>
        <p className="text-gray-600 mt-1">Hak amil, developer, mitra, dan influencer (sesuai pengaturan), dan apakah sudah ditransfer.</p>
      </div>

      <ReportFilters allTimePreset startDate={startDate} endDate={endDate} onStartDateChange={(v) => { setStartDate(v); setPage(1); }} onEndDateChange={(v) => { setEndDate(v); setPage(1); }} />
      {isError && <div className="card mb-6 border border-danger-200 bg-danger-50 text-sm text-danger-700">Gagal memuat bagi hasil.</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {isLoading
          ? [0, 1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-32" />)
          : parties.map((p) => (
              <button
                key={p.party}
                onClick={() => choose(p.party)}
                className={`card text-left transition-shadow hover:shadow-md ${party === p.party ? "ring-2 ring-primary-500" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-dark">{PARTY_LABEL[p.party] || p.label}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Hak</p>
                <p className="mono text-xl font-bold text-primary-700">Rp {formatRupiah(p.hak)}</p>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-600">{p.party === "amil" ? "Dipakai operasional" : "Sudah ditransfer"}</span>
                  <span className="mono">Rp {formatRupiah(p.dibayar)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-600">{p.party === "amil" ? "Belum dipakai" : "Belum ditransfer"}</span>
                  <span className="mono">Rp {formatRupiah(p.sisa)}</span>
                </div>
              </button>
            ))}
      </div>

      {hasRecipients && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-dark mb-3">Per {party === "mitra" ? "mitra" : "influencer"}</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="text-left">Nama</th>
                  <th className="text-right">Transaksi</th>
                  <th className="text-right">Hak</th>
                  <th className="text-right">Sudah ditransfer</th>
                  <th className="text-right">Belum ditransfer</th>
                </tr>
              </thead>
              <tbody>
                {recipients.length === 0 && <tr><td colSpan={5} className="text-center text-gray-500 py-6">Belum ada hak untuk periode ini.</td></tr>}
                {recipients.map((r: any) => (
                  <tr key={r.recipientId} className={`cursor-pointer hover:bg-light ${recipient?.id === r.recipientId ? "bg-primary-50" : ""}`} onClick={() => { setRecipient({ id: r.recipientId, name: r.name || r.recipientId }); setPage(1); }}>
                    <td className="font-medium">{r.name || "-"}</td>
                    <td className="text-right mono">{r.transaksi}</td>
                    <td className="text-right mono">Rp {formatRupiah(r.hak)}</td>
                    <td className="text-right mono text-success-700">Rp {formatRupiah(r.dibayar)}</td>
                    <td className="text-right mono font-semibold">Rp {formatRupiah(r.sisa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-dark">
            Rincian per transaksi · {PARTY_LABEL[party]}
            {recipient ? <span className="text-gray-600 font-normal"> · {recipient.name} <button className="text-xs text-primary-600 hover:underline ml-2" onClick={() => setRecipient(null)}>lihat semua</button></span> : null}
          </h2>
          {party !== "amil" && (
            <select className="form-input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">Semua status</option>
              <option value="belum">Belum ditransfer</option>
              <option value="sebagian">Sebagian</option>
              <option value="lunas">Lunas</option>
            </select>
          )}
        </div>
        <ReportTable
          loading={txQuery.isLoading}
          data={txQuery.data?.data || []}
          pagination={{ page, limit: PAGE_SIZE, total: txQuery.data?.pagination?.total || 0 }}
          onPageChange={setPage}
          emptyMessage="Belum ada transaksi dengan hak untuk pihak ini"
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
    </div>
  );
}
