import { notFound, redirect } from 'next/navigation';
import { Header, Footer } from '@/components/organisms';
import { fetchZakatTypes, type ZakatType } from '@/services/zakat';
import Link from 'next/link';

// Map slug to specific calculator pages
const calculatorPages: Record<string, string> = {
  'zakat-fitrah': '/zakat/zakat-fitrah',
  'zakat-maal': '/zakat/zakat-maal',
  'zakat-profesi': '/zakat/zakat-profesi',
  'zakat-penghasilan': '/zakat/zakat-profesi', // Redirect to zakat-profesi
  'zakat-pertanian': '/zakat/zakat-pertanian',
  'zakat-peternakan': '/zakat/zakat-peternakan',
  'zakat-bisnis': '/zakat/zakat-bisnis',
};

interface Props {
  params: {
    slug: string;
  };
}

export default async function ZakatDetailPage({ params }: Props) {
  const { slug } = params;

  // Fetch all zakat types to find this one
  let zakatTypes: ZakatType[];
  try {
    zakatTypes = await fetchZakatTypes();
  } catch (error) {
    console.error('Failed to fetch zakat types:', error);
    notFound();
  }

  // Find the zakat type by slug
  const zakatType = zakatTypes.find((type) => type.slug === slug);

  if (!zakatType) {
    notFound();
  }

  // If this zakat type has a dedicated calculator page, redirect to it
  if (zakatType.hasCalculator && calculatorPages[slug]) {
    redirect(calculatorPages[slug]);
  }

  // Show info page for zakat types without calculator
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-8 md:py-12">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Link
            href="/zakat"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Zakat
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {zakatType.name}
            </h1>
            {zakatType.description && (
              <p className="text-gray-600" style={{ fontSize: '15px' }}>
                {zakatType.description}
              </p>
            )}
          </div>

          {/* Image */}
          {zakatType.imageUrl && (
            <div className="mb-8 rounded-xl overflow-hidden">
              <img
                src={zakatType.imageUrl}
                alt={zakatType.name}
                className="w-full h-64 md:h-96 object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
            <div className="prose max-w-none">
              {!zakatType.hasCalculator ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Tentang {zakatType.name}
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Informasi lengkap tentang {zakatType.name} akan segera tersedia.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <p className="text-blue-800">
                      Untuk informasi lebih lanjut tentang {zakatType.name}, silakan hubungi kami atau kunjungi kantor kami.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Kalkulator {zakatType.name}
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Kalkulator untuk {zakatType.name} sedang dalam pengembangan dan akan segera tersedia.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                    <p className="text-amber-800">
                      Sementara waktu, Anda dapat menghubungi kami untuk bantuan perhitungan {zakatType.name}.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Back to Zakat List */}
          <div className="mt-8 text-center">
            <Link
              href="/zakat"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Lihat Jenis Zakat Lainnya
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
