/**
 * @deprecated This legacy ledger create form is deprecated. Use /dashboard/disbursements/create instead.
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ArrowLeftIcon, PlusIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Autocomplete, { type AutocompleteOption } from "@/components/Autocomplete";
import VendorModal from "@/components/modals/VendorModal";
import EmployeeModal from "@/components/modals/EmployeeModal";
import ExpenseAccountModal from "@/components/modals/ExpenseAccountModal";

export default function CreateDisbursementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Redirect to new disbursement form
  useEffect(() => {
    const confirmed = confirm(
      "Halaman ini adalah sistem lama yang sudah tidak digunakan.\n\n" +
      "Gunakan sistem Disbursement terbaru untuk membuat pengeluaran baru.\n\n" +
      "Klik OK untuk dialihkan ke halaman baru, atau Cancel untuk tetap di sini (read-only)."
    );
    if (confirmed) {
      router.push("/dashboard/disbursements/create");
    }
  }, [router]);
  const [formData, setFormData] = useState({
    campaignId: "",
    amount: "",
    expenseAccountId: "",
    recipientType: "", // "vendor" or "employee"
    vendorId: "",
    employeeId: "",
    recipientName: "",
    recipientBank: "",
    recipientAccount: "",
    recipientPhone: "",
    purpose: "",
    description: "",
    notes: "",
  });

  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isExpenseAccountModalOpen, setIsExpenseAccountModalOpen] = useState(false);

  // Fetch campaigns
  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await api.get("/admin/campaigns", {
        params: { page: 1, limit: 100, status: "active" },
      });
      return response.data;
    },
  });

  // Fetch expense accounts (COA type = expense)
  const { data: coaData, refetch: refetchCOA } = useQuery({
    queryKey: ["coa-expenses"],
    queryFn: async () => {
      const response = await api.get("/admin/coa", {
        params: { type: "expense", isActive: true },
      });
      return response.data;
    },
  });

  // Fetch vendors
  const { data: vendorsData, refetch: refetchVendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const response = await api.get("/admin/vendors", {
        params: { page: 1, limit: 100, status: "active" },
      });
      return response.data;
    },
  });

  // Fetch employees
  const { data: employeesData, refetch: refetchEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const response = await api.get("/admin/employees", {
        params: { page: 1, limit: 100, status: "active" },
      });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/admin/ledger", {
        ...data,
        amount: parseFloat(data.amount),
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      router.push(`/dashboard/ledger/${data.data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const campaigns = campaignsData?.data || [];
  const expenseAccounts = coaData?.data || [];
  const vendors = vendorsData?.data || [];
  const employees = employeesData?.data || [];

  // Format options for Autocomplete
  const campaignOptions: AutocompleteOption[] = campaigns.map((campaign: any) => ({
    value: campaign.id,
    label: campaign.title,
  }));

  const expenseAccountOptions: AutocompleteOption[] = expenseAccounts.map((account: any) => ({
    value: account.id,
    label: `${account.code} - ${account.name}`,
  }));

  const recipientTypeOptions: AutocompleteOption[] = [
    { value: "vendor", label: "Vendor" },
    { value: "employee", label: "Employee" },
  ];

  const vendorOptions: AutocompleteOption[] = vendors.map((vendor: any) => ({
    value: vendor.id,
    label: vendor.name,
  }));

  const employeeOptions: AutocompleteOption[] = employees.map((employee: any) => ({
    value: employee.id,
    label: employee.name,
  }));

  // Handle recipient type change
  const handleRecipientTypeChange = (value: string) => {
    setFormData({
      ...formData,
      recipientType: value,
      vendorId: "",
      employeeId: "",
      recipientName: "",
      recipientBank: "",
      recipientAccount: "",
      recipientPhone: "",
    });
  };

  // Handle vendor selection
  const handleVendorChange = (value: string) => {
    const selectedVendor = vendors.find((v: any) => v.id === value);
    if (selectedVendor) {
      setFormData({
        ...formData,
        vendorId: value,
        recipientName: selectedVendor.name,
        recipientBank: selectedVendor.bankName || "",
        recipientAccount: selectedVendor.bankAccount || "",
        recipientPhone: selectedVendor.phone || "",
      });
    }
  };

  // Handle employee selection
  const handleEmployeeChange = (value: string) => {
    const selectedEmployee = employees.find((e: any) => e.id === value);
    if (selectedEmployee) {
      // Get first bank account if exists
      const firstBankAccount = selectedEmployee.bankAccounts?.[0];

      setFormData({
        ...formData,
        employeeId: value,
        recipientName: selectedEmployee.name,
        recipientBank: firstBankAccount?.bankName || "",
        recipientAccount: firstBankAccount?.accountNumber || "",
        recipientPhone: selectedEmployee.phone || "",
      });
    }
  };

  // Handle modal success
  const handleVendorModalSuccess = () => {
    setIsVendorModalOpen(false);
    refetchVendors();
  };

  const handleEmployeeModalSuccess = (createdId?: string) => {
    setIsEmployeeModalOpen(false);
    refetchEmployees();
    if (createdId) {
      setFormData({ ...formData, employeeId: createdId });
      // Auto-select after refetch
      setTimeout(() => {
        handleEmployeeChange(createdId);
      }, 500);
    }
  };

  const handleExpenseAccountModalSuccess = () => {
    setIsExpenseAccountModalOpen(false);
    refetchCOA();
  };

  return (
    <div className="dashboard-container">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buat Catatan Ledger</h1>
          <p className="text-gray-600 mt-1">Buat permintaan catatan dana untuk campaign</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card max-w-3xl">
        <div className="space-y-6">
          {/* Campaign */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign <span className="text-red-500">*</span>
            </label>
            <Autocomplete
              options={campaignOptions}
              value={formData.campaignId}
              onChange={(value) => setFormData({ ...formData, campaignId: value })}
              placeholder="Pilih Campaign"
              allowClear={false}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jumlah Dana <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
              <input
                type="number"
                required
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          {/* Expense Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Akun Beban <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Autocomplete
                  options={expenseAccountOptions}
                  value={formData.expenseAccountId}
                  onChange={(value) => setFormData({ ...formData, expenseAccountId: value })}
                  placeholder="Pilih Akun Beban"
                  allowClear={false}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseAccountModalOpen(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                title="Tambah Akun Beban Baru"
              >
                <PlusIcon className="w-5 h-5" />
                Tambah
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Pilih kategori beban untuk catatan ini
            </p>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tujuan Pencairan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Contoh: Biaya operasional rumah sakit"
            />
          </div>

          {/* Recipient Info */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Penerima</h3>

            <div className="space-y-4">
              {/* Recipient Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transfer ke <span className="text-red-500">*</span>
                </label>
                <Autocomplete
                  options={recipientTypeOptions}
                  value={formData.recipientType}
                  onChange={handleRecipientTypeChange}
                  placeholder="Pilih Vendor atau Employee"
                  allowClear={false}
                />
              </div>

              {/* Vendor Selection */}
              {formData.recipientType === "vendor" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Vendor <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Autocomplete
                        options={vendorOptions}
                        value={formData.vendorId}
                        onChange={handleVendorChange}
                        placeholder="Pilih Vendor"
                        allowClear={false}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsVendorModalOpen(true)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      title="Tambah Vendor Baru"
                    >
                      <PlusIcon className="w-5 h-5" />
                      Tambah
                    </button>
                  </div>
                </div>
              )}

              {/* Employee Selection */}
              {formData.recipientType === "employee" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Employee <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Autocomplete
                        options={employeeOptions}
                        value={formData.employeeId}
                        onChange={handleEmployeeChange}
                        placeholder="Pilih Employee"
                        allowClear={false}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEmployeeModalOpen(true)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      title="Tambah Employee Baru"
                    >
                      <PlusIcon className="w-5 h-5" />
                      Tambah
                    </button>
                  </div>
                </div>
              )}

              {/* Auto-filled fields (read-only when vendor/employee selected) */}
              {formData.recipientType && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Penerima <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.recipientName}
                      onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                      placeholder="Nama lengkap penerima"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank
                    </label>
                    <input
                      type="text"
                      value={formData.recipientBank}
                      onChange={(e) => setFormData({ ...formData, recipientBank: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                      placeholder="Contoh: BCA"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nomor Rekening
                    </label>
                    <input
                      type="text"
                      value={formData.recipientAccount}
                      onChange={(e) => setFormData({ ...formData, recipientAccount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                      placeholder="1234567890"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nomor Telepon
                    </label>
                    <input
                      type="tel"
                      value={formData.recipientPhone}
                      onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                      placeholder="08xxxxxxxxxx"
                      readOnly
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Detail penggunaan dana..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan Internal
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Catatan untuk tim internal..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? "Menyimpan..." : "Simpan sebagai Draft"}
            </button>
          </div>

          {createMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              Gagal membuat catatan. Silakan coba lagi.
            </div>
          )}
        </div>
      </form>

      {/* Modals */}
      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        onSuccess={handleVendorModalSuccess}
      />
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSuccess={handleEmployeeModalSuccess}
      />
      <ExpenseAccountModal
        isOpen={isExpenseAccountModalOpen}
        onClose={() => setIsExpenseAccountModalOpen(false)}
        onSuccess={handleExpenseAccountModalSuccess}
      />
    </div>
  );
}
