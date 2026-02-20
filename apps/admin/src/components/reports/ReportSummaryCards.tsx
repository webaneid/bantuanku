"use client";

import { formatRupiah } from "@/lib/format";
import { LucideIcon } from "lucide-react";

interface SummaryCard {
  label: string;
  value: number;
  color: "primary" | "success" | "danger" | "warning" | "info";
  icon?: LucideIcon;
  prefix?: string;
  format?: "currency" | "number";
}

interface ReportSummaryCardsProps {
  cards: SummaryCard[];
}

const COLOR_MAP: Record<string, string> = {
  primary: "border-l-primary-600 text-primary-600",
  success: "border-l-success-600 text-success-600",
  danger: "border-l-danger-600 text-danger-600",
  warning: "border-l-[#d2aa55] text-[#d2aa55]",
  info: "border-l-[#296585] text-[#296585]",
};

export default function ReportSummaryCards({ cards }: ReportSummaryCardsProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${Math.min(cards.length, 4)} gap-4 mb-6`}>
      {cards.map((card, i) => {
        const colorClass = COLOR_MAP[card.color] || COLOR_MAP.primary;
        const [borderClass, textClass] = colorClass.split(" ");
        const Icon = card.icon;

        return (
          <div key={i} className={`card border-l-4 ${borderClass}`}>
            <div className="flex items-center gap-3">
              {Icon && (
                <div className={`${textClass} opacity-70`}>
                  <Icon size={20} />
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{card.label}</h3>
                <p className={`text-2xl font-bold mono ${textClass}`}>
                  {card.prefix || (card.format !== "number" ? "Rp " : "")}
                  {card.format === "number"
                    ? card.value.toLocaleString("id-ID")
                    : formatRupiah(card.value)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
