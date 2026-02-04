"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SettingsLayout from "@/components/SettingsLayout";
import api from "@/lib/api";
import FeedbackDialog from "@/components/FeedbackDialog";

type AmilForm = {
  qurbanPerEkor: string;
  qurbanSapi: string;
  zakatPercentage: string;
  donationPercentage: string;
};

export default function AmilSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AmilForm>({
    qurbanPerEkor: "",
    qurbanSapi: "",
    zakatPercentage: "12.5",
    donationPercentage: "20",
  });

  const { data: groupedSettings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      try {
        const response = await api.get("/admin/settings");
        return response.data?.data || {};
      } catch (error: any) {
        console.error("Settings API error:", error);
        return {};
      }
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const amilSettings = useMemo(() => groupedSettings?.amil || [], [groupedSettings]);

  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, type: "success", title: "" });

  useEffect(() => {
    if (!amilSettings) return;
    const nextForm: AmilForm = {
      qurbanPerEkor: "0",
      qurbanSapi: "0",
      zakatPercentage: "12.5",
      donationPercentage: "20",
    };

    amilSettings.forEach((setting: any) => {
      if (setting.key === "amil_qurban_perekor_fee") nextForm.qurbanPerEkor = setting.value || "0";
      if (setting.key === "amil_qurban_sapi_fee") nextForm.qurbanSapi = setting.value || "0";
      if (setting.key === "amil_zakat_percentage") nextForm.zakatPercentage = setting.value || "12.5";
      if (setting.key === "amil_donation_percentage") nextForm.donationPercentage = setting.value || "20";
    });

    setForm(nextForm);
  }, [amilSettings]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any[]) => api.put("/admin/settings/batch", payload),
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Pengaturan tersimpan",
        message: "Pengaturan Administrasi Amil berhasil disimpan.",
      });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal menyimpan",
        message: error.response?.data?.message || "Terjadi kesalahan. Coba lagi.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const zakatValue = parseFloat(form.zakatPercentage || "0");
    if (zakatValue > 12.5) {
      setFeedback({
        open: true,
        type: "error",
        title: "Batas terlewati",
        message: "Prosentase Amil Zakat tidak boleh lebih dari 12.5%.",
      });
      return;
    }

    const payload = [
      {
        key: "amil_qurban_perekor_fee",
        value: form.qurbanPerEkor || "0",
        category: "amil",
        type: "number" as const,
        label: "Administrasi Qurban per ekor",
        description: "Biaya administrasi per ekor qurban",
        isPublic: true,
      },
      {
        key: "amil_qurban_sapi_fee",
        value: form.qurbanSapi || "0",
        category: "amil",
        type: "number" as const,
        label: "Administrasi Qurban sapi",
        description: "Biaya administrasi qurban sapi",
        isPublic: true,
      },
      {
        key: "amil_zakat_percentage",
        value: form.zakatPercentage || "12.5",
        category: "amil",
        type: "number" as const,
        label: "Prosentase Amil untuk Zakat",
        description: "Maksimal 12.5%",
      },
      {
        key: "amil_donation_percentage",
        value: form.donationPercentage || "20",
        category: "amil",
        type: "number" as const,
        label: "Prosentase Amil Shodaqoh & Donasi",
        description: "Persentase alokasi amil untuk shodaqoh/donasi",
      },
    ];

    updateMutation.mutate(payload);
  };

  const zakatPercent = parseFloat(form.zakatPercentage || "0");
  const zakatOverLimit = zakatPercent > 12.5;

  const closeFeedback = () => setFeedback((prev) => ({ ...prev, open: false }));

  return (
    <SettingsLayout>
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Administrasi Amil</h2>
            <p className="text-sm text-gray-600">Atur biaya administrasi dan persentase amil</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Administrasi Qurban perekor (Rp)
              </label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={form.qurbanPerEkor}
                onChange={(e) => setForm({ ...form, qurbanPerEkor: e.target.value })}
              />
              <p className="text-xs text-gray-500">Biaya administrasi setiap ekor hewan qurban.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Administrasi Qurban sapi (Rp)
              </label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={form.qurbanSapi}
                onChange={(e) => setForm({ ...form, qurbanSapi: e.target.value })}
              />
              <p className="text-xs text-gray-500">Biaya administrasi untuk qurban sapi.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Prosentase Amil untuk zakat (%)
              </label>
              <input
                type="number"
                min="0"
                max="12.5"
                step="0.1"
                className={`form-input ${zakatOverLimit ? "border-red-500" : ""}`}
                value={form.zakatPercentage}
                onChange={(e) => setForm({ ...form, zakatPercentage: e.target.value })}
              />
              <p className={`text-xs ${zakatOverLimit ? "text-red-600" : "text-gray-500"}`}>
                Maksimal 12.5%. Lebih dari 12.5% tidak diperbolehkan.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Prosentase Amil shodaqoh & donasi (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="form-input"
                value={form.donationPercentage}
                onChange={(e) => setForm({ ...form, donationPercentage: e.target.value })}
              />
              <p className="text-xs text-gray-500">Default 20% dan bisa disesuaikan.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={zakatOverLimit || updateMutation.isPending}
              className="btn btn-primary"
            >
              {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={closeFeedback}
      />
    </SettingsLayout>
  );
}
