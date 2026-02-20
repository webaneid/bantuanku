import React from 'react';
import {
  Header,
  Footer,
  ProgramCard,
  HeroSlider,
  HeroSlide,
} from '@/components/organisms';

const heroSlides: HeroSlide[] = [
  {
    id: '1',
    title: 'Bantu Anak Yatim Mendapatkan Pendidikan Layak',
    description: 'Bersama kita wujudkan mimpi mereka untuk mendapatkan pendidikan yang berkualitas',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1920&q=80',
    ctaText: 'Donasi Sekarang',
    ctaLink: '/program/pendidikan-anak-yatim',
  },
  {
    id: '2',
    title: 'Program Zakat Fitrah & Zakat Mal',
    description: 'Salurkan zakat Anda kepada yang berhak dengan aman dan terpercaya',
    image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=1920&q=80',
    ctaText: 'Bayar Zakat',
    ctaLink: '/zakat',
  },
  {
    id: '3',
    title: 'Qurban 2026 - Berbagi Kebahagiaan',
    description: 'Semarakkan Idul Adha dengan berbagi daging qurban untuk keluarga yang membutuhkan',
    image: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=1920&q=80',
    ctaText: 'Pesan Qurban',
    ctaLink: '/qurban',
  },
];

const programs = [
  {
    id: '1',
    slug: 'bantuan-pendidikan-anak-yatim',
    title: 'Bantuan Pendidikan Anak Yatim',
    description: 'Membantu biaya pendidikan untuk 100 anak yatim di wilayah terpencil',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
    programType: 'infaq' as const,
    categoryName: 'Infaq/Sedekah',
    currentAmount: 75000000,
    targetAmount: 100000000,
    donorCount: 234,
    daysLeft: 15,
    isUrgent: true,
  },
  {
    id: '2',
    slug: 'zakat-fitrah-2026',
    title: 'Zakat Fitrah 2026',
    description: 'Program penyaluran zakat fitrah untuk mustahik di seluruh Indonesia',
    image: 'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=800&q=80',
    programType: 'zakat' as const,
    categoryName: 'Zakat',
    currentAmount: 120000000,
    targetAmount: 100000000,
    donorCount: 567,
  },
  {
    id: '3',
    slug: 'qurban-kambing-2026',
    title: 'Qurban Kambing 2026',
    description: 'Paket qurban kambing dengan kualitas terbaik dan penyaluran merata',
    image: 'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=800&q=80',
    programType: 'qurban' as const,
    categoryName: 'Qurban',
    currentAmount: 45000000,
    targetAmount: 80000000,
    donorCount: 89,
    daysLeft: 30,
  },
  {
    id: '4',
    slug: 'wakaf-quran-untuk-pesantren',
    title: 'Wakaf Al-Quran untuk Pesantren',
    description: 'Wakaf 1000 Al-Quran untuk pesantren di daerah pedalaman',
    image: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=800&q=80',
    programType: 'wakaf' as const,
    categoryName: 'Wakaf',
    currentAmount: 15000000,
    targetAmount: 50000000,
    donorCount: 123,
    daysLeft: 45,
  },
  {
    id: '5',
    slug: 'bantuan-bencana-alam',
    title: 'Bantuan Darurat Bencana Alam',
    description: 'Bantuan kemanusiaan untuk korban bencana alam di beberapa wilayah',
    image: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&q=80',
    programType: 'infaq' as const,
    categoryName: 'Infaq/Sedekah',
    currentAmount: 92000000,
    targetAmount: 150000000,
    donorCount: 412,
    daysLeft: 7,
    isUrgent: true,
  },
  {
    id: '6',
    slug: 'renovasi-masjid',
    title: 'Renovasi Masjid Desa Terpencil',
    description: 'Membantu renovasi masjid yang rusak di desa terpencil',
    image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&q=80',
    programType: 'infaq' as const,
    categoryName: 'Infaq/Sedekah',
    currentAmount: 28000000,
    targetAmount: 75000000,
    donorCount: 156,
    daysLeft: 20,
  },
];

export default function TestOrganismsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />

      <main className="flex-1">
        {/* Hero Slider */}
        <section>
          <HeroSlider slides={heroSlides} />
        </section>

        {/* Program Cards Section */}
        <section className="py-16 bg-gray-50">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Program Donasi Terpopuler
              </h2>
              <p className="text-lg text-gray-600">
                Pilih program donasi yang ingin Anda dukung
              </p>
            </div>

            {/* Featured Card */}
            <div className="mb-8">
              <ProgramCard {...programs[0]} variant="featured" />
            </div>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {programs.slice(1, 4).map((program) => (
                <ProgramCard key={program.id} {...program} />
              ))}
            </div>

            {/* Compact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {programs.slice(4, 6).map((program) => (
                <ProgramCard key={program.id} {...program} variant="compact" />
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-5xl font-bold text-primary-600 mb-2 mono">
                  1.2M+
                </div>
                <div className="text-lg text-gray-600">Total Donatur</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-primary-600 mb-2 mono">
                  250+
                </div>
                <div className="text-lg text-gray-600">Program Aktif</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-primary-600 mb-2 mono">
                  15M+
                </div>
                <div className="text-lg text-gray-600">Dana Tersalurkan</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary-500 to-primary-700 text-white">
          <div className="container text-center">
            <h2 className="text-4xl font-bold mb-4">
              Mulai Berbagi Kebaikan Hari Ini
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Setiap donasi Anda akan disalurkan dengan amanah dan transparan kepada yang berhak menerimanya
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button className="btn btn-lg bg-white text-primary-600 hover:bg-gray-100">
                Lihat Semua Program
              </button>
              <button className="btn btn-outline btn-lg" style={{ borderColor: 'white', color: 'white' }}>
                Hubungi Kami
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
