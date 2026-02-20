"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Wallet, Eye, X, TrendingUp, Plus, Check, XCircle, ArrowRight, UserPlus, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import api from "@/lib/api";
import DonorModal from "@/components/modals/DonorModal";
import Autocomplete from "@/components/Autocomplete";
import Pagination from "@/components/Pagination";
import { formatRupiah } from "@/lib/format";
import FeedbackDialog from "@/components/FeedbackDialog";
import { useAuth } from "@/lib/auth";

interface Savings {
  id: string;
  savingsNumber: string;
  userId: string;
  targetPeriodId: string;
  targetPackageId: string | null;
  targetAmount: number;
  currentAmount: number;
  installmentAmount: number;
  installmentFrequency: "weekly" | "monthly" | "custom";
  installmentDay: number | null;
  status: "active" | "paused" | "completed" | "converted" | "cancelled";
  convertedOrderId: string | null;
  createdAt: string;
  donorName?: string;
  donorPhone?: string;
  donorEmail?: string;
  periodName?: string;
  packageName?: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function QurbanSavingsPage() {
  const { user } = useAuth();
  const isMitra = user?.roles?.includes("mitra") && user.roles.length === 1;
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [showAddSavingsModal, setShowAddSavingsModal] = useState(false);
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [selectedDonaturId, setSelectedDonaturId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [savingsFormData, setSavingsFormData] = useState({
    userId: "",
    donorName: "",
    donorPhone: "",
    donorEmail: "",
    targetPeriodId: "",
    targetPackageId: "",
    targetAmount: "",
    installmentCount: 6,
    installmentAmount: "",
    installmentFrequency: "monthly" as "weekly" | "monthly" | "custom",
    installmentDay: "",
    startDate: new Date().toISOString().split('T')[0],
    notes: "",
  });
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, type: "success", title: "" });

  // Fetch periods for filter
  const { data: periods = [] } = useQuery({
    queryKey: ["qurban-periods-list"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/periods");
      const result = response.data?.data || response.data;
      return Array.isArray(result) ? result : [];
    },
  });

  // Fetch donatur list
  const { data: donaturList = [] } = useQuery({
    queryKey: ["donatur-list"],
    queryFn: async () => {
      const response = await api.get("/admin/donatur");
      return response.data.data || response.data;
    },
    enabled: !isMitra && showAddSavingsModal,
  });

