/**
 * Public Stats Service
 * Fetch public statistics from API
 */

import { API_URL } from '@/lib/api-url';

export interface PublicStats {
  totalDonors: number;
  totalCampaigns: number;
  totalDisbursed: number;
  totalPartners: number;
}


export async function fetchPublicStats(): Promise<PublicStats> {
  try {
    const response = await fetch(`${API_URL}/public-stats`, {
      next: { revalidate: 300, tags: ['stats'] },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle both {success: true, data: {...}} and direct {...} formats
    const stats = data.success ? data.data : data;

    return stats;
  } catch (error) {
    console.error('Error fetching public stats:', error);

    // Return default stats on error
    return {
      totalDonors: 0,
      totalCampaigns: 0,
      totalDisbursed: 0,
      totalPartners: 0,
    };
  }
}
