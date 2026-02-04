/**
 * Settings Service
 * Fetch public settings from API
 */

export interface MenuItem {
  id: string;
  label: string;
  url: string;
}

export interface PublicSettings {
  site_name?: string;
  site_tagline?: string;
  contact_email?: string;
  contact_phone?: string;
  organization_name?: string;
  organization_logo?: string;
  organization_about?: string;
  organization_about_url?: string;
  organization_about_url_label?: string;
  organization_phone?: string;
  organization_whatsapp?: string;
  organization_email?: string;
  organization_website?: string;
  organization_detail_address?: string;
  organization_province_code?: string;
  organization_regency_code?: string;
  organization_district_code?: string;
  organization_village_code?: string;
  gold_price_per_gram?: number;
  zakat_fitrah_amount?: number;
  fidyah_amount_per_day?: number;
  minimum_donation?: number;
  frontend_header_menu?: string; // JSON string
  frontend_hero_slides?: string; // JSON string
  frontend_service_categories?: string; // JSON string
  frontend_featured_section?: string; // JSON string
  frontend_programs_section?: string; // JSON string
  frontend_funfact_section?: string; // JSON string
  frontend_why_choose_us_section?: string; // JSON string
  frontend_cta_section?: string; // JSON string
  frontend_footer_menu?: string; // JSON string
  frontend_zakat_page?: string; // JSON string
  frontend_qurban_page?: string; // JSON string
  frontend_wakaf_page?: string; // JSON string
  frontend_program_page?: string; // JSON string
  amil_qurban_sapi_fee?: number;
  amil_qurban_perekor_fee?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

let cachedSettings: PublicSettings | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 0; // 0 seconds - no cache for development

export async function fetchPublicSettings(): Promise<PublicSettings> {
  // Return cached settings if still valid
  if (cachedSettings && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
    const response = await fetch(`${API_URL}/settings`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch settings: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle both {success: true, data: {...}} and direct {...} formats
    const settings = data.success ? data.data : data;

    cachedSettings = settings;
    cacheTime = Date.now();

    return settings;
  } catch (error) {
    console.error('Error fetching public settings:', error);

    // Return default settings on error
    return {
      site_name: 'Bantuanku',
      site_tagline: 'Platform Donasi Terpercaya',
      organization_logo: '/logo.svg',
    };
  }
}

export function clearSettingsCache(): void {
  cachedSettings = null;
  cacheTime = 0;
}