  // Fetch bank accounts
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
    enabled: !isMitra && showAddSavingsModal,
  });

  // Fetch savings
  const { data: savings = [], isLoading } = useQuery<Savings[]>({
    queryKey: ["qurban-savings", filterStatus, filterPeriod],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterPeriod) params.append("period_id", filterPeriod);

      const response = await api.get(`/admin/qurban/savings?${params.toString()}`);
      return response.data.data || response.data;
    },
  });

  // Fetch pending deposits count
  const { data: pendingCount = 0 } = useQuery<number>({
    queryKey: ["qurban-pending-count"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/savings/transactions/pending");
      return response.data.data?.length || 0;
    },
    refetchInterval: 30000, // Auto refresh every 30s
    enabled: !isMitra,
  });

  // Fetch settings (amil/admin fees)
  const { data: groupedSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get("/admin/settings");
      return response.data?.data || {};
    },
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !isMitra && showAddSavingsModal,
  });

  // Autocomplete options
  const donaturOptions = donaturList.map((donatur: any) => ({
    value: donatur.id,
    label: `${donatur.name} - ${donatur.phone}`,
  }));

  const paymentChannelOptions = [
    ...bankAccounts.map(acc => ({
      value: `bank_${acc.id}`,
      label: `${acc.bankName} - ${acc.accountNumber} (${acc.accountName})`,
    })),
    { value: "qris", label: "QRIS" },
    { value: "cash", label: "Tunai / Cash" },
  ];

  // Fetch packages for selected period
  const { data: packages = [] } = useQuery({
    queryKey: ["qurban-packages", savingsFormData.targetPeriodId],
    queryFn: async () => {
      if (!savingsFormData.targetPeriodId) return [];
      const response = await api.get(`/admin/qurban/packages?period_id=${savingsFormData.targetPeriodId}`);
      return response.data.data || response.data;
    },
    enabled: !!savingsFormData.targetPeriodId && !isMitra,
  });

  // Admin fee settings (amil)
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
    () => packages.find((pkg: any) => pkg.id === savingsFormData.targetPackageId),
    [packages, savingsFormData.targetPackageId]
  );

  const calculateAdminFee = (pkg?: any) => {
    if (!pkg) return 0;
    const baseFee = pkg.animalType === "cow" ? adminQurbanSapi : adminQurbanPerEkor;
    const divisor = pkg.packageType === "shared" ? pkg.maxSlots || 1 : 1;
    return baseFee / divisor;
  };

  const getPackagePrice = (pkg?: any): number => {
    if (!pkg) return 0;
    return Number(pkg.periods?.[0]?.price) || 0;
  };

  const packageAdminFee = calculateAdminFee(selectedPackage);
  const packageBasePrice = getPackagePrice(selectedPackage);
  const packageTotalWithAdmin = selectedPackage ? packageBasePrice + packageAdminFee : Number(savingsFormData.targetAmount) || 0;

  // Auto-calculate installment amount
  const calculatedInstallmentAmount = useMemo(() => {
    const total = Number(savingsFormData.targetAmount) || 0;
    const count = savingsFormData.installmentCount || 1;
    return count > 0 ? Math.ceil(total / count) : 0;
  }, [savingsFormData.targetAmount, savingsFormData.installmentCount]);

  useEffect(() => {
    if (!selectedPackage) return;
    setSavingsFormData((prev) => ({
      ...prev,
      targetAmount: packageTotalWithAdmin.toString(),
    }));
  }, [selectedPackage, packageTotalWithAdmin]);

  // Handle donatur selection from autocomplete
  const handleDonaturChange = (donaturId: string) => {
    setSelectedDonaturId(donaturId);
    const donatur = donaturList.find((d: any) => d.id === donaturId);
    if (donatur) {
      setSavingsFormData({
        ...savingsFormData,
        userId: "", // Donatur table is separate from users table, so we don't set userId
        donorName: donatur.name,
        donorPhone: donatur.phone,
        donorEmail: donatur.email || "",
      });
    }
  };

  // Handle donor success from DonorModal
  const handleDonorSuccess = (donor: any) => {
    setSelectedDonaturId(donor.id);
    setSavingsFormData({
      ...savingsFormData,
      userId: "", // Donatur table is separate from users table
      donorName: donor.name,
      donorPhone: donor.phone,
      donorEmail: donor.email || "",
    });
    setShowDonorModal(false);
  };

  // Create new savings
  const handleCreateSavings = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!savingsFormData.donorName || !savingsFormData.donorPhone) {
      setFeedback({
        open: true,
        type: "error",
        title: "Data belum lengkap",
        message: "Silakan pilih donatur terlebih dahulu.",
      });
      return;
    }

    try {
      // Convert numeric fields to numbers
      const payload = {
        ...savingsFormData,
        userId: null, // Always null since donatur table is separate from users table
        targetAmount: Number(savingsFormData.targetAmount),
        installmentCount: savingsFormData.installmentCount,
        installmentAmount: calculatedInstallmentAmount,
        installmentDay: savingsFormData.installmentDay ? Number(savingsFormData.installmentDay) : null,
      };

      console.log("Creating savings with payload:", payload);
      await api.post("/admin/qurban/savings", payload);
      queryClient.invalidateQueries({ queryKey: ["qurban-savings"] });
      setShowAddSavingsModal(false);
      setSelectedDonaturId("");
      setSavingsFormData({
        userId: "",
        donorName: "",
        donorPhone: "",
        donorEmail: "",
        targetPeriodId: "",
        targetPackageId: "",
        targetAmount: "",
        installmentCount: 6,
        installmentAmount: "",
        installmentFrequency: "monthly",
        installmentDay: "",
        startDate: new Date().toISOString().split('T')[0],
        notes: "",
      });
      setFeedback({
        open: true,
        type: "success",
        title: "Tabungan dibuat",
        message: "Tabungan qurban berhasil dibuat.",
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Gagal membuat tabungan";
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal membuat tabungan",
        message: errorMsg,
      });
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-success-50 text-success-700",
      paused: "bg-warning-50 text-warning-700",
      completed: "bg-info-50 text-info-700",
      converted: "bg-accent-50 text-accent-700",
      cancelled: "bg-danger-50 text-danger-700",
      pending: "bg-warning-50 text-warning-700",
      verified: "bg-success-50 text-success-700",
      rejected: "bg-danger-50 text-danger-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Aktif",
      paused: "Dijeda",
      completed: "Selesai",
      converted: "Terkonversi",
      cancelled: "Dibatalkan",
      pending: "Pending",
      verified: "Terverifikasi",
      rejected: "Ditolak",
      weekly: "Mingguan",
      monthly: "Bulanan",
      custom: "Custom",
    };
    return labels[status] || status;
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // Pagination logic
  const totalItems = savings.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSavings = savings.slice(startIndex, endIndex);

  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const periodOptions = [
    { value: "", label: "Semua Periode" },
    ...periods.map((period: any) => ({
      value: period.id,
      label: period.name,
    })),
  ];

  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "active", label: "Aktif" },
    { value: "paused", label: "Dijeda" },
    { value: "completed", label: "Selesai" },
    { value: "converted", label: "Terkonversi" },
    { value: "cancelled", label: "Dibatalkan" },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Tabungan Qurban
          </h1>
          <p className="text-sm text-gray-600 mt-1">Kelola tabungan qurban donatur</p>
        </div>
        <div className="flex gap-3 items-center">
          {!isMitra && (
            <Link
              href="/dashboard/qurban/savings/pending-deposits"
              className="btn btn-md relative"
              style={{ backgroundColor: "#d2aa55", color: "white" }}
            >
              <CheckCircle className="h-4 w-4" />
              Verifikasi Setoran
              {pendingCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-danger-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </Link>
          )}
          {!isMitra && (
            <button
              onClick={() => setShowAddSavingsModal(true)}
              className="btn btn-primary btn-md"
            >
              <Plus className="h-4 w-4" />
              Tambah Tabungan
            </button>
          )}
          <div className="bg-info-50 border border-info-200 text-info-700 px-4 py-2 rounded-lg">
            <span className="font-semibold">{savings.filter(s => s.status === "active").length}</span> aktif
          </div>
          <div className="bg-accent-50 border border-accent-200 text-accent-700 px-4 py-2 rounded-lg">
            <span className="font-semibold">{savings.filter(s => s.status === "completed").length}</span> selesai
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <Autocomplete
          options={periodOptions}
          value={filterPeriod}
          onChange={handleFilterChange(setFilterPeriod)}
          placeholder="Semua Periode"
        />
        <Autocomplete
          options={statusOptions}
          value={filterStatus}
          onChange={handleFilterChange(setFilterStatus)}
          placeholder="Semua Status"
        />
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="sortable">No. Tabungan</th>
                <th className="sortable">Penabung</th>
                <th className="sortable">Target</th>
                <th className="sortable">Progress</th>
                <th className="sortable">Cicilan</th>
                <th className="sortable">Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSavings.map((saving) => {
                const progress = calculateProgress(saving.currentAmount, saving.targetAmount);
                return (
                  <tr key={saving.id}>
                    <td>
                      <div>
                        <div className="mono text-sm text-gray-900">{saving.savingsNumber}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(saving.createdAt), "dd MMM yyyy", { locale: id })}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="font-medium text-gray-900">{saving.donorName}</div>
                        <div className="text-sm text-gray-600">{saving.donorPhone}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="font-medium text-gray-900">{saving.periodName}</div>
                        {saving.packageName && (
                          <div className="text-sm text-gray-600">{saving.packageName}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-success-600 font-semibold mono">
                            Rp {formatRupiah(saving.currentAmount)}
                          </span>
                          <span className="text-gray-500 mono">
                            Rp {formatRupiah(saving.targetAmount)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-success-500 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">{progress}%</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="font-medium mono text-sm">Rp {formatRupiah(saving.installmentAmount)}</div>
                        <div className="text-xs text-gray-500">
                          {saving.installmentAmount && saving.targetAmount ? `${Math.ceil(saving.targetAmount / saving.installmentAmount)}x cicilan` : ''} · {getStatusLabel(saving.installmentFrequency)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(saving.status)}`}>
                        {getStatusLabel(saving.status)}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          href={`/dashboard/qurban/savings/${saving.id}`}
                          className="action-btn action-view"
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="table-mobile-cards">
            {paginatedSavings.map((saving) => {
              const progress = calculateProgress(saving.currentAmount, saving.targetAmount);
              return (
                <div key={saving.id} className="table-card">
                  <div className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title mono">{saving.savingsNumber}</div>
                      <div className="table-card-header-subtitle">{saving.donorName}</div>
                    </div>
                    <span className={`table-card-header-badge ${getStatusColor(saving.status)}`}>
                      {getStatusLabel(saving.status)}
                    </span>
                  </div>

                  <div className="table-card-row">
                    <span className="table-card-row-label">Tanggal</span>
                    <span className="table-card-row-value">
                      {format(new Date(saving.createdAt), "dd MMM yyyy", { locale: id })}
                    </span>
                  </div>

                  <div className="table-card-row">
                    <span className="table-card-row-label">Telepon</span>
                    <span className="table-card-row-value">{saving.donorPhone}</span>
                  </div>

                  <div className="table-card-row">
                    <span className="table-card-row-label">Target</span>
                    <span className="table-card-row-value">
                      {saving.periodName}
                      {saving.packageName && (
                        <div className="text-xs text-gray-500 mt-1">{saving.packageName}</div>
                      )}
                    </span>
                  </div>

                  <div className="table-card-row">
                    <span className="table-card-row-label">Progress</span>
                    <span className="table-card-row-value">
                      <div className="space-y-1 w-full">
                        <div className="flex justify-between text-sm mono">
                          <span className="text-success-600 font-semibold">
                            Rp {formatRupiah(saving.currentAmount)}
                          </span>
                          <span className="text-gray-500">
                            Rp {formatRupiah(saving.targetAmount)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-success-500 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">{progress}%</div>
                      </div>
                    </span>
                  </div>

                  <div className="table-card-row">
                    <span className="table-card-row-label">Cicilan</span>
                    <span className="table-card-row-value mono font-semibold">
                      Rp {formatRupiah(saving.installmentAmount)}
                      <div className="text-xs text-gray-500 font-normal">
                        {saving.installmentAmount && saving.targetAmount ? `${Math.ceil(saving.targetAmount / saving.installmentAmount)}x cicilan` : ''} · {getStatusLabel(saving.installmentFrequency)}
                      </div>
                    </span>
                  </div>

                  <div className="table-card-footer">
                    <Link
                      href={`/dashboard/qurban/savings/${saving.id}`}
                      className="action-btn action-view"
                      title="Lihat Detail"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {savings.length === 0 && (
            <div className="text-center py-8 text-gray-500">Tidak ada data tabungan</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Add Savings Modal */}
      {showAddSavingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Tambah Tabungan Baru</h2>
              <button
                onClick={() => {
                  setShowAddSavingsModal(false);
                  setSelectedDonaturId("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSavings} className="space-y-4">
              {/* Donor Info */}
              <div className="border-b pb-4">
                <h4 className="font-medium mb-3">Informasi Penabung</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Pilih Donatur *</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Autocomplete
                          options={donaturOptions}
                          value={selectedDonaturId}
                          onChange={handleDonaturChange}
                          placeholder="Cari donatur..."
                          allowClear={false}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDonorModal(true)}
                        className="btn btn-secondary btn-md flex items-center gap-1 whitespace-nowrap"
                      >
                        <UserPlus className="h-4 w-4" />
                        Baru
                      </button>
                    </div>
                    {!savingsFormData.donorName && (
                      <p className="text-xs text-red-600 mt-1">* Wajib pilih donatur dari list atau klik tombol "Baru"</p>
                    )}
                  </div>
                  {savingsFormData.donorName && (
                    <div className="grid grid-cols-2 gap-4 bg-success-50 border border-success-200 p-3 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500">Nama</p>
                        <p className="font-medium">{savingsFormData.donorName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Telepon</p>
                        <p>{savingsFormData.donorPhone || "-"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Email</p>
                        <p>{savingsFormData.donorEmail || "-"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Target Info */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Target Tabungan</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Periode *</label>
                    <select
                      required
                      value={savingsFormData.targetPeriodId}
                      onChange={(e) => setSavingsFormData({ ...savingsFormData, targetPeriodId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Pilih Periode</option>
                      {periods.map((period: any) => (
                        <option key={period.id} value={period.id}>
                          {period.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Paket (Opsional)</label>
                    <Autocomplete
                      options={packages.map((pkg: any) => ({
                        value: pkg.id,
                        label: `${pkg.name} - Rp ${formatRupiah(getPackagePrice(pkg))}`,
                      }))}
                      value={savingsFormData.targetPackageId}
                      onChange={(value) => {
                        const pkg = packages.find((p: any) => p.id === value);
                        const price = getPackagePrice(pkg);
                        setSavingsFormData({
                          ...savingsFormData,
                          targetPackageId: value,
                          targetAmount: pkg ? String(price + calculateAdminFee(pkg)) : savingsFormData.targetAmount,
                        });
                      }}
                      placeholder="Pilih Paket"
                      disabled={!savingsFormData.targetPeriodId}
                    />
                  </div>
                  {selectedPackage && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Subtotal</label>
                        <input
                          type="text"
                          readOnly
                          value={`Rp ${formatRupiah(packageBasePrice)}`}
                          className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Administrasi</label>
                        <input
                          type="text"
                          readOnly
                          value={`Rp ${formatRupiah(packageAdminFee)}`}
                          className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700"
                        />
                        {selectedPackage.packageType === "shared" && (
                          <p className="text-xs text-gray-500 mt-1">
                            Dibagi {selectedPackage.maxSlots || 1} slot (paket patungan).
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Total</label>
                        <input
                          type="number"
                          required
                          value={savingsFormData.targetAmount}
                          onChange={(e) => setSavingsFormData({ ...savingsFormData, targetAmount: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </>
                  )}
                  {!selectedPackage && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Total</label>
                      <input
                        type="number"
                        required
                        value={savingsFormData.targetAmount}
                        onChange={(e) => setSavingsFormData({ ...savingsFormData, targetAmount: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Installment Info */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Rencana Cicilan</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Frekuensi *</label>
                    <select
                      required
                      value={savingsFormData.installmentFrequency}
                      onChange={(e) => setSavingsFormData({ ...savingsFormData, installmentFrequency: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="weekly">Mingguan</option>
                      <option value="monthly">Bulanan</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Jumlah Cicilan *</label>
                    <select
                      required
                      value={savingsFormData.installmentCount}
                      onChange={(e) => setSavingsFormData({ ...savingsFormData, installmentCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value={3}>3 kali</option>
                      <option value={6}>6 kali</option>
                      <option value={12}>12 kali</option>
                      <option value={24}>24 kali</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Tentukan berapa kali cicilan</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Nominal per Cicilan (Auto)</label>
                    <input
                      type="text"
                      readOnly
                      value={`Rp ${formatRupiah(calculatedInstallmentAmount)}`}
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-900 font-semibold"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Rp {formatRupiah(Number(savingsFormData.targetAmount) || 0)} ÷ {savingsFormData.installmentCount} kali = Rp {formatRupiah(calculatedInstallmentAmount)}/cicilan
                    </p>
                  </div>
                  {savingsFormData.installmentFrequency === 'monthly' && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Tanggal Cicilan</label>
                      <Autocomplete
                        options={Array.from({ length: 28 }, (_, i) => ({
                          value: String(i + 1),
                          label: `Tanggal ${i + 1}`,
                        }))}
                        value={savingsFormData.installmentDay}
                        onChange={(value) => setSavingsFormData({ ...savingsFormData, installmentDay: value })}
                        placeholder="Pilih tanggal"
                      />
                    </div>
                  )}
                  {savingsFormData.installmentFrequency === 'weekly' && (
                    <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Cicilan Mingguan:</strong> Notifikasi akan dikirim setiap hari <strong>Senin</strong>
                      </p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Catatan</label>
                    <textarea
                      value={savingsFormData.notes}
                      onChange={(e) => setSavingsFormData({ ...savingsFormData, notes: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSavingsModal(false);
                    setSelectedDonaturId("");
                  }}
                  className="btn btn-ghost btn-md"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!savingsFormData.donorName || !savingsFormData.targetPeriodId || !savingsFormData.targetAmount}
                  className="btn btn-primary btn-md"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Donor Modal */}
      <DonorModal
        isOpen={showDonorModal}
        onClose={() => setShowDonorModal(false)}
        onSuccess={handleDonorSuccess}
        zIndex={1060}
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
