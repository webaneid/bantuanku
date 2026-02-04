"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { ArrowLeftIcon, XMarkIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import MediaLibrary from "@/components/MediaLibrary";

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch?: string;
  coaCode: string;
}

interface ApproveFormData {
  sourceBankId: string;
  sourceBankName: string;
  sourceBankAccount: string;
  targetBankName: string;
  targetBankAccount: string;
  targetBankAccountName: string;
  transferProof: string;
}

interface DisburseFormData {
  reportDate: string;
  reportDescription: string;
  reportPhotos: string[];
}

export default function ZakatDistributionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isReportMediaLibraryOpen, setIsReportMediaLibraryOpen] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [approveForm, setApproveForm] = useState<ApproveFormData>({
    sourceBankId: "",
    sourceBankName: "",
    sourceBankAccount: "",
    targetBankName: "",
    targetBankAccount: "",
    targetBankAccountName: "",
    transferProof: "",
  });
  const [reportForm, setReportForm] = useState<DisburseFormData>({
    reportDate: new Date().toISOString().split('T')[0],
    reportDescription: "",
    reportPhotos: [],
  });

  // Fetch distribution detail
  const { data: distributionData, isLoading } = useQuery({
    queryKey: ["zakat-distribution", id],
    queryFn: async () => {
      const response = await api.get(`/admin/zakat/distributions/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });

  // Fetch bank accounts from settings
  useEffect(() => {
    const fetchBankAccounts = async () => {
      try {
        const response = await api.get("/admin/settings/public/bank-accounts");
        const banks = response.data.data || [];
        setBankAccounts(banks);
      } catch (error) {
        console.error("Failed to fetch bank accounts:", error);
      }
    };
    fetchBankAccounts();
  }, []);

  // Auto-fill target bank info when distribution data is loaded
  useEffect(() => {
    if (distributionData && showApproveModal) {
      // Determine target bank based on recipient type
      const getTargetBankInfo = async () => {
        try {
          if (distributionData.recipientType === "coordinator" && distributionData.coordinatorId) {
            // Fetch employee data
            const empResponse = await api.get(`/admin/employees/${distributionData.coordinatorId}`);
            const emp = empResponse.data.data;
            setApproveForm(prev => ({
              ...prev,
              targetBankName: emp.bankName || "",
              targetBankAccount: emp.bankAccount || "",
              targetBankAccountName: emp.bankAccountName || emp.name || "",
            }));
          } else if (distributionData.recipientType === "direct" && distributionData.mustahiqId) {
            // Fetch mustahiq data
            const mustResponse = await api.get(`/admin/mustahiqs/${distributionData.mustahiqId}`);
            const must = mustResponse.data.data;
            setApproveForm(prev => ({
              ...prev,
              targetBankName: must.bankName || "",
              targetBankAccount: must.bankAccount || "",
              targetBankAccountName: must.bankAccountName || must.name || "",
            }));
          }
        } catch (error) {
          console.error("Failed to fetch recipient bank info:", error);
          toast.error("Gagal mengambil data rekening penerima");
        }
      };
      getTargetBankInfo();
    }
  }, [distributionData, showApproveModal]);

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (data: ApproveFormData) => {
      const response = await api.post(`/admin/zakat/distributions/${id}/approve`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-distribution", id] });
      queryClient.invalidateQueries({ queryKey: ["zakat-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["zakat-stats"] });
      toast.success("Penyaluran berhasil disetujui");
      setShowApproveModal(false);
      setApproveForm({
        sourceBankId: "",
        sourceBankName: "",
        sourceBankAccount: "",
        targetBankName: "",
        targetBankAccount: "",
        targetBankAccountName: "",
        transferProof: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal menyetujui penyaluran");
    },
  });

  // Disburse mutation
  const disburseMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/admin/zakat/distributions/${id}/disburse`, {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-distribution", id] });
      queryClient.invalidateQueries({ queryKey: ["zakat-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["zakat-stats"] });
      toast.success("Penyaluran berhasil ditandai sebagai tersalurkan");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal menandai penyaluran");
    },
  });

  // Add report mutation
  const addReportMutation = useMutation({
    mutationFn: async (data: DisburseFormData) => {
      const response = await api.post(`/admin/zakat/distributions/${id}/add-report`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-distribution", id] });
      queryClient.invalidateQueries({ queryKey: ["zakat-distributions"] });
      toast.success("Laporan kegiatan berhasil ditambahkan");
      setShowReportModal(false);
      setReportForm({
        reportDate: new Date().toISOString().split('T')[0],
        reportDescription: "",
        reportPhotos: [],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal menambahkan laporan");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/admin/zakat/distributions/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Penyaluran berhasil dihapus");
      router.push("/dashboard/zakat/distributions");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal menghapus penyaluran");
    },
  });

  const handleApprove = () => {
    setShowApproveModal(true);
  };

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!approveForm.sourceBankId || !approveForm.sourceBankName || !approveForm.sourceBankAccount) {
      toast.error("Rekening asal harus diisi");
      return;
    }
    if (!approveForm.targetBankName || !approveForm.targetBankAccount || !approveForm.targetBankAccountName) {
      toast.error("Rekening tujuan harus diisi");
      return;
    }
    if (!approveForm.transferProof) {
      toast.error("Bukti transfer harus diisi");
      return;
    }

    approveMutation.mutate(approveForm);
  };

  const handleSourceBankChange = (bankId: string) => {
    const selectedBank = bankAccounts.find(b => b.id === bankId);
    if (selectedBank) {
      setApproveForm(prev => ({
        ...prev,
        sourceBankId: selectedBank.id,
        sourceBankName: selectedBank.bankName,
        sourceBankAccount: selectedBank.accountNumber,
      }));
    }
  };

  const handleDisburse = () => {
    if (confirm("Apakah Anda yakin penyaluran ini sudah dilakukan? Tindakan ini tidak dapat dibatalkan.")) {
      disburseMutation.mutate();
    }
  };

  const handleAddReport = () => {
    setShowReportModal(true);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!reportForm.reportDate) {
      toast.error("Tanggal kegiatan harus diisi");
      return;
    }
    if (!reportForm.reportDescription) {
      toast.error("Deskripsi kegiatan harus diisi");
      return;
    }
    if (reportForm.reportPhotos.length === 0) {
      toast.error("Minimal satu foto kegiatan harus diupload");
      return;
    }

    addReportMutation.mutate(reportForm);
  };

  const handleRemovePhoto = (url: string) => {
    setReportForm(prev => ({
      ...prev,
      reportPhotos: prev.reportPhotos.filter(p => p !== url),
    }));
  };

  const handleDelete = () => {
    if (confirm("Apakah Anda yakin ingin menghapus penyaluran ini? Hanya draft yang bisa dihapus.")) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="dashboard-container">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!distributionData) {
    return (
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="dashboard-container">
          <div className="text-center py-12">
            <p className="text-gray-500">Penyaluran tidak ditemukan</p>
            <button
              onClick={() => router.push("/dashboard/zakat/distributions")}
              className="btn btn-primary btn-md mt-4"
            >
              Kembali ke Daftar Penyaluran
            </button>
          </div>
        </div>
      </main>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
      approved: { label: "Disetujui", className: "bg-blue-100 text-blue-800" },
      disbursed: { label: "Tersalurkan", className: "bg-success-100 text-success-800" },
    };

    const badge = badges[status] || { label: status, className: "bg-gray-100 text-gray-800" };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const getAsnafLabel = (category: string) => {
    const labels: Record<string, string> = {
      fakir: "Fakir",
      miskin: "Miskin",
      amil: "Amil",
      mualaf: "Mualaf",
      riqab: "Riqab",
      gharim: "Gharim",
      fisabilillah: "Fisabilillah",
      ibnus_sabil: "Ibnus Sabil",
    };
    return labels[category] || category;
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/zakat/distributions")}
              className="btn btn-secondary btn-md"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Kembali
            </button>
            <div>
              <h1 className="dashboard-title">Detail Penyaluran Zakat</h1>
              <p className="dashboard-subtitle">
                Referensi ID: {distributionData.referenceId}
              </p>
            </div>
          </div>
          <div>{getStatusBadge(distributionData.status)}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recipient Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Informasi Penerima</h3>
            </div>
            <div className="card-content space-y-4">
              {distributionData.recipientType && (
                <div>
                  <div className="detail-label">Tipe Penerima</div>
                  <div className="detail-value">
                    {distributionData.recipientType === "coordinator" 
                      ? "Penanggung Jawab Distribusi" 
                      : "Penerima Langsung"}
                  </div>
                </div>
              )}

              <div>
                <div className="detail-label">Kategori Asnaf</div>
                <div className="detail-value">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {getAsnafLabel(distributionData.recipientCategory)}
                  </span>
                </div>
              </div>

              {distributionData.recipientType === "coordinator" ? (
                <>
                  <div>
                    <div className="detail-label">Penanggung Jawab</div>
                    <div className="detail-value">{distributionData.recipientName}</div>
                  </div>

                  {distributionData.distributionLocation && (
                    <div>
                      <div className="detail-label">Lokasi Distribusi</div>
                      <div className="detail-value">{distributionData.distributionLocation}</div>
                    </div>
                  )}

                  {distributionData.recipientCount && (
                    <div>
                      <div className="detail-label">Jumlah Penerima</div>
                      <div className="detail-value">{distributionData.recipientCount} orang</div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <div className="detail-label">Nama Penerima</div>
                    <div className="detail-value">{distributionData.recipientName}</div>
                  </div>

                  {distributionData.recipientContact && (
                    <div>
                      <div className="detail-label">Kontak</div>
                      <div className="detail-value">{distributionData.recipientContact}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Distribution Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Informasi Penyaluran</h3>
            </div>
            <div className="card-content space-y-4">
              {distributionData.zakatType && (
                <div>
                  <div className="detail-label">Jenis Zakat</div>
                  <div className="detail-value">
                    {distributionData.zakatType.icon} {distributionData.zakatType.name}
                  </div>
                </div>
              )}

              <div>
                <div className="detail-label">Jumlah Penyaluran</div>
                <div className="detail-value text-xl font-bold text-green-600">
                  Rp {formatRupiah(distributionData.amount)}
                </div>
              </div>

              <div>
                <div className="detail-label">Tujuan Penyaluran</div>
                <div className="detail-value">{distributionData.purpose}</div>
              </div>

              {distributionData.description && (
                <div>
                  <div className="detail-label mb-2">Deskripsi</div>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                    {distributionData.description}
                  </div>
                </div>
              )}

              {distributionData.notes && (
                <div>
                  <div className="detail-label mb-2">Catatan Internal</div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-sm text-gray-700">
                    {distributionData.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status & Timeline */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Status & Timeline</h3>
            </div>
            <div className="card-content space-y-4">
              <div>
                <div className="detail-label">Status</div>
                <div className="detail-value">{getStatusBadge(distributionData.status)}</div>
              </div>

              <div>
                <div className="detail-label">Dibuat Oleh</div>
                <div className="detail-value">
                  {distributionData.creator?.name || "-"}
                </div>
                {distributionData.createdAt && (
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(distributionData.createdAt).toLocaleString("id-ID")}
                  </div>
                )}
              </div>

              {distributionData.approvedBy && (
                <div>
                  <div className="detail-label">Disetujui Oleh</div>
                  <div className="detail-value">
                    {distributionData.approver?.name || "-"}
                  </div>
                  {distributionData.approvedAt && (
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(distributionData.approvedAt).toLocaleString("id-ID")}
                    </div>
                  )}
                </div>
              )}

              {distributionData.disbursedBy && (
                <div>
                  <div className="detail-label">Disalurkan Oleh</div>
                  <div className="detail-value">
                    {distributionData.disburser?.name || "-"}
                  </div>
                  {distributionData.disbursedAt && (
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(distributionData.disbursedAt).toLocaleString("id-ID")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Transfer Info (shown if approved) */}
          {(distributionData.status === "approved" || distributionData.status === "disbursed") && distributionData.sourceBankName && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Informasi Transfer</h3>
              </div>
              <div className="card-content space-y-4">
                <div>
                  <div className="detail-label">Rekening Asal (Yayasan)</div>
                  <div className="detail-value">
                    {distributionData.sourceBankName} - {distributionData.sourceBankAccount}
                  </div>
                </div>

                <div>
                  <div className="detail-label">Rekening Tujuan (Penerima)</div>
                  <div className="detail-value">
                    {distributionData.targetBankName} - {distributionData.targetBankAccount}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    a.n. {distributionData.targetBankAccountName}
                  </div>
                </div>

                {distributionData.transferProof && (
                  <div>
                    <div className="detail-label mb-2">Bukti Transfer</div>
                    <a
                      href={distributionData.transferProof}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline text-sm"
                    >
                      Lihat Bukti Transfer
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Report Info (shown if report added for coordinator type) */}
          {distributionData.status === "disbursed" && 
           distributionData.recipientType === "coordinator" && 
           distributionData.reportDescription && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Laporan Kegiatan Penyaluran</h3>
              </div>
              <div className="card-content space-y-4">
                {distributionData.reportDate && (
                  <div>
                    <div className="detail-label">Tanggal Kegiatan</div>
                    <div className="detail-value">
                      {new Date(distributionData.reportDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <div className="detail-label mb-2">Deskripsi Kegiatan</div>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                    {distributionData.reportDescription}
                  </div>
                </div>

                {distributionData.reportPhotos && (
                  <div>
                    <div className="detail-label mb-3">Foto Kegiatan</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {JSON.parse(distributionData.reportPhotos).map((url: string, index: number) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <img
                            src={url}
                            alt={`Foto kegiatan ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 group-hover:opacity-75 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Aksi</h3>
            </div>
            <div className="card-content space-y-3">
              {distributionData.status === "draft" && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="btn btn-primary btn-md w-full"
                  >
                    {approveMutation.isPending ? "Memproses..." : "Setujui Penyaluran"}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="btn btn-danger btn-md w-full"
                  >
                    {deleteMutation.isPending ? "Menghapus..." : "Hapus Draft"}
                  </button>
                </>
              )}

              {distributionData.status === "approved" && (
                <button
                  onClick={handleDisburse}
                  disabled={disburseMutation.isPending}
                  className="btn btn-success btn-md w-full"
                >
                  {disburseMutation.isPending ? "Memproses..." : "Tandai Sudah Disalurkan"}
                </button>
              )}

              {distributionData.status === "disbursed" && (
                <>
                  {/* Show "Add Report" button only for coordinator type and if report not added yet */}
                  {distributionData.recipientType === "coordinator" && !distributionData.reportAddedAt && (
                    <button
                      onClick={handleAddReport}
                      disabled={addReportMutation.isPending}
                      className="btn btn-primary btn-md w-full"
                    >
                      {addReportMutation.isPending ? "Memproses..." : "Tambahkan Laporan Kegiatan"}
                    </button>
                  )}
                  
                  {/* Show completion message */}
                  {(distributionData.recipientType === "direct" || distributionData.reportAddedAt) && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      {distributionData.recipientType === "direct" 
                        ? "Penyaluran sudah selesai"
                        : "Laporan kegiatan sudah ditambahkan"
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Setujui Penyaluran</h2>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="p-6 space-y-6">
              {/* Source Bank */}
              <div className="form-section">
                <h3 className="font-semibold text-gray-900 mb-4">Rekening Asal (Yayasan)</h3>
                <div className="form-group">
                  <label className="form-label">Pilih Rekening Asal *</label>
                  <select
                    className="form-input"
                    value={approveForm.sourceBankId}
                    onChange={(e) => handleSourceBankChange(e.target.value)}
                    required
                  >
                    <option value="">-- Pilih Rekening --</option>
                    {bankAccounts.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName} - {bank.accountNumber} ({bank.accountName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Bank */}
              <div className="form-section">
                <h3 className="font-semibold text-gray-900 mb-4">Rekening Tujuan (Penerima)</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Nama Bank *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={approveForm.targetBankName}
                      onChange={(e) => setApproveForm(prev => ({ ...prev, targetBankName: e.target.value }))}
                      placeholder="Contoh: Bank BCA"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nomor Rekening *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={approveForm.targetBankAccount}
                      onChange={(e) => setApproveForm(prev => ({ ...prev, targetBankAccount: e.target.value }))}
                      placeholder="Contoh: 1234567890"
                      required
                    />
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label">Nama Pemilik Rekening *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={approveForm.targetBankAccountName}
                      onChange={(e) => setApproveForm(prev => ({ ...prev, targetBankAccountName: e.target.value }))}
                      placeholder="Contoh: John Doe"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Transfer Proof */}
              <div className="form-section">
                <h3 className="font-semibold text-gray-900 mb-4">Bukti Transfer</h3>
                <div className="form-group">
                  <label className="form-label">Bukti Transfer *</label>
                  
                  {approveForm.transferProof ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <PhotoIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-700 flex-1 truncate">
                          {approveForm.transferProof.split("/").pop()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setApproveForm(prev => ({ ...prev, transferProof: "" }))}
                          className="text-danger-600 hover:text-danger-700 text-sm"
                        >
                          Hapus
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsMediaLibraryOpen(true)}
                        className="btn btn-outline btn-sm w-full"
                      >
                        <PhotoIcon className="h-4 w-4" />
                        Ganti Bukti Transfer
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsMediaLibraryOpen(true)}
                      className="btn btn-outline btn-md w-full flex items-center justify-center gap-2"
                    >
                      <PhotoIcon className="h-5 w-5" />
                      Pilih atau Upload Bukti Transfer
                    </button>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Upload foto atau screenshot bukti transfer dari media library
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="btn btn-outline btn-md flex-1"
                  disabled={approveMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-md flex-1"
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? "Memproses..." : "Setujui & Kirim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Library */}
      <MediaLibrary
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={(url) => {
          setApproveForm(prev => ({ ...prev, transferProof: url }));
          setIsMediaLibraryOpen(false);
        }}
        category="financial"
        accept="image/*"
      />

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Tambahkan Laporan Kegiatan</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="p-6 space-y-6">
              {/* Report Date */}
              <div className="form-group">
                <label className="form-label">Tanggal Kegiatan *</label>
                <input
                  type="date"
                  className="form-input"
                  value={reportForm.reportDate}
                  onChange={(e) => setReportForm(prev => ({ ...prev, reportDate: e.target.value }))}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tanggal kapan kegiatan penyaluran dilakukan
                </p>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Deskripsi Kegiatan *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={reportForm.reportDescription}
                  onChange={(e) => setReportForm(prev => ({ ...prev, reportDescription: e.target.value }))}
                  placeholder="Jelaskan detail kegiatan penyaluran zakat..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Contoh: Penyaluran zakat kepada 50 mustahiq di Masjid Al-Ikhlas
                </p>
              </div>

              {/* Photos Gallery */}
              <div className="form-group">
                <label className="form-label">Foto Kegiatan *</label>
                
                {reportForm.reportPhotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    {reportForm.reportPhotos.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(url)}
                          className="absolute top-1 right-1 bg-danger-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsReportMediaLibraryOpen(true)}
                  className="btn btn-outline btn-md w-full flex items-center justify-center gap-2"
                >
                  <PhotoIcon className="h-5 w-5" />
                  {reportForm.reportPhotos.length > 0 ? 'Tambah Foto Lagi' : 'Upload Foto Kegiatan'}
                </button>
                
                <p className="text-xs text-gray-500 mt-2">
                  Upload minimal 1 foto dokumentasi kegiatan penyaluran
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="btn btn-outline btn-md flex-1"
                  disabled={addReportMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-md flex-1"
                  disabled={addReportMutation.isPending}
                >
                  {addReportMutation.isPending ? "Menyimpan..." : "Simpan Laporan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Media Library */}
      <MediaLibrary
        isOpen={isReportMediaLibraryOpen}
        onClose={() => setIsReportMediaLibraryOpen(false)}
        onSelect={(url) => {
          setReportForm(prev => ({
            ...prev,
            reportPhotos: [...prev.reportPhotos, url],
          }));
          setIsReportMediaLibraryOpen(false);
        }}
        category="general"
        accept="image/*"
      />
    </main>
  );
}
