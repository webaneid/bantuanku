"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Input, Button, Label } from "@/components/atoms";
import { VerifyEmailNotice } from "@/components/molecules/VerifyEmailNotice";
import { GoogleSignInButton } from "@/components/molecules/GoogleSignInButton";
import toast from "@/lib/feedback-toast";
import { useI18n } from "@/lib/i18n/provider";
import { readNextFromLocation, postLoginPath } from "@/lib/safe-next";

const GOOGLE_ERROR_CODES = ["google_unverified", "google_staff", "google_inactive", "google_cancelled", "google_disabled", "google_failed"];

// Menampilkan pesan bila API mengembalikan pengguna ke /login?error=google_* setelah alur Google gagal
function GoogleErrorNotice() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");

  useEffect(() => {
    if (!errorCode || !errorCode.startsWith("google_")) return;
    const code = GOOGLE_ERROR_CODES.includes(errorCode) ? errorCode : "google_failed";
    toast.error(t(`auth.google.errors.${code}`));
  }, [errorCode, t]);

  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { login, user, isHydrated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Diisi saat API menolak login karena email belum terverifikasi (EMAIL_NOT_VERIFIED)
  const [unverified, setUnverified] = useState<{ email: string; status?: "sent" | "cooldown" | "failed" } | null>(null);

  // Tujuan setelah login (`?next=`, mis. /checkout): dibaca di client; default dashboard akun
  const [nextPath, setNextPath] = useState("/account");
  useEffect(() => {
    setNextPath(readNextFromLocation() || "/account");
  }, []);

  // Redirect if already logged in (only after hydration)
  useEffect(() => {
    if (isHydrated && user) {
      router.push(postLoginPath(user, readNextFromLocation()));
    }
  }, [user, router, isHydrated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    try {
      await login(email, password);
      toast.success(t("auth.login.success"));
      // Aturan tujuan yang sama dengan login Google: tujuan khusus (mis. checkout) langsung; selain itu
      // profil bila WhatsApp masih kosong, atau dashboard akun
      router.push(postLoginPath(useAuth.getState().user, readNextFromLocation()));
    } catch (error: any) {
      if (error.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        setUnverified({ email, status: error.response.data.verificationEmail });
      } else {
        toast.error(error.response?.data?.message || t("auth.login.failed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (unverified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
          <VerifyEmailNotice email={unverified.email} sendStatus={unverified.status} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("auth.login.title")}</h1>
          <p className="text-gray-600 mt-2">{t("auth.login.subtitle")}</p>
        </div>

        <Suspense fallback={null}>
          <GoogleErrorNotice />
        </Suspense>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">{t("auth.login.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.login.emailPlaceholder")}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">{t("auth.login.password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.login.passwordPlaceholder")}
              required
            />
            <div className="mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {t("auth.login.forgotPassword")}
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? t("auth.login.processing") : t("auth.login.submit")}
          </Button>
        </form>

        <div className="mt-6">
          <GoogleSignInButton returnTo={nextPath} />
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            {t("auth.login.noAccount")}{" "}
            <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              {t("auth.login.registerNow")}
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            {t("auth.login.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
