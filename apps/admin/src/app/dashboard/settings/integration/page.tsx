"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SettingsLayout from "@/components/SettingsLayout";
import api from "@/lib/api";
import FeedbackDialog from "@/components/FeedbackDialog";

type Setting = {
    key: string;
    value: string;
    type: string;
    label: string;
    description: string;
    category: string;
};

export default function IntegrationSettingsPage() {
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
        meta_domain_verification: "",
        meta_pixel_id: "",
        meta_capi_access_token: "",
    });

    // Populate form from settings
    useEffect(() => {
        if (groupedSettings?.integration) {
            const integrationSettings = groupedSettings.integration as Setting[];
            const extractedForm: Record<string, string> = {};
            for (const s of integrationSettings) {
                if (s.key in form) {
                    extractedForm[s.key] = s.value;
                }
            }
            setForm((prev) => ({ ...prev, ...extractedForm }));
        }
    }, [groupedSettings]);

    const saveMutation = useMutation({
        mutationFn: async (items: Array<{ key: string; value: string; category: string; type: string; label: string; description?: string; isPublic?: boolean }>) => {
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

    const handleSave = () => {
        const integrationSettings = (groupedSettings?.integration || []) as Setting[];

        const items = [
            {
                key: "meta_domain_verification",
                value: form.meta_domain_verification,
                category: "integration",
                type: "string",
                label: "Meta Domain Verification",
                description: "Kode verifikasi domain Meta Business Suite",
                isPublic: true,
            },
            {
                key: "meta_pixel_id",
                value: form.meta_pixel_id,
                category: "integration",
                type: "string",
                label: "Meta Pixel ID",
                description: "ID Pixel untuk tracking Meta Ads",
                isPublic: true,
            },
            {
                key: "meta_capi_access_token",
                value: form.meta_capi_access_token,
                category: "integration",
                type: "string",
                label: "Meta Conversions API Access Token",
                description: "Access token untuk Meta Conversions API (server-side tracking)",
                isPublic: false,
            },
        ].map((item) => {
            const existing = integrationSettings.find((s) => s.key === item.key);
            return {
                ...item,
                label: existing?.label || item.label,
                description: existing?.description || item.description,
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
                        <h2 className="text-xl font-bold text-gray-900">Integration</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Kelola integrasi dengan platform pihak ketiga.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Meta Business Suite */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-1">Meta Business Suite</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Verifikasi domain untuk Meta Business Suite (Facebook & Instagram).
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Domain Verification Code
                                    </label>
                                    <input
                                        type="text"
                                        value={form.meta_domain_verification}
                                        onChange={(e) => setForm((prev) => ({ ...prev, meta_domain_verification: e.target.value }))}
                                        placeholder="contoh: qwasp7ulvp4k5e69nrhct8pzrsn5pp"
                                        className="form-input"
                                    />
                                    <p className="text-xs text-gray-400 mt-1.5">
                                        Kode verifikasi domain dari Meta Business Suite.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Meta Pixel ID
                                    </label>
                                    <input
                                        type="text"
                                        value={form.meta_pixel_id}
                                        onChange={(e) => setForm((prev) => ({ ...prev, meta_pixel_id: e.target.value }))}
                                        placeholder="contoh: 1155458333240456"
                                        className="form-input"
                                    />
                                    <p className="text-xs text-gray-400 mt-1.5">
                                        ID Pixel untuk tracking konversi Meta Ads (Facebook & Instagram).
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Meta Conversions API */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-1">Meta Conversions API</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Server-side tracking untuk meningkatkan akurasi data konversi Meta Ads.
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Access Token
                                </label>
                                <input
                                    type="password"
                                    value={form.meta_capi_access_token}
                                    onChange={(e) => setForm((prev) => ({ ...prev, meta_capi_access_token: e.target.value }))}
                                    placeholder="EAAxxxxxxx..."
                                    className="form-input"
                                />
                                <p className="text-xs text-gray-400 mt-1.5">
                                    Token akses dari Meta Events Manager untuk Conversions API.
                                </p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saveMutation.isPending}
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
