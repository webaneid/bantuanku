const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  pillarId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoriesResponse {
  data: Category[];
}

/**
 * Fetch all active categories
 */
export async function fetchCategories(): Promise<CategoriesResponse> {
  try {
    const response = await fetch(`${API_URL}/categories`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}
