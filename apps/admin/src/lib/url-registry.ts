/**
 * URL Registry - Central registry for all frontend URLs
 * Used by URLAutocomplete component to provide URL suggestions
 */

export interface URLOption {
  value: string;
  label: string;
  category: 'Static' | 'Pages' | 'Program' | 'Zakat' | 'Qurban' | 'Kategori' | 'Pilar';
  description?: string;
}

// Static/fixed URLs
const STATIC_URLS: URLOption[] = [
  {
    value: '/',
    label: 'Beranda',
    category: 'Static',
    description: 'Halaman utama website',
  },
  {
    value: '/program',
    label: 'Semua Program',
    category: 'Static',
    description: 'Halaman daftar semua program donasi',
  },
  {
    value: '/zakat',
    label: 'Zakat',
    category: 'Static',
    description: 'Halaman daftar jenis zakat',
  },
  {
    value: '/zakat/laporan',
    label: 'Laporan Zakat Publik',
    category: 'Static',
    description: 'Halaman laporan zakat publik (tabel + filter)',
  },
  {
    value: '/qurban',
    label: 'Qurban',
    category: 'Static',
    description: 'Halaman daftar paket qurban',
  },
  {
    value: '/qurban/laporan',
    label: 'Laporan Qurban Publik',
    category: 'Static',
    description: 'Halaman laporan qurban publik (tabel + filter)',
  },
];

/**
 * Fetch all available URLs from API
 */
export async function fetchAllURLs(): Promise<URLOption[]> {
  const urls: URLOption[] = [...STATIC_URLS];

  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

    // Fetch categories
    try {
      const categoriesRes = await fetch(`${API_URL}/categories`);
      const categoriesData = await categoriesRes.json();
      if (categoriesData.success && categoriesData.data) {
        categoriesData.data.forEach((cat: any) => {
          urls.push({
            value: `/program/kategori/${cat.slug}`,
            label: `Kategori: ${cat.name}`,
            category: 'Kategori',
            description: `Program kategori ${cat.name}`,
          });
        });
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }

    // Fetch pillars
    try {
      const pillarsRes = await fetch(`${API_URL}/pillars`);
      const pillarsData = await pillarsRes.json();
      if (pillarsData.success && pillarsData.data) {
        pillarsData.data.forEach((pillar: any) => {
          urls.push({
            value: `/program/pilar/${pillar.slug}`,
            label: `Pilar: ${pillar.name}`,
            category: 'Pilar',
            description: `Program pilar ${pillar.name}`,
          });
        });
      }
    } catch (error) {
      console.error('Failed to fetch pillars:', error);
    }

    // Fetch campaigns (limit to active only, max 100)
    try {
      const campaignsRes = await fetch(`${API_URL}/campaigns?status=active&limit=100`);
      const campaignsData = await campaignsRes.json();
      if (campaignsData.success && campaignsData.data) {
        campaignsData.data.forEach((campaign: any) => {
          urls.push({
            value: `/program/${campaign.slug}`,
            label: campaign.title,
            category: 'Program',
            description: `Program: ${campaign.title}`,
          });
        });
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }

    // Fetch static pages (published)
    try {
      const pagesRes = await fetch(`${API_URL}/pages`);
      const pagesData = await pagesRes.json();
      if (pagesData.success && pagesData.data) {
        pagesData.data.forEach((page: any) => {
          urls.push({
            value: `/page/${page.slug}`,
            label: `Page: ${page.title}`,
            category: 'Pages',
            description: `Halaman statis ${page.title}`,
          });
        });
      }
    } catch (error) {
      console.error('Failed to fetch pages:', error);
    }

    // Fetch zakat types
    try {
      const zakatRes = await fetch(`${API_URL}/zakat/types`);
      const zakatData = await zakatRes.json();
      if (zakatData.success && zakatData.data) {
        zakatData.data.forEach((zakat: any) => {
          urls.push({
            value: `/zakat/${zakat.slug}`,
            label: `Zakat: ${zakat.name}`,
            category: 'Zakat',
            description: `Zakat ${zakat.name}`,
          });
        });
      }
    } catch (error) {
      console.error('Failed to fetch zakat types:', error);
    }

    // Fetch qurban packages (get active period first)
    try {
      const periodsRes = await fetch(`${API_URL}/qurban/periods?status=active`);
      const periodsData = await periodsRes.json();
      if (periodsData.success && periodsData.data && periodsData.data.length > 0) {
        const activePeriod = periodsData.data[0];

        const packagesRes = await fetch(`${API_URL}/qurban/packages?periodId=${activePeriod.id}`);
        const packagesData = await packagesRes.json();
        if (packagesData.success && packagesData.data) {
          packagesData.data.forEach((pkg: any) => {
            urls.push({
              value: `/qurban/${pkg.slug}`,
              label: `Qurban: ${pkg.name}`,
              category: 'Qurban',
              description: `Paket qurban ${pkg.name}`,
            });
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch qurban packages:', error);
    }

  } catch (error) {
    console.error('Failed to fetch URLs:', error);
  }

  // Sort URLs by category and then by label
  return urls.sort((a, b) => {
    if (a.category !== b.category) {
      const categoryOrder = ['Static', 'Pages', 'Program', 'Kategori', 'Pilar', 'Zakat', 'Qurban'];
      return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    }
    return a.label.localeCompare(b.label, 'id-ID');
  });
}
