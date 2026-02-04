"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Eye, CheckCircle, XCircle, X, CreditCard, Plus, UserPlus, Image } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import api from "@/lib/api";
import Autocomplete from "@/components/Autocomplete";
import MediaLibrary from "@/components/MediaLibrary";
import DonorModal from "@/components/modals/DonorModal";
import FeedbackDialog from "@/components/FeedbackDialog";

interface Order {
  id: string;
  order_number: string;
  period_id: string;
  package_id: string;
  donor_name: string;
  donor_phone: string;
  donor_email: string | null;
  shared_group_id: string | null;
  payment_method: "full" | "installment";
  total_amount: number;
  paid_amount: number;
  payment_status: "pending" | "partial" | "paid" | "overdue";
  order_status: "pending" | "confirmed" | "cancelled" | "executed";
  installment_count: number | null;
  installment_frequency: string | null;
  notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  package_name?: string;
  period_name?: string;
  animal_type?: string;
  package_type?: string;
}

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  payment_proof_url: string | null;
  status: "pending" | "verified" | "rejected";
  notes: string | null;
  created_at: string;
  verified_at: string | null;
  verified_by: string | null;
}

interface Package {
  id: string;
  name: string;
  price: number;
  periodId: string;
  periodName?: string;
  animalType: string;
  packageType: string;
  maxSlots?: number;
}

interface Period {
  id: string;
  name: string;
  hijriYear: string;
  gregorianYear: number;
  status: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch?: string;
  programs?: string[];
}

interface Donatur {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface OrderFormData {
  donatur_id: string;
  donor_name: string;
  donor_phone: string;
  donor_email: string;
  period_id: string;
  package_id: string;
  payment_method: string;
  payment_channel: string;
  total_amount: string;
  paid_amount: string;
  payment_proof_url: string;
  on_behalf_of: string;
  notes: string;
}


const formatDateValue = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return format(parsed, "dd MMM yyyy", { locale: id });
};

const formatCurrencyValue = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

