"use client";

import { usePathname, useRouter } from "next/navigation";
import { CogIcon, CreditCardIcon, UsersIcon, ScaleIcon, PaintBrushIcon, ChatBubbleLeftRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/lib/auth";

const allMenuItems = [
  {
    label: "General Settings",
    icon: CogIcon,
    href: "/dashboard/settings/general",
    roles: ["super_admin", "admin_finance"],
  },
  {
    label: "Administrasi Amil",
    icon: ScaleIcon,
    href: "/dashboard/settings/amil",
    roles: ["super_admin", "admin_finance"],
  },
  {
    label: "Payments",
    icon: CreditCardIcon,
    href: "/dashboard/settings/payments",
    roles: ["super_admin", "admin_finance"],
  },
  {
    label: "Users",
    icon: UsersIcon,
    href: "/dashboard/settings/users",
    roles: ["super_admin"],
  },
  {
    label: "Front-end",
    icon: PaintBrushIcon,
    href: "/dashboard/settings/frontend",
    roles: ["super_admin"],
  },
  {
    label: "SEO Halaman",
    icon: MagnifyingGlassIcon,
    href: "/dashboard/settings/seo",
    roles: ["super_admin"],
  },
  {
    label: "Notifikasi WhatsApp",
    icon: ChatBubbleLeftRightIcon,
    href: "/dashboard/settings/whatsapp",
    roles: ["super_admin"],
  },
  {
    label: "Developer",
    icon: CogIcon,
    href: "/dashboard/settings/developer",
    roles: ["super_admin", "admin_campaign", "admin_finance"],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const userRoles = user?.roles || [];
  const menuItems = allMenuItems.filter((item) =>
    userRoles.some((role) => item.roles.includes(role))
  );

  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Settings</h1>
        <p className="dashboard-subtitle">Kelola konfigurasi aplikasi</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-4 ${
                    active
                      ? "bg-primary-50 text-primary-700 border-primary-600 font-medium"
                      : "bg-white text-gray-700 border-transparent hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? "text-primary-600" : "text-gray-400"}`} />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
