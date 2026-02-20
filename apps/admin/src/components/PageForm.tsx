"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MediaLibrary from "./MediaLibrary";
import RichTextEditor from "./RichTextEditor";
import SEOPanel, { type SEOData } from "./SEOPanel";

export interface PageFormData {
  title: string;
  slug: string;
  featureImageUrl: string;
  excerpt: string;
  content: string;
  isPublished: boolean;
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

interface PageFormProps {
  initialData?: Partial<PageFormData>;
  isLoading?: boolean;
  onCancel: () => void;
  onSubmit: (data: PageFormData, mode: "draft" | "publish") => void;
}

const DEFAULT_FORM_DATA: PageFormData = {
  title: "",
  slug: "",
  featureImageUrl: "",
  excerpt: "",
  content: "",
  isPublished: false,
  metaTitle: "",
  metaDescription: "",
  focusKeyphrase: "",
  canonicalUrl: "",
  noIndex: false,
  noFollow: false,
  ogTitle: "",
  ogDescription: "",
  ogImageUrl: "",
  seoScore: 0,
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function PageForm({ initialData, isLoading = false, onCancel, onSubmit }: PageFormProps) {
  const [formData, setFormData] = useState<PageFormData>(() => ({
    ...DEFAULT_FORM_DATA,
    ...initialData,
    isPublished: Boolean(initialData?.isPublished),
  }));
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(initialData?.slug));
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setFormData({
      ...DEFAULT_FORM_DATA,
      ...initialData,
      isPublished: Boolean(initialData?.isPublished),
    });
    setSlugManuallyEdited(Boolean(initialData?.slug));
  }, [initialData]);

  const contentText = useMemo(
    () =>
      formData.content
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    [formData.content]
  );

  const validateForm = () => {
    if (!formData.title.trim()) return "Judul wajib diisi.";
    if (!formData.slug.trim()) return "Slug wajib diisi.";
    if (!slugPattern.test(formData.slug.trim())) {
      return "Slug hanya boleh huruf kecil, angka, dan tanda hubung.";
    }
    if (!contentText) return "Konten wajib diisi.";
    return "";
  };

  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      title: value,
      slug: slugManuallyEdited ? prev.slug : generateSlug(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setFormData((prev) => ({ ...prev, slug: value }));
  };

  const handleSEOChange = useCallback((seoData: Partial<SEOData>) => {
    setFormData((prev) => ({
      ...prev,
      metaTitle: seoData.metaTitle ?? prev.metaTitle,
      metaDescription: seoData.metaDescription ?? prev.metaDescription,
      focusKeyphrase: seoData.focusKeyphrase ?? prev.focusKeyphrase,
      canonicalUrl: seoData.canonicalUrl ?? prev.canonicalUrl,
      noIndex: seoData.noIndex ?? prev.noIndex,
      noFollow: seoData.noFollow ?? prev.noFollow,
      ogTitle: seoData.ogTitle ?? prev.ogTitle,
      ogDescription: seoData.ogDescription ?? prev.ogDescription,
      ogImageUrl: seoData.ogImageUrl ?? prev.ogImageUrl,
      seoScore: seoData.seoScore ?? prev.seoScore,
    }));
  }, []);

  const handleSubmit = (mode: "draft" | "publish") => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");
    onSubmit(
      {
        ...formData,
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        featureImageUrl: formData.featureImageUrl.trim(),
        excerpt: formData.excerpt.trim(),
        isPublished: mode === "publish",
      },
      mode
    );
  };

  return (
    <>
      <div className="form-layout-two-column">
        <div className="form-main-content">
          <div className="form-field">
            <label className="form-label">
              Judul <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Contoh: Tentang Kami"
              disabled={isLoading}
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              Slug <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="tentang-kami"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              URL publik: <span className="font-mono">/page/{formData.slug || "slug-page"}</span>
            </p>
          </div>

          <div className="form-field">
            <label className="form-label">Deskripsi Singkat</label>
            <textarea
              className="form-input"
              rows={3}
              value={formData.excerpt}
              onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Ringkasan singkat untuk preview."
              disabled={isLoading}
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              Deskripsi/Konten <span className="text-danger-500">*</span>
            </label>
            <RichTextEditor
              value={formData.content}
              onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
              placeholder="Tulis konten lengkap halaman..."
            />
          </div>

        </div>

        <div className="form-sidebar">
          <div className="form-field">
            <label className="form-label">Feature Image</label>
            {formData.featureImageUrl ? (
              <div className="media-field-preview">
                <div className="media-field-image">
                  <img src={formData.featureImageUrl} alt="Feature preview" />
                </div>
                <div className="media-field-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowMediaLibrary(true)}
                    disabled={isLoading}
                  >
                    Ganti Gambar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setFormData((prev) => ({ ...prev, featureImageUrl: "" }))}
                    disabled={isLoading}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-md w-full"
                onClick={() => setShowMediaLibrary(true)}
                disabled={isLoading}
              >
                Pilih Gambar
              </button>
            )}
          </div>

          <div className="form-field">
            <label className="form-label">Status Publish</label>
            <select
              className="form-input"
              value={formData.isPublished ? "published" : "draft"}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isPublished: e.target.value === "published" }))
              }
              disabled={isLoading}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

        </div>
      </div>

      <SEOPanel
        value={{
          focusKeyphrase: formData.focusKeyphrase || "",
          metaTitle: formData.metaTitle || "",
          metaDescription: formData.metaDescription || "",
          canonicalUrl: formData.canonicalUrl || "",
          noIndex: formData.noIndex || false,
          noFollow: formData.noFollow || false,
          ogTitle: formData.ogTitle || "",
          ogDescription: formData.ogDescription || "",
          ogImageUrl: formData.ogImageUrl || "",
          seoScore: formData.seoScore || 0,
        }}
        onChange={handleSEOChange}
        contentData={{
          title: formData.title,
          slug: formData.slug,
          description: formData.excerpt,
          content: formData.content,
          imageUrl: formData.featureImageUrl,
        }}
        entityType="page"
        disabled={isLoading}
      />

      {formError && (
        <div className="mt-4 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {formError}
        </div>
      )}

      <div className="form-page-actions">
        <button type="button" className="btn btn-secondary btn-lg" onClick={onCancel} disabled={isLoading}>
          Batal
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={() => handleSubmit("draft")}
            disabled={isLoading}
          >
            {isLoading ? "Menyimpan..." : "Simpan Draft"}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => handleSubmit("publish")}
            disabled={isLoading}
          >
            {isLoading ? "Menyimpan..." : "Publish"}
          </button>
        </div>
      </div>

      <MediaLibrary
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={(url) => {
          setFormData((prev) => ({ ...prev, featureImageUrl: url }));
          setShowMediaLibrary(false);
        }}
        category="general"
        accept="image/*"
        showUploadToast={false}
      />
    </>
  );
}
