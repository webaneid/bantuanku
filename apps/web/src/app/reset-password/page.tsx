"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input, Button, Label } from "@/components/atoms";
import toast from "@/lib/feedback-toast";
import api from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

function ResetPasswordContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [invalid, setInvalid] = useState(!token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (newPassword !== confirmPassword) {
      toast.error(t("auth.forgotPassword.toastPasswordMismatch"));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("auth.forgotPassword.toastPasswordMin"));
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password/email/reset", { token, newPassword });
      setDone(true);
    } catch (error: any) {
      // Token sekali pakai: setelah gagal karena tautan tidak valid, form tidak berguna lagi
      if (error.response?.status === 400) {
        setInvalid(true);
      } else {
        toast.error(error.response?.data?.message || t("auth.forgotPassword.toastResetFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
      {done ? (
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold text-gray-900">{t("auth.resetPassword.successTitle")}</h1>
          <p className="text-gray-600">{t("auth.resetPassword.successDesc")}</p>
          <Link href="/login">
            <Button fullWidth>{t("auth.verifyEmail.goLogin")}</Button>
          </Link>
        </div>
      ) : invalid ? (
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold text-gray-900">{t("auth.resetPassword.invalidTitle")}</h1>
          <p className="text-gray-600">{t("auth.resetPassword.invalidDesc")}</p>
          <Link href="/forgot-password">
            <Button variant="outline" fullWidth>{t("auth.resetPassword.requestNew")}</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t("auth.resetPassword.title")}</h1>
            <p className="text-gray-600 mt-2">{t("auth.resetPassword.subtitle")}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="newPassword">{t("auth.forgotPassword.newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("auth.forgotPassword.newPasswordPlaceholder")}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t("auth.forgotPassword.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("auth.forgotPassword.confirmPasswordPlaceholder")}
                required
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? t("auth.forgotPassword.processing") : t("auth.forgotPassword.submit")}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
      <Suspense fallback={null}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
