"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Input, Button, Label } from "@/components/atoms";
import toast from "@/lib/feedback-toast";
import { useI18n } from "@/lib/i18n/provider";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { login, user, isHydrated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in (only after hydration)
  useEffect(() => {
    if (isHydrated && user) {
      router.push("/account");
    }
  }, [user, router, isHydrated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    try {
      await login(email, password);
      toast.success(t("auth.login.success"));
      // Redirect to account dashboard
      router.push("/account");
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("auth.login.failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("auth.login.title")}</h1>
          <p className="text-gray-600 mt-2">{t("auth.login.subtitle")}</p>
        </div>

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
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? t("auth.login.processing") : t("auth.login.submit")}
          </Button>
        </form>

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
