/**
 * Testimonials Service
 * Ulasan Google Maps untuk beranda; dibaca di server (bukan dari browser) dan di-cache 1 jam.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

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
      next: { revalidate: 3600 },
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
