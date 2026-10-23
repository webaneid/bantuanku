"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/atoms";
import { useI18n } from "@/lib/i18n/provider";
import { safeNextPath, postLoginPath } from "@/lib/safe-next";

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
    // API selalu mengirim `next` (default /account). `/account` = tidak ada tujuan khusus.
    const next = safeNextPath(searchParams.get("next"));
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
        // Aturan tujuan yang sama dengan login email (lihat postLoginPath)
        router.replace(postLoginPath(user, next));
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
