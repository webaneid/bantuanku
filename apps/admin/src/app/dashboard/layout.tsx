"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Menu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMitra = user?.roles?.includes("mitra") && user.roles.length === 1;

  const { data: groupedSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get("/admin/settings");
      return response.data?.data || {};
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user && !isMitra,
  });

  const organizationSettings = groupedSettings?.organization || [];
  const organizationLogo =
    organizationSettings.find((s: any) => s.key === "organization_logo")?.value || "";
  const organizationName =
    organizationSettings.find((s: any) => s.key === "organization_name")?.value || "Bantuanku";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !user) {
      router.push("/login");
    }
  }, [user, router, mounted]);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <Sidebar variant="desktop" />

      {/* Mobile sidebar overlay */}
      <Sidebar
        variant="mobile"
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto bg-gray-50">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 mobile-topbar">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="mobile-topbar__button"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          {organizationLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={organizationLogo}
              alt={organizationName}
              className="mobile-topbar__logo"
            />
          ) : (
            <span className="mobile-topbar__fallback">{organizationName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
