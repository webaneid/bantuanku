import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header, Footer } from '@/components/organisms';
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

    if (!category) {
      return {
        title: 'Kategori Tidak Ditemukan',
      };
    }

    return {
      title: `${category.name} - Program Donasi`,
      description: `Lihat semua program donasi dalam kategori ${category.name}. Salurkan bantuan Anda untuk berbagai program kebaikan.`,
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
