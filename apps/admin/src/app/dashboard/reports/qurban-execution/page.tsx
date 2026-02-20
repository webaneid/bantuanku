"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import ExportButton from "@/components/reports/ExportButton";
import { exportMultiSheetExcel } from "@/utils/export-excel";

type ExecutionItem = {
  id: string;
  executionNumber: string;
  executionDate: string;
  location: string;
  butcherName: string | null;
  animalType: string;
  animalWeight: number | null;
  recipientCount: number;
  donorName: string | null;
  onBehalfOf: string | null;
  executorName: string | null;
  periodName: string | null;
  packageName: string | null;
  isShared: boolean;
  groupNumber: number | null;
  participantCount: number;
};

type QurbanExecutionReportData = {
  summary: {
    totalExecutions: number;
    totalRecipients: number;
    totalCow: number;
    totalGoat: number;
    sharedExecutions: number;
    individualExecutions: number;
  };
  executions: ExecutionItem[];
};

export default function QurbanExecutionReportPage() {
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return formatLocalDate(firstDay);
  });
  const [endDate, setEndDate] = useState(() => formatLocalDate(new Date()));

  const { data, isLoading } = useQuery({
    queryKey: ["qurban-execution-report", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await api.get(`/admin/reports/qurban-execution?${params}`);
      return response.data?.data as QurbanExecutionReportData;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const summary = data?.summary || {
    totalExecutions: 0,
    totalRecipients: 0,
    totalCow: 0,
    totalGoat: 0,
    sharedExecutions: 0,
    individualExecutions: 0,
  };

  const executions = data?.executions || [];

  const handleExportExcel = () => {
    exportMultiSheetExcel({
      sheets: [
        {
          name: "Penyembelihan",
          title: "Laporan Penyembelihan Qurban (Per Individu / Per Ekor)",
          subtitle: `Periode Filter: ${startDate} s/d ${endDate}`,
          data: executions.map((item) => ({
            executionNumber: item.executionNumber,
            executionDate: item.executionDate,
            periodName: item.periodName || "-",
            animalType: item.animalType,
            packageName: item.packageName || "-",
            donor: item.onBehalfOf || item.donorName || "-",
            recipientCount: item.recipientCount,
            approach: item.isShared ? "Patungan" : "Individu",
            location: item.location,
          })),
          columns: [
            { header: "No Eksekusi", key: "executionNumber", width: 20 },
            { header: "Tanggal", key: "executionDate", width: 16 },
            { header: "Periode", key: "periodName", width: 28 },
            { header: "Jenis Hewan", key: "animalType", width: 14 },
            { header: "Paket", key: "packageName", width: 28 },
            { header: "Shohibul Qurban", key: "donor", width: 26 },
            { header: "Penerima", key: "recipientCount", width: 12, format: "number" as const },
            { header: "Pendekatan", key: "approach", width: 14 },
            { header: "Lokasi", key: "location", width: 30 },
          ],
        },
      ],
      filename: `Laporan-Penyembelihan-Qurban-${startDate}-${endDate}`,
    });
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Penyembelihan Qurban</h1>
          <p className="text-gray-600 mt-1">Pendekatan personal per individu / per ekor</p>
        </div>
        <ExportButton onExportExcel={handleExportExcel} onPrint={() => window.print()} />
      </div>

      <div className="space-y-6">
        <div className="card no-print">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input w-full" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="card"><p className="text-xs text-gray-500">Total Eksekusi</p><p className="text-xl font-bold mt-1">{summary.totalExecutions}</p></div>
          <div className="card"><p className="text-xs text-gray-500">Total Sapi</p><p className="text-xl font-bold mt-1">{summary.totalCow}</p></div>
          <div className="card"><p className="text-xs text-gray-500">Total Kambing</p><p className="text-xl font-bold mt-1">{summary.totalGoat}</p></div>
          <div className="card"><p className="text-xs text-gray-500">Total Penerima</p><p className="text-xl font-bold mt-1">{summary.totalRecipients}</p></div>
          <div className="card"><p className="text-xs text-gray-500">Eksekusi Patungan</p><p className="text-xl font-bold mt-1">{summary.sharedExecutions}</p></div>
          <div className="card"><p className="text-xs text-gray-500">Eksekusi Individu</p><p className="text-xl font-bold mt-1">{summary.individualExecutions}</p></div>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="table-container">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Detail Per Ekor / Per Individu</h2>
            </div>

            {executions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Belum ada data penyembelihan pada periode ini</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>No Eksekusi</th>
                    <th>Tanggal</th>
                    <th>Periode</th>
                    <th>Hewan</th>
                    <th>Shohibul Qurban</th>
                    <th>Pendekatan</th>
                    <th className="text-right">Penerima</th>
                    <th>Lokasi</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="text-sm text-gray-900">{item.executionNumber}</td>
                      <td className="text-sm text-gray-700">{item.executionDate ? new Date(item.executionDate).toLocaleDateString("id-ID") : "-"}</td>
                      <td className="text-sm text-gray-700">{item.periodName || "-"}</td>
                      <td className="text-sm text-gray-700">{item.animalType}</td>
                      <td className="text-sm text-gray-700">{item.onBehalfOf || item.donorName || "-"}</td>
                      <td className="text-sm text-gray-700">
                        {item.isShared ? `Patungan${item.groupNumber ? ` #${item.groupNumber}` : ""}` : "Individu"}
                      </td>
                      <td className="text-sm text-right text-gray-700">{item.recipientCount || 0}</td>
                      <td className="text-sm text-gray-700">{item.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
