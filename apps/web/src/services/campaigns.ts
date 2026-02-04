/**
 * Campaigns Service
 * Fetch campaigns from API
 */

import { getImageUrl } from '@/lib/image';

// Re-export for backward compatibility
export { getImageUrl };

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  goal: number;
  collected: number;
  donorCount: number;
  category: string | null;
  categoryId: string | null;
  pillar: string;
  isFeatured: boolean;
  isUrgent: boolean;
  endDate: string | null;
  createdAt: string;
}

export interface CampaignsResponse {
  success: boolean;
  data: Campaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

export async function fetchCampaigns(params?: {
  limit?: number;
  page?: number;
  status?: 'active' | 'draft' | 'completed';
  isFeatured?: boolean;
  isUrgent?: boolean;
  pillar?: string;
  category?: string;
}): Promise<CampaignsResponse> {
  try {
    const queryParams = new URLSearchParams();

    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.isFeatured !== undefined) queryParams.append('isFeatured', params.isFeatured.toString());
    if (params?.isUrgent !== undefined) queryParams.append('isUrgent', params.isUrgent.toString());
    if (params?.pillar) queryParams.append('pillar', params.pillar);
    if (params?.category) queryParams.append('category', params.category);

    const url = `${API_URL}/campaigns${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
}

export async function fetchCampaignBySlug(slug: string): Promise<Campaign> {
  try {
    const response = await fetch(`${API_URL}/campaigns/${slug}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch campaign: ${response.statusText}`);
    }

    const data = await response.json();
    return data.success ? data.data : data;
  } catch (error) {
    console.error('Error fetching campaign:', error);
    throw error;
  }
}

/**
 * Calculate days left until campaign end date
 */
export function calculateDaysLeft(endDate: string | null): number | null {
  if (!endDate) return null;

  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

// getImageUrl is now imported from @/lib/image
