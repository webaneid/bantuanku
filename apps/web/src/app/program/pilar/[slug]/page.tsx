import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header, Footer } from '@/components/organisms';
import ProgramListTemplate from '@/components/templates/ProgramListTemplate';

interface PageProps {
  params: {
    slug: string;
  };
}

// Fetch pillar data
async function fetchPillarBySlug(slug: string) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';
    const response = await fetch(`${API_URL}/pillars`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });
    const data = await response.json();

    if (data.success && data.data) {
      return data.data.find((pillar: any) => pillar.slug === slug);
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch pillar:', error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const pillar = await fetchPillarBySlug(params.slug);

  if (!pillar) {
    return {
      title: 'Pilar Tidak Ditemukan',
    };
  }

  return {
    title: `${pillar.name} - Program Donasi`,
    description: pillar.description || `Lihat semua program donasi untuk pilar ${pillar.name}. Salurkan bantuan Anda untuk berbagai program kebaikan.`,
  };
}

export default async function PillarArchivePage({ params }: PageProps) {
  const pillar = await fetchPillarBySlug(params.slug);

  if (!pillar) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <ProgramListTemplate
          initialPillarSlug={params.slug}
          pageTitle={`Program ${pillar.name}`}
          pageDescription={pillar.description || `Lihat semua program donasi untuk pilar ${pillar.name}`}
          showCategoryFilter={true}
        />
      </main>
      <Footer />
    </div>
  );
}
