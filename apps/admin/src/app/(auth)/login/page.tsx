"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [organizationLogo, setOrganizationLogo] = useState("");

  // Reset loading state on mount (Firefox fix)
  useEffect(() => {
    setIsLoading(false);

    // Clean up any corrupt Zustand state in localStorage
    try {
      const authStorage = localStorage.getItem("auth-storage");
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        if (parsed.state && parsed.state.isLoading) {
          // Remove isLoading from persisted state
          delete parsed.state.isLoading;
          localStorage.setItem("auth-storage", JSON.stringify(parsed));
        }
      }
    } catch (e) {
      // If localStorage is corrupt, clear it
      localStorage.removeItem("auth-storage");
    }

    const fetchOrganizationLogo = async () => {
      try {
        const response = await api.get("/settings");
        const settings = response.data?.data || {};
        setOrganizationLogo(typeof settings.organization_logo === "string" ? settings.organization_logo : "");
      } catch {
        setOrganizationLogo("");
      }
    };

    fetchOrganizationLogo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isLoading) return;

    setIsLoading(true);
    try {
      await login(email, password);
      toast.success("Login successful!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          {organizationLogo ? (
            <img
              src={organizationLogo}
              alt="Logo organisasi"
              className="h-12 w-auto mx-auto object-contain"
            />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900">Bantuanku</h1>
          )}
          <p className="text-gray-600 mt-2">Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        {isLoading && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="text-xs text-red-600 hover:underline"
            >
              Stuck? Click here to reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
