"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  PlusCircle,
  FileBarChart,
  ChevronRight,
} from "lucide-react";
import { formatRupiahShort } from "@/lib/format";

interface QuickActionsProps {
  pendingDisbursements: number;
  pendingDisbursementsAmount: number;
}

export default function QuickActions({
  pendingDisbursements,
  pendingDisbursementsAmount,
}: QuickActionsProps) {
  const actions = [
    {
      title: "Pencairan Menunggu",
      desc:
        pendingDisbursements > 0
          ? `${pendingDisbursements} pencairan · Rp ${formatRupiahShort(pendingDisbursementsAmount)}`
          : "Tidak ada antrian",
      icon: ArrowDownToLine,
      href: "/dashboard/disbursements",
      iconBg: "bg-danger-50",
      iconColor: "text-danger-600",
    },
    {
      title: "Buat Transaksi Baru",
      desc: "Campaign, Zakat, atau Qurban",
      icon: PlusCircle,
      href: "/dashboard/transactions/create",
      iconBg: "bg-primary-50",
      iconColor: "text-primary-600",
    },
    {
      title: "Laporan Arus Kas",
      desc: "Pemasukan & pengeluaran",
      icon: FileBarChart,
      href: "/dashboard/reports/cash-flow",
      iconBg: "bg-info-50",
      iconColor: "text-info-600",
    },
  ];

  return (
    <div className="dashboard-section">
      <div className="dashboard-section__header">
        <h3 className="dashboard-section__title">Aksi Cepat</h3>
      </div>
      <div className="dashboard-section__body">
        <div className="flex flex-col gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="quick-action-card"
              >
                <div className={`quick-action-card__icon ${action.iconBg}`}>
                  <Icon className={`w-5 h-5 ${action.iconColor}`} />
                </div>
                <div className="quick-action-card__content">
                  <p className="quick-action-card__title">{action.title}</p>
                  <p className="quick-action-card__desc">{action.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 quick-action-card__arrow" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
