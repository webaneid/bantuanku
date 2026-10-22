"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/atoms";
import { useI18n } from "@/lib/i18n/provider";

// Hanya path relatif di situs sendiri (cegah open redirect lewat parameter `next`). Browser membuang
// TAB/CR/LF saat mem-parse URL, jadi "/\t/evil.com" menjadi "//evil.com": tolak karakter kontrol dan
// pastikan hasil parse tetap di origin yang sama.
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) {
    return "/account";
  }
  try {
    if (new URL(value, window.location.origin).origin !== window.location.origin) return "/account";
  } catch {
    return "/account";
  }
  return value;
}

function GoogleCallbackContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const [failed, setFailed] = useState(false);
  // Kode tukar sekali pakai: cegah panggilan ganda (React strict mode) yang membuat panggilan kedua gagal
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = searchParams.get("code");
    const next = safeNext(searchParams.get("next"));
    if (!code) {
      setFailed(true);
      return;
    }

    // Hapus kode dari URL/riwayat segera
    window.history.replaceState(null, "", "/auth/google");

    api
      .post("/auth/google/exchange", { code })
      .then(async (res) => {
        const { user, accessToken } = res.data.data;
        await setSession(user, accessToken);
        // Nomor WhatsApp wajib: akun Google baru belum punya, arahkan ke profil untuk melengkapi
        router.replace(user.whatsappNumber ? next : "/account/profile");
      })
      .catch(() => setFailed(true));
  }, [searchParams, router, setSession]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
      {!failed ? (
        <>
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t("auth.google.signingIn")}</p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t("auth.google.failedTitle")}</h1>
          <p className="text-gray-600 mb-6">{t("auth.google.failedDesc")}</p>
          <Link href="/login">
            <Button variant="outline" fullWidth>{t("auth.verifyEmail.backToLogin")}</Button>
          </Link>
        </>
      )}
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <GoogleCallbackContent />
      </Suspense>
    </div>
  );
}
