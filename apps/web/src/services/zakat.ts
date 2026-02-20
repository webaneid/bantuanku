import { getImageUrl } from '@/lib/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

// Export image helper for use in components
export { getImageUrl };

export interface ZakatType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  icon: string | null;
  hasCalculator: boolean;
  calculatorType?: string | null;
  fitrahAmount?: number | string | null;
  ownerType?: "organization" | "mitra";
  ownerName?: string | null;
  ownerSlug?: string | null;
  ownerLogoUrl?: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface ZakatConfig {
  calculators: any[];
  goldPricePerGram: number;
  zakatFitrahPerPerson: number;
  ricePricePerKg: number;
  fidyahPerDay: number;
}

export interface ZakatCalculationResult {
  type: string;
  isWajib: boolean;
  nisabValue: number;
  totalAssets: number;
  zakatAmount: number;
  details: any;
}

export interface ZakatPeriod {
  id: string;
  name: string;
  year: number;
  hijriYear: string | null;
  startDate: string;
  endDate: string;
  status: string;
}

// Get active zakat types
export async function fetchZakatTypes(): Promise<ZakatType[]> {
  try {
    const response = await fetch(`${API_URL}/zakat/types`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch zakat types: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching zakat types:', error);
    throw error;
  }
}

// Get zakat configuration
export async function fetchZakatConfig(): Promise<ZakatConfig> {
  try {
    const response = await fetch(`${API_URL}/zakat/config`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch zakat config: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching zakat config:', error);
    throw error;
  }
}

// Get active zakat periods
export async function fetchZakatPeriods(): Promise<ZakatPeriod[]> {
  try {
    const response = await fetch(`${API_URL}/zakat/periods`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch zakat periods: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching zakat periods:', error);
    throw error;
  }
}

// Calculate Zakat Fitrah
export async function calculateZakatFitrah(params: {
  numberOfPeople: number;
  pricePerPerson?: number;
}, token?: string): Promise<ZakatCalculationResult> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/zakat/calculate/fitrah`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to calculate zakat fitrah: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error calculating zakat fitrah:', error);
    throw error;
  }
}

// Calculate Zakat Maal
export async function calculateZakatMaal(params: {
  savings: number;
  deposits?: number;
  stocks?: number;
  otherAssets?: number;
  debts?: number;
}, token?: string): Promise<ZakatCalculationResult> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/zakat/calculate/maal`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to calculate zakat maal: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error calculating zakat maal:', error);
    throw error;
  }
}

// Calculate Zakat Income (Penghasilan)
export async function calculateZakatIncome(params: {
  monthlyIncome: number;
  otherIncome?: number;
  monthlyExpenses?: number;
}, token?: string): Promise<ZakatCalculationResult> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/zakat/calculate/income`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to calculate zakat income: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error calculating zakat income:', error);
    throw error;
  }
}

// Calculate Zakat Trade (Bisnis)
export async function calculateZakatTrade(params: {
  inventory: number;
  receivables?: number;
  cash?: number;
  payables?: number;
}, token?: string): Promise<ZakatCalculationResult> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/zakat/calculate/trade`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to calculate zakat trade: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error calculating zakat trade:', error);
    throw error;
  }
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
