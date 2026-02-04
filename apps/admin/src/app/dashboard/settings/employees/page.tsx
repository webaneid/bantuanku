"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SettingsLayout from "@/components/SettingsLayout";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { UserPlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  position: string;
  department: string | null;
  phone: string | null;
  isActive: boolean;
  userId: string | null;
  createdAt: string;
}

interface Role {
  id: string;
  slug: string;
  name: string;
  description?: string;
}

export default function EmployeesActivationPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    roleSlug: "",
  });

  // Fetch unactivated employees
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["unactivated-employees"],
    queryFn: async () => {
      const response = await api.get("/admin/employees/unactivated/list");
      return response.data?.data || [];
    },
  });

  // Fetch roles
  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await api.get("/admin/roles");
      return response.data?.data || [];
    },
  });

  // Get admin roles only (exclude user role)
  const adminRoles = rolesData?.filter(
    (role: Role) => role.slug !== "user"
  ) || [];

  // Activate employee mutation
  const activateMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; roleSlug: string }) => {
      return api.post(`/admin/employees/${selectedEmployee?.id}/activate-user`, data);
    },
    onSuccess: (response) => {
      toast.success(`${selectedEmployee?.name} berhasil diaktivasi sebagai user!`);
      queryClient.invalidateQueries({ queryKey: ["unactivated-employees"] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal mengaktivasi employee");
    },
  });

  const openActivateModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      email: employee.email || "",
      password: "",
      confirmPassword: "",
      roleSlug: "program_coordinator", // Default to program coordinator
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      roleSlug: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email) {
      toast.error("Email wajib diisi");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Password dan konfirmasi password tidak sama");
      return;
    }

    if (!formData.roleSlug) {
      toast.error("Role wajib dipilih");
      return;
    }

    activateMutation.mutate({
      email: formData.email,
      password: formData.password,
      roleSlug: formData.roleSlug,
    });
  };

  return (
    <SettingsLayout>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Aktivasi Karyawan</h2>
            <p className="text-sm text-gray-600 mt-1">
              Aktifkan karyawan sebagai user untuk memberikan akses ke admin panel
            </p>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : employeesData && employeesData.length > 0 ? (
            <div className="space-y-3">
              {employeesData.map((employee: Employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-medium text-gray-900">{employee.name}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
                        Belum Diaktivasi
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {employee.position}
                      {employee.department && ` · ${employee.department}`}
                    </p>
                    {employee.email && (
                      <p className="text-xs text-gray-500 mt-1">{employee.email}</p>
                    )}
                    {employee.phone && (
                      <p className="text-xs text-gray-500">{employee.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openActivateModal(employee)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                      Aktifkan sebagai User
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success-100 rounded-full mb-4">
                <UserPlusIcon className="w-8 h-8 text-success-600" />
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-1">
                Semua Karyawan Sudah Diaktivasi
              </h3>
              <p className="text-sm text-gray-600">
                Tidak ada karyawan yang perlu diaktivasi saat ini
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Activate Employee Modal */}
      {isModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Aktifkan Karyawan sebagai User
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900">{selectedEmployee.name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedEmployee.position}
                    {selectedEmployee.department && ` · ${selectedEmployee.department}`}
                  </p>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Email untuk Login <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email ini akan digunakan untuk login ke admin panel
                  </p>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Password <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimal 8 karakter"
                    required
                    minLength={8}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Konfirmasi Password <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    placeholder="Ketik ulang password"
                    required
                    minLength={8}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Role Akses <span className="text-danger-500">*</span>
                  </label>
                  <select
                    className="form-input"
                    value={formData.roleSlug}
                    onChange={(e) => setFormData({ ...formData, roleSlug: e.target.value })}
                    required
                  >
                    <option value="">Pilih Role</option>
                    {adminRoles.map((role: Role) => (
                      <option key={role.id} value={role.slug}>
                        {role.name}
                        {role.description && ` - ${role.description}`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Role menentukan akses dan permission di admin panel
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-800">
                    <strong>Catatan:</strong> Setelah diaktivasi, karyawan dapat login ke admin
                    panel menggunakan email dan password yang Anda tentukan.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  onClick={closeModal}
                  disabled={activateMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-md"
                  disabled={activateMutation.isPending}
                >
                  {activateMutation.isPending ? "Mengaktivasi..." : "Aktifkan User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}
