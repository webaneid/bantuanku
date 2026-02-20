"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ArrowLeftRight,
  Wallet,
  Scale,
  Landmark,
  BookOpen,
  HandCoins,
  Hash,
  MoonStar,
  Beef,
  Building2,
  Megaphone,
  Users,
} from "lucide-react";

const reportNav = [
  {
    group: "Keuangan",
    items: [
      { label: "Dashboard", href: "/dashboard/reports", icon: BarChart3, exact: true },
      { label: "Audit Kategori", href: "/dashboard/reports/category-audit", icon: BarChart3 },
      { label: "Catatan Mutasi", href: "/dashboard/reports/mutation", icon: ArrowLeftRight },
      { label: "Mutasi Kas & Bank", href: "/dashboard/reports/cash-flow", icon: Wallet },
      { label: "Neraca", href: "/dashboard/reports/neraca", icon: Landmark },
      { label: "Saldo Titipan Dana", href: "/dashboard/reports/liability-balance", icon: Scale },
    ],
  },
  {
    group: "Pendapatan",
    items: [
      { label: "Bagi Hasil Amil", href: "/dashboard/reports/revenue-sharing", icon: HandCoins },
      { label: "Laporan Kode Unik", href: "/dashboard/reports/unique-codes", icon: Hash },
      { label: "Laporan Zakat", href: "/dashboard/reports/zakat", icon: MoonStar },
      { label: "Laporan Qurban", href: "/dashboard/reports/qurban", icon: Beef },
      { label: "Penyembelihan Qurban", href: "/dashboard/reports/qurban-execution", icon: Beef },
    ],
  },
  {
    group: "Per Entitas",
    items: [
      { label: "Per Program", href: "/dashboard/reports/program", icon: BookOpen },
      { label: "Per Mitra", href: "/dashboard/reports/mitra", icon: Building2 },
      { label: "Per Fundraiser", href: "/dashboard/reports/fundraiser", icon: Megaphone },
      { label: "Per Rekening", href: "/dashboard/reports/rekening", icon: Landmark },
      { label: "Per Donatur", href: "/dashboard/reports/donatur", icon: Users },
    ],
  },
];

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="report-layout no-print-nav">
      {/* Horizontal tab nav - shown above content */}
      <div className="report-nav no-print px-4 lg:px-8 pt-4 lg:pt-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-3">
          <div className="flex flex-wrap gap-4">
            {reportNav.map((group) => (
              <div key={group.group} className="flex flex-wrap items-center gap-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2 hidden lg:inline">
                  {group.group}
                </span>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, (item as any).exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                        active
                          ? "bg-primary-50 text-primary-700 font-medium"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-2">{children}</div>
    </div>
  );
}
