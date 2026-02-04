"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import RichTextEditor from "./RichTextEditor";
import MediaLibrary from "./MediaLibrary";
import api from "@/lib/api";

export interface PackagePeriod {
  periodId: string;
  periodName?: string;
  price: number;
  stock: number;
  isAvailable: boolean;
}

export interface QurbanPackageFormData {
  name: string;
  description: string;
  animalType: "cow" | "goat";
  packageType: "individual" | "shared";
  maxSlots?: number;
  imageUrl?: string;
  isFeatured: boolean;
  periods: PackagePeriod[];
}

interface QurbanPackageFormProps {
  onSubmit: (data: QurbanPackageFormData) => void;
  initialData?: Partial<QurbanPackageFormData>;
  isLoading?: boolean;
}

interface Period {
  id: string;
  name: string;
  hijriYear: string;
  gregorianYear: number;
  status: "draft" | "active" | "closed" | "executed";
}

export default function QurbanPackageForm({ onSubmit, initialData, isLoading }: QurbanPackageFormProps) {
  const { register, handleSubmit, formState: { errors }, setValue, watch, control } = useForm<QurbanPackageFormData>({
    defaultValues: initialData || {
      animalType: "cow",
      packageType: "individual",
      isFeatured: false,
      periods: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "periods",
  });

  const [description, setDescription] = useState(initialData?.description || "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  const packageType = watch("packageType");

  // Fetch periods for dropdown
  const { data: periodsData, isLoading: isLoadingPeriods } = useQuery({
    queryKey: ["qurban-periods-list"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/periods");
      return response.data;
    },
  });

  // Handle both response formats: { data: [] } or direct array
  const periods: Period[] = Array.isArray(periodsData)
    ? periodsData
    : (periodsData?.data || []);

  // Get already selected period IDs
  const selectedPeriodIds = fields.map((field) => field.periodId);

  // Filter available periods (not yet selected)
  const availablePeriods = periods.filter(
    (period) => !selectedPeriodIds.includes(period.id)
  );

  // Sync states when initialData changes
  useEffect(() => {
    if (initialData) {
      if (initialData.description) setDescription(initialData.description);
      if (initialData.imageUrl) setImageUrl(initialData.imageUrl);
    }
  }, [initialData]);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setValue("description", value);
  };

  const handleImageSelect = (url: string) => {
    setImageUrl(url);
    setValue("imageUrl", url);
    setIsMediaLibraryOpen(false);
  };

  const handleAddPeriod = () => {
    if (availablePeriods.length === 0) return;

    append({
      periodId: "",
      price: 0,
      stock: 0,
      isAvailable: true,
    });
  };

  const getPeriodName = (periodId: string) => {
    const period = periods.find((p) => p.id === periodId);
    return period ? period.name : "";
  };

  return (
    <>
      <form id="qurban-package-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="form-layout-two-column">
          {/* Main Content (Left Column) */}
          <div className="form-main-content">
            {/* Package Info Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Informasi Paket
              </h3>

              {/* Name */}
              <div className="form-field">
                <label className="form-label">
                  Nama Paket <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? 'border-danger-500' : ''}`}
                  {...register("name", {
                    required: "Nama paket wajib diisi",
                    minLength: { value: 3, message: "Minimal 3 karakter" }
                  })}
                  placeholder="contoh: Sapi Premium Patungan 7 Orang"
                />
                {errors.name && <p className="form-error">{errors.name.message}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Nama paket yang akan digunakan di semua periode
                </p>
              </div>

              {/* Animal Type and Package Type (Row) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label">
                    Jenis Hewan <span className="text-danger-500">*</span>
                  </label>
                  <select
                    className={`form-input ${errors.animalType ? 'border-danger-500' : ''}`}
                    {...register("animalType", {
                      required: "Jenis hewan wajib dipilih"
                    })}
                  >
                    <option value="cow">🐄 Sapi</option>
                    <option value="goat">🐐 Kambing</option>
                  </select>
                  {errors.animalType && <p className="form-error">{errors.animalType.message}</p>}
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Tipe Paket <span className="text-danger-500">*</span>
                  </label>
                  <select
                    className={`form-input ${errors.packageType ? 'border-danger-500' : ''}`}
                    {...register("packageType", {
                      required: "Tipe paket wajib dipilih"
                    })}
                  >
                    <option value="individual">Individual</option>
                    <option value="shared">Patungan</option>
                  </select>
                  {errors.packageType && <p className="form-error">{errors.packageType.message}</p>}
                </div>
              </div>

              {/* Max Slots (only for shared) */}
              {packageType === "shared" && (
                <div className="form-field">
                  <label className="form-label">
                    Maksimal Slot <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="number"
                    className={`form-input ${errors.maxSlots ? 'border-danger-500' : ''}`}
                    {...register("maxSlots", {
                      required: packageType === "shared" ? "Maksimal slot wajib diisi untuk paket patungan" : false,
                      valueAsNumber: true,
                      min: { value: 2, message: "Minimal 2 slot" },
                      max: { value: 7, message: "Maksimal 7 slot" }
                    })}
                    placeholder="5 atau 7"
                    min="2"
                    max="7"
                  />
                  {errors.maxSlots && <p className="form-error">{errors.maxSlots.message}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Jumlah maksimal orang yang dapat berbagi dalam satu paket (biasanya 5 atau 7)
                  </p>
                </div>
              )}

              {/* Description (Rich Editor) */}
              <div className="form-field">
                <label className="form-label">Deskripsi Lengkap</label>
                <RichTextEditor
                  value={description}
                  onChange={handleDescriptionChange}
                  placeholder="Penjelasan lengkap tentang paket qurban ini..."
                />
                <input type="hidden" {...register("description")} />
              </div>
            </div>

            {/* Period-Price Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Harga & Stok per Periode
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Paket ini dapat dijual di berbagai periode dengan harga berbeda
                  </p>
                </div>
                {!isLoadingPeriods && availablePeriods.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleAddPeriod}
                  >
                    <PlusIcon className="w-4 h-4" />
                    Tambah Periode
                  </button>
                )}
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 mb-4">
                    Belum ada periode ditambahkan
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-md"
                    onClick={handleAddPeriod}
                    disabled={isLoadingPeriods || availablePeriods.length === 0}
                  >
                    <PlusIcon className="w-5 h-5" />
                    {isLoadingPeriods ? "Memuat periode..." : "Tambah Periode Pertama"}
                  </button>
                  {!isLoadingPeriods && availablePeriods.length === 0 && (
                    <p className="text-sm text-gray-400 mt-2">
                      Tidak ada periode tersedia. Buat periode baru terlebih dahulu.
                    </p>
                  )}
                  {!isLoadingPeriods && periods.length > 0 && (
                    <p className="text-xs text-green-600 mt-2">
                      {periods.length} periode tersedia
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const error = errors.periods?.[index];
                    const currentPeriodId = watch(`periods.${index}.periodId`);

                    return (
                      <div
                        key={field.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="text-sm font-medium text-gray-700">
                            Periode #{index + 1}
                          </h4>
                          <button
                            type="button"
                            className="text-danger-600 hover:text-danger-700"
                            onClick={() => remove(index)}
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {/* Period Selection */}
                          <div className="form-field">
                            <label className="form-label text-sm">
                              Periode <span className="text-danger-500">*</span>
                            </label>
                            <select
                              className={`form-input ${error?.periodId ? 'border-danger-500' : ''}`}
                              {...register(`periods.${index}.periodId`, {
                                required: "Periode wajib dipilih"
                              })}
                            >
                              <option value="">Pilih Periode</option>
                              {currentPeriodId && (
                                <option value={currentPeriodId}>
                                  {getPeriodName(currentPeriodId)}
                                </option>
                              )}
                              {availablePeriods.map((period) => (
                                <option key={period.id} value={period.id}>
                                  {period.name}
                                </option>
                              ))}
                            </select>
                            {error?.periodId && (
                              <p className="form-error text-xs">{error.periodId.message}</p>
                            )}
                          </div>

                          {/* Price and Stock */}
                          {packageType === "shared" ? (
                            // Shared package: input total price, auto-calculate per slot
                            <>
                              <div className="form-field">
                                <label className="form-label text-sm">
                                  Harga Utuh (Total 1 Hewan) <span className="text-danger-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  className={`form-input ${error?.price ? 'border-danger-500' : ''}`}
                                  placeholder="0"
                                  min="1000"
                                  step="1000"
                                  onChange={(e) => {
                                    const totalPrice = parseInt(e.target.value) || 0;
                                    const maxSlots = watch("maxSlots") || 1;
                                    const pricePerSlot = Math.floor(totalPrice / maxSlots);
                                    setValue(`periods.${index}.price`, pricePerSlot);
                                  }}
                                  defaultValue={(() => {
                                    const pricePerSlot = watch(`periods.${index}.price`);
                                    const maxSlots = watch("maxSlots") || 1;
                                    return pricePerSlot ? pricePerSlot * maxSlots : undefined;
                                  })()}
                                  key={`total-price-${index}-${watch("maxSlots")}`}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Masukkan harga total 1 ekor hewan
                                </p>
                                {error?.price && (
                                  <p className="form-error text-xs">{error.price.message}</p>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="form-field">
                                  <label className="form-label text-sm">
                                    Harga per Slot
                                  </label>
                                  <input
                                    type="text"
                                    className="form-input bg-gray-100"
                                    value={new Intl.NumberFormat("id-ID", {
                                      style: "currency",
                                      currency: "IDR",
                                      minimumFractionDigits: 0,
                                    }).format(watch(`periods.${index}.price`) || 0)}
                                    readOnly
                                    disabled
                                  />
                                  <input
                                    type="hidden"
                                    {...register(`periods.${index}.price`, {
                                      required: "Harga wajib diisi",
                                      valueAsNumber: true,
                                      min: { value: 1000, message: "Minimal Rp 1.000" }
                                    })}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Otomatis dihitung: Harga Utuh / {watch("maxSlots") || 1} slot
                                  </p>
                                </div>

                                <div className="form-field">
                                  <label className="form-label text-sm">
                                    Stok <span className="text-danger-500">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    className={`form-input ${error?.stock ? 'border-danger-500' : ''}`}
                                    {...register(`periods.${index}.stock`, {
                                      required: "Stok wajib diisi",
                                      valueAsNumber: true,
                                      min: { value: 0, message: "Minimal 0" }
                                    })}
                                    placeholder="0"
                                    min="0"
                                  />
                                  {error?.stock && (
                                    <p className="form-error text-xs">{error.stock.message}</p>
                                  )}
                                </div>
                              </div>
                            </>
                          ) : (
                            // Individual package: direct price input
                            <div className="grid grid-cols-2 gap-4">
                              <div className="form-field">
                                <label className="form-label text-sm">
                                  Harga <span className="text-danger-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  className={`form-input ${error?.price ? 'border-danger-500' : ''}`}
                                  {...register(`periods.${index}.price`, {
                                    required: "Harga wajib diisi",
                                    valueAsNumber: true,
                                    min: { value: 1000, message: "Minimal Rp 1.000" }
                                  })}
                                  placeholder="0"
                                  min="1000"
                                  step="1000"
                                />
                                {error?.price && (
                                  <p className="form-error text-xs">{error.price.message}</p>
                                )}
                              </div>

                              <div className="form-field">
                                <label className="form-label text-sm">
                                  Stok <span className="text-danger-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  className={`form-input ${error?.stock ? 'border-danger-500' : ''}`}
                                  {...register(`periods.${index}.stock`, {
                                    required: "Stok wajib diisi",
                                    valueAsNumber: true,
                                    min: { value: 0, message: "Minimal 0" }
                                  })}
                                  placeholder="0"
                                  min="0"
                                />
                                {error?.stock && (
                                  <p className="form-error text-xs">{error.stock.message}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Availability Toggle */}
                          <div className="flex items-center justify-between py-2 px-3 bg-white rounded border border-gray-200">
                            <label htmlFor={`isAvailable-${index}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                              Tersedia untuk dijual
                            </label>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                id={`isAvailable-${index}`}
                                type="checkbox"
                                className="sr-only peer"
                                {...register(`periods.${index}.isAvailable`)}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {errors.periods && typeof errors.periods === 'object' && !Array.isArray(errors.periods) && (
                <p className="form-error mt-2">
                  {(errors.periods as any).message || "Minimal 1 periode harus ditambahkan"}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar (Right Column) */}
          <div className="form-sidebar">
            {/* Featured Image */}
            <div className="form-field">
              <label className="form-label">Gambar Paket</label>

              {/* Image Preview with Actions */}
              {imageUrl ? (
                <div className="media-field-preview">
                  <div className="media-field-image">
                    <img src={imageUrl} alt="Preview" />
                  </div>
                  <div className="media-field-meta">
                    <p className="media-field-filename">Gambar untuk paket qurban ini</p>
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
                    Tetapkan gambar paket
                  </button>
                </div>
              )}

              {/* Hidden input for form */}
              <input type="hidden" {...register("imageUrl")} />
            </div>

            {/* Featured Status */}
            <div className="form-field">
              <div className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
                <div>
                  <label htmlFor="isFeatured" className="form-label mb-0 cursor-pointer">
                    Paket Unggulan
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Tampilkan sebagai paket unggulan
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

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium mb-2">
                💡 Tips
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Paket master dapat digunakan di berbagai periode</li>
                <li>• Harga dan stok dapat berbeda untuk setiap periode</li>
                <li>• Contoh: Sapi Premium di 2026 Rp 3,5jt, di 2027 Rp 3,8jt</li>
              </ul>
            </div>
          </div>
        </div>
      </form>

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
