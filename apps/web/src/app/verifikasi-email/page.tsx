"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Input, Button, Label } from "@/components/atoms";
import { useI18n } from "@/lib/i18n/provider";

type Status = "form" | "invalid";

// Verifikasi butuh token dari email DAN password akun (ADR-0011): orang yang mendaftar dengan email
// orang lain tidak bisa membuat pemilik email "memverifikasi" akun itu hanya dengan mengklik tautan.
function VerifyEmailContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [status, setStatus] = useState<Status>(token ? "form" : "invalid");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setPasswordError(false);
    try {
      const res = await api.post("/auth/email/verify", { token, password });
      const { user, accessToken } = res.data.data;
      await setSession(user, accessToken);
      // Nomor WhatsApp wajib: bila belum ada, arahkan ke profil untuk melengkapi
      router.replace(user.whatsappNumber ? "/account" : "/account/profile");
    } catch (error: any) {
      if (error.response?.data?.code === "INVALID_PASSWORD") {
        // Token tidak hangus saat password salah: boleh coba lagi
        setPasswordError(true);
      } else {
        setStatus("invalid");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
      {status === "form" ? (
        <>
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t("auth.verifyEmail.confirmTitle")}</h1>
            <p className="text-gray-600">{t("auth.verifyEmail.confirmDesc")}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="verify-password">{t("auth.verifyEmail.passwordLabel")}</Label>
              <Input
                id="verify-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.verifyEmail.passwordPlaceholder")}
                required
              />
              {passwordError && <p className="text-sm text-danger-600 mt-1">{t("auth.verifyEmail.wrongPassword")}</p>}
            </div>
            <Button type="submit" fullWidth loading={isLoading}>
              {t("auth.verifyEmail.confirmSubmit")}
            </Button>
          </form>
          <p className="text-sm text-gray-500 mt-4 text-center">
            {t("auth.verifyEmail.forgotHint")}{" "}
            <Link href="/forgot-password" className="text-primary-600 hover:text-primary-700 font-medium">
              {t("auth.login.forgotPassword")}
            </Link>
          </p>
        </>
      ) : (
        <div className="text-center">
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
        </div>
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
