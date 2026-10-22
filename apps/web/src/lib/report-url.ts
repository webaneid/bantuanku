// URL kanonik laporan kegiatan. Dipakai bersama oleh halaman /laporan/[slug] dan sitemap.xml agar keduanya
// SELALU sepakat: sitemap yang mencantumkan URL berbeda dari URL asli halaman menghasilkan 404 di mesin pencari.

export function slugifyReportTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * `canonicalUrl` eksplisit menang. Selain itu URL kanonik adalah `/laporan/<slug>` milik laporan itu sendiri;
 * satu-satunya pengecualian: slug berpola duplikat (`<slug-judul>-2`, `<slug-judul>-ab12cd`) dialihkan ke
 * `/laporan/<slug-judul>`. Slug yang sengaja berbeda dari judul (judul diedit setelah terbit) TIDAK ditebak
 * dari judul, karena URL itu tidak ada.
 */
export function inferCanonicalReportUrl(
  appUrl: string,
  report: { title?: string | null; canonicalUrl?: string | null } | null | undefined,
  currentSlug: string
): string {
  if (report?.canonicalUrl) {
    return report.canonicalUrl.startsWith('http')
      ? report.canonicalUrl
      : `${appUrl}${report.canonicalUrl.startsWith('/') ? report.canonicalUrl : `/${report.canonicalUrl}`}`;
  }

  const titleSlug = slugifyReportTitle(report?.title || '');
  const duplicateSuffixPattern = new RegExp(`^${titleSlug}-(?:\\d+|[a-z0-9]{4,12})$`);

  if (titleSlug && duplicateSuffixPattern.test(currentSlug)) {
    return `${appUrl}/laporan/${titleSlug}`;
  }

  return `${appUrl}/laporan/${currentSlug}`;
}
