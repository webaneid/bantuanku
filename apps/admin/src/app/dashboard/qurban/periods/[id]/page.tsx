"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Users, TrendingUp, Printer } from "lucide-react";
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

  // Fetch period detail with orders
  const { data, isLoading } = useQuery({
    queryKey: ["qurban-period-detail", periodId],
    queryFn: async () => {
      const response = await api.get(`/admin/qurban/periods/${periodId}/detail`);
      return response.data;
    },
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

      {/* Kambing Section */}
      {goatOrders.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Kambing ({goatOrders.length})</h2>
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
        <div className="bg-white rounded-lg shadow mb-6">
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
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">Belum ada pesanan untuk periode ini</p>
        </div>
      )}

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
