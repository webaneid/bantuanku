"use client";

import {
  Wallet,
  ArrowUpDown,
  Megaphone,
  Users,
  ArrowDownToLine,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { formatRupiah, formatRupiahShort } from "@/lib/format";

interface EnhancedStats {
  period: {
    current: { transactions: number; amount: number };
    previous: { transactions: number; amount: number };
    changes: { amountPercent: number; countPercent: number };
  };
  totals: {
    allTimeTransactions: number;
    allTimeAmount: number;
    activeCampaigns: number;
    uniqueDonors: number;
    pendingDisbursements: number;
    pendingDisbursementsAmount: number;
  };
}

interface KPICardsProps {
  data: EnhancedStats | undefined;
  periodLabel: string;
}

export default function KPICards({ data, periodLabel }: KPICardsProps) {
  if (!data) return null;

  const { period, totals } = data;

  const cards = [
    {
      label: "Total Pemasukan",
      value: `Rp ${formatRupiahShort(totals.allTimeAmount)}`,
      sub: `${formatRupiah(totals.allTimeTransactions)} transaksi`,
      trend: period.changes.amountPercent,
      icon: Wallet,
      modifier: "primary" as const,
    },
    {
      label: `Transaksi ${periodLabel}`,
      value: period.current.transactions.toLocaleString("id-ID"),
      sub: `Rp ${formatRupiah(period.current.amount)}`,
      trend: period.changes.countPercent,
      icon: ArrowUpDown,
      modifier: "info" as const,
    },
    {
      label: "Campaign Aktif",
      value: totals.activeCampaigns.toLocaleString("id-ID"),
      sub: "program berjalan",
      trend: null,
      icon: Megaphone,
      modifier: "success" as const,
    },
    {
      label: "Donatur Unik",
      value: totals.uniqueDonors.toLocaleString("id-ID"),
      sub: "total donatur",
      trend: null,
      icon: Users,
      modifier: "accent" as const,
    },
    {
      label: "Pencairan Menunggu",
      value: totals.pendingDisbursements.toLocaleString("id-ID"),
      sub: totals.pendingDisbursementsAmount > 0
        ? `Rp ${formatRupiahShort(totals.pendingDisbursementsAmount)}`
        : "tidak ada antrian",
      trend: null,
      icon: ArrowDownToLine,
      modifier: "danger" as const,
    },
  ];

  return (
    <div className="dashboard-kpi-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        const trendClass =
          card.trend === null
            ? ""
            : card.trend > 0
              ? "kpi-card__trend--up"
              : card.trend < 0
                ? "kpi-card__trend--down"
                : "kpi-card__trend--neutral";

        return (
          <div key={card.label} className={`kpi-card kpi-card--${card.modifier}`}>
            <div className="kpi-card__header">
              <div className="kpi-card__icon">
                <Icon className="w-5 h-5" />
              </div>
              {card.trend !== null && (
                <span className={`kpi-card__trend ${trendClass}`}>
                  {card.trend > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : card.trend < 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  {card.trend > 0 ? "+" : ""}
                  {card.trend.toFixed(1)}%
                </span>
              )}
            </div>
            <p className="kpi-card__label">{card.label}</p>
            <p className="kpi-card__value">{card.value}</p>
            <p className="kpi-card__sub">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
