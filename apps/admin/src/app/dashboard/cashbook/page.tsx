"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowDownCircle, ArrowUpCircle, Scale, Plus } from "lucide-react";
import api from "@/lib/api";
import ReportFilters from "@/components/reports/ReportFilters";
import ReportSummaryCards from "@/components/reports/ReportSummaryCards";
import ReportTable from "@/components/reports/ReportTable";
import ExportButton from "@/components/reports/ExportButton";
import { AdjustmentDialog, ReverseDialog } from "@/components/cashbook/CorrectionDialogs";
import { exportToExcel } from "@/utils/export-excel";
import { formatDateTimeWIB } from "@/lib/timezone";
import { COMPONENT_LABEL, FUND_LABEL, METHOD_LABEL, fundText, qs, useCashbookRange } from "@/lib/cashbook";

type Entry = {
  id: string;
  date: string;
  direction: "in" | "out";
  amount: number;
  component: string;
  fund: string;
  fundDetail: string | null;
  method: string;
  gateway: string | null;
  refType: string;
  transactionNumber: string | null;
  productName: string | null;
  reversesEntryId: string | null;
  note: string | null;
  account: { id: string; name: string; kind: string };
};

const PAGE_SIZE = 25;

export default function CashbookEntriesPage() {
  const { startDate, endDate, setStartDate, setEndDate } = useCashbookRange();
  const [fund, setFund] = useState("");
  const [direction, setDirection] = useState("");
  const [component, setComponent] = useState("");
  const [method, setMethod] = useState("");
  const [accountId, setAccountId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reverseTarget, setReverseTarget] = useState<Entry | null>(null);
  const [showAdjustment, setShowAdjustment] = useState(false);

  const filterParams = { startDate, endDate, fund, direction, component, method, accountId, q: search };

  const { data: accountOptions = [] } = useQuery({
    queryKey: ["cashbook", "account-options"],
    queryFn: async () => (await api.get("/admin/cashbook/account-options")).data?.data as Array<{ id: string; name: string }>,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["cashbook", "entries", filterParams, page],
    queryFn: async () => (await api.get(`/admin/cashbook/entries?${qs({ ...filterParams, page, limit: PAGE_SIZE })}`)).data,
  });

  const entries: Entry[] = data?.data || [];
  const summary = data?.summary || { masuk: 0, keluar: 0, netto: 0 };
  const total = data?.pagination?.total || 0;

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const all: Entry[] = [];
      for (let p = 1; p <= 50; p++) {
        const res = await api.get(`/admin/cashbook/entries?${qs({ ...filterParams, page: p, limit: 200 })}`);
        all.push(...(res.data?.data || []));
        if (p >= (res.data?.pagination?.totalPages || 1)) break;
      }
      exportToExcel({
        data: all.map((e) => ({
          ...e,
          date: formatDateTimeWIB(e.date),
          arah: e.direction === "in" ? "Masuk" : "Keluar",
          dana: fundText(e.fund, e.fundDetail),
          komponenLabel: COMPONENT_LABEL[e.component] || e.component,
          akun: e.account.name,
          metodeLabel: METHOD_LABEL[e.method] || e.method,
          gatewayLabel: e.gateway || "",
        })),
        columns: [
          { header: "Tanggal (WIB)", key: "date", width: 20 },
          { header: "Arah", key: "arah", width: 10 },
          { header: "Jumlah", key: "amount", width: 16, format: "currency" },
          { header: "Komponen", key: "komponenLabel", width: 16 },
          { header: "Dana", key: "dana", width: 24 },
          { header: "Akun", key: "akun", width: 28 },
          { header: "Metode", key: "metodeLabel", width: 16 },
          { header: "Gateway", key: "gatewayLabel", width: 12 },
          { header: "Transaksi", key: "transactionNumber", width: 22 },
          { header: "Produk", key: "productName", width: 30 },
          { header: "Catatan", key: "note", width: 40 },
        ],
        filename: `arus-kas-${startDate}_${endDate}`,
        sheetName: "Arus Kas",
        title: "Arus Kas",
        subtitle: `Periode ${startDate} s/d ${endDate}`,
      });
    } catch {
      toast.error("Gagal mengekspor arus kas");
    }
  };

  return (
    <div className="dashboard-container">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">Arus Kas</h1>
          <p className="text-gray-600 mt-1">Setiap uang masuk dan keluar yang tercatat, lengkap dengan dana, rekening, dan metode bayarnya.</p>
        </div>
        <button className="btn btn-outline btn-sm flex items-center gap-2 no-print" onClick={() => setShowAdjustment(true)}>
          <Plus size={16} /> Penyesuaian manual
        </button>
      </div>

      <ReportFilters
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={resetPage(setStartDate)}
        onEndDateChange={resetPage(setEndDate)}
        searchable
        searchValue={search}
        onSearchChange={resetPage(setSearch)}
        searchPlaceholder="No. transaksi / produk / rujukan"
        filters={[
          { key: "fund", label: "Dana", value: fund, onChange: resetPage(setFund), options: [{ value: "", label: "Semua dana" }, ...Object.entries(FUND_LABEL).map(([value, label]) => ({ value, label }))] },
          { key: "direction", label: "Arah", value: direction, onChange: resetPage(setDirection), options: [{ value: "", label: "Masuk & keluar" }, { value: "in", label: "Masuk" }, { value: "out", label: "Keluar" }] },
          { key: "component", label: "Komponen", value: component, onChange: resetPage(setComponent), options: [{ value: "", label: "Semua komponen" }, ...Object.entries(COMPONENT_LABEL).map(([value, label]) => ({ value, label }))] },
          { key: "method", label: "Metode", value: method, onChange: resetPage(setMethod), options: [{ value: "", label: "Semua metode" }, ...Object.entries(METHOD_LABEL).map(([value, label]) => ({ value, label }))] },
          { key: "account", label: "Akun kas", value: accountId, onChange: resetPage(setAccountId), options: [{ value: "", label: "Semua akun" }, ...accountOptions.map((a) => ({ value: a.id, label: a.name }))] },
        ]}
      >
        <ExportButton onExportExcel={handleExport} />
      </ReportFilters>

      {isError && (
        <div className="card mb-6 border border-danger-200 bg-danger-50">
          <p className="text-sm font-medium text-danger-700">Gagal memuat arus kas</p>
          <p className="text-sm text-danger-600 mt-1">{(error as any)?.response?.data?.message || "Terjadi kesalahan."}</p>
        </div>
      )}

      <ReportSummaryCards
        cards={[
          { label: "Uang Masuk", value: summary.masuk, color: "success", icon: ArrowDownCircle },
          { label: "Uang Keluar", value: summary.keluar, color: "danger", icon: ArrowUpCircle },
          { label: "Netto", value: summary.netto, color: "primary", icon: Scale },
        ]}
      />

      {(data?.byComponent?.length || 0) > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          {data.byComponent.map((c: any) => (
            <span key={`${c.direction}-${c.component}`} className={`px-2.5 py-1 rounded-full border ${c.direction === "in" ? "bg-success-50 border-success-200 text-success-700" : "bg-danger-50 border-danger-200 text-danger-700"}`}>
              {c.direction === "in" ? "Masuk" : "Keluar"} · {COMPONENT_LABEL[c.component] || c.component}: {c.count} baris · Rp {c.amount.toLocaleString("id-ID")}
            </span>
          ))}
        </div>
      )}

      <div className="card">
        <ReportTable
          loading={isLoading}
          data={entries}
          pagination={{ page, limit: PAGE_SIZE, total }}
          onPageChange={setPage}
          emptyMessage="Belum ada catatan pada filter ini"
          columns={[
            { key: "date", header: "Tanggal (WIB)", render: (v) => <span className="whitespace-nowrap text-sm">{formatDateTimeWIB(v)}</span> },
            {
              key: "direction",
              header: "Arah",
              render: (v) => (
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${v === "in" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"}`}>
                  {v === "in" ? "Masuk" : "Keluar"}
                </span>
              ),
            },
            { key: "amount", header: "Jumlah", align: "right", format: "currency" },
            { key: "component", header: "Komponen", render: (v, r) => <span className="text-sm">{COMPONENT_LABEL[v] || v}{r.refType === "transaction_paid" ? <span className="block text-xs text-warning-700">data eksisting</span> : null}</span> },
            { key: "fund", header: "Dana", render: (v, r) => <span className="text-sm">{fundText(v, r.fundDetail)}</span> },
            { key: "account", header: "Akun / metode", render: (_v, r) => <span className="text-sm">{r.account.name}<span className="block text-xs text-gray-500">{METHOD_LABEL[r.method] || r.method}{r.gateway ? ` · ${r.gateway}` : ""}</span></span> },
            { key: "transactionNumber", header: "Rujukan", render: (v, r) => <span className="text-sm">{v || "-"}{r.productName ? <span className="block text-xs text-gray-500 max-w-[220px] truncate">{r.productName}</span> : null}{r.note ? <span className="block text-xs text-gray-500 max-w-[220px] truncate" title={r.note}>{r.note}</span> : null}</span> },
            {
              key: "id",
              header: "",
              align: "right",
              render: (_v, r) =>
                r.reversesEntryId ? <span className="text-xs text-gray-400">pembalik</span> : (
                  <button className="text-xs text-danger-600 hover:underline no-print" onClick={() => setReverseTarget(r as Entry)}>Balik</button>
                ),
            },
          ]}
        />
      </div>

      <ReverseDialog entry={reverseTarget} onClose={() => setReverseTarget(null)} onDone={(m) => { toast.success(m); setReverseTarget(null); }} />
      <AdjustmentDialog open={showAdjustment} onClose={() => setShowAdjustment(false)} onDone={(m) => { toast.success(m); setShowAdjustment(false); }} />
    </div>
  );
}
