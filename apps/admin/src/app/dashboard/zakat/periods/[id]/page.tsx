"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Users, TrendingUp, Printer, Eye } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import api from "@/lib/api";
import { getCategoryLabel } from "@/lib/category-utils";

interface PeriodDetail {
  id: string;
  name: string;
  year: number;
  hijriYear: string | null;
  startDate: string;
  endDate: string;
  executionDate: string | null;
  status: string;
  description?: string;
  zakatTypeName?: string;
}

interface MuzakiDetail {
  transaction_id: string;
  transaction_number: string;
  muzaki_name: string;
  muzaki_email: string;
  muzaki_phone: string;
  on_behalf_of: string;
  zakat_type_name: string;
  amount: number;
  payment_status: "pending" | "partial" | "paid";
  is_anonymous: boolean;
  message: string | null;
  created_at: string;
  paid_at: string | null;
}

interface Stats {
  totalMuzaki: number;
  totalAmount: number;
  paidMuzaki: number;
  paidAmount: number;
  pendingMuzaki: number;
}

export default function ZakatPeriodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const periodId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [activeTab, setActiveTab] = useState<"muzaki" | "penyaluran" | "kegiatan">("muzaki");

  // Fetch period detail with muzaki
  const { data, isLoading } = useQuery({
    queryKey: ["zakat-period-detail", periodId],
    queryFn: async () => {
      const response = await api.get(`/admin/zakat/periods/${periodId}/detail`);
      return response.data;
    },
  });

  // Fetch disbursements for this period
  const { data: disbursementsData } = useQuery({
    queryKey: ["disbursements-period", periodId],
    queryFn: async () => {
      const response = await api.get("/admin/disbursements", {
        params: {
          reference_id: periodId,
          limit: 1000,
        },
      });
      return response.data;
    },
    enabled: !!periodId,
  });

  // Fetch activity reports for this period
  const { data: activityReportsData } = useQuery({
    queryKey: ["activity-reports-period", periodId],
    queryFn: async () => {
      const response = await api.get("/admin/activity-reports", {
        params: {
          reference_type: "zakat_period",
          reference_id: periodId,
        },
      });
      return response.data;
    },
    enabled: !!periodId,
  });

  const period: PeriodDetail = data?.period;
  const muzaki: MuzakiDetail[] = data?.muzaki || [];
  const sortedMuzaki = [...muzaki].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const stats: Stats = data?.stats || {
    totalMuzaki: 0,
    totalAmount: 0,
    paidMuzaki: 0,
    paidAmount: 0,
    pendingMuzaki: 0,
  };

  // Calculate disbursement stats
  const disbursements = disbursementsData?.data || [];
  const paidDisbursements = disbursements.filter((d: any) => d.status === "paid");
  const totalDisbursed = paidDisbursements.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
  const disbursementCount = paidDisbursements.length;

  // Activity reports data
  const activityReports = activityReportsData?.data || [];

  const formatCurrencyValue = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      partial: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Belum Bayar",
      partial: "Cicilan",
      paid: "Lunas",
    };
    return labels[status] || status;
  };

  const getDisbursementCategoryLabel = (d: any) => {
    const baseLabel = d.category ? getCategoryLabel(d.category) : "-";
    const recipientType = d.recipientType || d.recipient_type;

    if (recipientType === "mustahiq") {
      return `Langsung: ${baseLabel}`;
    }

    if (recipientType === "employee") {
      return `Melalui PJ untuk : ${baseLabel}`;
    }

    return baseLabel;
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Periode tidak ditemukan</p>
          <button onClick={() => router.back()} className="btn-secondary mt-4">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header - Hidden on Print */}
      <div className="mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="btn-secondary mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">{period.name}</h1>
            <div className="flex gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(period.startDate), "dd MMM yyyy", { locale: localeId })} -
                {format(new Date(period.endDate), "dd MMM yyyy", { locale: localeId })}
              </span>
              {period.hijriYear && <span>Tahun Hijriah: {period.hijriYear}</span>}
            </div>
            {period.description && (
              <p className="text-sm text-gray-600 mt-2">{period.description}</p>
            )}
            {period.zakatTypeName && (
              <p className="text-sm text-gray-700 font-medium mt-2">
                Jenis Zakat: {period.zakatTypeName}
              </p>
            )}
          </div>

          <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* Print Header - Visible only on Print */}
      <div className="hidden print:block mb-6">
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold mb-2">LAPORAN ZAKAT</h1>
          <h2 className="text-xl font-semibold">{period.name}</h2>
          {period.zakatTypeName && (
            <p className="text-lg mt-1">{period.zakatTypeName}</p>
          )}
          <p className="text-sm mt-2">
            Periode: {format(new Date(period.startDate), "dd MMM yyyy")} - {format(new Date(period.endDate), "dd MMM yyyy")}
          </p>
          {period.hijriYear && <p className="text-sm">Tahun Hijriah: {period.hijriYear}</p>}
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Muzaki</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalMuzaki}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.paidMuzaki} lunas, {stats.pendingMuzaki} pending
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Terkumpul</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrencyValue(stats.totalAmount)}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Penyaluran</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrencyValue(totalDisbursed)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {disbursementCount} penyaluran
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
              📦
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Sisa</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrencyValue(stats.paidAmount - totalDisbursed)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((1 - (totalDisbursed / stats.paidAmount)) * 100 || 0).toFixed(1)}% dari total
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl">
              💰
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("muzaki")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "muzaki"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Daftar Muzaki ({muzaki.length})
            </button>
            <button
              onClick={() => setActiveTab("penyaluran")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "penyaluran"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Penyaluran ({disbursements.length})
            </button>
            <button
              onClick={() => setActiveTab("kegiatan")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "kegiatan"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Laporan Kegiatan ({activityReports.length})
            </button>
          </div>
        </div>

        {/* Muzaki Table */}
        {activeTab === "muzaki" && sortedMuzaki.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Muzaki</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kontak</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atas Nama</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah Zakat</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedMuzaki.map((m, index) => (
                  <tr key={m.transaction_id}>
                    <td className="px-4 py-3 text-sm">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {m.is_anonymous ? "Hamba Allah (Anonim)" : m.muzaki_name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {!m.is_anonymous && (
                        <>
                          {m.muzaki_email && (
                            <div className="text-sm text-gray-600">{m.muzaki_email}</div>
                          )}
                          {m.muzaki_phone && (
                            <div className="text-sm text-gray-600">{m.muzaki_phone}</div>
                          )}
                          {!m.muzaki_email && !m.muzaki_phone && (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </>
                      )}
                      {m.is_anonymous && (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{m.on_behalf_of || m.muzaki_name}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrencyValue(m.amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(new Date(m.created_at), "dd MMM yyyy", { locale: localeId })}
                    </td>
                    <td className="px-4 py-3 print:hidden">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(m.payment_status)}`}>
                        {getStatusLabel(m.payment_status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm text-right">Total:</td>
                  <td className="px-4 py-3 text-sm">{formatCurrencyValue(stats.totalAmount)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {activeTab === "muzaki" && sortedMuzaki.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">Belum ada muzaki untuk periode ini</p>
          </div>
        )}

        {/* Penyaluran Table */}
        {activeTab === "penyaluran" && disbursements.length > 0 && (
          <>
            {/* Desktop Table */}
            <div className="table-container hidden lg:block">
              <table className="table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>No. Penyaluran</th>
                    <th>Penerima</th>
                    <th>Kategori</th>
                    <th>Jumlah</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {disbursements.map((d: any, index: number) => (
                    <tr key={d.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="font-medium text-gray-900">{d.disbursementNumber}</div>
                      </td>
                      <td>
                        <div className="font-medium text-gray-900">{d.recipientName}</div>
                        {d.recipientContact && (
                          <div className="text-sm text-gray-500">{d.recipientContact}</div>
                        )}
                      </td>
                      <td className="text-sm text-gray-600">
                        <div>{getDisbursementCategoryLabel(d)}</div>
                        {d.purpose && (
                          <div className="text-xs text-gray-500 mt-1">
                            Tujuan: {d.purpose}
                          </div>
                        )}
                      </td>
                      <td className="mono text-sm font-semibold">
                        {formatCurrencyValue(d.amount)}
                      </td>
                      <td>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            d.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : d.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {d.status === "paid" ? "Lunas" : d.status === "pending" ? "Pending" : d.status}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600">
                        {d.paidAt
                          ? format(new Date(d.paidAt), "dd MMM yyyy", { locale: localeId })
                          : d.createdAt
                          ? format(new Date(d.createdAt), "dd MMM yyyy", { locale: localeId })
                          : "-"}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            onClick={() => router.push(`/dashboard/disbursements/${d.id}`)}
                            className="action-btn action-view"
                            title="Lihat Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm text-right">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-sm">{formatCurrencyValue(totalDisbursed)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="table-mobile-cards lg:hidden">
              {disbursements.map((d: any, index: number) => (
                <div key={d.id} className="table-card">
                  <div className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title">{d.disbursementNumber}</div>
                      <div className="table-card-header-subtitle">{d.recipientName}</div>
                    </div>
                    <span
                      className={`table-card-header-badge ${
                        d.status === "paid"
                          ? "bg-success-50 text-success-700"
                          : d.status === "pending"
                          ? "bg-warning-50 text-warning-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {d.status === "paid" ? "Lunas" : d.status === "pending" ? "Pending" : d.status}
                    </span>
                  </div>

                  <div className="table-card-row">
                    <span className="table-card-row-label">Kategori</span>
                    <span className="table-card-row-value">
                      <div>{getDisbursementCategoryLabel(d)}</div>
                      {d.purpose && (
                        <div className="text-xs text-gray-500 mt-1">
                          Tujuan: {d.purpose}
                        </div>
                      )}
                    </span>
                  </div>

                  <div className="table-card-row">
                    <span className="table-card-row-label">Jumlah</span>
                    <span className="table-card-row-value mono font-semibold">
                      {formatCurrencyValue(d.amount)}
                    </span>
                  </div>

                  {d.recipientContact && (
                    <div className="table-card-row">
                      <span className="table-card-row-label">Kontak</span>
                      <span className="table-card-row-value">{d.recipientContact}</span>
                    </div>
                  )}

                  <div className="table-card-row">
                    <span className="table-card-row-label">Tanggal</span>
                    <span className="table-card-row-value">
                      {d.paidAt
                        ? format(new Date(d.paidAt), "dd MMM yyyy", { locale: localeId })
                        : d.createdAt
                        ? format(new Date(d.createdAt), "dd MMM yyyy", { locale: localeId })
                        : "-"}
                    </span>
                  </div>

                  <div className="table-card-footer">
                    <button
                      onClick={() => router.push(`/dashboard/disbursements/${d.id}`)}
                      className="action-btn action-view"
                      title="Lihat Detail"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "penyaluran" && disbursements.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">Belum ada penyaluran untuk periode ini</p>
          </div>
        )}

        {/* Laporan Kegiatan Tab */}
        {activeTab === "kegiatan" && activityReports.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Judul</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal Kegiatan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dibuat Oleh</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activityReports.map((report: any, index: number) => (
                  <tr key={report.id}>
                    <td className="px-4 py-3 text-sm">{index + 1}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{report.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">{report.description}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {report.activityDate
                        ? format(new Date(report.activityDate), "dd MMM yyyy", { locale: localeId })
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          report.status === "published"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {report.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {report.creator?.name || "-"}
                    </td>
                    <td className="px-4 py-3 print:hidden">
                      <button
                        onClick={() => router.push(`/dashboard/activity-reports/${report.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Lihat Detail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "kegiatan" && activityReports.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">Belum ada laporan kegiatan untuk periode ini</p>
          </div>
        )}
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-12 pt-6 border-t-2 border-gray-800">
        <div className="flex justify-between text-sm">
          <div>
            <p>Dicetak pada: {format(new Date(), "dd MMMM yyyy HH:mm", { locale: localeId })}</p>
          </div>
          <div className="text-right">
            <p className="mb-12">Amil Zakat</p>
            <p>_____________________</p>
            <p className="mt-1">Tanda Tangan & Nama</p>
          </div>
        </div>
      </div>
    </div>
  );
}
