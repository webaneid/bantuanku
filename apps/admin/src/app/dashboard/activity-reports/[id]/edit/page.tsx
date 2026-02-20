"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import RichTextEditor from "@/components/RichTextEditor";
import MediaLibrary from "@/components/MediaLibrary";
import FeedbackDialog from "@/components/FeedbackDialog";
import api from "@/lib/api";

const referenceTypeOptions = [
  { value: "campaign", label: "Campaign" },
  { value: "zakat_period", label: "Zakat - Periode" },
  { value: "zakat_disbursement", label: "Zakat - Pencairan" },
  { value: "qurban_period", label: "Qurban - Periode" },
];

export default function EditActivityReportPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);

  const [referenceType, setReferenceType] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const [title, setTitle] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [description, setDescription] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState("draft");
  const [typeSpecificData, setTypeSpecificData] = useState<any>({});
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  // Fetch existing report
  const { data: report, isLoading } = useQuery({
    queryKey: ["activity-report", id],
    queryFn: async () => {
      const response = await api.get(`/admin/activity-reports/${id}`);
      return response.data?.data;
    },
  });

  // Populate form when data is loaded
  useEffect(() => {
    if (report) {
      setReferenceType(report.referenceType || "campaign");
      setReferenceId(report.referenceId || report.campaignId || "");
      setReferenceName(report.referenceName || "");
      setTitle(report.title);
      setActivityDate(report.activityDate?.split("T")[0] || "");
      setDescription(report.description);
      setGallery(report.gallery || []);
      setVideoUrl(report.videoUrl || "");
      setStatus(report.status || "draft");
      setTypeSpecificData(report.typeSpecificData || {});
    }
  }, [report]);

  // Fetch campaigns
  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns-list"],
    queryFn: async () => {
      const response = await api.get("/admin/campaigns");
      return response.data;
    },
    enabled: referenceType === "campaign",
  });

  // Fetch zakat periods
  const { data: zakatPeriodsData } = useQuery({
    queryKey: ["zakat-periods-list"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/periods");
      return response.data;
    },
    enabled: referenceType === "zakat_period",
  });

  // Fetch disbursements (zakat type)
  const { data: disbursementsData } = useQuery({
    queryKey: ["disbursements-zakat-list"],
    queryFn: async () => {
      const response = await api.get("/admin/disbursements?disbursement_type=zakat_distribution");
      return response.data;
    },
    enabled: referenceType === "zakat_disbursement",
  });

  // Fetch qurban periods
  const { data: qurbanPeriodsData } = useQuery({
    queryKey: ["qurban-periods-list"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/periods");
      return response.data;
    },
    enabled: referenceType === "qurban_period",
  });

  const campaignOptions = (campaignsData?.data || []).map((c: any) => ({
    value: c.id,
    label: c.title,
  }));

  const zakatPeriodOptions = (zakatPeriodsData?.data || []).map((p: any) => ({
    value: p.id,
    label: `${p.name} - ${p.year}`,
  }));

  const disbursementOptions = (disbursementsData?.data || []).map((d: any) => ({
    value: d.id,
    label: `${d.disbursementNumber} - ${d.recipientName}`,
  }));

  const qurbanPeriodOptions = (qurbanPeriodsData?.data || []).map((p: any) => ({
    value: p.id,
    label: p.name,
  }));

  const getReferenceOptions = () => {
    switch (referenceType) {
      case "campaign": return campaignOptions;
      case "zakat_period": return zakatPeriodOptions;
      case "zakat_disbursement": return disbursementOptions;
      case "qurban_period": return qurbanPeriodOptions;
      default: return [];
    }
  };

  const getReferencePlaceholder = () => {
    switch (referenceType) {
      case "campaign": return "Pilih campaign...";
      case "zakat_period": return "Pilih periode zakat...";
      case "zakat_disbursement": return "Pilih pencairan zakat...";
      case "qurban_period": return "Pilih periode qurban...";
      default: return "Pilih referensi...";
    }
  };

  const handleReferenceTypeChange = (value: string) => {
    setReferenceType(value);
    setReferenceId("");
    setReferenceName("");
    setTypeSpecificData({});
  };

  const handleReferenceChange = (value: string) => {
    setReferenceId(value);
    const options = getReferenceOptions();
    const selected = options.find((o: any) => o.value === value);
    setReferenceName(selected?.label || "");
  };

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.put(`/admin/activity-reports/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-report", id] });
      queryClient.invalidateQueries({ queryKey: ["activity-reports"] });
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Laporan kegiatan berhasil diupdate!",
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal mengupdate laporan kegiatan",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!referenceType) {
      setFeedback({
        open: true,
        type: "error",
        title: "Validasi",
        message: "Jenis laporan harus dipilih",
      });
      return;
    }
    if (!referenceId) {
      setFeedback({
        open: true,
        type: "error",
        title: "Validasi",
        message: "Referensi harus dipilih",
      });
      return;
    }
    if (!title.trim()) {
      setFeedback({
        open: true,
        type: "error",
        title: "Validasi",
        message: "Judul laporan harus diisi",
      });
      return;
    }
    if (!activityDate) {
      setFeedback({
        open: true,
        type: "error",
        title: "Validasi",
        message: "Tanggal kegiatan harus diisi",
      });
      return;
    }
    if (!description.trim() || description === "<p></p>") {
      setFeedback({
        open: true,
        type: "error",
        title: "Validasi",
        message: "Deskripsi laporan harus diisi",
      });
      return;
    }

    updateMutation.mutate({
      referenceType,
      referenceId,
      referenceName,
      title,
      activityDate,
      description,
      gallery,
      videoUrl: videoUrl || undefined,
      typeSpecificData: Object.keys(typeSpecificData).length > 0 ? typeSpecificData : undefined,
      status,
    });
  };

  const handleGallerySelect = (url: string) => {
    setGallery([...gallery, url]);
    setIsMediaLibraryOpen(false);
  };

  const handleRemoveImage = (index: number) => {
    setGallery(gallery.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-12">
          <p className="text-gray-500">Laporan tidak ditemukan</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/activity-reports")}
            className="btn btn-primary btn-md mt-4"
          >
            Kembali ke Daftar Laporan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="form-page-header">
        <button
          className="btn btn-secondary btn-md"
          onClick={() => router.push(`/dashboard/activity-reports/${id}`)}
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali
        </button>

        <div className="form-page-header-content">
          <h1 className="form-page-title">Edit Laporan Kegiatan</h1>
          <p className="form-page-subtitle">
            Edit informasi laporan kegiatan
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} id="activity-report-form">
        <div className="form-layout-two-column">
          {/* Main Content (Left Column) */}
          <div className="form-main-content">
            {/* Reference Type */}
            <div className="form-field">
              <label className="form-label">
                Jenis Laporan <span className="text-danger-500">*</span>
              </label>
              <Autocomplete
                options={referenceTypeOptions}
                value={referenceType}
                onChange={handleReferenceTypeChange}
                placeholder="Pilih jenis laporan..."
                allowClear={false}
              />
            </div>

            {/* Reference Selection */}
            {referenceType && (
              <div className="form-field">
                <label className="form-label">
                  Referensi <span className="text-danger-500">*</span>
                </label>
                <Autocomplete
                  options={getReferenceOptions()}
                  value={referenceId}
                  onChange={handleReferenceChange}
                  placeholder={getReferencePlaceholder()}
                  allowClear={false}
                />
              </div>
            )}

            {/* Title */}
            <div className="form-field">
              <label className="form-label">
                Judul Laporan <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
                placeholder="Contoh: Pembagian Sembako untuk 100 Keluarga"
              />
            </div>

            {/* Activity Date */}
            <div className="form-field">
              <label className="form-label">
                Tanggal Kegiatan <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Type-Specific Fields */}
            {referenceType === "zakat_period" && (
              <div className="form-section">
                <h3 className="form-section-title">Detail Zakat Periode</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="form-label">Jumlah Penerima</label>
                    <input
                      type="number"
                      value={typeSpecificData.recipient_count || ""}
                      onChange={(e) => setTypeSpecificData({ ...typeSpecificData, recipient_count: parseInt(e.target.value) || 0 })}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Area Distribusi</label>
                    <input
                      type="text"
                      value={typeSpecificData.distribution_areas?.join(", ") || ""}
                      onChange={(e) => setTypeSpecificData({ ...typeSpecificData, distribution_areas: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                      className="form-input"
                      placeholder="Jakarta, Bogor, Depok"
                    />
                  </div>
                </div>
              </div>
            )}

            {referenceType === "zakat_disbursement" && (
              <div className="form-section">
                <h3 className="form-section-title">Detail Pencairan Zakat</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="form-label">Jumlah Penerima</label>
                    <input
                      type="number"
                      value={typeSpecificData.recipient_count || ""}
                      onChange={(e) => setTypeSpecificData({ ...typeSpecificData, recipient_count: parseInt(e.target.value) || 0 })}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Lokasi</label>
                    <input
                      type="text"
                      value={typeSpecificData.location || ""}
                      onChange={(e) => setTypeSpecificData({ ...typeSpecificData, location: e.target.value })}
                      className="form-input"
                      placeholder="Contoh: Jakarta Selatan"
                    />
                  </div>
                </div>
              </div>
            )}

            {referenceType === "qurban_period" && (
              <div className="form-section">
                <h3 className="form-section-title">Detail Qurban Periode</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-field">
                    <label className="form-label">Kambing</label>
                    <input
                      type="number"
                      value={typeSpecificData.animals_by_type?.kambing || ""}
                      onChange={(e) => setTypeSpecificData({
                        ...typeSpecificData,
                        animals_by_type: { ...typeSpecificData.animals_by_type, kambing: parseInt(e.target.value) || 0 },
                        total_animals: (parseInt(e.target.value) || 0) + (typeSpecificData.animals_by_type?.sapi || 0) + (typeSpecificData.animals_by_type?.domba || 0),
                      })}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Sapi</label>
                    <input
                      type="number"
                      value={typeSpecificData.animals_by_type?.sapi || ""}
                      onChange={(e) => setTypeSpecificData({
                        ...typeSpecificData,
                        animals_by_type: { ...typeSpecificData.animals_by_type, sapi: parseInt(e.target.value) || 0 },
                        total_animals: (typeSpecificData.animals_by_type?.kambing || 0) + (parseInt(e.target.value) || 0) + (typeSpecificData.animals_by_type?.domba || 0),
                      })}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Domba</label>
                    <input
                      type="number"
                      value={typeSpecificData.animals_by_type?.domba || ""}
                      onChange={(e) => setTypeSpecificData({
                        ...typeSpecificData,
                        animals_by_type: { ...typeSpecificData.animals_by_type, domba: parseInt(e.target.value) || 0 },
                        total_animals: (typeSpecificData.animals_by_type?.kambing || 0) + (typeSpecificData.animals_by_type?.sapi || 0) + (parseInt(e.target.value) || 0),
                      })}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="form-field">
                    <label className="form-label">Total Penerima Daging</label>
                    <input
                      type="number"
                      value={typeSpecificData.total_recipients || ""}
                      onChange={(e) => setTypeSpecificData({ ...typeSpecificData, total_recipients: parseInt(e.target.value) || 0 })}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Lokasi Penyembelihan</label>
                    <input
                      type="text"
                      value={typeSpecificData.slaughter_location || ""}
                      onChange={(e) => setTypeSpecificData({ ...typeSpecificData, slaughter_location: e.target.value })}
                      className="form-input"
                      placeholder="Contoh: RPH Pondok Ranggon"
                    />
                  </div>
                </div>
              </div>
            )}

            {referenceType === "campaign" && (
              <div className="form-section">
                <h3 className="form-section-title">Detail Campaign</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="form-label">Jumlah Penerima Manfaat</label>
                    <input
                      type="number"
                      value={typeSpecificData.beneficiary_count || ""}
                      onChange={(e) => setTypeSpecificData({ ...typeSpecificData, beneficiary_count: parseInt(e.target.value) || 0 })}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Lokasi Kegiatan</label>
                    <input
                      type="text"
                      value={typeSpecificData.location || ""}
                      onChange={(e) => setTypeSpecificData({ ...typeSpecificData, location: e.target.value })}
                      className="form-input"
                      placeholder="Contoh: Jakarta Timur"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="form-field">
              <label className="form-label">
                Deskripsi Laporan <span className="text-danger-500">*</span>
              </label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Tulis deskripsi lengkap kegiatan, hasil yang dicapai, dan dokumentasi..."
              />
            </div>
          </div>

          {/* Sidebar (Right Column) */}
          <div className="form-sidebar">
            {/* Gallery */}
            <div className="form-field">
              <label className="form-label">Gallery Foto Kegiatan</label>
              <p className="text-xs text-gray-500 mb-3">Tambahkan beberapa gambar dokumentasi kegiatan</p>

              {/* Gallery Grid */}
              {gallery.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {gallery.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img
                        src={img}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-danger-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus gambar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Image Button */}
              <button
                type="button"
                className="btn btn-secondary btn-sm w-full"
                onClick={() => setIsMediaLibraryOpen(true)}
              >
                Tambah Gambar
              </button>
            </div>

            {/* Video URL */}
            <div className="form-field">
              <label className="form-label">URL Video (Opsional)</label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="form-input"
                placeholder="https://youtube.com/..."
              />
            </div>

            {/* Status */}
            <div className="form-field">
              <label className="form-label">
                Status <span className="text-danger-500">*</span>
              </label>
              <Autocomplete
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "published", label: "Published" },
                ]}
                value={status}
                onChange={setStatus}
                placeholder="Pilih Status"
                allowClear={false}
              />
            </div>
          </div>
        </div>
      </form>

      {/* Form Actions */}
      <div className="form-page-actions">
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          onClick={() => router.push(`/dashboard/activity-reports/${id}`)}
          disabled={updateMutation.isPending}
        >
          Batal
        </button>
        <button
          type="submit"
          form="activity-report-form"
          className="btn btn-primary btn-lg"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      {/* Media Library Modal */}
      <MediaLibrary
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={handleGallerySelect}
        category="general"
        accept="image/*"
      />

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => {
          setFeedback((prev) => ({ ...prev, open: false }));
          if (feedback.type === "success") {
            router.push(`/dashboard/activity-reports/${id}`);
          }
        }}
      />
    </div>
  );
}
