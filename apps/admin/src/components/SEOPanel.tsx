"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  GlobeAltIcon,
  ShareIcon,
  AdjustmentsHorizontalIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import MediaLibrary from "./MediaLibrary";

// ─── Types ───────────────────────────────────────────────────────

export interface SEOData {
  focusKeyphrase: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  noIndex: boolean;
  noFollow: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  seoScore: number;
}

interface SEOCheck {
  id: string;
  name: string;
  weight: number;
  status: "good" | "ok" | "bad";
  message: string;
}

interface SEOScoreResult {
  overall: number;
  color: "red" | "orange" | "green";
  checks: SEOCheck[];
}

interface SEOPanelProps {
  /** Current SEO field values */
  value: Partial<SEOData>;
  /** Called when any SEO field changes */
  onChange: (data: Partial<SEOData>) => void;
  /** Content-level data used for analysis (not edited here) */
  contentData: {
    title: string;
    slug: string;
    description?: string;
    content?: string;
    imageUrl?: string;
  };
  /** Entity type for context-specific labels */
  entityType:
    | "campaign"
    | "page"
    | "zakatType"
    | "qurbanPackage"
    | "category"
    | "pillar";
  /** Base public URL for preview */
  baseUrl?: string;
  /** Disabled state */
  disabled?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────

const SEO_TITLE_MAX = 60;
const SEO_TITLE_MIN = 30;
const META_DESC_MAX = 155;
const META_DESC_MIN = 80;
const SLUG_MAX = 75;

const ENTITY_URL_PREFIX: Record<string, string> = {
  campaign: "/program",
  page: "/pages",
  zakatType: "/zakat",
  qurbanPackage: "/qurban",
  category: "/program",
  pillar: "/program",
};

const DEFAULT_SEO: SEOData = {
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

// ─── Helpers ─────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function getKeyphraseDensity(text: string, keyphrase: string): number {
  if (!text || !keyphrase) return 0;
  const words = text.toLowerCase();
  const kp = keyphrase.toLowerCase().trim();
  const matches = words.split(kp).length - 1;
  const totalWords = countWords(text);
  if (totalWords === 0) return 0;
  return (matches * countWords(kp)) / totalWords * 100;
}

function containsKeyphrase(text: string, keyphrase: string): boolean {
  if (!text || !keyphrase) return false;
  return text.toLowerCase().includes(keyphrase.toLowerCase().trim());
}

function extractFirst200Words(text: string): string {
  return text.split(/\s+/).slice(0, 200).join(" ");
}

function extractHeadings(html: string): string[] {
  const matches = html.match(/<h[2-3][^>]*>(.*?)<\/h[2-3]>/gi) || [];
  return matches.map((m) => stripHtml(m));
}

function countInternalLinks(html: string): number {
  const links = html.match(/<a\s[^>]*href\s*=\s*["'][^"']*["'][^>]*>/gi) || [];
  return links.filter((l) => {
    const href = l.match(/href=["']([^"']*)["']/)?.[1] || "";
    return href.startsWith("/") || href.includes("bantuanku.com");
  }).length;
}

function countExternalLinks(html: string): number {
  const links = html.match(/<a\s[^>]*href\s*=\s*["'][^"']*["'][^>]*>/gi) || [];
  return links.filter((l) => {
    const href = l.match(/href=["']([^"']*)["']/)?.[1] || "";
    return href.startsWith("http") && !href.includes("bantuanku.com");
  }).length;
}

function hasImageWithKeyphraseAlt(html: string, keyphrase: string): boolean {
  if (!keyphrase) return false;
  const images = html.match(/<img[^>]*>/gi) || [];
  return images.some((img) => {
    const alt = img.match(/alt=["']([^"']*)["']/)?.[1] || "";
    return containsKeyphrase(alt, keyphrase);
  });
}

function hasAnyImage(html: string): boolean {
  return /<img[^>]*>/i.test(html);
}

// ─── SEO Analyzer ────────────────────────────────────────────────

function analyzeSEO(
  seo: Partial<SEOData>,
  content: { title: string; slug: string; description?: string; content?: string; imageUrl?: string }
): SEOScoreResult {
  const checks: SEOCheck[] = [];
  const kp = seo.focusKeyphrase?.trim() || "";
  const metaTitle = seo.metaTitle?.trim() || content.title || "";
  const metaDesc = seo.metaDescription?.trim() || content.description || "";
  const slug = content.slug || "";
  const htmlContent = content.content || "";
  const plainContent = stripHtml(htmlContent);
  const wordCount = countWords(plainContent);
  const featuredImage = seo.ogImageUrl || content.imageUrl || "";

  // 1. Focus keyphrase set
  checks.push({
    id: "keyphrase-set",
    name: "Focus keyphrase",
    weight: 8,
    status: kp ? "good" : "bad",
    message: kp ? "Focus keyphrase sudah diisi." : "Focus keyphrase belum diisi. Isi keyphrase untuk analisis SEO.",
  });

  // 2. Keyphrase in SEO title
  if (kp) {
    const inTitle = containsKeyphrase(metaTitle, kp);
    const atStart = metaTitle.toLowerCase().startsWith(kp.toLowerCase());
    checks.push({
      id: "keyphrase-title",
      name: "Keyphrase di SEO title",
      weight: 9,
      status: atStart ? "good" : inTitle ? "ok" : "bad",
      message: atStart
        ? "Keyphrase ada di awal SEO title. Bagus!"
        : inTitle
          ? "Keyphrase ada di title, tapi idealnya di awal."
          : "Keyphrase tidak ditemukan di SEO title.",
    });
  }

  // 3. Keyphrase in meta description
  if (kp) {
    const inDesc = containsKeyphrase(metaDesc, kp);
    checks.push({
      id: "keyphrase-desc",
      name: "Keyphrase di meta description",
      weight: 7,
      status: inDesc ? "good" : "bad",
      message: inDesc
        ? "Keyphrase ditemukan di meta description."
        : "Keyphrase tidak ditemukan di meta description.",
    });
  }

  // 4. Keyphrase in slug
  if (kp) {
    const kpSlug = kp.toLowerCase().replace(/\s+/g, "-");
    const inSlug = slug.toLowerCase().includes(kpSlug) ||
      kp.toLowerCase().split(/\s+/).every((w) => slug.toLowerCase().includes(w));
    checks.push({
      id: "keyphrase-slug",
      name: "Keyphrase di URL/slug",
      weight: 6,
      status: inSlug ? "good" : "bad",
      message: inSlug
        ? "Keyphrase ditemukan di slug URL."
        : "Keyphrase tidak ditemukan di slug URL.",
    });
  }

  // 5. Keyphrase in first paragraph
  if (kp && plainContent) {
    const first100 = plainContent.split(/\s+/).slice(0, 100).join(" ");
    const first200 = extractFirst200Words(plainContent);
    const in100 = containsKeyphrase(first100, kp);
    const in200 = containsKeyphrase(first200, kp);
    checks.push({
      id: "keyphrase-intro",
      name: "Keyphrase di paragraf awal",
      weight: 5,
      status: in100 ? "good" : in200 ? "ok" : "bad",
      message: in100
        ? "Keyphrase ditemukan di 100 kata pertama."
        : in200
          ? "Keyphrase ditemukan di 200 kata pertama, lebih baik di 100 kata pertama."
          : "Keyphrase tidak ditemukan di bagian awal konten.",
    });
  }

  // 6. Keyphrase density
  if (kp && plainContent) {
    const density = getKeyphraseDensity(plainContent, kp);
    checks.push({
      id: "keyphrase-density",
      name: "Keyphrase density",
      weight: 6,
      status: density >= 1 && density <= 3 ? "good" : density >= 0.5 && density <= 4 ? "ok" : "bad",
      message: `Keyphrase density: ${density.toFixed(1)}%. ${density < 0.5 ? "Terlalu rendah, idealnya 1-3%." : density > 4 ? "Terlalu tinggi, idealnya 1-3%." : density >= 1 && density <= 3 ? "Bagus!" : "Cukup, tapi idealnya 1-3%."}`,
    });
  }

  // 7. SEO title length
  const titleLen = metaTitle.length;
  checks.push({
    id: "title-length",
    name: "Panjang SEO title",
    weight: 7,
    status: titleLen >= 50 && titleLen <= SEO_TITLE_MAX ? "good" : titleLen >= SEO_TITLE_MIN && titleLen <= 70 ? "ok" : "bad",
    message: `SEO title: ${titleLen} karakter. ${titleLen < SEO_TITLE_MIN ? `Terlalu pendek (min ${SEO_TITLE_MIN}).` : titleLen > 70 ? `Terlalu panjang (max ${SEO_TITLE_MAX}).` : titleLen >= 50 && titleLen <= SEO_TITLE_MAX ? "Panjang ideal!" : "Cukup, tapi idealnya 50-60 karakter."}`,
  });

  // 8. Meta description length
  const descLen = metaDesc.length;
  checks.push({
    id: "desc-length",
    name: "Panjang meta description",
    weight: 7,
    status: descLen >= 120 && descLen <= META_DESC_MAX ? "good" : descLen >= META_DESC_MIN && descLen <= 170 ? "ok" : "bad",
    message: `Meta description: ${descLen} karakter. ${descLen < META_DESC_MIN ? `Terlalu pendek (min ${META_DESC_MIN}).` : descLen > 170 ? `Terlalu panjang (max ${META_DESC_MAX}).` : descLen >= 120 && descLen <= META_DESC_MAX ? "Panjang ideal!" : "Cukup, tapi idealnya 120-155 karakter."}`,
  });

  // 9. Content length
  checks.push({
    id: "content-length",
    name: "Panjang konten",
    weight: 5,
    status: wordCount >= 300 ? "good" : wordCount >= 150 ? "ok" : "bad",
    message: `Konten: ${wordCount} kata. ${wordCount < 150 ? "Terlalu pendek (min 150 kata)." : wordCount < 300 ? "Cukup, tapi idealnya 300+ kata." : "Panjang konten bagus!"}`,
  });

  // 10. Internal links
  if (htmlContent) {
    const intLinks = countInternalLinks(htmlContent);
    checks.push({
      id: "internal-links",
      name: "Internal links",
      weight: 4,
      status: intLinks >= 2 ? "good" : intLinks >= 1 ? "ok" : "bad",
      message: `${intLinks} internal link ditemukan. ${intLinks === 0 ? "Tambahkan minimal 1 internal link." : intLinks < 2 ? "Cukup, idealnya 2+ internal links." : "Bagus!"}`,
    });
  }

  // 11. Image with keyphrase alt
  if (kp && htmlContent) {
    const hasKpAlt = hasImageWithKeyphraseAlt(htmlContent, kp);
    const hasImg = hasAnyImage(htmlContent);
    checks.push({
      id: "image-alt",
      name: "Gambar dengan alt keyphrase",
      weight: 5,
      status: hasKpAlt ? "good" : hasImg ? "ok" : "bad",
      message: hasKpAlt
        ? "Ada gambar dengan alt text mengandung keyphrase."
        : hasImg
          ? "Ada gambar tapi alt text tidak mengandung keyphrase."
          : "Tidak ada gambar di konten. Tambahkan gambar dengan alt text.",
    });
  }

  // 12. Featured image
  checks.push({
    id: "featured-image",
    name: "Featured image / OG image",
    weight: 4,
    status: featuredImage ? "good" : "bad",
    message: featuredImage
      ? "Featured image sudah diset."
      : "Tidak ada featured image. Gambar penting untuk share di sosmed.",
  });

  // 13. Slug length
  checks.push({
    id: "slug-length",
    name: "Panjang slug",
    weight: 3,
    status: slug.length <= SLUG_MAX ? "good" : slug.length <= 100 ? "ok" : "bad",
    message: `Slug: ${slug.length} karakter. ${slug.length > 100 ? `Terlalu panjang (max ${SLUG_MAX}).` : slug.length > SLUG_MAX ? "Cukup, tapi idealnya ≤75 karakter." : "Panjang slug OK."}`,
  });

  // 14. Subheadings
  if (htmlContent) {
    const headings = extractHeadings(htmlContent);
    checks.push({
      id: "subheadings",
      name: "Subheadings (H2/H3)",
      weight: 3,
      status: headings.length >= 2 ? "good" : headings.length >= 1 ? "ok" : "bad",
      message: `${headings.length} subheading ditemukan. ${headings.length === 0 ? "Tambahkan H2/H3 untuk struktur konten." : headings.length < 2 ? "Tambahkan lebih banyak subheading." : "Struktur heading bagus!"}`,
    });

    // 15. Keyphrase in subheading
    if (kp && headings.length > 0) {
      const kpInHeading = headings.some((h) => containsKeyphrase(h, kp));
      checks.push({
        id: "keyphrase-subheading",
        name: "Keyphrase di subheading",
        weight: 4,
        status: kpInHeading ? "good" : "bad",
        message: kpInHeading
          ? "Keyphrase ditemukan di salah satu subheading."
          : "Keyphrase tidak ditemukan di subheading manapun.",
      });
    }
  }

  // Calculate score
  let totalWeight = 0;
  let earned = 0;
  for (const c of checks) {
    totalWeight += c.weight;
    if (c.status === "good") earned += c.weight;
    else if (c.status === "ok") earned += c.weight * 0.5;
  }
  const overall = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;
  const color = overall >= 71 ? "green" : overall >= 41 ? "orange" : "red";

  return { overall, color, checks };
}

// ─── Char Counter Bar ────────────────────────────────────────────

function CharBar({ current, min, max }: { current: number; min: number; max: number }) {
  const pct = Math.min((current / max) * 100, 100);
  const isGood = current >= min && current <= max;
  const isOver = current > max;

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : isGood ? "bg-green-500" : "bg-yellow-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono ${isOver ? "text-red-600" : isGood ? "text-green-600" : "text-gray-500"}`}>
        {current}/{max}
      </span>
    </div>
  );
}

