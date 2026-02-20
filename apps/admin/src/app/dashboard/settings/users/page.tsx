"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SettingsLayout from "@/components/SettingsLayout";
import api from "@/lib/api";
import { PlusIcon, PencilIcon, TrashIcon, KeyIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import FeedbackDialog from "@/components/FeedbackDialog";
import EmployeeModal from "@/components/modals/EmployeeModal";

interface User {
  id: string;
  name: string;
  email: string;
  roleIds?: string[];
  isActive: boolean;
  createdAt: string;
}

interface Role {
  id: string;
  slug: string;
  name: string;
  description?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string;
  department: string | null;
  userId?: string | null;
}

export default function UsersSettingsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<"normal" | "employee">("normal");
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  const showFeedback = (type: "success" | "error", title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
    isActive: true,
    employeeId: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["settings-users"],
    queryFn: async () => {
      const response = await api.get("/admin/users");
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

  // Only these roles should appear on this page
  const allowedSlugs = ["super_admin", "admin_campaign", "admin_finance", "program_coordinator"];

  // Get admin roles only (for the role dropdown)
  const adminRoles = rolesData?.filter(
    (role: Role) => allowedSlugs.includes(role.slug)
  ) || [];

  // Get allowed role IDs
  const allowedRoleIds = adminRoles.map((r: Role) => r.id);

  // Filter users to only show those with allowed roles
  const adminUsers = usersData?.filter((user: User) => {
    if (!user.roleIds || user.roleIds.length === 0) return false;
    return user.roleIds.some((id: string) => allowedRoleIds.includes(id));
  }) || [];

  // Fetch all active employees (for "Buat dari Employee" flow)
  const { data: allEmployeesData } = useQuery({
    queryKey: ["employees-active-for-users"],
    queryFn: async () => {
      const response = await api.get("/admin/employees?status=active&limit=1000");
      return response.data?.data || [];
    },
  });

  // Get employee role ID
  const employeeRoleId = rolesData?.find((r: Role) => r.slug === "employee")?.id;

  // Filter: show employees that are either unactivated OR activated with "employee" role only
  const employeesData = allEmployeesData?.filter((emp: Employee) => {
    if (!emp.userId) return true; // unactivated - can create user
    // Already activated: only show if their current role is "employee" (eligible for promotion)
    const user = usersData?.find((u: User) => u.id === emp.userId);
    if (!user) return false;
    return user.roleIds?.length === 1 && user.roleIds[0] === employeeRoleId;
  }) || [];

  // Helper to check if selected employee already has a user account
  const selectedEmployeeHasUser = (() => {
    if (!formData.employeeId || createMode !== "employee") return false;
    const emp = allEmployeesData?.find((e: Employee) => e.id === formData.employeeId);
    return !!emp?.userId;
  })();

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { mode: "normal" | "employee" }) => {
      if (data.mode === "employee" && data.employeeId) {
        const role = rolesData?.find((r: Role) => r.id === data.roleId);
        if (!role) {
          throw new Error("Role not found");
        }

        // Check if employee already has user account → change role instead
        const emp = allEmployeesData?.find((e: Employee) => e.id === data.employeeId);
        if (emp?.userId) {
          return api.put(`/admin/employees/${data.employeeId}/change-role`, {
            roleSlug: role.slug,
          });
        }

        // Otherwise, activate new user
        return api.post(`/admin/employees/${data.employeeId}/activate-user`, {
          email: data.email,
          password: data.password,
          roleSlug: role.slug,
        });
      }

      // Otherwise, create normal user
      return api.post("/admin/users", {
        name: data.name,
        email: data.email,
        password: data.password,
        isActive: data.isActive,
        roleIds: data.roleId ? [data.roleId] : [],
      });
    },
    onSuccess: (response, variables) => {
      if (variables.mode === "employee") {
        const emp = allEmployeesData?.find((e: Employee) => e.id === variables.employeeId);
        if (emp?.userId) {
          showFeedback("success", "Berhasil", "Role employee berhasil diubah!");
        } else {
          showFeedback("success", "Berhasil", "Employee berhasil diaktivasi sebagai user!");
        }
        queryClient.invalidateQueries({ queryKey: ["employees-active-for-users"] });
      } else {
        showFeedback("success", "Berhasil", "User berhasil dibuat!");
      }
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
      closeModal();
    },
    onError: (error: any) => {
      showFeedback(
        "error",
        "Gagal",
        error.response?.data?.error || error.response?.data?.message || "Gagal membuat user"
      );
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return api.put(`/admin/users/${id}`, data);
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      showFeedback("success", "Berhasil", "User berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
    },
    onError: (error: any) => {
      showFeedback(
        "error",
        "Gagal",
        error.response?.data?.message || "Gagal menghapus user"
      );
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      return api.put(`/admin/users/${id}/password`, { password });
    },
    onSuccess: () => {
      showFeedback("success", "Berhasil", "Password berhasil diubah!");
      closePasswordModal();
    },
    onError: (error: any) => {
      showFeedback(
        "error",
        "Gagal",
        error.response?.data?.message || "Gagal mengubah password"
      );
    },
  });

  const openCreateModal = (mode: "normal" | "employee" = "normal") => {
    setEditingUser(null);
    setCreateMode(mode);
    setFormData({
      name: "",
      email: "",
      password: "",
      roleId: "",
      isActive: true,
      employeeId: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      roleId: user.roleIds?.[0] || "",
      isActive: user.isActive,
      employeeId: "",
    });
    setIsModalOpen(true);
  };

  const getCurrentUserRole = () => {
    // Get current user's role from local storage or context
    // For now, we'll check if any user has super_admin role
    // In production, this should come from auth context
    return "super_admin"; // TODO: Get from auth context
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      roleId: "",
      isActive: true,
      employeeId: "",
    });
  };

  const openPasswordModal = (userId: string) => {
    setSelectedUserId(userId);
    setPasswordForm({
      password: "",
      confirmPassword: "",
    });
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setSelectedUserId(null);
    setPasswordForm({
      password: "",
      confirmPassword: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      // Update - don't send password if empty
      const updateData: any = {
        name: formData.name,
        isActive: formData.isActive,
      };

      try {
        // Update user basic info
        await updateMutation.mutateAsync({ id: editingUser.id, data: updateData });

        // Update roles separately
        if (formData.roleId) {
          await api.patch(`/admin/users/${editingUser.id}/roles`, {
            roleIds: [formData.roleId],
          });
        }

        showFeedback("success", "Berhasil", "User berhasil diperbarui!");
        queryClient.invalidateQueries({ queryKey: ["settings-users"] });
        closeModal();
      } catch (error: any) {
        showFeedback(
          "error",
          "Gagal",
          error.response?.data?.message || "Gagal memperbarui user"
        );
      }
    } else {
      if (createMode === "employee" && !formData.employeeId) {
        showFeedback("error", "Validasi", "Pilih employee terlebih dahulu");
        return;
      }

      // Password & email only required for new user creation (not role change)
      if (!selectedEmployeeHasUser) {
        if (!formData.password) {
          showFeedback("error", "Validasi", "Password wajib diisi untuk user baru");
          return;
        }

        if (formData.password.length < 8) {
          showFeedback("error", "Validasi", "Password minimal 8 karakter");
          return;
        }

        if (!formData.email) {
          showFeedback("error", "Validasi", "Email wajib diisi");
          return;
        }
      }

      createMutation.mutate({ ...formData, mode: createMode });
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.password !== passwordForm.confirmPassword) {
      showFeedback("error", "Validasi", "Password dan konfirmasi password tidak sama");
      return;
    }

    if (passwordForm.password.length < 6) {
      showFeedback("error", "Validasi", "Password minimal 6 karakter");
      return;
    }

    if (selectedUserId) {
      changePasswordMutation.mutate({
        id: selectedUserId,
        password: passwordForm.password,
      });
    }
  };

  const handleDelete = (user: User) => {
    // Prevent deleting Super Admin
    const isSuperAdmin = user.roleIds?.some(roleId => {
      const role = rolesData?.find((r: Role) => r.id === roleId);
      return role?.slug === 'super_admin';
    });

    if (isSuperAdmin) {
      showFeedback("error", "Gagal", "Super Admin tidak dapat dihapus!");
      return;
    }

    setDeleteTargetUser(user);
  };

  const closeDeleteModal = () => {
    setDeleteTargetUser(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetUser) return;
    deleteMutation.mutate(deleteTargetUser.id);
    closeDeleteModal();
  };

  const getRoleDisplayName = (roleIds?: string[]) => {
    if (!roleIds || roleIds.length === 0) return "No Role";
    const role = rolesData?.find((r: Role) => r.id === roleIds[0]);
    return role?.name || roleIds[0];
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employeesData?.find((e: Employee) => e.id === employeeId);
    if (employee) {
      setFormData({
        ...formData,
        employeeId: employeeId,
        name: employee.name,
        email: employee.email || "",
      });
    } else {
      setFormData({
        ...formData,
        employeeId: "",
      });
    }
  };

  const handleEmployeeModalSuccess = (createdId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["employees-active-for-users"] });
    setIsEmployeeModalOpen(false);
    if (createdId) {
      // Auto-select the newly created employee after refetch
      setTimeout(() => {
        handleEmployeeSelect(createdId);
      }, 500);
    }
  };

  return (
    <>
    <SettingsLayout>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manage Users</h2>
            <p className="text-sm text-gray-600 mt-1">Kelola user yang dapat mengakses admin panel</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openCreateModal("employee")}
              className="btn btn-secondary btn-sm"
            >
              <UserPlusIcon className="w-4 h-4" />
              Buat dari Employee
            </button>
            <button
              type="button"
              onClick={() => openCreateModal("normal")}
              className="btn btn-primary btn-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Buat User Baru
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : adminUsers.length > 0 ? (
            <div className="space-y-3">
              {adminUsers.map((user: User) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-medium text-gray-900">{user.name}</h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive
                            ? "bg-success-100 text-success-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Role: <span className="font-medium">{getRoleDisplayName(user.roleIds)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openPasswordModal(user.id)}
                      className="action-btn action-edit"
                      title="Change Password"
                    >
                      <KeyIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(user)}
                      className="action-btn action-edit"
                      title="Edit User"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(user)}
                      className={`action-btn action-delete ${
                        user.roleIds?.some(roleId => {
                          const role = rolesData?.find((r: Role) => r.id === roleId);
                          return role?.slug === 'super_admin';
                        }) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title={
                        user.roleIds?.some(roleId => {
                          const role = rolesData?.find((r: Role) => r.id === roleId);
                          return role?.slug === 'super_admin';
                        }) ? 'Super Admin tidak dapat dihapus' : 'Delete User'
                      }
                      disabled={user.roleIds?.some(roleId => {
                        const role = rolesData?.find((r: Role) => r.id === roleId);
                        return role?.slug === 'super_admin';
                      })}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Belum ada user</div>
          )}
        </div>
      </div>

      {/* Create/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? "Edit User" : selectedEmployeeHasUser ? "Ubah Role Employee" : "Tambah User"}
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {!editingUser && createMode === "employee" && (
                  <div className="form-field">
                    <label className="form-label">
                      Pilih Employee <span className="text-danger-500">*</span>
                    </label>
                    <Autocomplete
                      options={
                        employeesData?.map((employee: Employee) => ({
                          value: employee.id,
                          label: `${employee.name} - ${employee.position}${
                            employee.department ? ` · ${employee.department}` : ""
                          }${employee.userId ? " (sudah aktif)" : ""}`,
                        })) || []
                      }
                      value={formData.employeeId}
                      onChange={handleEmployeeSelect}
                      placeholder="Cari employee..."
                      allowClear={false}
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm mt-1"
                      onClick={() => setIsEmployeeModalOpen(true)}
                    >
                      <PlusIcon className="w-4 h-4" />
                      Tambah Employee
                    </button>
                    {formData.employeeId && selectedEmployeeHasUser && (
                      <p className="text-xs text-primary-600 mt-1">
                        Employee sudah punya akun dengan role &quot;Employee&quot;. Pilih role baru untuk naik pangkat.
                      </p>
                    )}
                    {formData.employeeId && !selectedEmployeeHasUser && (
                      <p className="text-xs text-success-600 mt-1">
                        ✓ Data employee dipilih, nama dan email akan otomatis terisi
                      </p>
                    )}
                    {!formData.employeeId && employeesData && employeesData.length === 0 && (
                      <p className="text-xs text-warning-600 mt-1">
                        Belum ada employee yang tersedia. Tambah employee terlebih dahulu.
                      </p>
                    )}
                  </div>
                )}

                {/* Hide name/email/password for role change (employee already has user) */}
                {!selectedEmployeeHasUser && (
                  <>
                    <div className="form-field">
                      <label className="form-label">
                        Nama Lengkap <span className="text-danger-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-input ${createMode === "employee" && formData.employeeId ? "bg-gray-50" : ""}`}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        required
                        readOnly={createMode === "employee" && !!formData.employeeId}
                      />
                      {createMode === "employee" && formData.employeeId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Nama dari employee yang dipilih
                        </p>
                      )}
                    </div>

                    {!editingUser && (
                      <div className="form-field">
                        <label className="form-label">
                          Email <span className="text-danger-500">*</span>
                        </label>
                        <input
                          type="email"
                          className={`form-input ${createMode === "employee" && formData.employeeId && formData.email ? "bg-gray-50" : ""}`}
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="john@example.com"
                          required
                          readOnly={createMode === "employee" && !!(formData.employeeId && formData.email)}
                        />
                        {createMode === "employee" && formData.employeeId && formData.email && (
                          <p className="text-xs text-gray-500 mt-1">
                            Email dari employee yang dipilih
                          </p>
                        )}
                        {createMode === "employee" && formData.employeeId && !formData.email && (
                          <p className="text-xs text-warning-600 mt-1">
                            Employee ini belum memiliki email, silakan isi email untuk login
                          </p>
                        )}
                      </div>
                    )}

                    {editingUser && (
                      <div className="form-field">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-input bg-gray-50"
                          value={formData.email}
                          disabled
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Email tidak dapat diubah
                        </p>
                      </div>
                    )}

                    {!editingUser && (
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
                          required={!editingUser}
                          minLength={8}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Password minimal 8 karakter
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="form-field">
                  <label className="form-label">
                    Role <span className="text-danger-500">*</span>
                  </label>
                  <Autocomplete
                    options={adminRoles.map((role: Role) => ({
                      value: role.id,
                      label: role.description
                        ? `${role.name} - ${role.description}`
                        : role.name,
                    }))}
                    value={formData.roleId}
                    onChange={(value) => setFormData({ ...formData, roleId: value })}
                    placeholder="Pilih Role"
                    allowClear={false}
                  />
                  {editingUser && (
                    <p className="text-xs text-gray-500 mt-1">
                      Hanya Super Admin yang dapat mengubah role
                    </p>
                  )}
                </div>

                {!selectedEmployeeHasUser && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                      User aktif
                    </label>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  onClick={closeModal}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-md"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Menyimpan..."
                    : editingUser
                    ? "Update User"
                    : selectedEmployeeHasUser
                    ? "Ubah Role"
                    : "Buat User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Ubah Password</h2>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="p-6 space-y-4">
                <div className="form-field">
                  <label className="form-label">
                    Password Baru <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Konfirmasi Password <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    placeholder="Ketik ulang password baru"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  onClick={closePasswordModal}
                  disabled={changePasswordMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-md"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? "Menyimpan..." : "Ubah Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTargetUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Hapus User</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">
                Apakah Anda yakin ingin menghapus user <span className="font-semibold">"{deleteTargetUser.name}"</span>?
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={closeDeleteModal}
                disabled={deleteMutation.isPending}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger btn-md"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>

    <FeedbackDialog
      open={feedback.open}
      type={feedback.type}
      title={feedback.title}
      message={feedback.message}
      onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
    />

    {/* Employee Modal - for creating new employee from user creation flow */}
    <EmployeeModal
      isOpen={isEmployeeModalOpen}
      onClose={() => setIsEmployeeModalOpen(false)}
      onSuccess={handleEmployeeModalSuccess}
    />
    </>
  );
}
