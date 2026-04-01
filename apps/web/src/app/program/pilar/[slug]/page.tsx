import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header, Footer, Breadcrumb } from '@/components/organisms';
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.org';

  if (!pillar) {
    return {
      title: 'Pilar Tidak Ditemukan',
    };
  }

  const title = `${pillar.name} - Program Donasi`;
  const description = pillar.description || `Lihat semua program donasi untuk pilar ${pillar.name}. Salurkan bantuan Anda untuk berbagai program kebaikan.`;
  const canonical = `${appUrl}/program/pilar/${params.slug}`;

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
}

export default async function PillarArchivePage({ params }: PageProps) {
  const pillar = await fetchPillarBySlug(params.slug);

  if (!pillar) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Breadcrumb items={[{ label: 'Beranda', href: '/' }, { label: 'Program', href: '/program' }, { label: pillar.name }]} />
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
