"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Input, Button, Label } from "@/components/atoms";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:50245/v1";

// Normalize phone number
function normalizePhone(input: string | null | undefined): string {
  if (!input) return "";
  let cleaned = input.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+62")) {
    cleaned = "0" + cleaned.substring(3);
  } else if (cleaned.startsWith("62") && cleaned.length > 10) {
    cleaned = "0" + cleaned.substring(2);
  }
  if (cleaned && !cleaned.startsWith("0")) {
    cleaned = "0" + cleaned;
  }
  return cleaned;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, isHydrated } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    whatsappNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isHydrated && user) {
      router.push("/");
    }
  }, [user, router, isHydrated]);

  // Check if user already exists
  const checkExistingUser = useCallback(async (email: string, phone: string) => {
    if (!email || email.length < 5) return;
    if (!phone || phone.length < 10) return;

    setIsChecking(true);
    try {
      const params = new URLSearchParams();
      params.append("email", email.toLowerCase().trim());
      params.append("phone", normalizePhone(phone));

      const response = await fetch(`${API_URL}/auth/check-registration?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.data.exists) {
        if (data.data.registered) {
          // User already registered with password
          setShowLoginPrompt(true);
          toast.error("Email atau nomor telepon sudah terdaftar");
        } else {
          // User exists from checkout but hasn't registered yet
          // Auto-fill the name
          if (data.data.name && !isAutoFilled) {
            setFormData((prev) => ({
              ...prev,
              name: data.data.name,
            }));
            setIsAutoFilled(true);
            toast.success("Data Anda ditemukan! Nama telah diisi otomatis");
          }
        }
      }
    } catch (error) {
      console.error("Error checking registration:", error);
    } finally {
      setIsChecking(false);
    }
  }, [isAutoFilled]);

  // Debounced check - trigger when both email and phone are filled
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.email && formData.phone) {
        checkExistingUser(formData.email, formData.phone);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [formData.email, formData.phone, checkExistingUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      // If phone changes and sameAsPhone is checked, update whatsappNumber too
      if (name === "phone" && sameAsPhone) {
        updated.whatsappNumber = value;

        // If phone is cleared, uncheck sameAsPhone
        if (!value) {
          setSameAsPhone(false);
        }
      }

      return updated;
    });

    // Reset auto-fill flag if user manually changes name
    if (name === "name" && isAutoFilled) {
      setIsAutoFilled(false);
    }
  };

  const handleSameAsPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;

    if (checked && !formData.phone) {
      toast.error("Isi nomor telepon terlebih dahulu");
      return;
    }

    setSameAsPhone(checked);

    if (checked) {
      // Copy phone to whatsappNumber
      setFormData((prev) => ({
        ...prev,
        whatsappNumber: prev.phone,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading || showLoginPrompt) return;

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error("Password tidak cocok");
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }

    // Validate whatsapp number
    if (!formData.whatsappNumber || formData.whatsappNumber.length < 10) {
      toast.error("Nomor WhatsApp tidak valid (minimal 10 digit)");
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        whatsappNumber: formData.whatsappNumber,
        password: formData.password,
      });
      toast.success("Registrasi berhasil! Anda akan diarahkan ke beranda");
      router.push("/");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Registrasi gagal";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4 py-8">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Daftar</h1>
          <p className="text-gray-600 mt-2">Buat akun baru untuk mulai berdonasi</p>
        </div>

        {showLoginPrompt && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                  Akun Sudah Terdaftar
                </h3>
                <p className="text-sm text-yellow-700 mb-3">
                  Email atau nomor telepon Anda sudah terdaftar. Silahkan login untuk melanjutkan.
                </p>
                <Link href="/login" className="inline-block text-sm font-medium text-primary-600 hover:text-primary-700">
                  Login sekarang →
                </Link>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="nama@email.com"
              required
              disabled={showLoginPrompt}
            />
            <p className="text-xs text-gray-500 mt-1">Email akan digunakan sebagai username</p>
          </div>

          <div>
            <Label htmlFor="phone">
              Nomor Telepon <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="08xx xxxx xxxx"
              required
              disabled={showLoginPrompt}
            />
            {isChecking && (
              <p className="text-xs text-blue-600 mt-1">Memeriksa data...</p>
            )}
          </div>

          <div>
            <Label htmlFor="name">
              Nama Lengkap <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Masukkan nama lengkap"
              required
              disabled={showLoginPrompt}
            />
            {isAutoFilled && (
              <p className="text-xs text-green-600 mt-1">✓ Nama terisi otomatis dari data sebelumnya</p>
            )}
          </div>

          <div>
            <Label htmlFor="whatsappNumber">
              Nomor WhatsApp <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="sameAsPhone"
                  checked={sameAsPhone}
                  onChange={handleSameAsPhoneChange}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  disabled={showLoginPrompt}
                />
                <label htmlFor="sameAsPhone" className="text-sm text-gray-700 cursor-pointer">
                  Sama dengan nomor telepon
                </label>
              </div>
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                type="tel"
                value={formData.whatsappNumber}
                onChange={handleChange}
                placeholder="08xx xxxx xxxx"
                disabled={sameAsPhone || showLoginPrompt}
                required
              />
              <p className="text-xs text-gray-500">Wajib diisi - untuk notifikasi donasi</p>
            </div>
          </div>

          <div>
            <Label htmlFor="password">
              Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimal 8 karakter"
              required
              disabled={showLoginPrompt}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">
              Konfirmasi Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Ulangi password"
              required
              disabled={showLoginPrompt}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || showLoginPrompt}
            className="w-full"
          >
            {isLoading ? "Memproses..." : "Daftar"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Sudah punya akun?{" "}
            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Masuk di sini
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
