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

  // Fetch campaigns for dynamic pages
  try {
    const response = await fetch(`${apiUrl}/campaigns?limit=100`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      console.error('Failed to fetch campaigns for sitemap');
      return staticPages;
    }

    const data = await response.json();
    const campaigns = data.data?.data || [];

    const campaignPages: MetadataRoute.Sitemap = campaigns.map((campaign: any) => ({
      url: `${appUrl}/program/${campaign.slug}`,
      lastModified: campaign.updatedAt ? new Date(campaign.updatedAt) : new Date(campaign.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [...staticPages, ...campaignPages];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return staticPages;
  }
}
