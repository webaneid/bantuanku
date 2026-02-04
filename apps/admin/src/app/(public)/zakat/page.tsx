"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { Sparkles, Calculator, ArrowRight } from "lucide-react";

export default function ZakatPublicPage() {
  const { data: typesData } = useQuery({
    queryKey: ["public-zakat-types"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/types?isActive=true&limit=100");
      return response.data.data || [];
    },
  });

  const activeTypes = typesData?.filter((type: any) => type.hasCalculator) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-medium text-gray-700">Kalkulator Zakat</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Hitung Zakat Anda dengan Mudah
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            Gunakan kalkulator zakat kami untuk menghitung kewajiban zakat Anda secara akurat
            berdasarkan nisab dan haul yang berlaku.
          </p>
        </div>

        {/* Calculator Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto mt-12">
          {activeTypes.map((type: any) => (
            <Link
              key={type.id}
              href={`/zakat/${type.slug}`}
              className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{type.icon}</div>
                <Calculator className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                {type.name}
              </h3>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {type.description}
              </p>

              <div className="flex items-center text-primary-600 font-medium text-sm group-hover:gap-2 transition-all">
                <span>Hitung Sekarang</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* Info Section */}
        <div className="max-w-4xl mx-auto mt-16 bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tentang Zakat</h2>

          <div className="space-y-4 text-gray-600">
            <p>
              Zakat adalah rukun Islam yang ketiga dan merupakan kewajiban bagi setiap muslim
              yang telah memenuhi syarat (nisab dan haul).
            </p>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="border-l-4 border-primary-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">Nisab</h3>
                <p className="text-sm">
                  Batas minimum harta yang wajib dizakati. Nisab zakat maal adalah 85 gram emas
                  atau setara 595 gram perak.
                </p>
              </div>

              <div className="border-l-4 border-primary-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">Haul</h3>
                <p className="text-sm">
                  Masa kepemilikan harta selama 1 tahun hijriyah (354 hari). Harta yang telah
                  mencapai nisab dan haul wajib dizakati sebesar 2.5%.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 8 Asnaf Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            8 Golongan Penerima Zakat (Asnaf)
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Fakir", desc: "Tidak memiliki harta" },
              { name: "Miskin", desc: "Harta tidak mencukupi" },
              { name: "Amil", desc: "Pengelola zakat" },
              { name: "Mualaf", desc: "Yang baru masuk Islam" },
              { name: "Riqab", desc: "Budak/hamba sahaya" },
              { name: "Gharim", desc: "Yang berutang" },
              { name: "Fisabilillah", desc: "Di jalan Allah" },
              { name: "Ibnus Sabil", desc: "Musafir kehabisan bekal" },
            ].map((asnaf, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 shadow border border-gray-100">
                <div className="text-lg font-semibold text-primary-600 mb-1">
                  {idx + 1}. {asnaf.name}
                </div>
                <div className="text-xs text-gray-600">{asnaf.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
