"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import api from "@/lib/api";
import Autocomplete from "@/components/Autocomplete";
import AdminPaymentMethodList from "@/components/AdminPaymentMethodList";
import DonorModal from "@/components/modals/DonorModal";
import FeedbackDialog from "@/components/FeedbackDialog";

export default function CreateTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [donorId, setDonorId] = useState("");
  const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [redirectTransactionId, setRedirectTransactionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    product_type: "",
    product_id: "",
    quantity: 1,
    unit_price: 0,
    admin_fee: 0,
    donor_name: "",
    donor_email: "",
    donor_phone: "",
    is_anonymous: false,
    message: "",
    payment_method_id: null,
    type_specific_data: {},
    include_unique_code: false,
  });

  useEffect(() => {
    const productType = searchParams.get("product_type");
    if (productType && ["campaign", "zakat", "qurban"].includes(productType)) {
      setFormData((prev: any) => ({ ...prev, product_type: productType }));
    }
  }, [searchParams]);

  // Fetch campaigns
  const { data: campaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await api.get("/admin/campaigns", { params: { limit: 500 } });
      return response.data?.data || [];
    },
    enabled: formData.product_type === "campaign",
  });

  // Fetch zakat types
  const { data: zakatTypes } = useQuery({
    queryKey: ["zakat-types"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/types", { params: { limit: 100 } });
      return response.data?.data || [];
    },
    enabled: formData.product_type === "zakat",
  });

  // Fetch zakat periods based on selected type
  const { data: zakatPeriods } = useQuery({
    queryKey: ["zakat-periods", formData.type_specific_data?.zakat_type_id],
    queryFn: async () => {
      if (!formData.type_specific_data?.zakat_type_id) return [];
      const response = await api.get("/admin/zakat/periods", {
        params: {
          zakatTypeId: formData.type_specific_data.zakat_type_id,
          status: "active",
          limit: 100
        }
      });
      return response.data?.data || [];
    },
    enabled: formData.product_type === "zakat" && !!formData.type_specific_data?.zakat_type_id,
  });

  // Fetch qurban periods
  const { data: qurbanPeriods } = useQuery({
    queryKey: ["qurban-periods"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/periods", { params: { status: "active", limit: 100 } });
      return response.data?.data || [];
    },
    enabled: formData.product_type === "qurban",
  });

  // Fetch qurban packages based on selected period
  const { data: qurbanPackages } = useQuery({
    queryKey: ["qurban-packages", formData.type_specific_data?.period_id],
    queryFn: async () => {
      if (!formData.type_specific_data?.period_id) return [];
      const response = await api.get(`/admin/qurban/periods/${formData.type_specific_data.period_id}/packages`);
      return response.data?.data || [];
    },
    enabled: formData.product_type === "qurban" && !!formData.type_specific_data?.period_id,
  });

  // Fetch donatur
  const { data: donaturList } = useQuery({
    queryKey: ["donatur-list"],
    queryFn: async () => {
      const response = await api.get("/admin/donatur", { params: { limit: 500 } });
      return response.data?.data || [];
    },
  });


  // Fetch zakat fitrah amount setting
  const { data: zakatFitrahAmount } = useQuery({
    queryKey: ["settings", "zakat_fitrah_amount"],
    queryFn: async () => {
      const response = await api.get("/admin/settings/zakat_fitrah_amount");
      return parseInt(response.data?.data?.value || "45000");
    },
    enabled: formData.product_type === "zakat",
  });

  // Fetch fidyah amount setting
  const { data: fidyahAmount } = useQuery({
    queryKey: ["settings", "fidyah_amount_per_day"],
    queryFn: async () => {
      const response = await api.get("/admin/settings/fidyah_amount_per_day");
      return parseInt(response.data?.data?.value || "0");
    },
    enabled: formData.product_type === "campaign",
  });

  // Fetch qurban admin fees
  const { data: qurbanAdminFeeGoat } = useQuery({
    queryKey: ["settings", "amil_qurban_perekor_fee"],
    queryFn: async () => {
      const response = await api.get("/admin/settings/amil_qurban_perekor_fee");
      return parseInt(response.data?.data?.value || "0");
    },
    enabled: formData.product_type === "qurban",
  });

  const { data: qurbanAdminFeeCow } = useQuery({
    queryKey: ["settings", "amil_qurban_sapi_fee"],
    queryFn: async () => {
      const response = await api.get("/admin/settings/amil_qurban_sapi_fee");
      return parseInt(response.data?.data?.value || "0");
    },
    enabled: formData.product_type === "qurban",
  });

  const productTypeOptions = [
    { value: "campaign", label: "Campaign / Donasi" },
    { value: "zakat", label: "Zakat" },
    { value: "qurban", label: "Qurban" },
  ];

  const campaignOptions = Array.isArray(campaigns) ? campaigns.map((c: any) => ({
    value: c.id,
    label: c.title,
  })) : [];

  const zakatTypeOptions = Array.isArray(zakatTypes) ? zakatTypes.map((t: any) => ({
    value: t.id,
    label: t.name,
  })) : [];

  const zakatPeriodOptions = Array.isArray(zakatPeriods) ? zakatPeriods.map((p: any) => ({
    value: p.id,
    label: p.name,
  })) : [];

  const qurbanPeriodOptions = qurbanPeriods?.map((p: any) => ({
    value: p.id,
    label: `${p.name} (${p.hijriYear}H / ${p.gregorianYear}M)`,
  })) || [];

  const qurbanPackageOptions = qurbanPackages?.map((q: any) => ({
    value: q.packagePeriodId,
    label: `${q.name} - Rp ${q.price?.toLocaleString()}`,
  })) || [];

  const donaturOptions = donaturList?.map((d: any) => ({
    value: d.id,
    label: `${d.name} - ${d.email || d.phone || ""}`,
  })) || [];

  // Check if selected zakat type is zakat fitrah
  const isZakatFitrah = formData.product_type === "zakat" && formData.type_specific_data?.zakat_type_slug === "zakat-fitrah";

  // Check if selected campaign is fidyah
  const isFidyah = formData.product_type === "campaign" && formData.type_specific_data?.pillar === "fidyah";

  // Determine program filter based on product type and campaign pillar
  const programFilter = (() => {
    if (formData.product_type === "campaign") {
      const pillar = formData.type_specific_data?.pillar;
      if (pillar === "wakaf") {
        return "wakaf";
      } else if (pillar === "fidyah") {
        return "infaq";
      } else {
        return "infaq";
      }
    } else if (formData.product_type === "zakat") {
      return "zakat";
    } else if (formData.product_type === "qurban") {
      return "qurban";
    } else {
      return "general";
    }
  })();

  const handleDonorChange = (value: string) => {
    setDonorId(value);
    const selectedDonor = donaturList?.find((d: any) => d.id === value);
    if (selectedDonor) {
      setFormData({
        ...formData,
        donor_name: selectedDonor.name,
        donor_email: selectedDonor.email || "",
        donor_phone: selectedDonor.phone || "",
      });
    }
  };

  const handleDonorModalSuccess = (createdId?: string) => {
    setFeedback({
      open: true,
      type: "success",
      title: "Berhasil",
      message: "Donatur berhasil dibuat",
    });
    queryClient.invalidateQueries({ queryKey: ["donatur-list"] });
    if (createdId) {
      setDonorId(createdId);
    }
    setIsDonorModalOpen(false);
  };

  const handleProductTypeChange = (value: string) => {
    setFormData({
      ...formData,
      product_type: value,
      product_id: "",
      unit_price: 0,
      type_specific_data: {},
    });
  };

  const handleZakatTypeChange = (value: string) => {
    const selectedType = zakatTypes?.find((t: any) => t.id === value);
    setFormData({
      ...formData,
      product_id: "",
      unit_price: 0,
      type_specific_data: {
        zakat_type_id: value,
        zakat_type_name: selectedType?.name,
        zakat_type_slug: selectedType?.slug,
      },
    });
  };

  const handleQurbanPeriodChange = (value: string) => {
    setFormData({
      ...formData,
      product_id: "",
      unit_price: 0,
      type_specific_data: { ...formData.type_specific_data, period_id: value },
    });
  };

  const handleProductChange = (value: string) => {
    let unitPrice = 0;
    let productName = "";
    let typeSpecificData = {};

    if (formData.product_type === "campaign") {
      const campaign = campaigns?.find((c: any) => c.id === value);
      productName = campaign?.title || "";
      typeSpecificData = { campaign_id: value, pillar: campaign?.pillar };
      if (campaign?.pillar === "fidyah" && fidyahAmount) {
        unitPrice = fidyahAmount;
      }
    } else if (formData.product_type === "zakat") {
      const period = zakatPeriods?.find((p: any) => p.id === value);
      const zakatTypeName = formData.type_specific_data?.zakat_type_name || "";
      const periodInfo = period?.hijriYear
        ? `${period.year}/${period.hijriYear}`
        : period?.year?.toString() || "";
      productName = `${zakatTypeName}${periodInfo ? ` - Periode ${periodInfo}` : ""}`;
      typeSpecificData = {
        ...formData.type_specific_data, // Keep zakat type data
        zakat_period_id: value,
        zakat_period_name: period?.name,
        year: period?.year,
        hijri_year: period?.hijriYear,
      };
      // Set unit price from zakat fitrah amount if it's zakat fitrah
      if (formData.type_specific_data?.zakat_type_slug === "zakat-fitrah" && zakatFitrahAmount) {
        unitPrice = zakatFitrahAmount;
      }
    } else if (formData.product_type === "qurban") {
      const qurbanPackage = qurbanPackages?.find((q: any) => q.packagePeriodId === value);
      const selectedPeriod = qurbanPeriods?.find((p: any) => p.id === formData.type_specific_data?.period_id);
      unitPrice = qurbanPackage?.price || 0;
      const periodInfo = selectedPeriod?.hijriYear && selectedPeriod?.gregorianYear
        ? `${selectedPeriod.hijriYear}/${selectedPeriod.gregorianYear}`
        : selectedPeriod?.hijriYear || selectedPeriod?.gregorianYear || "";
      productName = `${qurbanPackage?.name}${periodInfo ? ` - Periode ${periodInfo}` : ""}`;
      typeSpecificData = {
        period_id: formData.type_specific_data?.period_id,
        package_id: qurbanPackage?.packageId,
        package_period_id: value,
        onBehalfOf: formData.type_specific_data?.onBehalfOf,
      };
    }

    // Set admin fee for qurban based on animal type and package type
    let adminFee = formData.admin_fee;
    if (formData.product_type === "qurban") {
      const qurbanPackage = qurbanPackages?.find((q: any) => q.packagePeriodId === value);

      // Get base admin fee based on animal type
      let baseAdminFee = 0;
      if (qurbanPackage?.animalType === "goat" && qurbanAdminFeeGoat) {
        baseAdminFee = qurbanAdminFeeGoat;
      } else if (qurbanPackage?.animalType === "cow" && qurbanAdminFeeCow) {
        baseAdminFee = qurbanAdminFeeCow;
      }

      // If shared/patungan, divide by maxSlots
      if (qurbanPackage?.packageType === "shared" && qurbanPackage?.maxSlots && qurbanPackage.maxSlots > 0) {
        adminFee = Math.round(baseAdminFee / qurbanPackage.maxSlots);
      } else {
        // Individual package, use full admin fee
        adminFee = baseAdminFee;
      }
    }

    setFormData({
      ...formData,
      product_id: value,
      product_name: productName,
      unit_price: unitPrice,
      admin_fee: adminFee,
      type_specific_data: typeSpecificData,
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/transactions", data);
      return response.data;
    },
    onSuccess: (data) => {
      setRedirectTransactionId(data?.data?.id || null);
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Transaksi berhasil dibuat",
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal membuat transaksi",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_type) {
      setFeedback({
        open: true,
        type: "error",
        title: "Validasi",
        message: "Pilih tipe produk",
      });
      return;
    }
    if (!formData.product_id) {
      setFeedback({
        open: true,
        type: "error",
        title: "Validasi",
        message: "Pilih produk",
      });
      return;
    }
    if (!formData.donor_name) {
      setFeedback({
        open: true,
        type: "error",
        title: "Validasi",
        message: "Nama donatur wajib diisi",
      });
      return;
    }
    if (!formData.donor_phone) {
      setFeedback({
        open: true,
        type: "error",
        title: "Validasi",
        message: "Nomor telepon donatur wajib diisi",
      });
      return;
    }

    const payload = {
      product_type: formData.product_type,
      product_id: formData.product_id,
      quantity: parseInt(formData.quantity) || 1,
      unit_price: parseInt(formData.unit_price) || 0,
      admin_fee: parseInt(formData.admin_fee) || 0,
      donor_name: formData.donor_name,
      donor_email: formData.donor_email || undefined,
      donor_phone: formData.donor_phone,
      donatur_id: donorId || undefined,
      is_anonymous: formData.is_anonymous,
      message: formData.message || undefined,
      payment_method_id: formData.payment_method_id || undefined,
      type_specific_data: formData.type_specific_data,
      include_unique_code: formData.include_unique_code,
    };

    createMutation.mutate(payload);
  };

  const subtotal = (formData.quantity || 1) * (formData.unit_price || 0);
  const total = subtotal + (formData.admin_fee || 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Kembali
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Buat Transaksi Baru</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Product Type */}
          <div>
            <label className="form-label">
              Tipe Transaksi <span className="text-danger-500">*</span>
            </label>
            <Autocomplete
              options={productTypeOptions}
              value={formData.product_type}
              onChange={handleProductTypeChange}
              placeholder="Pilih tipe transaksi"
              allowClear={false}
            />
          </div>

          {/* Zakat Type Selection */}
          {formData.product_type === "zakat" && (
            <div>
              <label className="form-label">
                Jenis Zakat <span className="text-danger-500">*</span>
              </label>
              <Autocomplete
                options={zakatTypeOptions}
                value={formData.type_specific_data?.zakat_type_id || ""}
                onChange={handleZakatTypeChange}
                placeholder="Pilih jenis zakat"
                allowClear={false}
              />
            </div>
          )}

          {/* Qurban Period Selection */}
          {formData.product_type === "qurban" && (
            <div>
              <label className="form-label">
                Periode Qurban <span className="text-danger-500">*</span>
              </label>
              <Autocomplete
                options={qurbanPeriodOptions}
                value={formData.type_specific_data?.period_id || ""}
                onChange={handleQurbanPeriodChange}
                placeholder="Pilih periode qurban"
                allowClear={false}
              />
            </div>
          )}

          {/* Product Selection */}
          {formData.product_type === "campaign" && (
            <div>
              <label className="form-label">
                Campaign
                <span className="text-danger-500"> *</span>
              </label>
              <Autocomplete
                options={campaignOptions}
                value={formData.product_id}
                onChange={handleProductChange}
                placeholder="Pilih campaign"
                allowClear={false}
              />
            </div>
          )}

          {/* Zakat Period Selection */}
          {formData.product_type === "zakat" && formData.type_specific_data?.zakat_type_id && (
            <div>
              <label className="form-label">
                Periode Zakat <span className="text-danger-500">*</span>
              </label>
              <Autocomplete
                options={zakatPeriodOptions}
                value={formData.product_id}
                onChange={handleProductChange}
                placeholder="Pilih periode zakat"
                allowClear={false}
              />
            </div>
          )}

          {/* Qurban Package Selection */}
          {formData.product_type === "qurban" && formData.type_specific_data?.period_id && (
            <div>
              <label className="form-label">
                Paket Qurban <span className="text-danger-500">*</span>
              </label>
              <Autocomplete
                options={qurbanPackageOptions}
                value={formData.product_id}
                onChange={handleProductChange}
                placeholder="Pilih paket qurban"
                allowClear={false}
              />
            </div>
          )}

          {/* Order Details */}
          {formData.product_id && (
            <>
              {/* Unique Code Option */}
              <div className="border-t pt-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="include_unique_code"
                    checked={formData.include_unique_code}
                    onChange={(e) => setFormData({ ...formData, include_unique_code: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="include_unique_code" className="text-sm font-medium">
                    Sertakan Kode Unik
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Centang jika donatur akan melakukan transfer bank dan membutuhkan kode unik untuk verifikasi.
                </p>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Detail Order</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      min="1"
                      disabled={formData.product_type !== "qurban" && !isZakatFitrah && !isFidyah}
                    />
                    {isZakatFitrah && (
                      <p className="text-xs text-gray-500 mt-1">
                        Jumlah jiwa yang akan dibayarkan zakat fitrah
                      </p>
                    )}
                    {isFidyah && (
                      <p className="text-xs text-gray-500 mt-1">
                        Jumlah hari × jumlah orang
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">
                      Harga Satuan (Rp)
                      {isZakatFitrah && <span className="text-xs text-gray-500 ml-2">(Nominal Zakat Fitrah/jiwa)</span>}
                      {isFidyah && <span className="text-xs text-gray-500 ml-2">(Nominal Fidyah/hari)</span>}
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      min="0"
                      disabled={formData.product_type === "qurban" || isZakatFitrah || isFidyah}
                    />
                  </div>

                  {formData.product_type === "qurban" && (
                    <div>
                      <label className="form-label">
                        Admin Fee (Rp)
                        <span className="text-xs text-gray-500 ml-2">(Biaya administrasi perekor)</span>
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.admin_fee}
                        onChange={(e) => setFormData({ ...formData, admin_fee: e.target.value })}
                        min="0"
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {(() => {
                          const qurbanPackage = qurbanPackages?.find((q: any) => q.packagePeriodId === formData.product_id);
                          if (qurbanPackage?.packageType === "shared" && qurbanPackage?.maxSlots) {
                            return `Otomatis dari pengaturan (dibagi ${qurbanPackage.maxSlots} slot untuk paket patungan)`;
                          }
                          return "Otomatis dari pengaturan Administrasi Qurban";
                        })()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Subtotal:</span>
                    <span>Rp {subtotal.toLocaleString()}</span>
                  </div>
                  {formData.admin_fee > 0 && (
                    <div className="flex justify-between text-sm mb-2">
                      <span>Admin Fee:</span>
                      <span>Rp {parseInt(formData.admin_fee || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>Rp {total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Donor Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Informasi Donatur</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">
                      Pilih Donatur <span className="text-danger-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Autocomplete
                          options={donaturOptions}
                          value={donorId}
                          onChange={handleDonorChange}
                          placeholder="Pilih donatur atau ketik untuk mencari..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDonorModalOpen(true)}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <PlusIcon className="h-5 w-5 mr-1" />
                        Tambah Baru
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">
                      Nama <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.donor_name}
                      onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
                      placeholder="Nama donatur"
                      readOnly={!!donorId}
                    />
                  </div>

                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.donor_email}
                      onChange={(e) => setFormData({ ...formData, donor_email: e.target.value })}
                      placeholder="email@example.com"
                      readOnly={!!donorId}
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Nomor Telepon <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="tel"
                      className="form-input"
                      value={formData.donor_phone}
                      onChange={(e) => setFormData({ ...formData, donor_phone: e.target.value })}
                      placeholder="08123456789"
                      readOnly={!!donorId}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is_anonymous"
                      checked={formData.is_anonymous}
                      onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="is_anonymous" className="text-sm">
                      Donasi Anonim
                    </label>
                  </div>

                  <div>
                    <label className="form-label">Pesan / Doa</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tulis pesan atau doa..."
                    />
                  </div>

                  {(formData.product_type === "qurban" || formData.product_type === "zakat") && (
                    <div>
                      <label className="form-label">Atas Nama (Opsional)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.type_specific_data?.onBehalfOf || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          type_specific_data: {
                            ...formData.type_specific_data,
                            onBehalfOf: e.target.value
                          }
                        })}
                        placeholder="Contoh: Keluarga Ahmad"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Options */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Opsi Pembayaran</h3>
                <div>
                  <label className="form-label">Metode Pembayaran (Opsional)</label>
                  <AdminPaymentMethodList
                    value={formData.payment_method_id || ""}
                    onChange={(value) => setFormData({ ...formData, payment_method_id: value || null })}
                    types={["cash", "bank_transfer", "qris"]}
                    programFilter={programFilter}
                    placeholder="Pilih metode pembayaran"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Kosongkan jika pembayaran dilakukan nanti
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 justify-end pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={createMutation.isPending}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              disabled={createMutation.isPending || !formData.product_id}
            >
              {createMutation.isPending ? "Menyimpan..." : "Buat Transaksi"}
            </button>
          </div>
        </form>

        {/* Donor Modal */}
        <DonorModal
          isOpen={isDonorModalOpen}
          onClose={() => setIsDonorModalOpen(false)}
          onSuccess={handleDonorModalSuccess}
        />

        <FeedbackDialog
          open={feedback.open}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={() => {
            setFeedback((prev) => ({ ...prev, open: false }));
            if (redirectTransactionId) {
              const id = redirectTransactionId;
              setRedirectTransactionId(null);
              router.push(`/dashboard/transactions/${id}`);
            }
          }}
        />
      </div>
    </div>
  );
}
