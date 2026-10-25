"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Heart,
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
  Receipt,
  Wallet,
  User,
  Megaphone,
  Building2,
  MessageSquare,
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
    roles: ["super_admin", "admin_campaign", "admin_finance", "employee", "mitra"]
  },
  {
    icon: Heart,
    label: "Campaigns",
    href: "/dashboard/campaigns",
    roles: ["super_admin", "admin_campaign", "admin_finance", "program_coordinator", "employee", "mitra"],
    submenu: [
      { label: "All Campaigns", href: "/dashboard/campaigns", roles: ["super_admin", "admin_campaign", "admin_finance", "program_coordinator", "employee", "mitra"] },
      { label: "Donations", href: "/dashboard/campaigns/donations", roles: ["super_admin", "admin_campaign", "admin_finance"] },
      { label: "Categories", href: "/dashboard/campaigns/categories", roles: ["super_admin", "admin_campaign"] },
      { label: "Pillars", href: "/dashboard/campaigns/pillars", roles: ["super_admin", "admin_campaign"] },
    ]
  },
  {
    icon: Sparkles,
    label: "Zakat",
    href: "/dashboard/zakat",
    roles: ["super_admin", "admin_finance", "admin_campaign", "program_coordinator", "mitra"],
    submenu: [
      { label: "Dashboard Zakat", href: "/dashboard/zakat", roles: ["super_admin", "admin_finance", "admin_campaign"] },
      { label: "Jenis Zakat", href: "/dashboard/zakat/types", roles: ["super_admin", "admin_finance", "admin_campaign", "mitra"] },
      { label: "Periode Zakat", href: "/dashboard/zakat/periods", roles: ["super_admin", "admin_finance", "admin_campaign", "mitra"] },
      { label: "Pembayaran Zakat", href: "/dashboard/zakat/donations", roles: ["super_admin", "admin_finance", "admin_campaign"] },
      { label: "Penyaluran", href: "/dashboard/zakat/distributions", roles: ["super_admin", "admin_finance", "admin_campaign", "program_coordinator"] },
      { label: "Kalkulator Zakat", href: "/dashboard/zakat/calculator", roles: ["super_admin", "admin_finance", "admin_campaign"] },
    ]
  },
  {
    icon: Beef,
    label: "Qurban",
    href: "/dashboard/qurban",
    roles: ["super_admin", "admin_finance", "admin_campaign", "mitra"],
    submenu: [
      { label: "Periode", href: "/dashboard/qurban/periods", roles: ["super_admin", "admin_finance", "admin_campaign", "mitra"] },
      { label: "Paket Hewan", href: "/dashboard/qurban/packages", roles: ["super_admin", "admin_finance", "admin_campaign", "mitra"] },
      { label: "Orders", href: "/dashboard/qurban/orders", roles: ["super_admin", "admin_finance", "admin_campaign"] },
      { label: "Tabungan Qurban", href: "/dashboard/qurban/savings", roles: ["super_admin", "admin_finance", "admin_campaign", "mitra"] },
      { label: "Grup Patungan", href: "/dashboard/qurban/shared-groups", roles: ["super_admin", "admin_finance", "admin_campaign"] },
      { label: "Diskon & Voucher", href: "/dashboard/qurban/discounts", roles: ["super_admin", "admin_campaign"] },
    ]
  },
  {
    icon: FileText,
    label: "Pages",
    href: "/dashboard/pages",
    roles: ["super_admin", "admin_campaign"],
  },
  {
    icon: FileText,
    label: "Laporan Kegiatan",
    href: "/dashboard/activity-reports",
    roles: ["super_admin", "admin_campaign", "admin_finance", "program_coordinator"]
  },
  {
    icon: Receipt,
    label: "Transactions",
    href: "/dashboard/transactions",
    roles: ["super_admin", "admin_finance"]
  },
  {
    icon: Megaphone,
    label: "Influencer",
    href: "/dashboard/fundraisers",
    roles: ["super_admin", "admin_finance", "admin_campaign"]
  },
  {
    icon: Building2,
    label: "Mitra",
    href: "/dashboard/mitra",
    roles: ["super_admin", "admin_campaign", "mitra"],
  },
  {
    icon: Wallet,
    label: "Disbursements",
    href: "/dashboard/disbursements",
    roles: ["super_admin", "admin_finance", "admin_campaign", "program_coordinator", "mitra"],
    submenu: [
      { label: "Semua Pencairan", href: "/dashboard/disbursements", roles: ["super_admin", "admin_finance", "admin_campaign", "program_coordinator", "mitra"] },
      { label: "Pengajuan", href: "/dashboard/disbursements?view=pending", roles: ["super_admin", "admin_finance", "admin_campaign"] },
      { label: "Disetujui", href: "/dashboard/disbursements?view=approved", roles: ["super_admin", "admin_finance"] },
      { label: "Akun Beban", href: "/dashboard/ledger/coa", roles: ["super_admin", "admin_finance"] },
      { label: "Kategori Ledger", href: "/dashboard/ledger/categories", roles: ["super_admin", "admin_finance"] },
    ]
  },
  {
    icon: Database,
    label: "Master",
    href: "/dashboard/master",
    roles: ["super_admin", "admin_campaign", "admin_finance"],
    submenu: [
      { label: "Donatur", href: "/dashboard/donatur", roles: ["super_admin", "admin_campaign", "admin_finance"] },
      { label: "Vendors", href: "/dashboard/master/vendors", roles: ["super_admin", "admin_campaign", "admin_finance"] },
      { label: "Employees", href: "/dashboard/master/employees", roles: ["super_admin", "admin_campaign", "admin_finance"] },
      { label: "Mustahiq Zakat", href: "/dashboard/master/mustahiqs", roles: ["super_admin", "admin_campaign", "admin_finance"] },
      { label: "Penghasilan Bulanan", href: "/dashboard/master/penghasilan-bulanan", roles: ["super_admin", "admin_campaign", "admin_finance"] },
    ]
  },
  {
    icon: BarChart3,
    label: "Statistics",
    href: "/dashboard/statistics",
    roles: ["super_admin", "admin_finance", "admin_campaign"],
    submenu: [
      { label: "Statistik Donatur", href: "/dashboard/statistics/donatur", roles: ["super_admin", "admin_finance", "admin_campaign"] },
      { label: "Statistik Mustahiq", href: "/dashboard/statistics/mustahiq", roles: ["super_admin", "admin_finance", "admin_campaign"] },
    ]
  },
  {
    icon: Wallet,
    label: "Keuangan",
    href: "/dashboard/cashbook",
    roles: ["super_admin", "admin_finance"],
    submenu: [
      { label: "Arus Kas", href: "/dashboard/cashbook", roles: ["super_admin", "admin_finance"] },
      { label: "Sirkulasi Rekening", href: "/dashboard/cashbook/accounts", roles: ["super_admin", "admin_finance"] },
      { label: "Dana per Sumber", href: "/dashboard/cashbook/funds", roles: ["super_admin", "admin_finance"] },
      { label: "Bagi Hasil", href: "/dashboard/cashbook/revenue-share", roles: ["super_admin", "admin_finance"] },
      { label: "Per Mitra", href: "/dashboard/cashbook/mitra", roles: ["super_admin", "admin_finance"] },
      { label: "Per Influencer", href: "/dashboard/cashbook/influencer", roles: ["super_admin", "admin_finance"] },
      { label: "Per Program", href: "/dashboard/cashbook/programs", roles: ["super_admin", "admin_finance"] },
      { label: "Perlu Ditinjau", href: "/dashboard/cashbook/review", roles: ["super_admin", "admin_finance"] },
    ],
  },
  {
    icon: BarChart3,
    label: "Reports",
    href: "/dashboard/reports",
    roles: ["super_admin", "admin_finance"],
    submenu: [
      { label: "Dashboard Laporan", href: "/dashboard/reports", roles: ["super_admin", "admin_finance"] },
      { label: "Audit Kategori COA", href: "/dashboard/reports/category-audit", roles: ["super_admin", "admin_finance"] },
      { label: "Catatan Mutasi", href: "/dashboard/reports/mutation", roles: ["super_admin", "admin_finance"] },
      { label: "Laporan Cash Flow", href: "/dashboard/reports/cash-flow", roles: ["super_admin", "admin_finance"] },
      { label: "Neraca", href: "/dashboard/reports/neraca", roles: ["super_admin", "admin_finance"] },
      { label: "Laporan Zakat", href: "/dashboard/reports/zakat", roles: ["super_admin", "admin_finance"] },
      { label: "Laporan Qurban", href: "/dashboard/reports/qurban", roles: ["super_admin", "admin_finance"] },
      { label: "Penyembelihan Qurban", href: "/dashboard/reports/qurban-execution", roles: ["super_admin", "admin_finance"] },
      { label: "Bagi Hasil Amil", href: "/dashboard/reports/revenue-sharing", roles: ["super_admin", "admin_finance"] },
      { label: "Saldo Titipan Dana", href: "/dashboard/reports/liability-balance", roles: ["super_admin", "admin_finance"] },
      { label: "Per Program", href: "/dashboard/reports/program", roles: ["super_admin", "admin_finance"] },
      { label: "Per Rekening", href: "/dashboard/reports/rekening", roles: ["super_admin", "admin_finance"] },
      { label: "Per Donatur", href: "/dashboard/reports/donatur", roles: ["super_admin", "admin_finance"] },
    ]
  },
  {
    icon: Megaphone,
    label: "Influencer Saya",
    href: "/dashboard/my-fundraiser",
    roles: ["employee", "program_coordinator"],
  },
  {
    icon: MessageSquare,
    label: "WhatsApp",
    href: "/dashboard/whatsapp/broadcasts",
    roles: ["super_admin", "admin_finance"],
    submenu: [
      { label: "Broadcast", href: "/dashboard/whatsapp/broadcasts", roles: ["super_admin", "admin_finance"] },
    ],
  },
  {
    icon: Settings,
    label: "Settings",
    href: "/dashboard/settings",
    roles: ["super_admin", "admin_finance"],
  },
];

