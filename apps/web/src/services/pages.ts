/**
 * Static Pages Service
 */

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  featureImageUrl?: string | null;
  content: string;
  excerpt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  // SEO fields
  metaTitle?: string | null;
  metaDescription?: string | null;
  focusKeyphrase?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean | null;
  noFollow?: boolean | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  seoScore?: number | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:50245/v1";

export async function fetchPublishedPages(): Promise<StaticPage[]> {
  const response = await fetch(`${API_URL}/pages`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch pages: ${response.statusText}`);
  }

  const data = await response.json();
  return data?.data || [];
}

export async function fetchPageBySlug(slug: string): Promise<StaticPage> {
  const response = await fetch(`${API_URL}/pages/${slug}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.statusText}`);
  }

  const data = await response.json();
  return data?.data || data;
}
