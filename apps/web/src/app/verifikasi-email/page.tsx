"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/atoms";
import { useI18n } from "@/lib/i18n/provider";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  // Token sekali pakai: cegah dua panggilan (React strict mode) yang membuat panggilan kedua gagal
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      return;
    }

    api
      .post("/auth/email/verify", { token })
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [searchParams]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
      {status === "loading" && (
        <>
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t("auth.verifyEmail.verifying")}</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t("auth.verifyEmail.successTitle")}</h1>
          <p className="text-gray-600 mb-6">{t("auth.verifyEmail.successDesc")}</p>
          <Link href="/login">
            <Button fullWidth>{t("auth.verifyEmail.goLogin")}</Button>
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t("auth.verifyEmail.errorTitle")}</h1>
          <p className="text-gray-600 mb-6">{t("auth.verifyEmail.errorDesc")}</p>
          <Link href="/login">
            <Button variant="outline" fullWidth>{t("auth.verifyEmail.backToLogin")}</Button>
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
