import { Header, Footer, ZakatCard } from '@/components/organisms';
import { fetchZakatTypes, getImageUrl, type ZakatType } from '@/services/zakat';
import { fetchPublicSettings } from '@/services/settings';

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Fallback zakat types jika API error atau belum ada data
// Image URLs akan di-set dari database/CDN, fallback ke placeholder jika kosong
const fallbackZakatTypes: ZakatType[] = [
  {
    id: 'zakat-fitrah',
    slug: 'zakat-fitrah',
    name: 'Zakat Fitrah',
    imageUrl: null, // Will use placeholder from getImageUrl
    description: null,
    icon: null,
    hasCalculator: true,
    isActive: true,
    displayOrder: 1,
  },
  {
    id: 'zakat-maal',
    slug: 'zakat-maal',
    name: 'Zakat Maal',
    imageUrl: null, // Will use placeholder from getImageUrl
    description: null,
    icon: null,
    hasCalculator: true,
    isActive: true,
    displayOrder: 2,
  },
  {
    id: 'zakat-penghasilan',
    slug: 'zakat-penghasilan',
    name: 'Zakat Penghasilan',
    imageUrl: null, // Will use placeholder from getImageUrl
    description: null,
    icon: null,
    hasCalculator: true,
    isActive: true,
    displayOrder: 3,
  },
  {
    id: 'zakat-bisnis',
    slug: 'zakat-bisnis',
    name: 'Zakat Bisnis',
    imageUrl: null, // Will use placeholder from getImageUrl
    description: null,
    icon: null,
    hasCalculator: true,
    isActive: true,
    displayOrder: 4,
  },
];

export default async function ZakatPage() {
  // Fetch zakat types from API
  let zakatTypes = fallbackZakatTypes;
  try {
    const types = await fetchZakatTypes();
    if (types && types.length > 0) {
      zakatTypes = types;
    }
  } catch (error) {
    console.error('Failed to fetch zakat types, using fallback data:', error);
  }

  // Default page content
  let pageTitle = "Zakat";
  let pageDescription = "Tunaikan zakat Anda dengan mudah dan amanah";
  let infoTitle = "Tentang Zakat";
  let infoItems = [
    "Zakat adalah rukun Islam yang ke-3 dan wajib ditunaikan oleh setiap Muslim yang mampu",
    "Zakat Fitrah dibayarkan menjelang Idul Fitri, sedangkan Zakat Mal dibayarkan saat harta mencapai nisab",
    "Zakat akan disalurkan kepada 8 golongan yang berhak (asnaf)",
    "Tunaikan zakat melalui lembaga resmi dan terpercaya",
  ];

  // Fetch settings from API
  try {
    const settings = await fetchPublicSettings();

    console.log('[Zakat Page] Settings response:', settings.frontend_zakat_page ? 'Found' : 'Not found');

    if (settings.frontend_zakat_page) {
      const zakatPage = JSON.parse(settings.frontend_zakat_page);
      console.log('[Zakat Page] Parsed data:', zakatPage);

      if (zakatPage.title) pageTitle = zakatPage.title;
      if (zakatPage.description) pageDescription = zakatPage.description;
      if (zakatPage.infoTitle) infoTitle = zakatPage.infoTitle;
      if (zakatPage.infoItems && Array.isArray(zakatPage.infoItems)) {
        infoItems = zakatPage.infoItems.map((item: any) => item.text);
      }

      console.log('[Zakat Page] Applied:', { pageTitle, pageDescription, infoTitle, infoItemsCount: infoItems.length });
    }
  } catch (error) {
    console.error('[Zakat Page] Failed to fetch settings:', error);
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <section className="py-12 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="section-title text-gray-900 mb-4">
                {pageTitle}
              </h1>
              <p className="section-description text-gray-600">
                {pageDescription}
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="container mx-auto px-4 py-8 md:py-12">

          {/* Zakat Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {zakatTypes.map((zakat) => (
              <ZakatCard
                key={zakat.id}
                id={zakat.id}
                slug={zakat.slug}
                title={zakat.name}
                image={getImageUrl(zakat.imageUrl, '/images/placeholder-zakat.jpg')}
              />
            ))}
          </div>

          {/* Info Box */}
          <div className="mt-12 bg-emerald-50 border border-emerald-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="hidden md:block w-5 h-5 text-emerald-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="section-title text-emerald-900 mb-3">
                  {infoTitle}
                </h4>
                <ul className="!space-y-0 md:!space-y-2 !mb-0 !ml-0">
                  {infoItems.map((item, index) => (
                    <li key={index} className="section-description text-emerald-800">• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
