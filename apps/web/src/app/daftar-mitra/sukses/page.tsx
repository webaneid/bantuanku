"use client";

import Link from "next/link";
import { Header as Navbar, Footer } from "@/components/organisms";

export default function DaftarMitraSuksesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-success-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-success-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pendaftaran Berhasil!</h1>

            <p className="text-gray-600 mb-6">
              Terima kasih telah mendaftar sebagai mitra lembaga. Tim kami akan memverifikasi data Anda dan menghubungi melalui email yang telah didaftarkan.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Langkah Selanjutnya:</h3>
              <ol className="text-sm text-gray-600 space-y-2">
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">1.</span>
                  Tim admin akan mereview pendaftaran Anda
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">2.</span>
                  Anda akan menerima email konfirmasi verifikasi
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">3.</span>
                  Setelah diverifikasi, Anda dapat login melalui dashboard admin
                </li>
              </ol>
            </div>

            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
