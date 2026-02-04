/**
 * Address Service
 * Fetch address data from API
 */

export interface CompleteAddress {
  village: {
    code: string;
    name: string;
    postalCode: string | null;
  };
  district: {
    code: string;
    name: string;
  };
  regency: {
    code: string;
    name: string;
  };
  province: {
    code: string;
    name: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

export async function fetchCompleteAddress(villageCode: string): Promise<CompleteAddress | null> {
  try {
    const response = await fetch(`${API_URL}/address/complete/${villageCode}`, {
      cache: 'force-cache', // Cache forever since address data rarely changes
    });

    if (!response.ok) {
      console.error(`Failed to fetch address: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching complete address:', error);
    return null;
  }
}

/**
 * Format complete address as single string
 * Format: "Detail Address, Village, District, Regency, Province"
 */
export function formatCompleteAddress(
  detailAddress: string,
  address: CompleteAddress
): string {
  const parts = [
    detailAddress,
    address.village.name,
    address.district.name,
    address.regency.name,
    address.province.name,
  ].filter(Boolean);

  return parts.join(', ');
}