// ─── Check Item ──────────────────────────────────────────────────

function CheckItem({ check }: { check: SEOCheck }) {
  const icon =
    check.status === "good" ? (
      <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
    ) : check.status === "ok" ? (
      <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
    ) : (
      <XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
    );

  return (
    <div className="flex items-start gap-2 py-1">
      {icon}
      <span className="text-xs text-gray-700 leading-snug">{check.message}</span>
    </div>
  );
}

// ─── Score Badge ─────────────────────────────────────────────────

function ScoreBadge({ score }: { score: SEOScoreResult }) {
  const bgClass =
    score.color === "green"
      ? "bg-green-100 text-green-800 border-green-300"
      : score.color === "orange"
        ? "bg-yellow-100 text-yellow-800 border-yellow-300"
        : "bg-red-100 text-red-800 border-red-300";

  const label =
    score.color === "green" ? "Bagus" : score.color === "orange" ? "Perlu Perbaikan" : "Buruk";

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-semibold rounded-full border ${bgClass}`}>
      <span className={`w-2 h-2 rounded-full ${score.color === "green" ? "bg-green-500" : score.color === "orange" ? "bg-yellow-500" : "bg-red-500"}`} />
      {score.overall}/100 — {label}
    </div>
  );
}

// ─── SERP Preview ────────────────────────────────────────────────

function SERPPreview({
  title,
  slug,
  description,
  urlPrefix,
}: {
  title: string;
  slug: string;
  description: string;
  urlPrefix: string;
}) {
  const displayTitle = title || "Judul Halaman";
  const displayDesc = description || "Deskripsi halaman akan tampil di sini...";
  const displayUrl = `bantuanku.com${urlPrefix}/${slug || "slug"}`;

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <p className="text-xs text-gray-500 mb-1.5 font-medium">Preview Google</p>
      <p className="text-blue-700 text-base leading-snug font-medium truncate" title={displayTitle}>
        {displayTitle.length > SEO_TITLE_MAX ? displayTitle.slice(0, SEO_TITLE_MAX) + "..." : displayTitle}
      </p>
      <p className="text-green-700 text-xs truncate mt-0.5">{displayUrl}</p>
      <p className="text-gray-600 text-sm mt-1 line-clamp-2 leading-snug">
        {displayDesc.length > META_DESC_MAX ? displayDesc.slice(0, META_DESC_MAX) + "..." : displayDesc}
      </p>
    </div>
  );
}

// ─── Collapsible Section ─────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-gray-200">
      <button
        type="button"
        className="flex items-center justify-between w-full py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-1.5">
          {icon}
          {title}
        </span>
        {open ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

// ─── OG Image Picker ─────────────────────────────────────────────

function OgImagePicker({
  value,
  fallback,
  onChange,
  disabled,
}: {
  value: string;
  fallback?: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const [showMedia, setShowMedia] = useState(false);
  const displayUrl = value || "";

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">OG Image</label>
      {displayUrl ? (
        <div className="flex items-start gap-2">
          <div className="w-[20%] flex-shrink-0 rounded-md overflow-hidden border border-gray-200 bg-gray-50" style={{ aspectRatio: "1200/630" }}>
            <img
              src={displayUrl}
              alt="OG Image preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowMedia(true)}
              disabled={disabled}
            >
              Ganti
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => onChange("")}
              disabled={disabled}
            >
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="w-full flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-4 text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
          onClick={() => setShowMedia(true)}
          disabled={disabled}
        >
          <PhotoIcon className="w-6 h-6" />
          <span className="text-xs font-medium">Pilih OG Image</span>
          <span className="text-[10px]">Rekomendasi 1200×630px</span>
        </button>
      )}
      <p className="text-xs text-gray-400 mt-1">Kosongkan untuk pakai featured image</p>

      <MediaLibrary
        isOpen={showMedia}
        onClose={() => setShowMedia(false)}
        onSelect={(url) => {
          onChange(url);
          setShowMedia(false);
        }}
        category="general"
        accept="image/*"
        showUploadToast={false}
      />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export default function SEOPanel({
  value,
  onChange,
  contentData,
  entityType,
  baseUrl,
  disabled = false,
}: SEOPanelProps) {
  const seo = useMemo(() => ({ ...DEFAULT_SEO, ...value }), [value]);
  const urlPrefix = ENTITY_URL_PREFIX[entityType] || "";

  const update = useCallback(
    (field: keyof SEOData, val: string | boolean | number) => {
      onChange({ ...seo, [field]: val });
    },
    [seo, onChange]
  );

  // Real-time SEO score
  const scoreResult = useMemo(
    () => analyzeSEO(seo, contentData),
    [seo, contentData]
  );

  // Sync score back to parent (for saving to DB)
  useEffect(() => {
    if (scoreResult.overall !== seo.seoScore) {
      onChange({ ...seo, seoScore: scoreResult.overall });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreResult.overall]);

  // Auto-populate metaTitle & metaDescription from content when empty
  useEffect(() => {
    const updates: Partial<SEOData> = {};
    let changed = false;

    // Auto-fill metaTitle from title
    if (!seo.metaTitle && contentData.title) {
      updates.metaTitle = contentData.title.slice(0, 70);
      changed = true;
    }

    // Auto-fill metaDescription from description (excerpt) or content
    if (!seo.metaDescription) {
      if (contentData.description) {
        updates.metaDescription = contentData.description.slice(0, 140);
        changed = true;
      } else if (contentData.content) {
        const plain = stripHtml(contentData.content).slice(0, 140);
        if (plain) {
          updates.metaDescription = plain;
          changed = true;
        }
      }
    }

    if (changed) {
      onChange({ ...seo, ...updates });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentData.title, contentData.description, contentData.content]);

  // Effective values (with fallbacks) for preview
  const effectiveTitle = seo.metaTitle || contentData.title || "";
  const effectiveDesc = seo.metaDescription || contentData.description || "";

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-200">
        <MagnifyingGlassIcon className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-800">SEO</span>
        <div className="ml-auto">
          <ScoreBadge score={scoreResult} />
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Focus Keyphrase */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Focus Keyphrase</label>
          <input
            type="text"
            className="form-input text-sm"
            value={seo.focusKeyphrase}
            onChange={(e) => update("focusKeyphrase", e.target.value)}
            placeholder="contoh: zakat fitrah online"
            disabled={disabled}
          />
          <p className="text-xs text-gray-400 mt-0.5">Kata kunci utama yang ingin ditargetkan</p>
        </div>

        {/* SEO Title */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">SEO Title</label>
          <input
            type="text"
            className="form-input text-sm"
            value={seo.metaTitle}
            onChange={(e) => update("metaTitle", e.target.value)}
            placeholder={contentData.title || "Judul halaman..."}
            disabled={disabled}
            maxLength={70}
          />
          <CharBar current={effectiveTitle.length} min={50} max={SEO_TITLE_MAX} />
        </div>

        {/* Meta Description */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Meta Description</label>
          <textarea
            className="form-input text-sm"
            rows={3}
            value={seo.metaDescription}
            onChange={(e) => update("metaDescription", e.target.value)}
            placeholder={contentData.description?.slice(0, 155) || "Deskripsi halaman untuk hasil pencarian..."}
            disabled={disabled}
            maxLength={170}
          />
          <CharBar current={effectiveDesc.length} min={120} max={META_DESC_MAX} />
        </div>

        {/* SERP Preview */}
        <SERPPreview
          title={effectiveTitle}
          slug={contentData.slug}
          description={effectiveDesc}
          urlPrefix={urlPrefix}
        />

        {/* SEO Checks */}
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Analisis SEO</p>
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {/* Show bad first, then ok, then good */}
            {[...scoreResult.checks]
              .sort((a, b) => {
                const order = { bad: 0, ok: 1, good: 2 };
                return order[a.status] - order[b.status];
              })
              .map((c) => (
                <CheckItem key={c.id} check={c} />
              ))}
          </div>
        </div>

        {/* Social section */}
        <CollapsibleSection
          title="Social Media"
          icon={<ShareIcon className="w-4 h-4" />}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">OG Title</label>
              <input
                type="text"
                className="form-input text-sm"
                value={seo.ogTitle}
                onChange={(e) => update("ogTitle", e.target.value)}
                placeholder={effectiveTitle || "Judul untuk Facebook/WhatsApp/LinkedIn..."}
                disabled={disabled}
                maxLength={70}
              />
              <p className="text-xs text-gray-400 mt-0.5">Kosongkan untuk pakai SEO Title</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">OG Description</label>
              <textarea
                className="form-input text-sm"
                rows={2}
                value={seo.ogDescription}
                onChange={(e) => update("ogDescription", e.target.value)}
                placeholder={effectiveDesc || "Deskripsi untuk social media..."}
                disabled={disabled}
                maxLength={200}
              />
              <p className="text-xs text-gray-400 mt-0.5">Kosongkan untuk pakai Meta Description</p>
            </div>
            <OgImagePicker
              value={seo.ogImageUrl}
              fallback={contentData.imageUrl}
              onChange={(url) => update("ogImageUrl", url)}
              disabled={disabled}
            />
          </div>
        </CollapsibleSection>

        {/* Advanced section */}
        <CollapsibleSection
          title="Advanced"
          icon={<AdjustmentsHorizontalIcon className="w-4 h-4" />}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Canonical URL</label>
              <input
                type="text"
                className="form-input text-sm"
                value={seo.canonicalUrl}
                onChange={(e) => update("canonicalUrl", e.target.value)}
                placeholder={`https://bantuanku.com${urlPrefix}/${contentData.slug || "slug"}`}
                disabled={disabled}
              />
              <p className="text-xs text-gray-400 mt-0.5">Kosongkan untuk auto-generate</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary-600 rounded"
                  checked={seo.noIndex}
                  onChange={(e) => update("noIndex", e.target.checked)}
                  disabled={disabled}
                />
                <span className="text-xs text-gray-700">No Index</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary-600 rounded"
                  checked={seo.noFollow}
                  onChange={(e) => update("noFollow", e.target.checked)}
                  disabled={disabled}
                />
                <span className="text-xs text-gray-700">No Follow</span>
              </label>
            </div>
            <p className="text-xs text-gray-400">
              Centang "No Index" agar halaman tidak muncul di Google. Centang "No Follow" agar link di halaman ini tidak diikuti crawler.
            </p>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
