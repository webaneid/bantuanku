"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import RichTextEditor from "./RichTextEditor";
import MediaLibrary from "./MediaLibrary";
import SEOPanel, { type SEOData } from "./SEOPanel";
import api from "@/lib/api";

export interface ZakatTypeFormData {
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  icon?: string;
  hasCalculator: boolean;
  isActive: boolean;
  displayOrder: number;
  calculatorType?: string;
  fitrahAmount?: string;
  // SEO fields
  metaTitle?: string;
  metaDescription?: string;
  focusKeyphrase?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  seoScore?: number;
}

interface ZakatTypeFormProps {
  onSubmit: (data: ZakatTypeFormData) => void;
  initialData?: Partial<ZakatTypeFormData>;
  isLoading?: boolean;
}

export default function ZakatTypeForm({ onSubmit, initialData, isLoading }: ZakatTypeFormProps) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ZakatTypeFormData>({
    defaultValues: initialData || {
      hasCalculator: true,
      isActive: true,
      displayOrder: 0,
    },
  });

  const [description, setDescription] = useState(initialData?.description || "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  // Fetch public settings to get default fitrah amount
  const { data: publicSettings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const response = await api.get("/settings");
      return response.data?.data || {};
    },
  });

  const defaultFitrahAmount = publicSettings?.zakat_fitrah_amount ? String(publicSettings.zakat_fitrah_amount) : "";

  const nameValue = watch("name");

  // Sync states when initialData changes
  useEffect(() => {
    if (initialData) {
      if (initialData.description) setDescription(initialData.description);
      if (initialData.imageUrl) setImageUrl(initialData.imageUrl);
    }
  }, [initialData]);

  // Auto-generate slug from name
  useEffect(() => {
    if (nameValue && !initialData?.slug) {
      const slug = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setValue("slug", slug);
    }
  }, [nameValue, initialData, setValue]);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setValue("description", value);
  };

  const handleImageSelect = (url: string) => {
    setImageUrl(url);
    setValue("imageUrl", url);
    setIsMediaLibraryOpen(false);
  };

  // SEO state
  const [seoValues, setSeoValues] = useState<Partial<SEOData>>({
    focusKeyphrase: initialData?.focusKeyphrase || "",
    metaTitle: initialData?.metaTitle || "",
    metaDescription: initialData?.metaDescription || "",
    canonicalUrl: initialData?.canonicalUrl || "",
    noIndex: initialData?.noIndex || false,
    noFollow: initialData?.noFollow || false,
    ogTitle: initialData?.ogTitle || "",
    ogDescription: initialData?.ogDescription || "",
    ogImageUrl: initialData?.ogImageUrl || "",
    seoScore: initialData?.seoScore || 0,
  });

  const handleSEOChange = useCallback((data: Partial<SEOData>) => {
    setSeoValues(data);
  }, []);

  useEffect(() => {
    if (initialData) {
      setSeoValues({
        focusKeyphrase: initialData.focusKeyphrase || "",
        metaTitle: initialData.metaTitle || "",
        metaDescription: initialData.metaDescription || "",
        canonicalUrl: initialData.canonicalUrl || "",
        noIndex: initialData.noIndex || false,
        noFollow: initialData.noFollow || false,
        ogTitle: initialData.ogTitle || "",
        ogDescription: initialData.ogDescription || "",
        ogImageUrl: initialData.ogImageUrl || "",
        seoScore: initialData.seoScore || 0,
      });
    }
  }, [initialData]);

  const handleFormSubmit = (data: ZakatTypeFormData) => {
    onSubmit({ ...data, ...seoValues });
  };

  return (
    <>
      <form id="zakat-type-form" onSubmit={handleSubmit(handleFormSubmit)}>
        <div className="form-layout-two-column">
          {/* Main Content (Left Column) */}
          <div className="form-main-content">
            {/* Name */}
            <div className="form-field">
              <label className="form-label">
                Nama Jenis Zakat <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.name ? 'border-danger-500' : ''}`}
                {...register("name", {
                  required: "Nama wajib diisi",
                  minLength: { value: 3, message: "Minimal 3 karakter" }
                })}
                placeholder="contoh: Zakat Maal"
              />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>

            {/* Slug */}
            <div className="form-field">
              <label className="form-label">
                Slug <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.slug ? 'border-danger-500' : ''}`}
                {...register("slug", {
                  required: "Slug wajib diisi",
                  pattern: {
                    value: /^[a-z0-9-]+$/,
                    message: "Slug hanya boleh huruf kecil, angka, dan tanda hubung"
                  }
                })}
                placeholder="contoh: zakat-maal"
              />
              {errors.slug && <p className="form-error">{errors.slug.message}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Otomatis dibuat dari nama, bisa diubah manual
              </p>
            </div>

            {/* Calculator Type */}
            <div className="form-field">
              <label className="form-label">
                Jenis Kalkulator Zakat <span className="text-danger-500">*</span>
              </label>
              <select
                className={`form-input ${errors.calculatorType ? 'border-danger-500' : ''}`}
                {...register("calculatorType", {
                  required: "Jenis kalkulator wajib dipilih"
                })}
              >
                <option value="">-- Pilih Jenis Kalkulator --</option>
                <option value="zakat-fitrah">Zakat Fitrah</option>
                <option value="zakat-maal">Zakat Maal</option>
                <option value="zakat-profesi">Zakat Profesi</option>
                <option value="zakat-pertanian">Zakat Pertanian</option>
                <option value="zakat-peternakan">Zakat Peternakan</option>
              </select>
              {errors.calculatorType && <p className="form-error">{errors.calculatorType.message}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Menentukan jenis kalkulator yang digunakan untuk menghitung zakat ini
              </p>
            </div>

            {/* Description (Rich Editor) */}
            <div className="form-field">
              <label className="form-label">Deskripsi Lengkap</label>
              <RichTextEditor
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Penjelasan lengkap tentang jenis zakat ini..."
              />
              <input type="hidden" {...register("description")} />
            </div>

            {/* Section Divider */}
            <div className="form-section-divider"></div>

            {/* Icon */}
            <div className="form-field">
              <label className="form-label">Icon (Emoji)</label>
              <input
                type="text"
                className="form-input"
                {...register("icon")}
                placeholder="contoh: 💰"
                maxLength={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Emoji yang akan ditampilkan sebagai icon
              </p>
            </div>

            {/* Display Order */}
            <div className="form-field">
              <label className="form-label">Urutan Tampilan</label>
              <input
                type="number"
                className="form-input"
                {...register("displayOrder", { valueAsNumber: true })}
                placeholder="0"
                min={0}
              />
              <p className="text-xs text-gray-500 mt-1">
                Urutan tampilan di daftar (angka lebih kecil tampil lebih dulu)
              </p>
            </div>

            {/* Nominal Zakat Fitrah */}
            <div className="form-field">
              <label className="form-label">Nominal Zakat Fitrah (Rp/jiwa)</label>
              <input
                type="number"
                className="form-input"
                {...register("fitrahAmount")}
                placeholder={defaultFitrahAmount ? `Rp ${Number(defaultFitrahAmount).toLocaleString("id-ID")}` : "Kosongkan untuk menggunakan default"}
                min={0}
              />
              <p className="text-xs text-gray-500 mt-1">
                {defaultFitrahAmount
                  ? `Jika dikosongkan maka Nominal Zakat Fitrah Rp. ${Number(defaultFitrahAmount).toLocaleString("id-ID")}/Jiwa sesuai dengan sistem ini.`
                  : "Jika dikosongkan, nominal akan menggunakan nilai default dari pengaturan sistem."}
              </p>
            </div>

            {/* Has Calculator */}
            <div className="form-field">
              <div className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
                <div>
                  <label htmlFor="hasCalculator" className="form-label mb-0 cursor-pointer">
                    Ada Kalkulator
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Apakah jenis zakat ini memiliki kalkulator?
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="hasCalculator"
                    type="checkbox"
                    className="sr-only peer"
                    {...register("hasCalculator")}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Sidebar (Right Column) */}
          <div className="form-sidebar">
            {/* Featured Image */}
            <div className="form-field">
              <label className="form-label">Gambar Unggulan</label>

              {/* Image Preview with Actions */}
              {imageUrl ? (
                <div className="media-field-preview">
                  <div className="media-field-image">
                    <img src={imageUrl} alt="Preview" />
                  </div>
                  <div className="media-field-meta">
                    <p className="media-field-filename">Gambar unggulan untuk jenis zakat ini</p>
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

            {/* Active Status */}
            <div className="form-field">
              <div className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
                <div>
                  <label htmlFor="isActive" className="form-label mb-0 cursor-pointer">
                    Status Aktif
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Tampilkan jenis zakat ini di website
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="isActive"
                    type="checkbox"
                    className="sr-only peer"
                    {...register("isActive")}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </form>

      <SEOPanel
        value={seoValues}
        onChange={handleSEOChange}
        contentData={{
          title: watch("name") || "",
          slug: watch("slug") || "",
          description: description,
          content: description,
          imageUrl: imageUrl,
        }}
        entityType="zakatType"
        disabled={isLoading}
      />

      {/* Media Library Modal */}
      <MediaLibrary
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={handleImageSelect}
        selectedUrl={imageUrl}
        accept="image/*"
        category="general"
      />
    </>
  );
}
