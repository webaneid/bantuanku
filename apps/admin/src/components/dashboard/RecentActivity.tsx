"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";

interface RecentDonation {
  id: string;
  referenceId: string;
  donorName: string;
  isAnonymous: boolean;
  amount: number;
  paidAt: string;
  productType: string;
  productName: string;
}

interface RecentActivityProps {
  data: RecentDonation[];
}

const TYPE_CONFIG: Record<string, { label: string; badgeClass: string; avatarClass: string }> = {
  campaign: {
    label: "Campaign",
    badgeClass: "bg-info-50 text-info-700",
    avatarClass: "bg-info-100 text-info-700",
  },
  zakat: {
    label: "Zakat",
    badgeClass: "bg-primary-50 text-primary-700",
    avatarClass: "bg-primary-100 text-primary-700",
  },
  qurban: {
    label: "Qurban",
    badgeClass: "bg-accent-50 text-accent-700",
    avatarClass: "bg-accent-100 text-accent-700",
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function RecentActivity({ data }: RecentActivityProps) {
  return (
    <div className="dashboard-section">
      <div className="dashboard-section__header">
        <h3 className="dashboard-section__title">Aktivitas Terbaru</h3>
        <Link
          href="/dashboard/transactions"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Lihat Semua →
        </Link>
      </div>
      <div className="dashboard-section__body" style={{ padding: "0 1.5rem" }}>
        {data.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            Belum ada transaksi
          </div>
        ) : (
          <div className="activity-feed">
            {data.map((item) => {
              const displayName = item.isAnonymous
                ? "Hamba Allah"
                : item.donorName || "Anonim";
              const config = TYPE_CONFIG[item.productType] || TYPE_CONFIG.campaign;
              let timeAgo = "";
              try {
                timeAgo = formatDistanceToNow(new Date(item.paidAt), {
                  addSuffix: true,
                  locale: idLocale,
                });
              } catch {
                timeAgo = "-";
              }

              return (
                <div key={item.id} className="activity-feed__item">
                  <div className={`activity-feed__avatar ${config.avatarClass}`}>
                    {getInitials(displayName)}
                  </div>
                  <div className="activity-feed__content">
                    <p className="activity-feed__name">{displayName}</p>
                    <p className="activity-feed__product">
                      {item.productName || item.productType}
                    </p>
                    <span className={`activity-feed__badge ${config.badgeClass}`}>
                      {config.label}
                    </span>
                  </div>
                  <div className="activity-feed__meta">
                    <p className="activity-feed__amount">
                      Rp {formatRupiah(item.amount)}
                    </p>
                    <p className="activity-feed__time">{timeAgo}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
