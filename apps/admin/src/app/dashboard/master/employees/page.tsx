"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import EmployeeModal from "@/components/modals/EmployeeModal";
import Autocomplete from "@/components/Autocomplete";
import FeedbackDialog from "@/components/FeedbackDialog";

type Employee = {
  id: string;
  employeeId?: string;
  name: string;
  position: string;
  department?: string;
  employmentType?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  website?: string;

  // Address - Indonesia Address System
  detailAddress?: string;
  provinceCode?: string;
  regencyCode?: string;
  districtCode?: string;
  villageCode?: string;
  provinceName?: string;
  regencyName?: string;
  districtName?: string;
  villageName?: string;
  villagePostalCode?: string | null;

  emergencyContact?: string;
  emergencyPhone?: string;
  joinDate?: Date;
  endDate?: Date;
  salary?: number;
  allowance?: number;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  taxId?: string;
  nationalId?: string;
  userId?: string | null;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export default function EmployeesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, type: "success", title: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["employees", searchQuery, departmentFilter, statusFilter],
    queryFn: async () => {
      const params: any = { page: 1, limit: 100 };
      if (searchQuery) params.search = searchQuery;
      if (departmentFilter) params.department = departmentFilter;
      if (statusFilter) params.status = statusFilter;
      const response = await api.get("/admin/employees", { params });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setFeedback({
        open: true,
        type: "success",
        title: "Karyawan dihapus",
        message: "Data karyawan berhasil dihapus.",
      });
    },
    onError: () => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal menghapus",
        message: "Terjadi kesalahan saat menghapus karyawan.",
      });
    },
  });

  const employees = data?.data || [];

  const handleCreate = () => {
    setSelectedEmployee(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (employee: Employee) => {
    router.push(`/dashboard/master/employees/${employee.id}`);
  };

  const handleDelete = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!employeeToDelete) return;
    deleteMutation.mutate(employeeToDelete.id);
    setIsDeleteModalOpen(false);
    setEmployeeToDelete(null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setIsViewMode(false);
  };

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    handleModalClose();
  };

  const departmentOptions = [
    { value: "", label: "All Departments" },
    { value: "program", label: "Program" },
    { value: "finance", label: "Finance" },
    { value: "fundraising", label: "Fundraising" },
    { value: "admin", label: "Admin" },
    { value: "it", label: "IT" },
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-1">Kelola data karyawan</p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="btn btn-primary btn-md"
        >
          <PlusIcon className="w-5 h-5" />
          Tambah Karyawan
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari karyawan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input w-full"
          />
        </div>
        <div className="w-full md:w-48">
          <Autocomplete
            options={departmentOptions}
            value={departmentFilter}
            onChange={setDepartmentFilter}
            placeholder="All Departments"
          />
        </div>
        <div className="w-full md:w-48">
          <Autocomplete
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Status"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>NIP / Nama</th>
              <th>Posisi</th>
              <th>Department</th>
              <th>Kontak</th>
              <th>Gaji</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-8">
                  Tidak ada data karyawan
                </td>
              </tr>
            ) : (
              employees.map((employee: Employee) => (
                <tr key={employee.id}>
                  <td>
                    {employee.employeeId && (
                      <div className="text-xs text-gray-500 mono">{employee.employeeId}</div>
                    )}
                    <div className="font-medium text-gray-900">{employee.name}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{employee.position}</div>
                    {employee.employmentType && (
                      <div className="text-xs text-gray-500">{employee.employmentType}</div>
                    )}
                  </td>
                  <td>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                      {employee.department || "-"}
                    </span>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{employee.email || "-"}</div>
                    {employee.phone && (
                      <div className="text-xs text-gray-500">{employee.phone}</div>
                    )}
                  </td>
                  <td className="mono text-sm">
                    {employee.salary ? `Rp ${formatRupiah(employee.salary)}` : "-"}
                  </td>
                  <td>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        employee.isActive
                          ? "bg-success-50 text-success-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {employee.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        onClick={() => handleView(employee)}
                        className="action-btn action-view"
                        title="View"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(employee)}
                        className="action-btn action-edit"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(employee)}
                        className="action-btn action-delete"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="table-mobile-cards">
        {employees.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Tidak ada data karyawan
          </div>
        ) : (
          employees.map((employee: Employee) => (
            <div key={employee.id} className="table-card">
              <div className="table-card-header">
                <div className="table-card-header-left">
                  <div className="table-card-header-title">{employee.name}</div>
                  <div className="table-card-header-subtitle">
                    {employee.employeeId || employee.position}
                  </div>
                </div>
                <span
                  className={`table-card-header-badge ${
                    employee.isActive
                      ? "bg-success-50 text-success-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {employee.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Posisi</span>
                <span className="table-card-row-value">{employee.position}</span>
              </div>

              {employee.department && (
                <div className="table-card-row">
                  <span className="table-card-row-label">Department</span>
                  <span className="table-card-row-value">{employee.department}</span>
                </div>
              )}

              {employee.email && (
                <div className="table-card-row">
                  <span className="table-card-row-label">Email</span>
                  <span className="table-card-row-value">{employee.email}</span>
                </div>
              )}

              {employee.salary && (
                <div className="table-card-row">
                  <span className="table-card-row-label">Gaji</span>
                  <span className="table-card-row-value mono">
                    Rp {formatRupiah(employee.salary)}
                  </span>
                </div>
              )}

              <div className="table-card-footer">
                <button
                  onClick={() => handleView(employee)}
                  className="action-btn action-view"
                  title="View"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(employee)}
                  className="action-btn action-edit"
                  title="Edit"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(employee)}
                  className="action-btn action-delete"
                  title="Delete"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        employee={selectedEmployee}
        isViewMode={isViewMode}
      />

      {isDeleteModalOpen && employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Hapus Karyawan</h3>
            <p className="text-sm text-gray-600 mb-6">
              Yakin ingin menghapus karyawan &quot;{employeeToDelete.name}&quot;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setEmployeeToDelete(null);
                }}
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
