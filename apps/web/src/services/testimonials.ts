/**
 * Testimonials Service
 * Ulasan Google Maps untuk beranda; dibaca di server (bukan dari browser) dan di-cache 1 jam.
 */

import { API_URL } from '@/lib/api-url';

export interface TestimonialReview {
  author_name: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

export async function fetchTestimonials(locale: string): Promise<TestimonialReview[]> {
  try {
    const response = await fetch(`${API_URL}/testimonials?lang=${encodeURIComponent(locale)}`, {
      next: { revalidate: 3600, tags: ['settings'] },
    });
    if (!response.ok) return [];
    const json = await response.json();
    const data = json.success ? json.data : json;
    if (!data?.enabled || !Array.isArray(data.reviews)) return [];
    return data.reviews;
  } catch {
    return [];
  }
}
