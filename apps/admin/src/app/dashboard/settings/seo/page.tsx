"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SettingsLayout from "@/components/SettingsLayout";
import SEOPanel, { type SEOData } from "@/components/SEOPanel";
import FeedbackDialog from "@/components/FeedbackDialog";
import api from "@/lib/api";

interface PageSEOConfig {
  key: string;
  label: string;
  description: string;
  defaultTitle: string;
  slug: string;
}

const SEO_PAGES: PageSEOConfig[] = [
  {
    key: "seo_page_home",
    label: "🏠 Homepage",
    description: "Halaman utama website",
    defaultTitle: "Homepage",
    slug: "",
  },
  {
    key: "seo_page_program",
    label: "📋 Arsip Program",
    description: "Halaman daftar semua program (/program)",
    defaultTitle: "Program",
    slug: "program",
  },
  {
    key: "seo_page_zakat",
    label: "🕌 Arsip Zakat",
    description: "Halaman daftar semua zakat (/zakat)",
    defaultTitle: "Zakat",
    slug: "zakat",
  },
  {
    key: "seo_page_qurban",
    label: "🐄 Arsip Qurban",
    description: "Halaman daftar semua qurban (/qurban)",
    defaultTitle: "Qurban",
    slug: "qurban",
  },
  {
    key: "seo_page_wakaf",
    label: "🤲 Arsip Wakaf",
    description: "Halaman daftar semua wakaf (/wakaf)",
    defaultTitle: "Wakaf",
    slug: "wakaf",
  },
];

const emptySEO: Partial<SEOData> = {
  focusKeyphrase: "",
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  noIndex: false,
  noFollow: false,
  ogTitle: "",
  ogDescription: "",
  ogImageUrl: "",
  seoScore: 0,
};

export default function SEOSettingsPage() {
  const queryClient = useQueryClient();
  const [activePageKey, setActivePageKey] = useState(SEO_PAGES[0].key);
  const [seoData, setSeoData] = useState<Record<string, Partial<SEOData>>>({});
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  // Fetch existing SEO page settings
  const { data: groupedSettings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get("/admin/settings");
      return response.data?.data || {};
    },
    refetchOnWindowFocus: false,
  });

  // Load SEO data from settings when fetched
  useEffect(() => {
    if (!groupedSettings) return;

    const seoPageSettings = groupedSettings["seo_pages"] || [];
    const loaded: Record<string, Partial<SEOData>> = {};

    for (const page of SEO_PAGES) {
      const setting = seoPageSettings.find((s: any) => s.key === page.key);
      if (setting?.value) {
        try {
          loaded[page.key] = JSON.parse(setting.value);
        } catch {
          loaded[page.key] = { ...emptySEO };
        }
      } else {
        loaded[page.key] = { ...emptySEO };
      }
    }

    setSeoData(loaded);
  }, [groupedSettings]);

  const handleSEOChange = useCallback(
    (data: Partial<SEOData>) => {
      setSeoData((prev) => ({
        ...prev,
        [activePageKey]: data,
      }));
    },
    [activePageKey]
  );

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const settingsPayload = SEO_PAGES.map((page) => ({
        key: page.key,
        value: JSON.stringify(seoData[page.key] || emptySEO),
        category: "seo_pages",
        type: "json" as const,
        label: `SEO ${page.label}`,
        description: `SEO settings untuk ${page.description}`,
        isPublic: true,
      }));

      return api.put("/admin/settings/batch", settingsPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil!",
        message: "SEO halaman berhasil disimpan",
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal menyimpan SEO halaman",
      });
    },
  });

  const activePage = SEO_PAGES.find((p) => p.key === activePageKey)!;
  const activeValues = seoData[activePageKey] || emptySEO;

  return (
    <SettingsLayout>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">SEO Halaman</h2>
          <p className="text-sm text-gray-600 mt-1">
            Kelola SEO untuk halaman-halaman arsip dan homepage
          </p>
        </div>

        {/* Page Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {SEO_PAGES.map((page) => {
              const isActive = activePageKey === page.key;
              const pageData = seoData[page.key];
              const score = pageData?.seoScore || 0;

              return (
                <button
                  key={page.key}
                  type="button"
                  onClick={() => setActivePageKey(page.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? "border-primary-600 text-primary-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span>{page.label}</span>
                  {score > 0 && (
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
                        score >= 80
                          ? "bg-green-500"
                          : score >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    >
                      {score}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Page Info */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="text-sm text-gray-600">{activePage.description}</div>
        </div>

        {/* SEO Panel */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <SEOPanel
              key={activePageKey}
              value={activeValues}
              onChange={handleSEOChange}
              contentData={{
                title: activePage.defaultTitle,
                slug: activePage.slug,
                description: "",
                content: "",
              }}
              entityType="page"
              disabled={saveMutation.isPending}
            />
          )}
        </div>

        {/* Save Button */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
          >
            {saveMutation.isPending ? "Menyimpan..." : "Simpan Semua SEO"}
          </button>
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
