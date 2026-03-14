import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${appUrl}/program`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${appUrl}/zakat`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/qurban`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/wakaf`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Fetch all dynamic pages in parallel
  const [campaignPages, staticContentPages] = await Promise.all([
    fetchCampaignPages(apiUrl, appUrl),
    fetchStaticContentPages(apiUrl, appUrl),
  ]);

  return [...staticPages, ...campaignPages, ...staticContentPages];
}

async function fetchCampaignPages(apiUrl: string, appUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    // Fetch all campaigns (paginate if needed)
    const allCampaigns: any[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const response = await fetch(`${apiUrl}/campaigns?limit=${limit}&page=${page}`, {
        next: { revalidate: 3600 },
      });

      if (!response.ok) break;

      const data = await response.json();
      const campaigns = data.data?.data || [];
      allCampaigns.push(...campaigns);

      // Stop if we got fewer than limit (last page)
      if (campaigns.length < limit) break;
      page++;
    }

    return allCampaigns.map((campaign: any) => ({
      url: `${appUrl}/program/${campaign.slug}`,
      lastModified: campaign.updatedAt ? new Date(campaign.updatedAt) : new Date(campaign.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Error fetching campaigns for sitemap:', error);
    return [];
  }
}

async function fetchStaticContentPages(apiUrl: string, appUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const response = await fetch(`${apiUrl}/pages`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const pages = (data.success ? data.data : data) || [];

    if (!Array.isArray(pages)) return [];

    return pages
      .filter((page: any) => page.isPublished !== false)
      .map((page: any) => ({
        url: `${appUrl}/page/${page.slug}`,
        lastModified: page.updatedAt ? new Date(page.updatedAt) : new Date(page.createdAt),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      }));
  } catch (error) {
    console.error('Error fetching pages for sitemap:', error);
    return [];
  }
}
