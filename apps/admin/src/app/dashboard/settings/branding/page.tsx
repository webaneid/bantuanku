"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SettingsLayout from "@/components/SettingsLayout";
import FeedbackDialog from "@/components/FeedbackDialog";
import api from "@/lib/api";
import {
  BRAND_SETTING_KEYS,
  DEFAULT_BRAND,
  SHADES,
  brandContrast,
  isHexColor,
  scaleFor,
  type Brand,
  type BrandKey,
} from "@/lib/brand";

type Setting = { key: string; value: string };

const FIELDS: Array<{ key: BrandKey; label: string; description: string }> = [
  { key: "primary", label: "Warna Utama (Primary)", description: "Tombol utama, tautan, penanda aktif, dan identitas brand." },
  { key: "secondary", label: "Warna Kedua (Secondary)", description: "Aksen dan penekanan: chip, sorotan, elemen pendamping." },
  { key: "light", label: "Warna Terang", description: "Latar halaman dan permukaan terang. Boleh bukan putih/abu-abu bawaan." },
  { key: "dark", label: "Warna Gelap", description: "Teks utama dan permukaan gelap. Boleh bukan hitam pekat." },
];

const BRAND_LABELS: Record<BrandKey, string> = {
  primary: "Warna Brand: Primary",
  secondary: "Warna Brand: Secondary",
  light: "Warna Brand: Terang",
  dark: "Warna Brand: Gelap",
};

export default function BrandingSettingsPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ open: boolean; type: "success" | "error"; title: string; message?: string }>({
    open: false,
    type: "success",
    title: "",
  });

  const { data: groupedSettings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get("/admin/settings");
      return response.data?.data || {};
    },
    refetchOnWindowFocus: false,
  });

  const [form, setForm] = useState<Brand>({ ...DEFAULT_BRAND });

  useEffect(() => {
    const saved = (groupedSettings?.branding || []) as Setting[];
    const next = { ...DEFAULT_BRAND };
    for (const field of FIELDS) {
      const value = saved.find((s) => s.key === BRAND_SETTING_KEYS[field.key])?.value;
      if (isHexColor(value)) next[field.key] = value.toLowerCase();
    }
    setForm(next);
  }, [groupedSettings]);

  const allValid = FIELDS.every((f) => isHexColor(form[f.key]));
  const brand: Brand = useMemo(
    () => ({
      primary: isHexColor(form.primary) ? form.primary : DEFAULT_BRAND.primary,
      secondary: isHexColor(form.secondary) ? form.secondary : DEFAULT_BRAND.secondary,
      light: isHexColor(form.light) ? form.light : DEFAULT_BRAND.light,
      dark: isHexColor(form.dark) ? form.dark : DEFAULT_BRAND.dark,
    }),
    [form]
  );
  const primaryScale = scaleFor("primary", brand);
  const secondaryScale = scaleFor("secondary", brand);

  // Keterbacaan (WCAG): < 3:1 memblokir simpan (juga ditolak API); 3–4,5:1 hanya peringatan
  const { errors: contrastErrors, warnings } = brandContrast(brand);

  const saveMutation = useMutation({
    mutationFn: async (values: Brand) => {
      await api.put(
        "/admin/settings/batch",
        FIELDS.map((f) => ({
          key: BRAND_SETTING_KEYS[f.key],
          value: values[f.key].toLowerCase(),
          category: "branding",
          type: "string",
          label: BRAND_LABELS[f.key],
          description: f.description,
          isPublic: true,
        }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setFeedback({
        open: true,
        type: "success",
        title: "Warna brand disimpan",
        message: "Website publik memakai warna baru dalam beberapa menit (cache).",
      });
    },
    onError: (err: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal menyimpan",
        message: err?.response?.data?.message || err.message,
      });
    },
  });

  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">Memuat pengaturan...</div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-dark">Warna Brand</h2>
            <p className="text-sm text-gray-500 mt-1">
              Empat warna identitas yang dipakai di seluruh website publik. Skala warna (terang ke gelap) dibuat otomatis dari Primary dan Secondary.
              Warna status (sukses, peringatan, bahaya, info) tetap baku agar maknanya sama di semua tema.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FIELDS.map((field) => {
              const value = form[field.key];
              const valid = isHexColor(value);
              return (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      aria-label={field.label}
                      value={valid ? value : DEFAULT_BRAND[field.key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value.toLowerCase() }))}
                      className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white p-1"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value.trim() }))}
                      placeholder="#rrggbb"
                      maxLength={7}
                      className="form-input font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, [field.key]: DEFAULT_BRAND[field.key] }))}
                      disabled={value === DEFAULT_BRAND[field.key]}
                      className="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-light disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Bawaan
                    </button>
                  </div>
                  {!valid && <p className="text-xs text-danger-600 mt-1.5">Format harus #rrggbb (mis. #035a52).</p>}
                  <p className="text-xs text-gray-400 mt-1.5">{field.description}</p>
                </div>
              );
            })}
          </div>

          {/* Pratinjau skala */}
          <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
            <p className="text-sm font-medium text-dark">Pratinjau skala otomatis</p>
            {([
              ["Primary", primaryScale],
              ["Secondary", secondaryScale],
            ] as const).map(([name, scale]) => (
              <div key={name}>
                <p className="text-xs text-gray-500 mb-1.5">{name}</p>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {SHADES.map((shade) => (
                    <div key={shade} className="text-center">
                      <div className="h-10 rounded border border-gray-200" style={{ backgroundColor: scale[shade] }} />
                      <span className="text-[10px] text-gray-400">{shade}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-gray-200 p-5" style={{ backgroundColor: brand.light, color: brand.dark }}>
              <p className="text-xs uppercase tracking-wide opacity-70">Contoh tampilan</p>
              <p className="text-lg font-semibold mt-1">Salurkan kebaikan Anda hari ini</p>
              <p className="text-sm opacity-80 mt-1">Teks utama memakai Warna Gelap di atas latar Warna Terang.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: primaryScale[500] }}>
                  Donasi Sekarang
                </span>
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: secondaryScale[100], color: secondaryScale[800] }}>
                  Qurban
                </span>
              </div>
            </div>

            {contrastErrors.length > 0 && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-800 space-y-1" role="alert">
                {contrastErrors.map((e) => (
                  <p key={e}>• {e}</p>
                ))}
                <p className="font-medium pt-1">Perbaiki warna di atas sebelum menyimpan.</p>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800 space-y-1">
                {warnings.map((w) => (
                  <p key={w}>• {w}</p>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...DEFAULT_BRAND })}
              disabled={saveMutation.isPending}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-light disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Kembalikan ke bawaan
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate(form)}
              disabled={!allValid || contrastErrors.length > 0 || saveMutation.isPending}
              className="btn btn-primary btn-md"
            >
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Warna"}
            </button>
          </div>
        </div>
      </div>

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </SettingsLayout>
  );
}
