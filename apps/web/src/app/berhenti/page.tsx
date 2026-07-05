"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

type Status = "loading" | "success" | "already" | "error";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [isOptingIn, setIsOptingIn] = useState(false);
  const [optInDone, setOptInDone] = useState(false);

  useEffect(() => {
    const token = searchParams.get("t");
    if (!token) {
      setStatus("error");
      return;
    }

    api
      .get(`/wa/unsubscribe?t=${encodeURIComponent(token)}`)
      .then((res) => {
        if (res.data?.data?.alreadyOptedOut) {
          setStatus("already");
        } else {
          setStatus("success");
        }
      })
      .catch(() => setStatus("error"));
  }, [searchParams]);

  const handleOptIn = async () => {
    setIsOptingIn(true);
    try {
      await api.post("/wa/opt-in");
      setOptInDone(true);
    } catch {
      // opt-in requires login; redirect to login
      window.location.href = "/login?redirect=/account/profile";
    } finally {
      setIsOptingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Memproses permintaan...</p>
          </>
        )}

        {status === "success" && !optInDone && (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Berhasil Berhenti Berlangganan</h1>
            <p className="text-gray-600 mb-6">
              Anda tidak akan menerima pesan informasi & program dari kami via WhatsApp.
              Donasi Anda tetap dicatat dan kami sangat menghargai setiap kebaikan Bapak/Ibu.
            </p>
            <button
              onClick={handleOptIn}
              disabled={isOptingIn}
              className="text-sm text-primary-600 hover:underline disabled:opacity-50"
            >
              {isOptingIn ? "Memproses..." : "Berlangganan kembali"}
            </button>
          </>
        )}

        {status === "already" && !optInDone && (
          <>
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Sudah Berhenti Sebelumnya</h1>
            <p className="text-gray-600 mb-6">
              Anda sudah berhenti berlangganan sebelumnya. Tidak ada perubahan.
            </p>
            <button
              onClick={handleOptIn}
              disabled={isOptingIn}
              className="text-sm text-primary-600 hover:underline disabled:opacity-50"
            >
              {isOptingIn ? "Memproses..." : "Berlangganan kembali"}
            </button>
          </>
        )}

        {optInDone && (
          <>
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Berlangganan Kembali</h1>
            <p className="text-gray-600 mb-6">
              Anda akan kembali menerima info program & kebaikan dari kami via WhatsApp.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link Tidak Valid</h1>
            <p className="text-gray-600 mb-6">
              Link ini tidak valid atau sudah kedaluwarsa (berlaku 30 hari). Silakan minta link baru atau atur preferensi via halaman profil.
            </p>
          </>
        )}

        <Link href="/" className="block mt-4 text-sm text-gray-500 hover:text-gray-700">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
