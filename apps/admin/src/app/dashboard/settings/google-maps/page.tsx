"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SettingsLayout from "@/components/SettingsLayout";
import api from "@/lib/api";
import FeedbackDialog from "@/components/FeedbackDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Setting = {
    key: string;
    value: string;
    type: string;
    label: string;
    description: string;
    category: string;
};

type ApiSettingType = "string" | "number" | "boolean" | "json";

const normalizeSettingType = (type?: string): ApiSettingType => {
    if (type === "number" || type === "boolean" || type === "json") {
        return type;
    }
    return "string";
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function GoogleMapsSettingsPage() {
    const queryClient = useQueryClient();
    const [feedback, setFeedback] = useState<{
        open: boolean;
        type: "success" | "error";
        title: string;
        message?: string;
    }>({ open: false, type: "success", title: "" });

    const { data: groupedSettings, isLoading } = useQuery({
        queryKey: ["settings"],
        queryFn: async () => {
            const response = await api.get("/admin/settings");
            return response.data?.data || {};
        },
        refetchOnWindowFocus: false,
    });

    const [form, setForm] = useState({
        google_maps_enabled: "false",
        google_maps_api_key: "",
        google_maps_place_id: "",
        google_maps_min_rating: "4",
        google_maps_max_reviews: "5",
    });

    // Populate config form from settings
    useEffect(() => {
        if (groupedSettings?.frontend) {
            const frontendSettings = groupedSettings.frontend as Setting[];
            const extractedForm: Record<string, string> = {};
            for (const s of frontendSettings) {
                if (s.key.startsWith("google_maps_")) {
                    extractedForm[s.key] = s.value;
                }
            }
            setForm((prev) => ({ ...prev, ...extractedForm }));
        }
    }, [groupedSettings]);

    // Save Config Mutation
    const saveMutation = useMutation({
        mutationFn: async (items: Array<{ key: string; value: string; category: string; type: string; label: string; description?: string }>) => {
            await api.put("/admin/settings/batch", items);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            setFeedback({ open: true, type: "success", title: "Pengaturan berhasil disimpan" });
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

    const resetCacheMutation = useMutation({
        mutationFn: async () => {
            await api.post("/admin/settings/google-maps/reset-cache");
        },
        onSuccess: () => {
            setFeedback({ open: true, type: "success", title: "Cache testimoni berhasil di-reset" });
        },
        onError: (err: any) => {
            setFeedback({
                open: true,
                type: "error",
                title: "Gagal reset cache",
                message: err?.response?.data?.message || err.message,
            });
        },
    });

    const handleSaveConfig = () => {
        const defaultLabels: Record<string, string> = {
            google_maps_enabled: "Testimoni Google Maps Aktif",
            google_maps_api_key: "Google Places API Key",
            google_maps_place_id: "Google Place ID",
            google_maps_min_rating: "Minimal Rating",
            google_maps_max_reviews: "Maksimal Ulasan Ditampilkan"
        };

        const frontendSettings = (groupedSettings?.frontend || []) as Setting[];
        const items = Object.entries(form).map(([key, value]) => {
            const existing = frontendSettings.find((s) => s.key === key);
            let type: ApiSettingType = "string";
            if (key === "google_maps_enabled") type = "boolean";
            if (key === "google_maps_min_rating" || key === "google_maps_max_reviews") type = "number";

            return {
                key,
                value,
                category: "frontend",
                type: type,
                label: existing?.label || defaultLabels[key] || key,
                description: existing?.description || "",
            };
        });

        saveMutation.mutate(items);
    };

    if (isLoading) {
        return (
            <SettingsLayout>
                <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
                    Memuat pengaturan...
                </div>
            </SettingsLayout>
        );
    }

    return (
        <SettingsLayout>
            <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Testimoni Google Maps</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Atur integrasi ulasan Google Maps untuk ditampilkan pada halaman depan website publik.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Toggle Status */}
                        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Status Fitur</p>
                                <p className="text-sm text-gray-500 mt-0.5">Aktifkan atau nonaktifkan tampilan testimoni di website</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.google_maps_enabled === "true"}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            google_maps_enabled: e.target.checked ? "true" : "false",
                                        }))
                                    }
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                        </div>

                        {/* API Credentials */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Google Places API Key <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={form.google_maps_api_key}
                                    onChange={(e) => setForm((prev) => ({ ...prev, google_maps_api_key: e.target.value }))}
                                    placeholder="AIzaSy..."
                                    className="form-input"
                                />
                                <p className="text-xs text-gray-400 mt-1.5">
                                    Gunakan API Key yang telah mengaktifkan layanan Places API (New). Key akan disimpan secara terenkripsi (AES).
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Google Place ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.google_maps_place_id}
                                    onChange={(e) => setForm((prev) => ({ ...prev, google_maps_place_id: e.target.value }))}
                                    placeholder="ChIJ..."
                                    className="form-input"
                                />
                                <p className="text-xs text-gray-400 mt-1.5">ID spesifik lokasi bisnis di Google Maps.</p>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Minimal Rating (Bintang)</label>
                                <select
                                    value={form.google_maps_min_rating}
                                    onChange={(e) => setForm((prev) => ({ ...prev, google_maps_min_rating: e.target.value }))}
                                    className="form-select"
                                >
                                    <option value="1">1 Bintang atau lebih</option>
                                    <option value="2">2 Bintang atau lebih</option>
                                    <option value="3">3 Bintang atau lebih</option>
                                    <option value="4">4 Bintang atau lebih</option>
                                    <option value="5">Hanya 5 Bintang</option>
                                </select>
                                <p className="text-xs text-gray-400 mt-1.5">Hanya tampilkan ulasan dengan rating tersebut</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Ulasan Maksimal</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={form.google_maps_max_reviews}
                                    onChange={(e) => setForm((prev) => ({ ...prev, google_maps_max_reviews: e.target.value }))}
                                    className="form-input"
                                />
                                <p className="text-xs text-gray-400 mt-1.5">Batasan jumlah ulasan yang di tampilkan (Maks 10)</p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => resetCacheMutation.mutate()}
                                disabled={saveMutation.isPending || resetCacheMutation.isPending}
                                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {resetCacheMutation.isPending ? "Resetting..." : "Reset Cache"}
                            </button>
                            <button
                                onClick={handleSaveConfig}
                                disabled={saveMutation.isPending || resetCacheMutation.isPending}
                                className="btn btn-primary btn-md"
                            >
                                {saveMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <FeedbackDialog
                open={feedback.open}
                onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
            />
        </SettingsLayout>
    );
}
