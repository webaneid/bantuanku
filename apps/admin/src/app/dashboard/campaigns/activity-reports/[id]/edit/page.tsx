"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, CloudArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import RichTextEditor from "@/components/RichTextEditor";
import MediaLibrary from "@/components/MediaLibrary";
import { toast } from "react-hot-toast";
import api from "@/lib/api";

export default function EditActivityReportPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);

  const [campaignId, setCampaignId] = useState("");
  const [title, setTitle] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [description, setDescription] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [status, setStatus] = useState("draft");
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

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
      setCampaignId(report.campaignId);
      setTitle(report.title);
      setActivityDate(report.activityDate.split("T")[0]); // Convert to YYYY-MM-DD
      setDescription(report.description);
      setGallery(report.gallery || []);
      setStatus(report.status || "draft");
    }
  }, [report]);

  // Fetch campaigns for autocomplete
  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns-list"],
    queryFn: async () => {
      const response = await api.get("/admin/campaigns");
      return response.data;
    },
  });

  const campaignOptions = (campaignsData?.data || []).map((campaign: any) => ({
    value: campaign.id,
    label: campaign.title,
  }));

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.put(`/admin/activity-reports/${id}`, data);
    },
    onSuccess: () => {
      toast.success("Laporan kegiatan berhasil diupdate!");
      queryClient.invalidateQueries({ queryKey: ["activity-report", id] });
      queryClient.invalidateQueries({ queryKey: ["activity-reports"] });
      router.push(`/dashboard/campaigns/activity-reports/${id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mengupdate laporan kegiatan");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!campaignId) {
      toast.error("Campaign harus dipilih");
      return;
    }
    if (!title.trim()) {
      toast.error("Judul laporan harus diisi");
      return;
    }
    if (!activityDate) {
      toast.error("Tanggal kegiatan harus diisi");
      return;
    }
    if (!description.trim() || description === "<p></p>") {
      toast.error("Deskripsi laporan harus diisi");
      return;
    }

    updateMutation.mutate({
      campaignId,
      title,
      activityDate,
      description,
      gallery,
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
            onClick={() => router.push("/dashboard/campaigns/activity-reports")}
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
          onClick={() => router.push(`/dashboard/campaigns/activity-reports/${id}`)}
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
          {/* Campaign */}
          <div className="form-field">
            <label className="form-label">
              Campaign <span className="text-danger-500">*</span>
            </label>
            <Autocomplete
              options={campaignOptions}
              value={campaignId}
              onChange={setCampaignId}
              placeholder="Pilih campaign..."
              allowClear={false}
            />
          </div>

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
          onClick={() => router.push(`/dashboard/campaigns/activity-reports/${id}`)}
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
    </div>
  );
}
