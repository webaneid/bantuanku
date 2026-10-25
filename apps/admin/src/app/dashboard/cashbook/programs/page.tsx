"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import ReportFilters from "@/components/reports/ReportFilters";
import ReportTable from "@/components/reports/ReportTable";
import { FUND_LABEL, PROGRAM_FUNDS, qs, useCashbookRange } from "@/lib/cashbook";

const PAGE_SIZE = 20;

export default function CashbookProgramsPage() {
  const { startDate, endDate, setStartDate, setEndDate } = useCashbookRange();
  const [fund, setFund] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["cashbook", "programs", startDate, endDate, fund, search, page],
    queryFn: async () => (await api.get(`/admin/cashbook/programs?${qs({ startDate, endDate, fund, q: search, page, limit: PAGE_SIZE })}`)).data,
  });

  return (
    <div className="dashboard-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark">Per Program</h1>
        <p className="text-gray-600 mt-1">Masuk, hak pihak lain, disalurkan, dan sisa untuk setiap campaign, jenis zakat, dan paket qurban.</p>
      </div>

      <ReportFilters
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={(v) => { setStartDate(v); setPage(1); }}
        onEndDateChange={(v) => { setEndDate(v); setPage(1); }}
        searchable
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Nama program"
        filters={[{ key: "fund", label: "Dana", value: fund, onChange: (v) => { setFund(v); setPage(1); }, options: [{ value: "", label: "Semua dana" }, ...PROGRAM_FUNDS.map((f) => ({ value: f, label: FUND_LABEL[f] }))] }]}
      />
      {isError && <div className="card mb-6 border border-danger-200 bg-danger-50 text-sm text-danger-700">Gagal memuat laporan program.</div>}

      <div className="card">
        <ReportTable
          loading={isLoading}
          data={data?.data || []}
          pagination={{ page, limit: PAGE_SIZE, total: data?.pagination?.total || 0 }}
          onPageChange={setPage}
          emptyMessage="Belum ada uang masuk pada filter ini"
          columns={[
            { key: "name", header: "Program", render: (v, r) => <span className="font-medium text-sm">{v}<span className="block text-xs text-gray-500 font-normal">{FUND_LABEL[r.fund] || r.fund}</span></span> },
            { key: "masuk", header: "Masuk", align: "right", format: "currency" },
            { key: "hakPihakLain", header: "Hak pihak lain", align: "right", format: "currency" },
            { key: "disalurkan", header: "Disalurkan", align: "right", format: "currency" },
            { key: "sisa", header: "Sisa", align: "right", format: "currency" },
          ]}
        />
        {data?.catatan && <p className="text-xs text-gray-500 mt-3">{data.catatan}</p>}
      </div>
    </div>
  );
}