export default function QurbanOrdersPage() {
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddDonaturModal, setShowAddDonaturModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [formData, setFormData] = useState<OrderFormData>({
    donatur_id: "",
    donor_name: "",
    donor_phone: "",
    donor_email: "",
    period_id: "",
    package_id: "",
    payment_method: "full",
    payment_channel: "",
    total_amount: "",
    paid_amount: "",
    payment_proof_url: "",
    on_behalf_of: "",
    notes: "",
  });
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, type: "success", title: "" });

  const queryClient = useQueryClient();

  // Fetch donaturs for dropdown
  const { data: donaturs = [] } = useQuery<Donatur[]>({
    queryKey: ["donaturs-list"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/donaturs");
      return response.data.data || response.data;
    },
  });

  const { data: groupedSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      try {
        const response = await api.get("/admin/settings");
        return response.data?.data || {};
      } catch (error: any) {
        console.error("Settings API error:", error);
        return {};
      }
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Fetch periods for dropdown
  const { data: periods = [] } = useQuery<Period[]>({
    queryKey: ["qurban-periods-list"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/periods");
      return response.data.data || response.data;
    },
  });

  // Fetch packages for dropdown
  const { data: packages = [] } = useQuery<Package[]>({
    queryKey: ["qurban-packages-list"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/packages");
      return response.data.data || response.data;
    },
  });

  // Fetch bank accounts from settings
  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ["payment-bank-accounts"],
    queryFn: async () => {
      const response = await api.get("/admin/settings");
      const settings = response.data?.data?.payment || [];
      const bankAccountsSetting = settings.find((s: any) => s.key === "payment_bank_accounts");
      if (bankAccountsSetting?.value) {
        try {
          return JSON.parse(bankAccountsSetting.value);
        } catch {
          return [];
        }
      }
      return [];
    },
  });

  // Normalize bank accounts with default program
  const normalizedBankAccounts = useMemo(
    () =>
      (bankAccounts || []).map((acc) => ({
        ...acc,
        programs: acc.programs && acc.programs.length > 0 ? acc.programs : ["general"],
      })),
    [bankAccounts]
  );

  // Filter bank accounts: prefer qurban-specific, fallback to general
  const qurbanBankAccounts = useMemo(() => {
    const hasQurban = normalizedBankAccounts.some((acc) => acc.programs?.includes("qurban"));
    return normalizedBankAccounts.filter((acc) =>
      hasQurban ? acc.programs?.includes("qurban") : acc.programs?.includes("general")
    );
  }, [normalizedBankAccounts]);

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["qurban-orders", filterStatus, filterPaymentStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterPaymentStatus) params.append("payment_status", filterPaymentStatus);

      const response = await api.get(`/admin/qurban/orders?${params.toString()}`);
      return response.data.data || response.data;
    },
  });

  // Fetch order detail with payments
  const fetchOrderDetail = async (orderId: string) => {
    const response = await api.get(`/admin/qurban/orders/${orderId}`);
    const data = response.data;
    setSelectedOrder(data.order);
    setPayments(data.payments || []);
    setShowDetailModal(true);
  };

  // Confirm order mutation
  const confirmMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post(`/admin/qurban/orders/${orderId}/confirm`, {});
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-orders"] });
      setShowDetailModal(false);
      setFeedback({
        open: true,
        type: "success",
        title: "Order dikonfirmasi",
        message: "Order berhasil dikonfirmasi.",
      });
    },
  });

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post(`/admin/qurban/orders/${orderId}/cancel`, {});
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-orders"] });
      setShowDetailModal(false);
      setFeedback({
        open: true,
        type: "success",
        title: "Order dibatalkan",
        message: "Order berhasil dibatalkan.",
      });
    },
  });

  // Create order mutation
  const createMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const selectedPackage = packages.find(p => p.id === data.package_id);
      const payload = {
        donorName: data.donor_name,
        donorPhone: data.donor_phone,
        donorEmail: data.donor_email || null,
        packageId: data.package_id,
        unitPrice: selectedPackage?.price || 0,
        totalAmount: parseFloat(data.total_amount),
        paymentMethod: data.payment_method,
        paymentChannel: data.payment_channel || null,
        paidAmount: parseFloat(data.paid_amount) || 0,
        paymentProofUrl: data.payment_proof_url || null,
        onBehalfOf: data.on_behalf_of || null,
        notes: data.notes || null,
      };
      const response = await api.post("/admin/qurban/orders", payload);
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-orders"] });
      setShowCreateModal(false);
      resetForm();
      setFeedback({
        open: true,
        type: "success",
        title: "Order dibuat",
        message: "Order berhasil dibuat.",
      });
    },
  });

  // Handle donor creation success from DonorModal
  const handleDonorSuccess = (createdId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["donaturs-list"] });
    setShowAddDonaturModal(false);
    // Auto-select the new donatur
    if (createdId) {
      handleDonaturChange(createdId);
    }
  };

  const resetForm = () => {
    setFormData({
      donatur_id: "",
      donor_name: "",
      donor_phone: "",
      donor_email: "",
      period_id: "",
      package_id: "",
      payment_method: "full",
      payment_channel: "",
      total_amount: "",
      paid_amount: "",
      payment_proof_url: "",
      on_behalf_of: "",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDonaturChange = (donaturId: string) => {
    const selectedDonatur = donaturs.find(d => d.id === donaturId);
    setFormData({
      ...formData,
      donatur_id: donaturId,
      donor_name: selectedDonatur?.name || "",
      donor_phone: selectedDonatur?.phone || "",
      donor_email: selectedDonatur?.email || "",
    });
  };

  const handlePeriodChange = (periodId: string) => {
    setFormData({
      ...formData,
      period_id: periodId,
      package_id: "", // Reset package when period changes
      total_amount: "",
      paid_amount: "", // Reset paid amount juga
    });
  };

  const handlePackageChange = (packageId: string) => {
    const selectedPackage = packages.find(p => p.id === packageId);
    const price = selectedPackage ? String(selectedPackage.price) : "";
    setFormData({
      ...formData,
      package_id: packageId,
      total_amount: price,
      paid_amount: price, // Auto-fill paid amount sama dengan total
    });
  };

  const handleConfirm = (orderId: string) => {
    if (confirm("Konfirmasi order ini untuk eksekusi penyembelihan?")) {
      confirmMutation.mutate(orderId);
    }
  };

  const handleCancel = (orderId: string) => {
    if (confirm("Batalkan order ini? Slot akan dikembalikan jika patungan.")) {
      cancelMutation.mutate(orderId);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-warning-50 text-warning-700",
      confirmed: "bg-success-50 text-success-700",
      cancelled: "bg-danger-50 text-danger-700",
      executed: "bg-info-50 text-info-700",
      partial: "bg-warning-50 text-warning-700",
      paid: "bg-success-50 text-success-700",
      overdue: "bg-danger-50 text-danger-700",
      full: "bg-primary-50 text-primary-700",
      installment: "bg-warning-50 text-warning-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending",
      confirmed: "Dikonfirmasi",
      cancelled: "Dibatalkan",
      executed: "Dieksekusi",
      partial: "Cicilan",
      paid: "Lunas",
      overdue: "Terlambat",
      full: "Bayar Penuh",
      installment: "Cicilan",
    };
    return labels[status] || status;
  };

  // Options for Autocomplete
  const donaturOptions = donaturs.map(d => ({
    value: d.id,
    label: `${d.name}${d.phone ? ` - ${d.phone}` : ""}`,
  }));

  const periodOptions = periods.map(p => ({
    value: p.id,
    label: `${p.name} (${p.status === "active" ? "Aktif" : p.status})`,
  }));

  // Filter packages by selected period
const filteredPackages = formData.period_id
  ? packages.filter(pkg => pkg.periodId === formData.period_id)
  : packages;

const packageOptions = filteredPackages.map(pkg => ({
  value: pkg.id,
  label: `${pkg.name} - ${pkg.animalType === "cow" ? "🐄" : "🐐"} - ${formatCurrencyValue(pkg.price)}`,
}));

const amilSettings = useMemo(() => groupedSettings?.amil || [], [groupedSettings]);
const adminQurbanPerEkor = useMemo(() => {
  const setting = amilSettings.find((s: any) => s.key === "amil_qurban_perekor_fee");
  const num = Number(setting?.value);
  return Number.isFinite(num) ? num : 0;
}, [amilSettings]);
const adminQurbanSapi = useMemo(() => {
  const setting = amilSettings.find((s: any) => s.key === "amil_qurban_sapi_fee");
  const num = Number(setting?.value);
  return Number.isFinite(num) ? num : 0;
}, [amilSettings]);

const selectedPackage = useMemo(
  () => packages.find((pkg) => pkg.id === formData.package_id),
  [packages, formData.package_id]
);

const calculateAdminFee = (pkg?: Package | null) => {
  if (!pkg) return 0;
  const baseFee = pkg.animalType === "cow" ? adminQurbanSapi : adminQurbanPerEkor;
  const divisor = pkg.packageType === "shared" ? pkg.maxSlots || 1 : 1;
  return baseFee / divisor;
};

const packageAdminFee = calculateAdminFee(selectedPackage);
const packageBasePrice = selectedPackage?.price || 0;
const packageTotalWithAdmin = selectedPackage ? packageBasePrice + packageAdminFee : Number(formData.total_amount) || 0;

useEffect(() => {
  if (!selectedPackage) return;
  const totalStr = packageTotalWithAdmin.toString();
  setFormData((prev) => {
    const nextPaid =
      prev.paid_amount === "" || prev.paid_amount === prev.total_amount
        ? totalStr
        : prev.paid_amount;
    return {
      ...prev,
      total_amount: totalStr,
      paid_amount: nextPaid,
    };
  });
}, [selectedPackage, packageTotalWithAdmin]);

  // Payment channel options from bank accounts + other methods
  const paymentChannelOptions = useMemo(
    () => [
      ...qurbanBankAccounts.map((acc) => {
        const programLabel = acc.programs?.join(", ") || "general";
        return {
          value: `bank_${acc.id}`,
          label: `${acc.bankName} - ${acc.accountNumber} (${acc.accountName}) [${programLabel}]`,
        };
      }),
      { value: "qris", label: "QRIS" },
      { value: "cash", label: "Tunai / Cash" },
    ],
    [qurbanBankAccounts]
  );

  const paymentMethodOptions = [
    { value: "full", label: "Bayar Penuh" },
    { value: "installment", label: "Cicilan" },
  ];

  const orderStatusFilterOptions = [
    { value: "", label: "Semua Status Order" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Dikonfirmasi" },
    { value: "cancelled", label: "Dibatalkan" },
    { value: "executed", label: "Dieksekusi" },
  ];

  const paymentStatusFilterOptions = [
    { value: "", label: "Semua Status Pembayaran" },
    { value: "pending", label: "Pending" },
    { value: "partial", label: "Cicilan" },
    { value: "paid", label: "Lunas" },
    { value: "overdue", label: "Terlambat" },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Orders Qurban
          </h1>
          <p className="text-sm text-gray-600 mt-1">Kelola pesanan qurban</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary btn-md"
        >
          <Plus className="h-4 w-4" />
          Tambah Order
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="w-64">
          <Autocomplete
            options={orderStatusFilterOptions}
            value={filterStatus}
            onChange={setFilterStatus}
            placeholder="Semua Status Order"
          />
        </div>
        <div className="w-64">
          <Autocomplete
            options={paymentStatusFilterOptions}
            value={filterPaymentStatus}
            onChange={setFilterPaymentStatus}
            placeholder="Semua Status Pembayaran"
          />
        </div>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Donatur</th>
                  <th>Paket</th>
                  <th>Pembayaran</th>
                  <th>Total</th>
                  <th>Status Order</th>
                  <th>Status Bayar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className="font-medium text-gray-900 mono">{order.order_number}</div>
                      <div className="text-sm text-gray-500">
                        {formatDateValue(order.created_at)}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium text-gray-900">{order.donor_name}</div>
                      <div className="text-sm text-gray-500">{order.donor_phone}</div>
                    </td>
                    <td>
                      <div className="font-medium text-gray-900">{order.package_name}</div>
                      <div className="flex gap-1 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
                          {order.animal_type === "cow" ? "🐄" : "🐐"}
                        </span>
                        {order.package_type === "shared" && (
                          <span className="text-xs px-2 py-0.5 rounded bg-info-50 text-info-700">
                            Patungan
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.payment_method)}`}>
                        {getStatusLabel(order.payment_method)}
                      </span>
                    </td>
                    <td className="mono text-sm">
                      <div className="font-semibold">Rp {new Intl.NumberFormat("id-ID").format(order.total_amount)}</div>
                      {order.payment_method === "installment" && (
                        <div className="text-xs text-gray-600">
                          Dibayar: Rp {new Intl.NumberFormat("id-ID").format(order.paid_amount)}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.order_status)}`}>
                        {getStatusLabel(order.order_status)}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.payment_status)}`}>
                        {getStatusLabel(order.payment_status)}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => fetchOrderDetail(order.id)}
                          className="action-btn action-view"
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {order.order_status === "pending" && order.payment_status === "paid" && (
                          <button
                            onClick={() => handleConfirm(order.id)}
                            className="action-btn"
                            style={{ backgroundColor: "#678f0c", color: "white" }}
                            title="Konfirmasi"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {order.order_status === "pending" && (
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="action-btn action-delete"
                            title="Batalkan"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {orders.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Tidak ada data order</p>
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="table-mobile-cards">
            {orders.map((order) => (
              <div key={order.id} className="table-card">
                <div className="table-card-header">
                  <div className="table-card-header-left">
                    <div className="table-card-header-title mono">{order.order_number}</div>
                    <div className="table-card-header-subtitle">{order.donor_name}</div>
                  </div>
                  <span className={`table-card-header-badge ${getStatusColor(order.order_status)}`}>
                    {getStatusLabel(order.order_status)}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Tanggal</span>
                  <span className="table-card-row-value">{formatDateValue(order.created_at)}</span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Telepon</span>
                  <span className="table-card-row-value">{order.donor_phone}</span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Paket</span>
                  <span className="table-card-row-value">
                    {order.package_name}
                    <span className="ml-2">
                      {order.animal_type === "cow" ? "🐄" : "🐐"}
                      {order.package_type === "shared" && " (Patungan)"}
                    </span>
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Metode Bayar</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.payment_method)}`}>
                    {getStatusLabel(order.payment_method)}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Total</span>
                  <span className="table-card-row-value mono font-semibold">
                    Rp {new Intl.NumberFormat("id-ID").format(order.total_amount)}
                  </span>
                </div>

                {order.payment_method === "installment" && (
                  <div className="table-card-row">
                    <span className="table-card-row-label">Terbayar</span>
                    <span className="table-card-row-value mono text-xs">
                      Rp {new Intl.NumberFormat("id-ID").format(order.paid_amount)}
                    </span>
                  </div>
                )}

                <div className="table-card-row">
                  <span className="table-card-row-label">Status Bayar</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.payment_status)}`}>
                    {getStatusLabel(order.payment_status)}
                  </span>
                </div>

                <div className="table-card-footer">
                  <button
                    onClick={() => fetchOrderDetail(order.id)}
                    className="action-btn action-view"
                    title="Lihat Detail"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {order.order_status === "pending" && order.payment_status === "paid" && (
                    <button
                      onClick={() => handleConfirm(order.id)}
                      className="action-btn"
                      style={{ backgroundColor: "#678f0c", color: "white" }}
                      title="Konfirmasi"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  {order.order_status === "pending" && (
                    <button
                      onClick={() => handleCancel(order.id)}
                      className="action-btn action-delete"
                      title="Batalkan"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Detail Order</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Order Info */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Informasi Order</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="font-mono">{selectedOrder.order_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tanggal</p>
                    <p>{format(new Date(selectedOrder.created_at), "dd MMMM yyyy HH:mm", { locale: id })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status Order</p>
                    <span className={`inline-block text-xs px-2 py-1 rounded ${getStatusColor(selectedOrder.order_status)}`}>
                      {getStatusLabel(selectedOrder.order_status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status Pembayaran</p>
                    <span className={`inline-block text-xs px-2 py-1 rounded ${getStatusColor(selectedOrder.payment_status)}`}>
                      {getStatusLabel(selectedOrder.payment_status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Donor Info */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Informasi Donatur</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Nama</p>
                    <p className="font-medium">{selectedOrder.donor_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Telepon</p>
                    <p>{selectedOrder.donor_phone}</p>
                  </div>
                  {selectedOrder.donor_email && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Email</p>
                      <p>{selectedOrder.donor_email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Package Info */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Paket Qurban</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Nama Paket</p>
                    <p className="font-medium">{selectedOrder.package_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Periode</p>
                    <p>{selectedOrder.period_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Jenis Hewan</p>
                    <p>{selectedOrder.animal_type === "cow" ? "🐄 Sapi" : "🐐 Kambing"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tipe</p>
                    <p>{selectedOrder.package_type === "individual" ? "Individual" : "Patungan"}</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Informasi Pembayaran</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Metode</p>
                    <p>{getStatusLabel(selectedOrder.payment_method)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-semibold text-lg">{formatCurrencyValue(selectedOrder.total_amount)}</p>
                  </div>
                  {selectedOrder.payment_method === "installment" && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Terbayar</p>
                        <p className="font-medium text-success-600">{formatCurrencyValue(selectedOrder.paid_amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Sisa</p>
                        <p className="font-medium text-danger-600">
                          {formatCurrencyValue(selectedOrder.total_amount - selectedOrder.paid_amount)}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Payment History */}
                {payments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Riwayat Pembayaran
                    </h4>
                    <div className="space-y-2">
                      {payments.map((payment) => (
                        <div key={payment.id} className="bg-gray-50 rounded p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{formatCurrencyValue(payment.amount)}</p>
                              <p className="text-sm text-gray-600">
                                {format(new Date(payment.created_at), "dd MMM yyyy HH:mm", { locale: id })}
                              </p>
                              {payment.payment_method && (
                                <p className="text-xs text-gray-500 mt-1">Via: {payment.payment_method}</p>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(payment.status)}`}>
                              {getStatusLabel(payment.status)}
                            </span>
                          </div>
                          {payment.notes && (
                            <p className="text-sm text-gray-600 mt-2">{payment.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedOrder.notes && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Catatan</h3>
                  <p className="text-sm text-gray-700">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                {selectedOrder.order_status === "pending" && selectedOrder.payment_status === "paid" && (
                  <button
                    onClick={() => handleConfirm(selectedOrder.id)}
                    disabled={confirmMutation.isPending}
                    className="btn btn-success btn-md"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Konfirmasi Order
                  </button>
                )}
                {selectedOrder.order_status === "pending" && (
                  <button
                    onClick={() => handleCancel(selectedOrder.id)}
                    disabled={cancelMutation.isPending}
                    className="btn btn-danger btn-md"
                  >
                    <XCircle className="h-4 w-4" />
                    Batalkan Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tambah Order Manual</h3>
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-4 overflow-y-auto flex-1">
                {/* Donor Info */}
                <div className="border-b pb-4">
                  <h4 className="font-medium mb-3">Informasi Donatur</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Pilih Donatur *</label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Autocomplete
                            options={donaturOptions}
                            value={formData.donatur_id}
                            onChange={handleDonaturChange}
                            placeholder="Cari donatur..."
                            allowClear={false}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddDonaturModal(true)}
                          className="btn btn-secondary btn-md flex items-center gap-1 whitespace-nowrap"
                        >
                          <UserPlus className="h-4 w-4" />
                          Baru
                        </button>
                      </div>
                    </div>
                    {formData.donatur_id && (
                      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500">Nama</p>
                          <p className="font-medium">{formData.donor_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Telepon</p>
                          <p>{formData.donor_phone || "-"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Email</p>
                          <p>{formData.donor_email || "-"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Period & Package Selection */}
                <div className="border-b pb-4">
                  <h4 className="font-medium mb-3">Periode & Paket Qurban</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Periode Qurban *</label>
                      <Autocomplete
                        options={periodOptions}
                        value={formData.period_id}
                        onChange={handlePeriodChange}
                        placeholder="Pilih periode..."
                        allowClear={false}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Pilih Paket *</label>
                      <Autocomplete
                        options={packageOptions}
                        value={formData.package_id}
                        onChange={handlePackageChange}
                        placeholder={formData.period_id ? "Cari paket..." : "Pilih periode terlebih dahulu"}
                        allowClear={false}
                        disabled={!formData.period_id}
                      />
                      {formData.period_id && packageOptions.length === 0 && (
                        <p className="text-xs text-orange-600 mt-1">Tidak ada paket untuk periode ini</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Atas Nama (Pewakil)</label>
                      <input
                        type="text"
                        value={formData.on_behalf_of}
                        onChange={(e) => setFormData({ ...formData, on_behalf_of: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Nama pewakil qurban (opsional)"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div>
                  <h4 className="font-medium mb-3">Informasi Pembayaran</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Metode Pembayaran *</label>
                      <Autocomplete
                        options={paymentMethodOptions}
                        value={formData.payment_method}
                        onChange={(val) => setFormData({ ...formData, payment_method: val })}
                        placeholder="Pilih metode..."
                        allowClear={false}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Transfer ke Rekening *</label>
                      <Autocomplete
                        options={paymentChannelOptions}
                        value={formData.payment_channel}
                        onChange={(val) => setFormData({ ...formData, payment_channel: val })}
                        placeholder="Pilih rekening tujuan..."
                        allowClear={false}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Harga hewan per ekor</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedPackage ? formatCurrencyValue(packageBasePrice) : ""}
                        className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700"
                        placeholder="Pilih paket terlebih dahulu"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Administrasi</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedPackage ? formatCurrencyValue(packageAdminFee) : ""}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700 ${selectedPackage?.packageType === "shared" ? "" : ""}`}
                        placeholder="Menunggu paket dipilih"
                      />
                      {selectedPackage && selectedPackage.packageType === "shared" && (
                        <p className="text-xs text-gray-500 mt-1">
                          Dibagi {selectedPackage.maxSlots || 1} slot (paket patungan).
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Total Harga *</label>
                      <input
                        type="number"
                        required
                        value={formData.total_amount}
                        onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Jumlah Terbayar *</label>
                      <input
                        type="number"
                        required
                        value={formData.paid_amount}
                        onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Default sama dengan Total Harga</p>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Bukti Transfer</label>
                      <div className="flex gap-2">
                        {formData.payment_proof_url ? (
                          <div className="flex items-center gap-3 flex-1 bg-gray-50 rounded-lg p-2">
                            <img
                              src={formData.payment_proof_url}
                              alt="Bukti Transfer"
                              className="h-16 w-16 object-cover rounded"
                            />
                            <span className="text-sm text-gray-600 truncate flex-1">
                              {formData.payment_proof_url.split("/").pop()}
                            </span>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, payment_proof_url: "" })}
                              className="text-danger-500 hover:text-danger-700"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowMediaLibrary(true)}
                            className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-gray-50 w-full justify-center"
                          >
                            <Image className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-600">Pilih Bukti Transfer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1">Catatan</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Catatan tambahan..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !formData.donatur_id || !formData.package_id}
                  className="btn-primary"
                >
                  {createMutation.isPending ? "Menyimpan..." : "Simpan Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Donatur Modal - Using DonorModal Helper */}
      <DonorModal
        isOpen={showAddDonaturModal}
        onClose={() => setShowAddDonaturModal(false)}
        onSuccess={handleDonorSuccess}
        zIndex={1060}
        disablePassword={true}
      />

      {/* Media Library for Payment Proof */}
      <MediaLibrary
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={(url) => {
          setFormData({ ...formData, payment_proof_url: url });
          setShowMediaLibrary(false);
        }}
        selectedUrl={formData.payment_proof_url}
        accept="image/*"
        category="financial"
      />

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
