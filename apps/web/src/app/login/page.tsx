"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Input, Button, Label } from "@/components/atoms";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
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
      toast.success("Login berhasil!");
      // Redirect to account dashboard
      router.push("/account");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login gagal");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Masuk</h1>
          <p className="text-gray-600 mt-2">Selamat datang kembali!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Memproses..." : "Masuk"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Belum punya akun?{" "}
            <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Daftar sekarang
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
