"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import { toast } from "react-hot-toast";
import EmployeeModal from "@/components/modals/EmployeeModal";
import MustahiqModal from "@/components/modals/MustahiqModal";

const ASNAF_CATEGORIES = [
  { value: "fakir", label: "Fakir", description: "Orang yang tidak memiliki harta dan tidak mampu berusaha" },
  { value: "miskin", label: "Miskin", description: "Orang yang memiliki harta namun tidak mencukupi kebutuhan dasar" },
  { value: "amil", label: "Amil", description: "Pengelola zakat" },
  { value: "mualaf", label: "Mualaf", description: "Orang yang baru masuk Islam atau yang perlu dikuatkan imannya" },
  { value: "riqab", label: "Riqab", description: "Budak yang ingin memerdekakan diri / orang terlilit hutang" },
  { value: "gharim", label: "Gharim", description: "Orang yang berutang untuk kepentingan baik" },
  { value: "fisabilillah", label: "Fisabilillah", description: "Orang yang berjuang di jalan Allah" },
  { value: "ibnus_sabil", label: "Ibnus Sabil", description: "Musafir yang kehabisan bekal" },
];

export default function NewDistributionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    zakatTypeId: "",
    recipientType: "", // "coordinator" or "direct"
    recipientCategory: "",
    recipientName: "",
    recipientContact: "",
    distributionLocation: "", // for coordinator
    recipientCount: "", // for coordinator
    amount: "",
    purpose: "",
    description: "",
    notes: "",
  });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedMustahiqId, setSelectedMustahiqId] = useState("");
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isMustahiqModalOpen, setIsMustahiqModalOpen] = useState(false);

  // Fetch zakat types
  const { data: zakatTypesData, isLoading: isLoadingTypes } = useQuery({
    queryKey: ["zakat-types-active"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/types", {
        params: { isActive: "true", limit: 100 },
      });
      return response.data?.data || [];
    },
  });

  // Fetch employees
  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const response = await api.get("/admin/employees", {
        params: { status: "active", limit: 100 },
      });
      return response.data?.data || [];
    },
    enabled: formData.recipientType === "coordinator",
  });

  // Fetch mustahiqs
  const { data: mustahiqsData, isLoading: isLoadingMustahiqs } = useQuery({
    queryKey: ["mustahiqs-active"],
    queryFn: async () => {
      const response = await api.get("/admin/mustahiqs", {
        params: { status: "active", limit: 100 },
      });
      return response.data?.data || [];
    },
    enabled: formData.recipientType === "direct",
  });

  const zakatTypeOptions = zakatTypesData?.map((type: any) => ({
    value: type.id,
    label: `${type.icon || ""} ${type.name}`,
  })) || [];

  const recipientTypeOptions = [
    { value: "coordinator", label: "Penanggung Jawab Distribusi (Employee)" },
    { value: "direct", label: "Penerima Langsung (Mustahiq)" },
  ];

  const employeeOptions = employeesData?.map((emp: any) => ({
    value: emp.id,
    label: `${emp.name} - ${emp.position || ""}`,
  })) || [];

  const mustahiqOptions = mustahiqsData?.map((mustahiq: any) => ({
    value: mustahiq.id,
    label: `${mustahiq.name} (${mustahiq.asnafCategory})`,
  })) || [];

  const asnafOptions = ASNAF_CATEGORIES.map(cat => ({
    value: cat.value,
    label: cat.label,
  }));

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post("/admin/zakat/distributions", payload);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["zakat-distributions"] });
      toast.success("Penyaluran berhasil dibuat");
      router.push(`/dashboard/zakat/distributions/${response.data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal membuat penyaluran");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.recipientType) {
      toast.error("Tipe penerima harus dipilih");
      return;
    }
    if (!formData.zakatTypeId) {
      toast.error("Jenis zakat harus dipilih");
      return;
    }
    if (!formData.recipientCategory) {
      toast.error("Kategori asnaf harus dipilih");
      return;
    }

    // Validation for coordinator type
    if (formData.recipientType === "coordinator") {
      if (!selectedEmployeeId) {
        toast.error("Penanggung jawab harus dipilih");
        return;
      }
      if (!formData.distributionLocation.trim()) {
        toast.error("Lokasi distribusi harus diisi");
        return;
      }
      if (!formData.recipientCount || parseInt(formData.recipientCount) <= 0) {
        toast.error("Jumlah penerima harus lebih dari 0");
        return;
      }
    }

    // Validation for direct recipient type
    if (formData.recipientType === "direct") {
      if (!selectedMustahiqId) {
        toast.error("Penerima zakat harus dipilih");
        return;
      }
      if (!formData.recipientName.trim()) {
        toast.error("Nama penerima harus diisi");
        return;
      }
    }

    if (!formData.amount || parseInt(formData.amount) <= 0) {
      toast.error("Jumlah penyaluran harus lebih dari 0");
      return;
    }
    if (!formData.purpose.trim()) {
      toast.error("Tujuan penyaluran harus diisi");
      return;
    }

    // Prepare payload
    const payload: any = {
      zakatTypeId: formData.zakatTypeId,
      recipientType: formData.recipientType,
      recipientCategory: formData.recipientCategory,
      amount: parseInt(formData.amount),
      purpose: formData.purpose,
      description: formData.description,
      notes: formData.notes,
    };

    if (formData.recipientType === "coordinator") {
      payload.coordinatorId = selectedEmployeeId;
      payload.recipientName = formData.recipientName;
      payload.distributionLocation = formData.distributionLocation;
      payload.recipientCount = parseInt(formData.recipientCount);
    } else {
      payload.mustahiqId = selectedMustahiqId;
      payload.recipientName = formData.recipientName;
      payload.recipientContact = formData.recipientContact;
    }

    createMutation.mutate(payload);
  };

  const selectedAsnaf = ASNAF_CATEGORIES.find(cat => cat.value === formData.recipientCategory);

  const handleCancel = () => {
    router.push("/dashboard/zakat/distributions");
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const employee = employeesData?.find((e: any) => e.id === employeeId);
    if (employee) {
      setFormData(prev => ({
        ...prev,
        recipientName: employee.name,
        recipientContact: employee.phone || employee.email || "",
      }));
    }
  };

  const handleMustahiqSelect = (mustahiqId: string) => {
    setSelectedMustahiqId(mustahiqId);
    const mustahiq = mustahiqsData?.find((m: any) => m.id === mustahiqId);
    if (mustahiq) {
      setFormData(prev => ({
        ...prev,
        recipientName: mustahiq.name,
        recipientContact: mustahiq.phone || mustahiq.email || "",
        recipientCategory: mustahiq.asnafCategory,
      }));
    }
  };

  const handleEmployeeModalSuccess = (createdId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["employees-active"] });
    setIsEmployeeModalOpen(false);
    if (createdId) {
      setSelectedEmployeeId(createdId);
      // Auto-select after refetch
      setTimeout(() => {
        handleEmployeeSelect(createdId);
      }, 500);
    }
  };

  const handleMustahiqModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["mustahiqs-active"] });
    setIsMustahiqModalOpen(false);
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="dashboard-container">
        {/* Header */}
        <div className="form-page-header">
          <button className="btn btn-secondary btn-md" onClick={handleCancel}>
            <ArrowLeftIcon className="w-5 h-5" />
            Kembali
          </button>

          <div className="form-page-header-content">
            <h1 className="form-page-title">Buat Penyaluran Baru</h1>
            <p className="form-page-subtitle">
              Catat penyaluran dana zakat kepada penerima (8 asnaf)
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="form-page-card">
          <form id="distribution-form" onSubmit={handleSubmit}>
            {/* Recipient Information */}
            <div className="form-section">
              <h3 className="form-section-title">Informasi Penerima</h3>
              <div className="form-grid">
                <div className="form-group col-span-2">
                  <label className="form-label">
                    Tipe Penerima <span className="text-danger-600">*</span>
                  </label>
                  <Autocomplete
                    options={recipientTypeOptions}
                    value={formData.recipientType}
                    onChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        recipientType: value,
                        recipientName: "",
                        recipientContact: "",
                        recipientCategory: "",
                        distributionLocation: "",
                        recipientCount: "",
                      }));
                      setSelectedEmployeeId("");
                      setSelectedMustahiqId("");
                    }}
                    placeholder="Pilih tipe penerima"
                  />
                </div>

                {/* Coordinator (Employee) Section */}
                {formData.recipientType === "coordinator" && (
                  <>
                    <div className="form-group col-span-2">
                      <label className="form-label">
                        Penanggung Jawab Distribusi <span className="text-danger-600">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Autocomplete
                            options={employeeOptions}
                            value={selectedEmployeeId}
                            onChange={handleEmployeeSelect}
                            placeholder="Pilih employee sebagai penanggung jawab"
                            isLoading={isLoadingEmployees}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEmployeeModalOpen(true)}
                          className="btn btn-secondary btn-md"
                          title="Tambah Employee Baru"
                        >
                          <PlusIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="form-group col-span-2">
                      <label className="form-label">
                        Kategori Asnaf <span className="text-danger-600">*</span>
                      </label>
                      <Autocomplete
                        options={asnafOptions}
                        value={formData.recipientCategory}
                        onChange={(value) => setFormData(prev => ({ ...prev, recipientCategory: value }))}
                        placeholder="Pilih kategori asnaf yang akan menerima"
                      />
                      {selectedAsnaf && (
                        <p className="text-xs text-gray-500 mt-1">{selectedAsnaf.description}</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="distributionLocation" className="form-label">
                        Lokasi Distribusi <span className="text-danger-600">*</span>
                      </label>
                      <input
                        id="distributionLocation"
                        type="text"
                        className="form-input"
                        value={formData.distributionLocation}
                        onChange={(e) => setFormData(prev => ({ ...prev, distributionLocation: e.target.value }))}
                        placeholder="contoh: Masjid Al-Ikhlas, Desa Sukamaju"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="recipientCount" className="form-label">
                        Jumlah Penerima <span className="text-danger-600">*</span>
                      </label>
                      <input
                        id="recipientCount"
                        type="number"
                        className="form-input"
                        value={formData.recipientCount}
                        onChange={(e) => setFormData(prev => ({ ...prev, recipientCount: e.target.value }))}
                        placeholder="Berapa orang yang menerima"
                        min="1"
                        required
                      />
                    </div>
                  </>
                )}

                {/* Direct Recipient (Mustahiq) Section */}
                {formData.recipientType === "direct" && (
                  <>
                    <div className="form-group col-span-2">
                      <label className="form-label">
                        Penerima Zakat <span className="text-danger-600">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Autocomplete
                            options={mustahiqOptions}
                            value={selectedMustahiqId}
                            onChange={handleMustahiqSelect}
                            placeholder="Pilih mustahiq sebagai penerima"
                            isLoading={isLoadingMustahiqs}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsMustahiqModalOpen(true)}
                          className="btn btn-secondary btn-md"
                          title="Tambah Mustahiq Baru"
                        >
                          <PlusIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="form-group col-span-2">
                      <label className="form-label">
                        Kategori Asnaf <span className="text-danger-600">*</span>
                      </label>
                      <Autocomplete
                        options={asnafOptions}
                        value={formData.recipientCategory}
                        onChange={(value) => setFormData(prev => ({ ...prev, recipientCategory: value }))}
                        placeholder="Pilih kategori asnaf"
                        disabled={!!selectedMustahiqId}
                      />
                      {selectedAsnaf && (
                        <p className="text-xs text-gray-500 mt-1">{selectedAsnaf.description}</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="recipientName" className="form-label">
                        Nama Penerima <span className="text-danger-600">*</span>
                      </label>
                      <input
                        id="recipientName"
                        type="text"
                        className="form-input"
                        value={formData.recipientName}
                        onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                        placeholder="Nama lengkap penerima"
                        readOnly={!!selectedMustahiqId}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="recipientContact" className="form-label">
                        Kontak (No. HP / Alamat)
                      </label>
                      <input
                        id="recipientContact"
                        type="text"
                        className="form-input"
                        value={formData.recipientContact}
                        onChange={(e) => setFormData(prev => ({ ...prev, recipientContact: e.target.value }))}
                        placeholder="08xx atau alamat lengkap"
                        readOnly={!!selectedMustahiqId}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Distribution Information */}
            <div className="form-section">
              <h3 className="form-section-title">Informasi Penyaluran</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    Jenis Zakat <span className="text-danger-600">*</span>
                  </label>
                  <Autocomplete
                    options={zakatTypeOptions}
                    value={formData.zakatTypeId}
                    onChange={(value) => setFormData(prev => ({ ...prev, zakatTypeId: value }))}
                    placeholder="Pilih jenis zakat"
                    isLoading={isLoadingTypes}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="amount" className="form-label">
                    Jumlah Penyaluran (Rp) <span className="text-danger-600">*</span>
                  </label>
                  <input
                    id="amount"
                    type="number"
                    className="form-input"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0"
                    min="1"
                    required
                  />
                </div>

                <div className="form-group col-span-2">
                  <label htmlFor="purpose" className="form-label">
                    Tujuan Penyaluran <span className="text-danger-600">*</span>
                  </label>
                  <input
                    id="purpose"
                    type="text"
                    className="form-input"
                    value={formData.purpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="contoh: Bantuan modal usaha, Biaya pendidikan, dll"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="form-section">
              <h3 className="form-section-title">Informasi Tambahan</h3>
              <div className="form-grid">
                <div className="form-group col-span-2">
                  <label htmlFor="description" className="form-label">
                    Deskripsi
                  </label>
                  <textarea
                    id="description"
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Deskripsi detail tentang penyaluran ini..."
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Opsional: Jelaskan detail penyaluran, kondisi penerima, atau informasi lainnya
                  </p>
                </div>

                <div className="form-group col-span-2">
                  <label htmlFor="notes" className="form-label">
                    Catatan Internal
                  </label>
                  <textarea
                    id="notes"
                    className="form-textarea"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Catatan untuk internal tim..."
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Opsional: Catatan khusus untuk admin atau tim internal
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Form Actions */}
        <div className="form-page-actions">
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={handleCancel}
            disabled={createMutation.isPending}
          >
            Batal
          </button>
          <button
            type="submit"
            form="distribution-form"
            className="btn btn-primary btn-lg"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Menyimpan..." : "Simpan Penyaluran"}
          </button>
        </div>
      </div>

      {/* Modals */}
      {isEmployeeModalOpen && (
        <EmployeeModal
          isOpen={isEmployeeModalOpen}
          onClose={() => setIsEmployeeModalOpen(false)}
          onSuccess={handleEmployeeModalSuccess}
        />
      )}

      {isMustahiqModalOpen && (
        <MustahiqModal
          onClose={() => setIsMustahiqModalOpen(false)}
          onSuccess={handleMustahiqModalSuccess}
        />
      )}
    </main>
  );
}
