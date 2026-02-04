'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header, Footer } from '@/components/organisms';
import ProgramListTemplate from '@/components/templates/ProgramListTemplate';
import { fetchPublicSettings } from '@/services/settings';

export default function ProgramPage() {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get('category');

  // Page settings state
  const [pageTitle, setPageTitle] = useState("Semua Program");
  const [pageDescription, setPageDescription] = useState("Pilih program yang ingin Anda dukung dan berbagi kebaikan untuk sesama");

  // Fetch page settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchPublicSettings();

        if (settings.frontend_program_page) {
          const programPage = JSON.parse(settings.frontend_program_page);
          if (programPage.title) setPageTitle(programPage.title);
          if (programPage.description) setPageDescription(programPage.description);
        }
      } catch (error) {
        console.error('Failed to fetch program page settings:', error);
      }
    };

    loadSettings();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <ProgramListTemplate
          initialCategorySlug={categoryFromUrl || undefined}
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          showCategoryFilter={true}
        />
      </main>
      <Footer />
    </div>
  );
}
