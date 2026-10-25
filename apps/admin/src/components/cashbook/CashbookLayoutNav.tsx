"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Building2, Landmark, Megaphone, PieChart, HandCoins, BookOpen, ShieldAlert } from "lucide-react";

const NAV = [
  { label: "Arus Kas", href: "/dashboard/cashbook", icon: ArrowLeftRight, exact: true },
  { label: "Sirkulasi Rekening", href: "/dashboard/cashbook/accounts", icon: Landmark },
  { label: "Dana per Sumber", href: "/dashboard/cashbook/funds", icon: PieChart },
  { label: "Bagi Hasil", href: "/dashboard/cashbook/revenue-share", icon: HandCoins },
  { label: "Per Mitra", href: "/dashboard/cashbook/mitra", icon: Building2 },
  { label: "Per Influencer", href: "/dashboard/cashbook/influencer", icon: Megaphone },
  { label: "Per Program", href: "/dashboard/cashbook/programs", icon: BookOpen },
  { label: "Perlu Ditinjau", href: "/dashboard/cashbook/review", icon: ShieldAlert },
];

export default function CashbookLayoutNav() {
  const pathname = usePathname();
  return (
    <div className="no-print px-4 lg:px-8 pt-4 lg:pt-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-3">
        <div className="flex flex-wrap items-center gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  active ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-600 hover:bg-gray-100 hover:text-dark"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
