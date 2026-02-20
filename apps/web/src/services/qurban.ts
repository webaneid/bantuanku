import { getImageUrl, getImageUrlByVariant, type ImageVariant } from '@/lib/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

export interface QurbanPeriod {
  id: string;
  name: string;
  hijriYear: number;
  gregorianYear: number;
  startDate: string;
  endDate: string;
  executionDate: string;
  status: string;
}

export interface QurbanPackage {
  availablePeriods?: Array<{
    periodId: string;
    packagePeriodId: string;
    periodName: string;
    gregorianYear: number;
    price: number;
  }>;
  packagePeriodId: string; // ID of package-period junction (unique per period)
  id: string; // Package master ID
  periodId: string;
  periodName?: string;
  periodEndDate?: string;
  periodExecutionDate?: string;
  animalType: string; // 'cow' or 'goat'
  packageType: string; // 'individual' or 'shared'
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number; // Price for this specific period
  maxSlots: number | null;
  slotsFilled: number;
  stock: number;
  stockSold: number;
  isFeatured: boolean;
  availableSlots: number;
  ownerType?: "organization" | "mitra";
  ownerName?: string | null;
  ownerSlug?: string | null;
  ownerLogoUrl?: string | null;
  executionDateOverride?: string | null;
  executionTimeNote?: string | null;
  executionLocation?: string | null;
  executionNotes?: string | null;
}

export async function fetchActivePeriods() {
  try {
    const url = `${API_URL}/qurban/periods`;

    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch periods: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching qurban periods:', error);
    throw error;
  }
}

export async function fetchPackagesByPeriod(periodId: string) {
  try {
    const url = `${API_URL}/qurban/periods/${periodId}/packages`;

    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch packages: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching qurban packages:', error);
    throw error;
  }
}

export async function fetchPackageDetail(packagePeriodId: string) {
  try {
    const url = `${API_URL}/qurban/packages/${packagePeriodId}`;

    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch package detail: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching qurban package detail:', error);
    throw error;
  }
}

// Helper to get image URL with fallback (alias for getImageUrl)
export function getQurbanImageUrl(imageUrl: string | null | undefined): string {
  const url = getImageUrl(imageUrl, '/images/placeholder-qurban.jpg');

  // Fix wrong port (8787 -> 50245) for localhost during development
  if (url.includes('localhost:8787')) {
    return url.replace('localhost:8787', 'localhost:50245');
  }

  return url;
}

export function getQurbanImageUrlByVariant(
  imageUrl: string | null | undefined,
  preferredVariants: ImageVariant[]
): string {
  const url = getImageUrlByVariant(imageUrl, preferredVariants, '/images/placeholder-qurban.jpg');

  if (url.includes('localhost:8787')) {
    return url.replace('localhost:8787', 'localhost:50245');
  }

  return url;
}

// Helper to map animal type to Indonesian
export function getAnimalTypeLabel(animalType: string): string {
  const map: Record<string, string> = {
    cow: 'Sapi',
    goat: 'Kambing',
  };
  return map[animalType] || animalType;
}

// Helper to map package type to Indonesian
export function getPackageTypeLabel(packageType: string): string {
  const map: Record<string, string> = {
    individual: 'Individu',
    shared: 'Patungan',
  };
  return map[packageType] || packageType;
}
