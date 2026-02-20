"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Users, TrendingUp, Printer, Eye } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import api from "@/lib/api";

interface PeriodDetail {
  id: string;
  name: string;
  hijriYear: string;
  gregorianYear: number;
  startDate: string;
  endDate: string;
  executionDate: string;
  status: string;
  description?: string;
}

interface OrderDetail {
  order_id: string;
  order_number: string;
  animal_type: "goat" | "cow";
  package_name: string;
  package_type: "individual" | "shared";
  price: number;
  donor_name: string;
  donor_phone: string;
  on_behalf_of: string;
  quantity: number;
  payment_status: "pending" | "partial" | "paid";
  order_status: string;
  group_number?: number | null;
  group_max_slots?: number | null;
  created_at: string;
}

interface Stats {
  totalOrders: number;
  totalGoats: number;
  totalCows: number;
  totalRevenue: number;
  paidOrders: number;
  pendingOrders: number;
}

export default function PeriodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const periodId = params.id as string;
  const [activeTab, setActiveTab] = useState<"penerimaan" | "penyaluran" | "laporan" | "kegiatan">("penerimaan");

  // Fetch period detail with orders
  const { data, isLoading } = useQuery({
    queryKey: ["qurban-period-detail", periodId],
    queryFn: async () => {
      const response = await api.get(`/admin/qurban/periods/${periodId}/detail`);
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
          reference_type: "qurban_period",
          reference_id: periodId,
        },
      });
      return response.data;
    },
    enabled: !!periodId,
  });

  const period: PeriodDetail = data?.period;
  const orders: OrderDetail[] = data?.orders || [];
  const stats: Stats = data?.stats || {
    totalOrders: 0,
    totalGoats: 0,
    totalCows: 0,
    totalRevenue: 0,
    paidOrders: 0,
    pendingOrders: 0,
  };

  // Calculate disbursement data
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
      confirmed: "bg-purple-100 text-purple-800",
      executed: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Belum Bayar",
      partial: "Cicilan",
      paid: "Lunas",
      confirmed: "Dikonfirmasi",
      executed: "Selesai",
    };
    return labels[status] || status;
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

  // Group orders by animal type
  const goatOrders = orders.filter(o => o.animal_type === "goat");
  const cowOrders = orders.filter(o => o.animal_type === "cow");

  // Calculate total quantities for section headers
  const totalGoatQuantity = goatOrders.reduce((sum, o) => sum + Number(o.quantity), 0);

  // For cows: count individual cows + unique shared groups
  const totalCowQuantity = (() => {
    const individualCows = cowOrders
      .filter(o => o.package_type === "individual")
      .reduce((sum, o) => sum + Number(o.quantity), 0);

    const sharedGroups = new Set(
      cowOrders
        .filter(o => o.package_type === "shared" && o.group_number)
        .map(o => o.group_number)
    );

    return individualCows + sharedGroups.size;
  })();

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
              <span>Tahun Hijriah: {period.hijriYear}</span>
            </div>
            {period.description && (
              <p className="text-sm text-gray-600 mt-2">{period.description}</p>
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
          <h1 className="text-3xl font-bold mb-2">LAPORAN QURBAN</h1>
          <h2 className="text-xl font-semibold">{period.name}</h2>
          <p className="text-sm mt-2">
            Periode: {format(new Date(period.startDate), "dd MMM yyyy")} - {format(new Date(period.endDate), "dd MMM yyyy")}
          </p>
          <p className="text-sm">Tahun Hijriah: {period.hijriYear}</p>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Kambing</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalGoats}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
              🐐
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Sapi</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalCows}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-3xl">
              🐄
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Pesanan</p>
              <p className="text-3xl font-bold text-purple-600">{stats.totalOrders}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.paidOrders} lunas, {stats.pendingOrders} pending
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("penerimaan")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "penerimaan"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Penerimaan Uang ({orders.length})
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
              onClick={() => setActiveTab("laporan")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "laporan"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Laporan
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

        {/* Penerimaan Uang Tab */}
        {activeTab === "penerimaan" && (
          <>
            {/* Kambing Section */}
            {goatOrders.length > 0 && (
              <div className="mb-6">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-bold">Kambing ({totalGoatQuantity} ekor)</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paket</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Harga</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pemesan</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telepon</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atas Nama</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {goatOrders.map((order, index) => (
                        <tr key={order.order_id}>
                          <td className="px-4 py-3 text-sm">{index + 1}</td>
                          <td className="px-4 py-3 text-sm">{order.package_name}</td>
                          <td className="px-4 py-3 text-sm font-semibold">{order.quantity} ekor</td>
                          <td className="px-4 py-3 text-sm">{formatCurrencyValue(order.price)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{order.donor_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{order.donor_phone}</td>
                          <td className="px-4 py-3 text-sm">{order.on_behalf_of || order.donor_name}</td>
                          <td className="px-4 py-3 print:hidden">
                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(order.payment_status)}`}>
                              {getStatusLabel(order.payment_status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sapi Section */}
            {cowOrders.length > 0 && (
              <div className="mb-6">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-bold">Sapi ({totalCowQuantity} ekor)</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paket</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Harga</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pemesan</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telepon</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atas Nama</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cowOrders.map((order, index) => (
                        <tr key={order.order_id}>
                          <td className="px-4 py-3 text-sm">{index + 1}</td>
                          <td className="px-4 py-3 text-sm">{order.package_name}</td>
                          <td className="px-4 py-3 text-sm">
                            {order.package_type === "shared" && order.group_number ? (
                              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium">
                                Group #{order.group_number}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold">
                            {order.package_type === "shared" && order.group_max_slots ? (
                              `1/${order.group_max_slots} ekor`
                            ) : (
                              `${order.quantity} ekor`
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">{formatCurrencyValue(order.price)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{order.donor_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{order.donor_phone}</td>
                          <td className="px-4 py-3 text-sm">{order.on_behalf_of || order.donor_name}</td>
                          <td className="px-4 py-3 print:hidden">
                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(order.payment_status)}`}>
                              {getStatusLabel(order.payment_status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {orders.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-gray-500">Belum ada pesanan untuk periode ini</p>
              </div>
            )}
          </>
        )}

        {/* Penyaluran Tab */}
        {activeTab === "penyaluran" && disbursements.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Penyaluran</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Penerima</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {disbursements.map((d: any, index: number) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 text-sm">{index + 1}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{d.disbursementNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{d.recipientName}</div>
                      {d.recipientContact && (
                        <div className="text-xs text-gray-500">{d.recipientContact}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.category || "-"}</td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {formatCurrencyValue(d.amount)}
                    </td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {d.paidAt
                        ? format(new Date(d.paidAt), "dd MMM yyyy", { locale: localeId })
                        : d.createdAt
                        ? format(new Date(d.createdAt), "dd MMM yyyy", { locale: localeId })
                        : "-"}
                    </td>
                    <td className="px-4 py-3 print:hidden">
                      <button
                        onClick={() => router.push(`/dashboard/disbursements/${d.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Lihat Detail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
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
        )}

        {activeTab === "penyaluran" && disbursements.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">Belum ada penyaluran untuk periode ini</p>
          </div>
        )}

        {/* Laporan Tab */}
        {activeTab === "laporan" && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Laporan Keuangan Periode</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
                <p className="text-sm text-green-700 mb-1">Total Penerimaan</p>
                <p className="text-2xl font-bold text-green-800">
                  {formatCurrencyValue(stats.totalRevenue)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.totalOrders} pesanan
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
                <p className="text-sm text-blue-700 mb-1">Total Penyaluran</p>
                <p className="text-2xl font-bold text-blue-800">
                  {formatCurrencyValue(totalDisbursed)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {disbursementCount} penyaluran
                </p>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
                <p className="text-sm text-purple-700 mb-1">Saldo</p>
                <p className="text-2xl font-bold text-purple-800">
                  {formatCurrencyValue(stats.totalRevenue - totalDisbursed)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {((1 - (totalDisbursed / stats.totalRevenue)) * 100 || 0).toFixed(1)}% dari total
                </p>
              </div>
            </div>

            {/* Detail Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Penerimaan Detail */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4 text-gray-800">Rincian Penerimaan</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-sm text-gray-600">Kambing ({stats.totalGoats} ekor)</span>
                    <span className="text-sm font-medium">
                      {formatCurrencyValue(
                        goatOrders.reduce((sum, o) => sum + Number(o.price), 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-sm text-gray-600">Sapi ({stats.totalCows} ekor)</span>
                    <span className="text-sm font-medium">
                      {formatCurrencyValue(
                        cowOrders.reduce((sum, o) => sum + Number(o.price), 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="font-bold text-green-600">
                      {formatCurrencyValue(stats.totalRevenue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Pembayaran */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4 text-gray-800">Status Pembayaran</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      <span className="text-sm text-gray-600">Lunas</span>
                    </div>
                    <span className="text-sm font-medium">{stats.paidOrders} pesanan</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                      <span className="text-sm text-gray-600">Pending</span>
                    </div>
                    <span className="text-sm font-medium">{stats.pendingOrders} pesanan</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold text-gray-800">Total Pesanan</span>
                    <span className="font-bold text-purple-600">
                      {stats.totalOrders}
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
            <p className="mb-12">Panitia Qurban</p>
            <p>_____________________</p>
            <p className="mt-1">Tanda Tangan & Nama</p>
          </div>
        </div>
      </div>
    </div>
  );
}