type SidebarProps = {
  variant?: "desktop" | "mobile";
  isOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ variant = "desktop", isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([
    "Campaigns",
    ...(pathname.startsWith("/dashboard/disbursements") ? ["Disbursements"] : []),
    ...(pathname.startsWith("/dashboard/cashbook") ? ["Keuangan"] : [])
  ]);

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
  const organizationName =
    organizationSettings.find((s: any) => s.key === "organization_name")?.value || "";
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

  // Helper to check if URL matches including query params
  const isUrlActive = (href: string) => {
    const [hrefPath, hrefQuery] = href.split("?");
    if (pathname !== hrefPath) return false;
    if (!hrefQuery) return !searchParams.toString();
    return hrefQuery === searchParams.toString();
  };

  // Filter menu items
  const menuItems = allMenuItems
    .filter((item) => hasAccess(item.roles))
    .map((item) => {
      if (item.submenu) {
        const filteredSubmenu = item.submenu.filter((subItem) => hasAccess(subItem.roles));
        // If only 1 submenu item visible, convert to direct link
        if (filteredSubmenu.length === 1) {
          return { ...item, href: filteredSubmenu[0].href, submenu: undefined };
        }
        return { ...item, submenu: filteredSubmenu };
      }
      return item;
    })
    .filter((item) => !item.submenu || item.submenu.length > 0);

  // Tampilan menu (gradasi primary gelap + kaca putih untuk menu aktif). Warna hanya dari token brand.
  const containerBase = "relative isolate overflow-hidden flex flex-col w-64 text-white bg-primary-900";
  const desktopClasses = "h-screen hidden lg:flex";
  const mobileClasses = isOpen ? "fixed inset-y-0 left-0 z-50 shadow-2xl" : "hidden";

  const linkBase =
    "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200";
  const linkIdle = "text-white/70 hover:bg-white/10 hover:text-white";
  // Aktif: kaca putih bergradasi (blur + cincin tipis + sorot atas)
  const linkActive =
    "text-white font-semibold bg-gradient-to-r from-white/25 via-white/15 to-white/5 backdrop-blur-md ring-1 ring-white/25 shadow-[0_6px_18px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.35)]";
  const iconBase = "w-5 h-5 shrink-0 transition-colors";
  const iconClass = (active?: boolean) => `${iconBase} ${active ? "text-light" : "text-light/80 group-hover:text-light"}`;

  const subBase = "flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200";
  const subIdle = "text-white/60 hover:bg-white/10 hover:text-white";
  const subActive =
    "text-white font-medium bg-gradient-to-r from-white/20 to-white/5 ring-1 ring-white/20";

  return (
    <div
      className={`${containerBase} ${variant === "desktop" ? desktopClasses : mobileClasses}`}
      role="navigation"
    >
      {/* Lapisan dekoratif: gradasi gelap berlapis dan cahaya lembut */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-700/60 via-primary-900/40 to-dark/90" />
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-primary-300/25 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-secondary-500/15 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        {organizationLogo ? (
          <div className="rounded-xl bg-white/90 px-3 py-2 shadow-lg shadow-black/20 ring-1 ring-white/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={organizationLogo}
              alt={organizationName}
              className="h-8 w-auto object-contain"
            />
          </div>
        ) : (
          <div className="h-10 w-10 rounded-xl bg-white/15 text-white ring-1 ring-white/25 flex items-center justify-center font-semibold text-lg">
            {organizationName.charAt(0).toUpperCase()}
          </div>
        )}
        {variant === "mobile" && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="p-2 text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white/15 ring-1 ring-white/25 flex items-center justify-center">
            <span className="text-white font-semibold">
              {user?.name?.charAt(0) || "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-white/60 truncate">{user?.roles?.[0]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_transparent]">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedMenus.includes(item.label);
            const isActive = isUrlActive(item.href);
            const isSubmenuActive = hasSubmenu && item.submenu.some(sub => isUrlActive(sub.href));
            const Icon = item.icon;

            return (
              <li key={item.href}>
                {hasSubmenu ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleSubmenu(item.label)}
                      className={`${linkBase} justify-between w-full ${isSubmenuActive ? linkActive : linkIdle}`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={iconClass(isSubmenuActive)} />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-light/70" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-light/70" />
                      )}
                    </button>
                    {isExpanded && (
                      <ul className="mt-1 ml-6 pl-3 border-l border-white/15 space-y-1">
                        {item.submenu.map((subItem) => {
                          const isSubActive = isUrlActive(subItem.href);
                          return (
                            <li key={subItem.href}>
                              <Link
                                href={subItem.href}
                                className={`${subBase} ${isSubActive ? subActive : subIdle}`}
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
                    className={`${linkBase} ${isActive ? linkActive : linkIdle}`}
                  >
                    <Icon className={iconClass(isActive)} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Profile & Logout */}
      <div className="p-4 border-t border-white/10 space-y-1">
        <Link
          href="/dashboard/profile"
          className={`${linkBase} ${pathname === "/dashboard/profile" ? linkActive : linkIdle}`}
        >
          <User className={iconClass(pathname === "/dashboard/profile")} />
          <span className="font-medium">Profile</span>
        </Link>
        <button
          type="button"
          onClick={logout}
          className={`${linkBase} w-full text-danger-200 hover:bg-danger-500/25 hover:text-white`}
        >
          <LogOut className={`${iconBase} text-danger-200 group-hover:text-white`} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
