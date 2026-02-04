"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import Autocomplete from "./Autocomplete";
import RichTextEditor from "./RichTextEditor";
import MediaLibrary from "./MediaLibrary";
import EmployeeModal from "./modals/EmployeeModal";
import { PlusIcon } from "@heroicons/react/24/outline";

export interface CampaignFormData {
  title: string;
  description: string;
  content?: string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  goal: number;
  category: string;
  categoryId?: string;
  pillar?: string;
  coordinatorId?: string | null;
  startDate?: string;
  endDate?: string;
  status?: string;
  isFeatured?: boolean;
  isUrgent?: boolean;
}

interface CampaignFormProps {
  onSubmit: (data: CampaignFormData) => void;
  initialData?: Partial<CampaignFormData>;
  isLoading?: boolean;
}

export default function CampaignForm({ onSubmit, initialData, isLoading }: CampaignFormProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CampaignFormData>({
    defaultValues: initialData,
    mode: 'onSubmit',
  });

  const [category, setCategory] = useState(initialData?.category || "");
  const [pillar, setPillar] = useState(initialData?.pillar || "");
  const [coordinatorId, setCoordinatorId] = useState(initialData?.coordinatorId || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [status, setStatus] = useState(initialData?.status || "draft");
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isGalleryLibraryOpen, setIsGalleryLibraryOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);

  // Sync states when initialData changes
  useEffect(() => {
    if (initialData) {
      if (initialData.category) {
        setCategory(initialData.category);
        setValue('categoryId', initialData.categoryId || initialData.category);
      }
      if (initialData.pillar) {
        setPillar(initialData.pillar);
        setValue('pillar', initialData.pillar);
      }
      if (initialData.coordinatorId) {
        setCoordinatorId(initialData.coordinatorId);
        setValue('coordinatorId', initialData.coordinatorId);
      }
      if (initialData.content) {
        setContent(initialData.content);
        setValue('content', initialData.content);
      }
      if (initialData.imageUrl) {
        setImageUrl(initialData.imageUrl);
        setValue('imageUrl', initialData.imageUrl);
      }
      if (initialData.images) {
        setImages(initialData.images);
        setValue('images', initialData.images);
      }
      if (initialData.status) {
        setStatus(initialData.status);
        setValue('status', initialData.status);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // Fetch categories from API
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get("/categories");
      return response.data.data;
    },
  });

  // Fetch pillars from API (aktif)
  const { data: pillarsData } = useQuery({
    queryKey: ["pillars-active"],
    queryFn: async () => {
      const response = await api.get("/pillars");
      return response.data?.data || [];
    },
  });

  // Fetch active employees for coordinator dropdown
  const { data: employeesData } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const response = await api.get("/admin/employees?status=active");
      return response.data;
    },
  });

  const categoryOptions = (categoriesData || []).map((cat: any) => ({
    value: cat.id,
    label: cat.name,
  }));

  const pillarOptions = (pillarsData || []).map((p: any) => ({
    value: p.slug,
    label: p.name,
  }));

  const employeeOptions = (employeesData?.data || []).map((emp: any) => ({
    value: emp.id,
    label: `${emp.name} - ${emp.position || ""}`,
  }));

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setValue("categoryId", value);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setValue("status", value);
  };

  const handlePillarChange = (value: string) => {
    setPillar(value);
    setValue("pillar", value);
  };

  const handleCoordinatorChange = (value: string) => {
    setCoordinatorId(value);
    setValue("coordinatorId", value || null);
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setValue("content", value);
  };

  const handleImageSelect = (url: string) => {
    setImageUrl(url);
    setValue("imageUrl", url);
  };

  const handleGalleryImageSelect = (url: string) => {
    const newImages = [...images, url];
    setImages(newImages);
    setValue("images", newImages);
    setIsGalleryLibraryOpen(false);
  };

  const handleRemoveGalleryImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    setValue("images", newImages);
  };

  const handleEmployeeModalSuccess = (createdId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["employees-active"] });
    setIsEmployeeModalOpen(false);
    if (createdId) {
      setCoordinatorId(createdId);
      setValue("coordinatorId", createdId);
    }
  };

  const handleFormSubmit = (data: CampaignFormData) => {
    console.log('Form submitted with data:', data);
    console.log('Form errors:', errors);
    onSubmit(data);
  };

  const handleFormError = (errors: any) => {
    console.error('Form validation errors:', errors);

    // Show alert with all errors
    const errorMessages = Object.entries(errors)
      .map(([field, error]: [string, any]) => `${field}: ${error.message}`)
      .join('\n');

    alert('Form validation failed:\n\n' + errorMessages);

    // Scroll to first error
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <>
      <form id="campaign-form" onSubmit={handleSubmit(handleFormSubmit, handleFormError)}>
        <div className="form-layout-two-column">
        {/* Main Content (Left Column) */}
        <div className="form-main-content">
          {/* Title */}
          <div className="form-field">
            <label className="form-label">
              Judul Campaign <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.title ? 'border-danger-500' : ''}`}
              {...register("title", { required: "Judul wajib diisi", minLength: { value: 5, message: "Minimal 5 karakter" } })}
            />
            {errors.title && <p className="form-error">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="form-field">
            <label className="form-label">
              Deskripsi Singkat <span className="text-danger-500">*</span>
            </label>
            <textarea
              rows={3}
              className={`form-input ${errors.description ? 'border-danger-500' : ''}`}
              {...register("description", { required: "Deskripsi wajib diisi", minLength: { value: 20, message: "Minimal 20 karakter" } })}
            />
            {errors.description && <p className="form-error">{errors.description.message}</p>}
          </div>

          {/* Content */}
          <div className="form-field">
            <label className="form-label">Deskripsi Lengkap</label>
            <RichTextEditor
              value={content}
              onChange={handleContentChange}
              placeholder="Cerita lengkap tentang campaign ini..."
            />
            <input type="hidden" {...register("content")} />
          </div>

          {/* Section Divider */}
          <div className="form-section-divider"></div>

          {/* Goal */}
          <div className="form-field">
            <label className="form-label">
              Target Donasi (Rp) {pillar?.toLowerCase() !== 'fidyah' && <span className="text-danger-500">*</span>}
            </label>
            <input
              type="number"
              className={`form-input ${errors.goal ? 'border-danger-500' : ''}`}
              {...register("goal", {
                validate: (value) => {
                  const isFidyah = pillar?.toLowerCase() === 'fidyah';

                  // Jika Fidyah, goal opsional
                  if (isFidyah) {
                    return true;
                  }

                  // Jika bukan Fidyah, goal wajib dan minimal 100.000
                  if (!value || value === 0) {
                    return "Target donasi wajib diisi";
                  }

                  if (value < 100000) {
                    return "Minimal Rp 100.000";
                  }

                  return true;
                },
                valueAsNumber: true
              })}
              placeholder={pillar?.toLowerCase() === 'fidyah' ? "Opsional (kosongkan jika tidak ada target)" : "1000000"}
            />
            {errors.goal && <p className="form-error">{errors.goal.message}</p>}
            {pillar?.toLowerCase() === 'fidyah' && (
              <p className="form-helper">Untuk Fidyah, target donasi bersifat opsional</p>
            )}
          </div>

          {/* Pillar */}
          <div className="form-field">
            <label className="form-label">Pilar (Opsional)</label>
            <Autocomplete
              options={pillarOptions}
              value={pillar}
              onChange={handlePillarChange}
              placeholder="Pilih Pilar"
            />
            <input type="hidden" {...register("pillar")} />
          </div>

          {/* Coordinator */}
          <div className="form-field">
            <label className="form-label">Penanggung Jawab Program (Opsional)</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Autocomplete
                  options={employeeOptions}
                  value={coordinatorId}
                  onChange={handleCoordinatorChange}
                  placeholder="Pilih penanggung jawab program..."
                />
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => setIsEmployeeModalOpen(true)}
              >
                <PlusIcon className="w-5 h-5" />
                Tambah Employee
              </button>
            </div>
            <input type="hidden" {...register("coordinatorId")} />
            <p className="text-xs text-gray-500 mt-1">
              Tentukan karyawan yang bertanggung jawab untuk program ini
            </p>
          </div>

          {/* Start Date */}
          <div className="form-field">
            <label className="form-label">Tanggal Mulai (Opsional)</label>
            <input
              type="date"
              className="form-input"
              {...register("startDate")}
            />
          </div>

          {/* End Date */}
          <div className="form-field">
            <label className="form-label">Tanggal Berakhir (Opsional)</label>
            <input
              type="date"
              className="form-input"
              {...register("endDate")}
            />
          </div>
        </div>

        {/* Sidebar (Right Column) */}
        <div className="form-sidebar">
          {/* Image URL */}
          <div className="form-field">
            <label className="form-label">Gambar Utama</label>

            {/* Image Preview with Actions */}
            {imageUrl ? (
              <div className="media-field-preview">
                <div className="media-field-image">
                  <img src={imageUrl} alt="Preview" />
                </div>
                <div className="media-field-meta">
                  <p className="media-field-filename">Terakhir diubah 4 tahun lalu.</p>
                  <div className="media-field-status">
                    <span className="media-status-badge">Telah Terbit</span>
                    <span className="media-status-date">Juli 4, 2022<br/>2:22 pm</span>
                  </div>
                </div>
                <div className="media-field-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsMediaLibraryOpen(true)}
                  >
                    Gantikan
                  </button>
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-danger-600"
                    onClick={() => {
                      setImageUrl("");
                      setValue("imageUrl", "");
                    }}
                  >
                    Singkirkan
                  </button>
                </div>
              </div>
            ) : (
              <div className="media-field-empty">
                <button
                  type="button"
                  className="btn btn-secondary btn-md w-full"
                  onClick={() => setIsMediaLibraryOpen(true)}
                >
                  Tetapkan gambar unggulan
                </button>
              </div>
            )}

            {/* Hidden input for form */}
            <input type="hidden" {...register("imageUrl")} />
          </div>

          {/* Video URL */}
          <div className="form-field">
            <label className="form-label">URL Video (Opsional)</label>
            <input
              type="url"
              className="form-input"
              {...register("videoUrl")}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          {/* Gallery Images */}
          <div className="form-field">
            <label className="form-label">Galeri Gambar (Opsional)</label>
            <p className="text-xs text-gray-500 mb-3">Tambahkan beberapa gambar untuk ditampilkan sebagai galeri</p>

            {/* Gallery Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img
                      src={img}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(index)}
                      className="absolute top-1 right-1 bg-danger-600 hover:bg-danger-700 text-white rounded-full p-1.5 shadow-lg transition-colors"
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
              onClick={() => setIsGalleryLibraryOpen(true)}
            >
              Tetapkan gambar unggulan
            </button>

            {/* Hidden input for form */}
            <input type="hidden" {...register("images")} />
          </div>

          {/* Category */}
          <div className="form-field">
            <label className="form-label">
              Kategori <span className="text-danger-500">*</span>
            </label>
            <Autocomplete
              options={categoryOptions}
              value={category}
              onChange={handleCategoryChange}
              placeholder="Pilih Kategori"
              allowClear={false}
            />
            <input type="hidden" {...register("categoryId", { required: "Kategori wajib dipilih" })} />
            {errors.categoryId && <p className="form-error">{errors.categoryId.message}</p>}
          </div>

          {/* Status */}
          <div className="form-field">
            <label className="form-label">
              Status <span className="text-danger-500">*</span>
            </label>
            <Autocomplete
              options={[
                { value: "draft", label: "Draft" },
                { value: "active", label: "Aktif" },
                { value: "completed", label: "Selesai" },
                { value: "cancelled", label: "Dibatalkan" },
              ]}
              value={status}
              onChange={handleStatusChange}
              placeholder="Pilih Status"
              allowClear={false}
            />
            <input type="hidden" {...register("status", { required: "Status wajib dipilih" })} />
            {errors.status && <p className="form-error">{errors.status.message}</p>}
          </div>

          {/* Campaign Unggulan */}
          <div className="form-field">
            <div className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
              <div>
                <label htmlFor="isFeatured" className="form-label mb-0 cursor-pointer">
                  Campaign Unggulan
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Tandai campaign ini sebagai unggulan untuk ditampilkan di beranda
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="isFeatured"
                  type="checkbox"
                  className="sr-only peer"
                  {...register("isFeatured")}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {/* Campaign Mendesak */}
          <div className="form-field">
            <div className="flex items-center justify-between py-2 px-4 bg-amber-50 rounded-lg border border-amber-200">
              <div>
                <label htmlFor="isUrgent" className="form-label mb-0 cursor-pointer">
                  Campaign Mendesak
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Tandai campaign ini sebagai mendesak/urgent untuk prioritas tinggi
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="isUrgent"
                  type="checkbox"
                  className="sr-only peer"
                  {...register("isUrgent")}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
      </form>

      {/* Media Library Modal - Main Image */}
      <MediaLibrary
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={handleImageSelect}
        selectedUrl={imageUrl}
        accept="image/*"
        category="general"
      />

      {/* Media Library Modal - Gallery Images */}
      <MediaLibrary
        isOpen={isGalleryLibraryOpen}
        onClose={() => setIsGalleryLibraryOpen(false)}
        onSelect={handleGalleryImageSelect}
        accept="image/*"
        category="general"
      />

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSuccess={handleEmployeeModalSuccess}
      />
    </>
  );
}
