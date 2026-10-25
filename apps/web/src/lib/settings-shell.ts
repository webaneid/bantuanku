import type { PublicSettings } from '@/services/settings';

/**
 * Kunci settings yang dibutuhkan komponen klien (Header, Footer, menu mobile, invoice, akun).
 * Layout server memilih hanya kunci ini sebelum mengirimnya ke browser, supaya payload kecil
 * dan data internal (mis. id Pixel, konfigurasi section beranda) tidak ikut terserialisasi.
 */
export const SHELL_SETTING_KEYS = [
  'site_name',
  'site_tagline',
  'organization_name',
  'organization_logo',
  'organization_institution_logo',
  'organization_about',
  'organization_about_url',
  'organization_about_url_label',
  'organization_phone',
  'organization_whatsapp',
  'organization_email',
  'organization_address',
  'organization_detail_address',
  'organization_province_name',
  'organization_regency_name',
  'organization_district_name',
  'organization_village_name',
  'frontend_header_menu',
  'frontend_footer_menu',
  'frontend_service_categories',
  'utilities_invoice_footer',
  'social_media_facebook',
  'social_media_instagram',
  'social_media_youtube',
  'social_media_twitter',
  'social_media_linkedin',
  'social_media_threads',
  'social_media_tiktok',
] as const;

export function pickShellSettings(settings: Record<string, any>): PublicSettings {
  const picked: Record<string, any> = {};
  for (const key of SHELL_SETTING_KEYS) {
    if (settings[key] !== undefined && settings[key] !== null) picked[key] = settings[key];
  }
  return picked as PublicSettings;
}
