"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import RichTextEditor from "@/components/RichTextEditor";
import MediaLibrary from "@/components/MediaLibrary";
import { toast } from "react-hot-toast";
import api from "@/lib/api";

export default function CreateActivityReportPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [campaignId, setCampaignId] = useState("");
  const [title, setTitle] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [description, setDescription] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [status, setStatus] = useState("draft");
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post("/admin/activity-reports", data);
    },
    onSuccess: () => {
      toast.success("Laporan kegiatan berhasil dibuat!");
      queryClient.invalidateQueries({ queryKey: ["activity-reports"] });
      router.push("/dashboard/campaigns/activity-reports");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal membuat laporan kegiatan");
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

    createMutation.mutate({
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

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="form-page-header">
        <button
          className="btn btn-secondary btn-md"
          onClick={() => router.push("/dashboard/campaigns/activity-reports")}
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali
        </button>

        <div className="form-page-header-content">
          <h1 className="form-page-title">Buat Laporan Kegiatan</h1>
          <p className="form-page-subtitle">
            Buat laporan kegiatan untuk campaign
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
          onClick={() => router.push("/dashboard/campaigns/activity-reports")}
          disabled={createMutation.isPending}
        >
          Batal
        </button>
        <button
          type="submit"
          form="activity-report-form"
          className="btn btn-primary btn-lg"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Menyimpan..." : "Buat Laporan"}
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
