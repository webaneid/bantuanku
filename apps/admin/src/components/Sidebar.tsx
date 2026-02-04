"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Heart,
  DollarSign,
  Users,
  Settings,
  FileText,
  BarChart3,
  LogOut,
  ChevronDown,
  ChevronRight,
  Database,
  Sparkles,
  Beef,
} from "lucide-react";
import { X, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

// Define all menu items with role-based access
const allMenuItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
    roles: ["super_admin", "admin_campaign", "admin_finance"]
  },
  {
    icon: Heart,
    label: "Campaigns",
    href: "/dashboard/campaigns",
    roles: ["super_admin", "admin_campaign", "program_coordinator"],
    submenu: [
      { label: "All Campaigns", href: "/dashboard/campaigns", roles: ["super_admin", "admin_campaign", "program_coordinator"] },
      { label: "Categories", href: "/dashboard/campaigns/categories", roles: ["super_admin", "admin_campaign"] },
      { label: "Pillars", href: "/dashboard/campaigns/pillars", roles: ["super_admin", "admin_campaign"] },
      { label: "Laporan Kegiatan", href: "/dashboard/campaigns/activity-reports", roles: ["super_admin", "admin_campaign", "program_coordinator"] },
    ]
  },
  {
    icon: DollarSign,
    label: "Donations",
    href: "/dashboard/donations",
    roles: ["super_admin", "admin_campaign", "admin_finance"]
  },
  {
    icon: Sparkles,
    label: "Zakat",
    href: "/dashboard/zakat",
    roles: ["super_admin", "admin_finance", "program_coordinator"],
    submenu: [
      { label: "Dashboard Zakat", href: "/dashboard/zakat", roles: ["super_admin", "admin_finance"] },
      { label: "Jenis Zakat", href: "/dashboard/zakat/types", roles: ["super_admin", "admin_finance"] },
      { label: "Pembayaran Zakat", href: "/dashboard/zakat/donations", roles: ["super_admin", "admin_finance"] },
      { label: "Penyaluran", href: "/dashboard/zakat/distributions", roles: ["super_admin", "admin_finance", "program_coordinator"] },
      { label: "Kalkulator Zakat", href: "/dashboard/zakat/calculator", roles: ["super_admin", "admin_finance"] },
    ]
  },
  {
    icon: Beef,
    label: "Qurban",
    href: "/dashboard/qurban",
    roles: ["super_admin", "admin_finance"],
    submenu: [
      { label: "Periode", href: "/dashboard/qurban/periods", roles: ["super_admin", "admin_finance"] },
      { label: "Paket Hewan", href: "/dashboard/qurban/packages", roles: ["super_admin", "admin_finance"] },
      { label: "Orders", href: "/dashboard/qurban/orders", roles: ["super_admin", "admin_finance"] },
      { label: "Verifikasi Pembayaran", href: "/dashboard/qurban/payments", roles: ["super_admin", "admin_finance"] },
      { label: "Tabungan Qurban", href: "/dashboard/qurban/savings", roles: ["super_admin", "admin_finance"] },
      { label: "Grup Patungan", href: "/dashboard/qurban/shared-groups", roles: ["super_admin", "admin_finance"] },
    ]
  },
  {
    icon: FileText,
    label: "Ledger",
    href: "/dashboard/ledger",
    roles: ["super_admin", "admin_finance"],
    submenu: [
      { label: "Semua Catatan", href: "/dashboard/ledger", roles: ["super_admin", "admin_finance"] },
      { label: "Akun Beban", href: "/dashboard/ledger/coa", roles: ["super_admin", "admin_finance"] },
    ]
  },
  {
    icon: Users,
    label: "Donatur",
    href: "/dashboard/donatur",
    roles: ["super_admin", "admin_campaign", "admin_finance"]
  },
  {
    icon: Database,
    label: "Master",
    href: "/dashboard/master",
    roles: ["super_admin"],
    submenu: [
      { label: "Vendors", href: "/dashboard/master/vendors", roles: ["super_admin"] },
      { label: "Employees", href: "/dashboard/master/employees", roles: ["super_admin"] },
      { label: "Mustahiq Zakat", href: "/dashboard/master/mustahiqs", roles: ["super_admin"] },
    ]
  },
  {
    icon: BarChart3,
    label: "Reports",
    href: "/dashboard/reports",
    roles: ["super_admin", "admin_finance"],
    submenu: [
      { label: "Catatan Mutasi", href: "/dashboard/reports", roles: ["super_admin", "admin_finance"] },
      { label: "Laporan Cash Flow", href: "/dashboard/reports/cash-flow", roles: ["super_admin", "admin_finance"] },
    ]
  },
  {
    icon: Settings,
    label: "Settings",
    href: "/dashboard/settings",
    roles: ["super_admin"]
  },
];

type SidebarProps = {
  variant?: "desktop" | "mobile";
  isOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ variant = "desktop", isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Campaigns"]);

  const { data: groupedSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get("/admin/settings");
      return response.data?.data || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const organizationSettings = groupedSettings?.organization || [];
  const organizationName =
    organizationSettings.find((s: any) => s.key === "organization_name")?.value || "Bantuanku";
  const organizationLogo =
    organizationSettings.find((s: any) => s.key === "organization_logo")?.value || "";

  const toggleSubmenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  // Filter menu items based on user roles
  const userRoles = user?.roles || [];
  const hasAccess = (itemRoles?: string[]) => {
    if (!itemRoles || itemRoles.length === 0) return true;
    return userRoles.some((role) => itemRoles.includes(role));
  };

  // Filter menu items
  const menuItems = allMenuItems
    .filter((item) => hasAccess(item.roles))
    .map((item) => {
      if (item.submenu) {
        return {
          ...item,
          submenu: item.submenu.filter((subItem) => hasAccess(subItem.roles)),
        };
      }
      return item;
    })
    .filter((item) => !item.submenu || item.submenu.length > 0);

  const containerBase =
    "bg-white border-gray-200 flex flex-col w-64";

  const desktopClasses = "h-screen border-r hidden lg:flex";
  const mobileClasses = isOpen
    ? "fixed inset-y-0 left-0 z-50 shadow-xl border-r"
    : "hidden";

  return (
    <div
      className={`${containerBase} ${variant === "desktop" ? desktopClasses : mobileClasses}`}
      role="navigation"
    >
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        {organizationLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organizationLogo}
            alt={organizationName}
            className="h-10 w-auto object-contain"
          />
        ) : (
          <div className="h-10 w-10 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center font-semibold text-lg">
            {organizationName.charAt(0).toUpperCase()}
          </div>
        )}
        {variant === "mobile" && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-semibold">
              {user?.name?.charAt(0) || "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.roles?.[0]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedMenus.includes(item.label);
            const isActive = pathname === item.href;
            const isSubmenuActive = hasSubmenu && item.submenu.some(sub => pathname === sub.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                {hasSubmenu ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleSubmenu(item.label)}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${
                        isSubmenuActive
                          ? "bg-primary-50 text-primary-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {item.submenu.map((subItem) => {
                          const isSubActive = pathname === subItem.href;
                          return (
                            <li key={subItem.href}>
                              <Link
                                href={subItem.href}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                                  isSubActive
                                    ? "bg-primary-50 text-primary-600 font-medium"
                                    : "text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                {subItem.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary-50 text-primary-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          type="button"
          onClick={logout}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
