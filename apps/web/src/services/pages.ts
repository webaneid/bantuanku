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

import { API_URL } from '@/lib/api-url';

export async function fetchPublishedPages(): Promise<StaticPage[]> {
  const response = await fetch(`${API_URL}/pages`, { next: { revalidate: 300, tags: ['pages'] }, });
  if (!response.ok) {
    throw new Error(`Failed to fetch pages: ${response.statusText}`);
  }

  const data = await response.json();
  return data?.data || [];
}

export async function fetchPageBySlug(slug: string): Promise<StaticPage> {
  const response = await fetch(`${API_URL}/pages/${slug}`, { next: { revalidate: 300, tags: ['pages'] }, });
  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.statusText}`);
  }

  const data = await response.json();
  return data?.data || data;
}
