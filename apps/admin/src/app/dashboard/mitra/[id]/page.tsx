"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";
import api from "@/lib/api";

const statusBadgeMap: Record<string, string> = {
  pending: "bg-warning-50 text-warning-700",
  verified: "bg-success-50 text-success-700",
  rejected: "bg-danger-50 text-danger-700",
  suspended: "bg-gray-100 text-gray-700",
};

const getStatusBadgeClass = (status: string) => {
  return statusBadgeMap[status?.toLowerCase() || ""] || "bg-gray-100 text-gray-700";
};

const statusLabelMap: Record<string, string> = {
  pending: "Pending",
  verified: "Terverifikasi",
  rejected: "Ditolak",
  suspended: "Disuspend",
};

const campaignStatusBadgeMap: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-success-50 text-success-700",
  completed: "bg-blue-50 text-blue-700",
  cancelled: "bg-danger-50 text-danger-700",
  inactive: "bg-gray-100 text-gray-700",
};

const getProgramTypeLabel = (programType?: string) => {
  if (programType === "zakat") return "Zakat";
  if (programType === "qurban") return "Qurban";
  return "Campaign";
};

export default function MitraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const [programsPage, setProgramsPage] = useState(1);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activatePassword, setActivatePassword] = useState("");

  // Fetch mitra detail
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mitra", id],
    queryFn: async () => {
      const response = await api.get(`/admin/mitra/${id}`);
      return response.data?.data;
    },
  });

  // Fetch mitra programs
  const { data: programsData } = useQuery({
    queryKey: ["mitra-programs", id],
    queryFn: async () => {
      const response = await api.get(`/admin/mitra/${id}/programs`);
      return response.data?.data || response.data;
    },
    enabled: !!data,
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: () => api.post(`/admin/mitra/${id}/verify`, {}),
    onSuccess: () => {
      toast.success("Mitra berhasil diverifikasi");
      queryClient.invalidateQueries({ queryKey: ["mitra", id] });
      refetch();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memverifikasi mitra"),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => api.post(`/admin/mitra/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success("Mitra berhasil ditolak");
      queryClient.invalidateQueries({ queryKey: ["mitra", id] });
      refetch();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menolak mitra"),
  });

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: () => api.post(`/admin/mitra/${id}/suspend`, {}),
    onSuccess: () => {
      toast.success("Mitra berhasil di-suspend");
      queryClient.invalidateQueries({ queryKey: ["mitra", id] });
      refetch();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal men-suspend mitra"),
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: () => api.post(`/admin/mitra/${id}/activate`, {}),
    onSuccess: () => {
      toast.success("Mitra berhasil diaktifkan");
      queryClient.invalidateQueries({ queryKey: ["mitra", id] });
      refetch();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mengaktifkan mitra"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/mitra/${id}`),
    onSuccess: () => {
      toast.success("Mitra berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["mitra"] });
      router.push("/dashboard/mitra");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus mitra"),
  });

  // Activate user mutation
  const activateUserMutation = useMutation({
    mutationFn: (payload: { email: string; password: string }) =>
      api.post(`/admin/mitra/${id}/activate-user`, payload),
    onSuccess: () => {
      toast.success("Akun login mitra berhasil dibuat");
      setShowActivateModal(false);
      setActivatePassword("");
      queryClient.invalidateQueries({ queryKey: ["mitra", id] });
      refetch();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal membuat akun login"),
  });

  const handleActivateUser = () => {
    if (!activatePassword || activatePassword.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }
    activateUserMutation.mutate({
      email: data?.email,
      password: activatePassword,
    });
  };

  const handleReject = () => {
    const reason = window.prompt("Alasan penolakan:");
    if (!reason) return;
    rejectMutation.mutate(reason);
  };

  const handleDelete = () => {
    if (!window.confirm("Yakin ingin menghapus mitra ini?")) return;
    deleteMutation.mutate();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
            <div className="h-8 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !data) {
    return (
      <div className="dashboard-container">
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">Mitra tidak ditemukan atau terjadi kesalahan.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => router.push("/dashboard/mitra")}
            >
              Kembali
            </button>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => refetch()}
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const programs = programsData?.programs || programsData?.campaigns || [];

  const goToProgramDetail = (program: any) => {
    if (program.programType === "zakat") {
      router.push(`/dashboard/zakat/types/${program.id}/edit`);
      return;
    }
    if (program.programType === "qurban") {
      router.push(`/dashboard/qurban/packages/${program.id}/edit`);
      return;
    }
    router.push(`/dashboard/campaigns/${program.id}`);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => router.push("/dashboard/mitra")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Detail Mitra</h1>
          <p className="text-gray-600">{data.nama || data.name || "-"}</p>
        </div>
        <div className="flex gap-2">
          {data.status === "pending" && (
            <>
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? "..." : "Verifikasi"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-md text-red-600"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? "..." : "Tolak"}
              </button>
            </>
          )}
          {data.status === "verified" && (
            <button
              type="button"
              className="btn btn-secondary btn-md text-red-600"
              onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending ? "..." : "Suspend"}
            </button>
          )}
          {data.status === "suspended" && (
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
            >
              {activateMutation.isPending ? "..." : "Aktifkan"}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-md"
            onClick={() => router.push(`/dashboard/mitra/${id}/edit`)}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-md text-red-600"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "..." : "Hapus"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Status</div>
          <span
            className={`mt-1 inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(data.status)}`}
          >
            {statusLabelMap[data.status] || data.status}
          </span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Program</div>
          <div className="text-2xl font-bold">{data.campaignsCount || 0}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Donasi Masuk</div>
          <div className="text-xl font-bold">Rp {formatRupiah(data.totalDonations || 0)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Bagi Hasil</div>
          <div className="text-xl font-bold text-primary-600">Rp {formatRupiah(data.totalRevShare || 0)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Saldo</div>
          <div className="text-xl font-bold text-success-600">Rp {formatRupiah(data.balance || 0)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Sudah Dicairkan</div>
          <div className="text-xl font-bold text-gray-700">Rp {formatRupiah(data.totalWithdrawn || 0)}</div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left column (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Lembaga */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Info Lembaga</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Nama</span>
                <span className="font-medium">{data.nama || data.name || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500">Deskripsi</span>
                <p className="mt-1 text-sm text-gray-700">{data.deskripsi || data.description || "-"}</p>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">PIC Nama</span>
                <span className="font-medium">{data.picName || data.picNama || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">PIC Jabatan</span>
                <span>{data.picPosition || data.picJabatan || "-"}</span>
              </div>
              {data.createdAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Terdaftar</span>
                  <span>{format(new Date(data.createdAt), "dd MMM yyyy, HH:mm", { locale: idLocale })}</span>
                </div>
              )}
              {data.verifiedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Diverifikasi</span>
                  <span>{format(new Date(data.verifiedAt), "dd MMM yyyy, HH:mm", { locale: idLocale })}</span>
                </div>
              )}
              {data.rejectedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Ditolak</span>
                  <span>{format(new Date(data.rejectedAt), "dd MMM yyyy, HH:mm", { locale: idLocale })}</span>
                </div>
              )}
              {data.rejectionReason && (
                <div>
                  <span className="text-gray-500">Alasan Penolakan</span>
                  <p className="mt-1 text-sm text-red-600">{data.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Kontak */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Kontak</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span>{data.email || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Telepon</span>
                <span>{data.phone || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">WhatsApp</span>
                <span>{data.whatsappNumber || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Website</span>
                {data.website ? (
                  <a
                    href={data.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    {data.website}
                  </a>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
          </div>

          {/* Alamat */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Alamat</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-500">Alamat Detail</span>
                <p className="mt-1 text-sm text-gray-700">{data.detailAddress || data.address || "-"}</p>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Provinsi</span>
                <span>{data.provinceName || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Kabupaten/Kota</span>
                <span>{data.regencyName || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Kecamatan</span>
                <span>{data.districtName || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Kelurahan/Desa</span>
                <span>{data.villageName || "-"}</span>
              </div>
            </div>
          </div>

          {/* Dokumen */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Dokumen</h3>
            <div className="space-y-4">
              {/* KTP */}
              <div>
                <span className="text-sm text-gray-500 block mb-2">KTP</span>
                {data.ktpUrl ? (
                  <div className="space-y-2">
                    <a
                      href={data.ktpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline text-sm"
                    >
                      Lihat Dokumen KTP
                    </a>
                    <img
                      src={data.ktpUrl}
                      alt="KTP"
                      className="w-full max-w-md rounded-lg border border-gray-200 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Belum diunggah</span>
                )}
              </div>

              {/* Buku Rekening */}
              <div>
                <span className="text-sm text-gray-500 block mb-2">Buku Rekening</span>
                {data.bankBookUrl ? (
                  <div className="space-y-2">
                    <a
                      href={data.bankBookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline text-sm"
                    >
                      Lihat Dokumen Buku Rekening
                    </a>
                    <img
                      src={data.bankBookUrl}
                      alt="Buku Rekening"
                      className="w-full max-w-md rounded-lg border border-gray-200 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Belum diunggah</span>
                )}
              </div>

              {/* NPWP */}
              <div>
                <span className="text-sm text-gray-500 block mb-2">NPWP</span>
                {data.npwpUrl ? (
                  <div className="space-y-2">
                    <a
                      href={data.npwpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline text-sm"
                    >
                      Lihat Dokumen NPWP
                    </a>
                    <img
                      src={data.npwpUrl}
                      alt="NPWP"
                      className="w-full max-w-md rounded-lg border border-gray-200 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Belum diunggah</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column (col-span-1) */}
        <div className="space-y-6">
          {/* Rekening Bank */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Rekening Bank</h3>
            {(data.bankAccounts || []).length > 0 ? (
              <div className="space-y-3">
                {(data.bankAccounts || []).map((acc: any, i: number) => (
                  <div key={acc.id || i} className={i > 0 ? "pt-3 border-t border-gray-100" : ""}>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nama Bank</span>
                      <span>{acc.bankName}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-500">No. Rekening</span>
                      <span className="font-mono">{acc.accountNumber}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-500">Atas Nama</span>
                      <span>{acc.accountHolderName}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Belum ada rekening bank</p>
            )}
          </div>

          {/* Akun Login */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Akun Login</h3>
            {data.userId ? (
              <div className="space-y-2">
                <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-success-50 text-success-700">
                  Akun Aktif
                </span>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span>{data.email || "-"}</span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-3">Mitra belum memiliki akun login</p>
                {showActivateModal ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Email</label>
                      <input
                        type="text"
                        value={data.email || ""}
                        disabled
                        className="form-input bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Password</label>
                      <input
                        type="text"
                        value={activatePassword}
                        onChange={(e) => setActivatePassword(e.target.value)}
                        className="form-input text-sm"
                        placeholder="Minimal 8 karakter"
                        minLength={8}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleActivateUser}
                        disabled={activateUserMutation.isPending}
                      >
                        {activateUserMutation.isPending ? "..." : "Simpan"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setShowActivateModal(false);
                          setActivatePassword("");
                        }}
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm w-full"
                    onClick={() => setShowActivateModal(true)}
                  >
                    Aktifkan Akun Login
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {data.notes && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Catatan</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Programs Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Program Mitra</h3>
          <p className="text-sm text-gray-500 mt-1">
            Daftar campaign, zakat, dan qurban yang dimiliki oleh mitra ini
          </p>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tipe</th>
                <th>Judul</th>
                <th>Status</th>
                <th>Pilar</th>
                <th>Target</th>
                <th>Terkumpul</th>
                <th>Donatur/Order</th>
                <th>Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {programs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    Belum ada program
                  </td>
                </tr>
              ) : (
                programs.map((program: any) => (
                  <tr key={`${program.programType || "campaign"}-${program.id}`} className="hover:bg-gray-50">
                    <td className="text-sm text-gray-600">{getProgramTypeLabel(program.programType)}</td>
                    <td>
                      <button
                        type="button"
                        className="text-sm font-medium text-primary-600 hover:underline text-left"
                        onClick={() => goToProgramDetail(program)}
                      >
                        {program.title}
                      </button>
                    </td>
                    <td>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          campaignStatusBadgeMap[program.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {program.status}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600">{program.pillar || "-"}</td>
                    <td className="text-sm font-mono">
                      {program.programType === "campaign" ? `Rp ${formatRupiah(Number(program.goal || 0))}` : "-"}
                    </td>
                    <td className="text-sm font-mono">
                      {program.programType === "campaign" || program.programType === "zakat" || program.programType === "qurban"
                        ? `Rp ${formatRupiah(Number(program.collected || 0))}`
                        : "-"}
                    </td>
                    <td className="text-sm text-center">
                      {program.programType === "campaign" || program.programType === "zakat" || program.programType === "qurban"
                        ? (program.donorCount || 0)
                        : "-"}
                    </td>
                    <td className="text-sm text-gray-600">
                      {program.createdAt
                        ? format(new Date(program.createdAt), "dd MMM yyyy", { locale: idLocale })
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
