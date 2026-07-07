import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header, Footer, Breadcrumb } from '@/components/organisms';
import ProgramListTemplate from '@/components/templates/ProgramListTemplate';
import { fetchCategories } from '@/services/categories';

interface PageProps {
  params: {
    slug: string;
  };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const categoriesResponse = await fetchCategories();
    const categories = categoriesResponse.data || [];
    const category = categories.find((cat: any) => cat.slug === params.slug);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    if (!category) {
      return {
        title: 'Kategori Tidak Ditemukan',
      };
    }

    const title = `${category.name} - Program Donasi`;
    const description = `Lihat semua program donasi dalam kategori ${category.name}. Salurkan bantuan Anda untuk berbagai program kebaikan.`;
    const canonical = `${appUrl}/program/kategori/${params.slug}`;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        type: 'website',
        url: canonical,
        title,
        description,
        locale: 'id_ID',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch (error) {
    return {
      title: 'Program Donasi',
    };
  }
}

export default async function CategoryArchivePage({ params }: PageProps) {
  try {
    // Fetch category data
    const categoriesResponse = await fetchCategories();
    const categories = categoriesResponse.data || [];
    const category = categories.find((cat: any) => cat.slug === params.slug);

    if (!category) {
      notFound();
    }

    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <Breadcrumb items={[{ label: 'Beranda', href: '/' }, { label: 'Program', href: '/program' }, { label: category.name }]} />
        <main className="flex-1">
          <ProgramListTemplate
            initialCategorySlug={params.slug}
            pageTitle={`Program ${category.name}`}
            pageDescription={category.description || `Lihat semua program donasi dalam kategori ${category.name}`}
            showCategoryFilter={true}
          />
        </main>
        <Footer />
      </div>
    );
  } catch (error) {
    console.error('Failed to load category page:', error);
    notFound();
  }
}
