"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import Autocomplete from "@/components/Autocomplete";
import DonorModal from "@/components/modals/DonorModal";

export default function CreateTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [donorId, setDonorId] = useState("");
  const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
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

  // Fetch qurban periods
  const { data: qurbanPeriods } = useQuery({
    queryKey: ["qurban-periods"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/periods", { params: { isActive: "true", limit: 100 } });
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

  // Fetch payment methods
  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const response = await api.get("/payments/methods");
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

  const campaignOptions = campaigns?.map((c: any) => ({
    value: c.id,
    label: c.title,
  })) || [];

  const zakatTypeOptions = zakatTypes?.map((z: any) => ({
    value: z.id,
    label: z.name,
  })) || [];

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
  const selectedZakatType = zakatTypes?.find((z: any) => z.id === formData.product_id);
  const isZakatFitrah = formData.product_type === "zakat" && selectedZakatType?.slug === "zakat-fitrah";

  const paymentMethodOptions = (() => {
    const methods = paymentMethods || [];

    // Determine target program based on product type and pillar
    let targetProgram = "general";

    if (formData.product_type === "campaign") {
      const pillar = formData.type_specific_data?.pillar;
      if (pillar === "wakaf") {
        targetProgram = "wakaf";
      } else {
        targetProgram = "infaq";
      }
    } else if (formData.product_type === "zakat") {
      targetProgram = "zakat";
    } else if (formData.product_type === "qurban") {
      targetProgram = "qurban";
    } else {
      targetProgram = "infaq";
    }

    // Filter methods: bank_transfer and qris only
    const bankAndQris = methods.filter((m: any) =>
      m.type === "bank_transfer" || m.type === "qris"
    );

    // Check if there are accounts for target program
    const hasTargetProgram = bankAndQris.some((m: any) => {
      const programs = m.programs && m.programs.length > 0 ? m.programs : ["general"];
      return programs.includes(targetProgram);
    });

    // Filter based on availability
    const filtered = bankAndQris.filter((m: any) => {
      const programs = m.programs && m.programs.length > 0 ? m.programs : ["general"];

      if (hasTargetProgram) {
        return programs.includes(targetProgram);
      } else {
        return programs.includes("general");
      }
    });

    return filtered.map((method: any) => {
      const programs = method.programs && method.programs.length > 0 ? method.programs : ["general"];
      const programLabel = programs.join(", ");

      let label = method.name;
      if (method.type === "bank_transfer") {
        const accountNumber = method.details?.accountNumber || "";
        const accountName = method.details?.accountName || "";
        label = `${method.details?.bankName || method.name} - ${accountNumber}${accountName ? ` - a.n ${accountName}` : ""} [${programLabel}]`;
      } else if (method.type === "qris") {
        const qrisName = method.details?.name || method.name;
        label = `${qrisName} [${programLabel}]`;
      }

      return {
        value: method.code,
        label,
      };
    });
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
    toast.success("Donatur berhasil dibuat");
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

  const handleQurbanPeriodChange = (value: string) => {
    setFormData({
      ...formData,
      product_id: "",
      unit_price: 0,
      type_specific_data: { period_id: value },
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
    } else if (formData.product_type === "zakat") {
      const zakatType = zakatTypes?.find((z: any) => z.id === value);
      productName = zakatType?.name || "";
      typeSpecificData = { zakat_type_id: value };
      // Set unit price from zakat fitrah amount if it's zakat fitrah
      if (zakatType?.slug === "zakat-fitrah" && zakatFitrahAmount) {
        unitPrice = zakatFitrahAmount;
      }
    } else if (formData.product_type === "qurban") {
      const qurbanPackage = qurbanPackages?.find((q: any) => q.packagePeriodId === value);
      const selectedPeriod = qurbanPeriods?.find((p: any) => p.id === formData.type_specific_data?.period_id);
      unitPrice = qurbanPackage?.price || 0;
      productName = `${qurbanPackage?.name} - ${selectedPeriod?.name || selectedPeriod?.hijriYear + 'H'}`;
      typeSpecificData = {
        period_id: formData.type_specific_data?.period_id,
        package_id: qurbanPackage?.packageId,
        package_period_id: value,
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
      toast.success("Transaksi berhasil dibuat");
      router.push(`/dashboard/transactions/${data.data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal membuat transaksi");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_type) {
      toast.error("Pilih tipe produk");
      return;
    }
    if (!formData.product_id) {
      toast.error("Pilih produk");
      return;
    }
    if (!formData.donor_name) {
      toast.error("Nama donatur wajib diisi");
      return;
    }
    if (!formData.donor_phone) {
      toast.error("Nomor telepon donatur wajib diisi");
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
          {formData.product_type && formData.product_type !== "qurban" && (
            <div>
              <label className="form-label">
                {formData.product_type === "campaign" && "Campaign"}
                {formData.product_type === "zakat" && "Jenis Zakat"}
                <span className="text-danger-500"> *</span>
              </label>
              <Autocomplete
                options={
                  formData.product_type === "campaign"
                    ? campaignOptions
                    : zakatTypeOptions
                }
                value={formData.product_id}
                onChange={handleProductChange}
                placeholder={`Pilih ${formData.product_type === "campaign" ? "campaign" : "jenis zakat"}`}
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
                      disabled={formData.product_type !== "qurban" && !isZakatFitrah}
                    />
                    {isZakatFitrah && (
                      <p className="text-xs text-gray-500 mt-1">
                        Jumlah jiwa yang akan dibayarkan zakat fitrah
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">
                      Harga Satuan (Rp)
                      {isZakatFitrah && <span className="text-xs text-gray-500 ml-2">(Nominal Zakat Fitrah/jiwa)</span>}
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      min="0"
                      disabled={formData.product_type === "qurban" || isZakatFitrah}
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
                </div>
              </div>

              {/* Payment Options */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Opsi Pembayaran</h3>
                <div>
                  <label className="form-label">Metode Pembayaran (Opsional)</label>
                  <Autocomplete
                    options={paymentMethodOptions}
                    value={formData.payment_method_id || ""}
                    onChange={(value) => setFormData({ ...formData, payment_method_id: value || null })}
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
          disablePassword={true}
        />
      </div>
    </div>
  );
}
