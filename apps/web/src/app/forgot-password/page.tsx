"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input, Button, Label } from "@/components/atoms";
import toast from "@/lib/feedback-toast";
import api from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password/request-otp", { phone });
      setOtpSent(true);
      toast.success(t("auth.forgotPassword.toastOtpSent"));
    } catch (requestError: any) {
      toast.error(requestError.response?.data?.message || t("auth.forgotPassword.toastOtpFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
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
      await api.post("/auth/forgot-password/reset", {
        phone,
        otp,
        newPassword,
      });
      toast.success(t("auth.forgotPassword.toastResetSuccess"));
      router.push("/login");
    } catch (resetError: any) {
      toast.error(resetError.response?.data?.message || t("auth.forgotPassword.toastResetFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("auth.forgotPassword.title")}</h1>
          <p className="text-gray-600 mt-2">{t("auth.forgotPassword.subtitle")}</p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleRequestOtp} className="space-y-6">
            <div>
              <Label htmlFor="phone">{t("auth.forgotPassword.phone")}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("auth.forgotPassword.phonePlaceholder")}
                required
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? t("auth.forgotPassword.processing") : t("auth.forgotPassword.sendOtp")}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <Label htmlFor="otp">{t("auth.forgotPassword.otp")}</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder={t("auth.forgotPassword.otpPlaceholder")}
                required
              />
            </div>

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
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            {t("auth.forgotPassword.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
