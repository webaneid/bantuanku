import { MetadataRoute } from 'next';

// Generate sitemap at request time, not build time
export const dynamic = 'force-dynamic';

function safeDate(value: any): Date {
  if (!value) return new Date();
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: appUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${appUrl}/program`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${appUrl}/zakat`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${appUrl}/zakat/laporan`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${appUrl}/qurban`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${appUrl}/qurban/laporan`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${appUrl}/wakaf`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${appUrl}/daftar-mitra`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${appUrl}/laporan`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  // Zakat calculator pages
  const zakatCalculators = [
    'zakat-fitrah', 'zakat-maal', 'zakat-penghasilan',
    'zakat-profesi', 'zakat-pertanian', 'zakat-peternakan', 'zakat-bisnis',
  ];
  const calculatorPages: MetadataRoute.Sitemap = zakatCalculators.map((slug) => ({
    url: `${appUrl}/zakat/calculator/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Fetch all dynamic pages in parallel
  const [campaignPages, zakatTypePages, qurbanPages, categoryPages, pillarPages, staticContentPages, reportPages] = await Promise.all([
    fetchCampaignPages(apiUrl, appUrl),
    fetchZakatTypePages(apiUrl, appUrl),
    fetchQurbanPages(apiUrl, appUrl),
    fetchCategoryPages(apiUrl, appUrl),
    fetchPillarPages(apiUrl, appUrl),
    fetchStaticContentPages(apiUrl, appUrl),
    fetchReportPages(apiUrl, appUrl),
  ]);

  return [
    ...staticPages,
    ...calculatorPages,
    ...campaignPages,
    ...zakatTypePages,
    ...qurbanPages,
    ...categoryPages,
    ...pillarPages,
    ...staticContentPages,
    ...reportPages,
  ];
}

async function fetchCampaignPages(apiUrl: string, appUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const allCampaigns: any[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const response = await fetch(`${apiUrl}/campaigns?limit=${limit}&page=${page}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) break;

      const data = await response.json();
      const campaigns = Array.isArray(data.data) ? data.data : (data.data?.data || []);
      allCampaigns.push(...campaigns);

      if (campaigns.length < limit) break;
      page++;
    }

    return allCampaigns.map((campaign: any) => ({
      url: `${appUrl}/program/${campaign.slug}`,
      lastModified: safeDate(campaign.updatedAt || campaign.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Error fetching campaigns for sitemap:', error);
    return [];
  }
}

async function fetchZakatTypePages(apiUrl: string, appUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const response = await fetch(`${apiUrl}/zakat/types`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const types = Array.isArray(data.data) ? data.data : (data.data?.data || []);

    return types
      .filter((t: any) => t.isActive !== false && t.slug)
      .map((t: any) => ({
        url: `${appUrl}/zakat/${t.slug}`,
        lastModified: safeDate(t.updatedAt || t.createdAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
  } catch (error) {
    console.error('Error fetching zakat types for sitemap:', error);
    return [];
  }
}

async function fetchQurbanPages(apiUrl: string, appUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    // 1. Fetch active periods
    const periodsRes = await fetch(`${apiUrl}/qurban/periods?status=active`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!periodsRes.ok) return [];

    const periodsData = await periodsRes.json();
    const periods = Array.isArray(periodsData.data) ? periodsData.data : (periodsData.data?.data || []);

    // 2. Fetch packages for each period to get packagePeriodIds
    const allPackages: any[] = [];
    for (const period of periods) {
      try {
        const pkgRes = await fetch(`${apiUrl}/qurban/periods/${period.id}/packages`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!pkgRes.ok) continue;

        const pkgData = await pkgRes.json();
        const packages = Array.isArray(pkgData.data) ? pkgData.data : (pkgData.data?.data || []);
        allPackages.push(...packages);
      } catch {
        // Skip this period if fetch fails
      }
    }

    return allPackages
      .filter((pkg: any) => pkg.packagePeriodId)
      .map((pkg: any) => ({
        url: `${appUrl}/qurban/${pkg.packagePeriodId}`,
        lastModified: safeDate(pkg.updatedAt || pkg.createdAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
  } catch (error) {
    console.error('Error fetching qurban packages for sitemap:', error);
    return [];
  }
}

async function fetchCategoryPages(apiUrl: string, appUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const response = await fetch(`${apiUrl}/categories`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const categories = Array.isArray(data.data) ? data.data : (data.data?.data || []);

    return categories
      .filter((c: any) => c.isActive !== false && c.slug)
      .map((c: any) => ({
        url: `${appUrl}/program/kategori/${c.slug}`,
        lastModified: safeDate(c.updatedAt || c.createdAt),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
    return [];
  }
}

async function fetchPillarPages(apiUrl: string, appUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const response = await fetch(`${apiUrl}/pillars`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const pillars = Array.isArray(data.data) ? data.data : (data.data?.data || []);

    return pillars
      .filter((p: any) => p.slug)
      .map((p: any) => ({
        url: `${appUrl}/program/pilar/${p.slug}`,
        lastModified: safeDate(p.updatedAt || p.createdAt),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
  } catch (error) {
    console.error('Error fetching pillars for sitemap:', error);
    return [];
  }
}

async function fetchStaticContentPages(apiUrl: string, appUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const response = await fetch(`${apiUrl}/pages`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const pages = Array.isArray(data.data) ? data.data : (data.success ? data.data : data) || [];

    if (!Array.isArray(pages)) return [];

    return pages
      .filter((page: any) => page.isPublished !== false)
      .map((page: any) => ({
        url: `${appUrl}/page/${page.slug}`,
        lastModified: safeDate(page.updatedAt || page.createdAt),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      }));
  } catch (error) {
    console.error('Error fetching pages for sitemap:', error);
    return [];
  }
}

async function fetchReportPages(apiUrl: string, appUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const allReports: any[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const response = await fetch(`${apiUrl}/activity-reports?limit=${limit}&page=${page}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) break;

      const data = await response.json();
      const reports = data.data?.data || [];
      if (!Array.isArray(reports)) break;
      allReports.push(...reports);

      if (reports.length < limit) break;
      page++;
    }

    return allReports
      .filter((r: any) => r.slug)
      .map((r: any) => ({
        url: `${appUrl}/laporan/${r.slug}`,
        lastModified: safeDate(r.publishedAt || r.activityDate || r.createdAt),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));
  } catch (error) {
    console.error('Error fetching reports for sitemap:', error);
    return [];
  }
}
