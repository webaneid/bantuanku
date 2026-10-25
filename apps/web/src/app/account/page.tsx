"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { formatRupiahFull } from "@/lib/format";
import { Button } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/provider";

interface ProfileData {
  name?: string;
  phone?: string;
  whatsappNumber?: string;
  detailAddress?: string;
  provinceCode?: string;
  jobTitleId?: number | null;
  incomeRangeId?: number | null;
  nik?: string;
  npwp?: string;
  birthPlace?: string;
  birthDate?: string;
  gender?: string;
}

const PROFILE_FIELDS: (keyof ProfileData)[] = [
  "name", "phone", "whatsappNumber", "detailAddress", "provinceCode",
  "jobTitleId", "incomeRangeId", "nik", "npwp", "birthPlace", "birthDate", "gender",
];

function getProfileCompletion(profile: ProfileData | null): { filled: number; total: number; percent: number } {
  if (!profile) return { filled: 0, total: PROFILE_FIELDS.length, percent: 0 };
  const filled = PROFILE_FIELDS.filter((key) => {
    const val = profile[key];
    return val !== null && val !== undefined && val !== "";
  }).length;
  return { filled, total: PROFILE_FIELDS.length, percent: Math.round((filled / PROFILE_FIELDS.length) * 100) };
}

interface Stats {
  totalDonations: number;
  totalAmount: number;
  pendingDonations: number;
}

interface Transaction {
  id: string;
  transactionNumber: string;
  productType: string;
  productName: string;
  totalAmount: number;
  paymentStatus: string;
  paidAt: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, isHydrated, logout } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();
  const localeTag = locale === "id" ? "id-ID" : "en-US";
  const [stats, setStats] = useState<Stats>({ totalDonations: 0, totalAmount: 0, pendingDonations: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const statusConfig = {
    pending: { label: t("account.dashboard.status.pending"), color: "bg-warning-50 text-warning-700 border-warning-200" },
    processing: { label: t("account.dashboard.status.processing"), color: "bg-info-50 text-info-700 border-info-200" },
    paid: { label: t("account.dashboard.status.paid"), color: "bg-success-50 text-success-700 border-success-200" },
    cancelled: { label: t("account.dashboard.status.cancelled"), color: "bg-danger-50 text-danger-700 border-danger-200" },
  };

  useEffect(() => {
    // Wait for hydration and user before fetching data
    if (!isHydrated || !user) {
      if (isHydrated && !user) {
        // Hydration done but no user, stop loading
        setIsLoading(false);
      }
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, transactionsRes, profileRes] = await Promise.all([
          api.get("/account/stats"),
          api.get("/transactions/my?limit=5"),
          api.get("/auth/me"),
        ]);

        if (statsRes.data.success) {
          setStats({
            totalDonations: 0,
            totalAmount: 0,
            pendingDonations: 0,
            ...statsRes.data.data,
          });
        }

        if (transactionsRes.data.success) {
          setTransactions(transactionsRes.data.data);
        }

        if (profileRes.data.success) {
          setProfile(profileRes.data.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isHydrated, user]);

  // Redirect to profile if required fields are missing
  useEffect(() => {
    if (isLoading || !profile) return;
    const isIncomplete = !profile.jobTitleId || !profile.incomeRangeId || !profile.gender || !profile.provinceCode;
    if (isIncomplete) {
      router.replace("/account/profile");
    }
  }, [isLoading, profile, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const completion = getProfileCompletion(profile);

  // Aksi cepat: lingkaran ikon di dalam hero (seperti referensi desain)
  const quickActions = [
    { href: "/account/transactions", label: t("account.dashboard.quickActions.history"), icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
    { href: "/account/qurban-savings", label: t("account.dashboard.quickActions.qurbanSavings"), icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
    { href: "/qurban", label: t("account.dashboard.quickActions.qurban"), icon: "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" },
    { href: "/account/fundraiser", label: t("account.dashboard.quickActions.influencer"), icon: "M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" },
    { href: "/account/profile", label: t("account.dashboard.quickActions.profile"), icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  ];

  return (
    <div>
      {/* Hero: mobile edge-to-edge dengan sudut bawah membulat; desktop kartu membulat */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white rounded-b-[28px] lg:rounded-2xl px-[15px] lg:px-8 pt-5 lg:pt-8 pb-7 lg:pb-8 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-white/5"></div>
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-white/5"></div>

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
                {(user?.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/70">{t("account.dashboard.welcomeBack")}</p>
                <p className="truncate text-lg font-semibold leading-tight">{user?.name}</p>
              </div>
            </div>

            {/* Mobile: beranda situs + keluar (desktop memakai sidebar) */}
            <div className="flex items-center gap-2 lg:hidden">
              <Link
                href="/"
                aria-label={t("account.layout.backToHome")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
              <button
                type="button"
                onClick={logout}
                aria-label={t("account.layout.nav.logout")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-white/70">{t("account.dashboard.heroLabel")}</p>
              <p className="mt-1 whitespace-nowrap text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">{formatRupiahFull(stats.totalAmount)}</p>
            </div>
            <Link
              href="/program"
              className="flex-shrink-0 rounded-full bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-primary-700 shadow-sm hover:bg-primary-50 transition-colors"
            >
              {t("account.dashboard.heroDonate")}
            </Link>
          </div>

          <div className="mt-7 grid grid-cols-5 gap-2 lg:max-w-xl">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="group flex flex-col items-center gap-2 text-center">
                <span className="flex h-12 w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full bg-white text-primary-700 shadow-sm transition-transform group-hover:scale-105">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                  </svg>
                </span>
                <span className="text-[11px] leading-tight text-white/85">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Isi: mobile satu kolom; desktop 2/3 transaksi + 1/3 ringkasan */}
      <div className="mt-5 px-[15px] lg:px-0 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        {/* Ringkasan (mobile di atas, desktop di kanan) */}
        <div className="space-y-4 lg:order-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-success-100 text-success-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <p className="text-2xl font-bold text-dark">{stats.totalDonations}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t("account.dashboard.successTile")}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-warning-100 text-warning-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <p className="text-2xl font-bold text-dark">{stats.pendingDonations}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t("account.dashboard.pendingTile")}</p>
            </div>
          </div>

          {completion.percent < 100 && (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-dark">{t("account.dashboard.profileCompletion.title")}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{t("account.dashboard.profileCompletion.description")}</p>
                </div>
                <span className="text-sm font-bold text-primary-700">{completion.percent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    completion.percent < 50 ? "bg-warning-500" : completion.percent < 80 ? "bg-primary-500" : "bg-success-500"
                  )}
                  style={{ width: `${completion.percent}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">
                  {completion.filled} {t("account.dashboard.profileCompletion.of")} {completion.total} {t("account.dashboard.profileCompletion.fields")}
                </span>
                <Link href="/account/profile" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                  {t("account.dashboard.profileCompletion.cta")}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Transaksi terbaru */}
        <section className="lg:order-1 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-dark">{t("account.dashboard.recent.title")}</h2>
            {transactions.length > 0 && (
              <Link href="/account/transactions" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                {t("account.dashboard.recent.viewAll")}
              </Link>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-dark mb-1">{t("account.dashboard.recent.emptyTitle")}</h3>
              <p className="text-sm text-gray-500 mb-5">{t("account.dashboard.recent.emptyDesc")}</p>
              <Link href="/program">
                <Button>{t("account.dashboard.recent.startDonating")}</Button>
              </Link>
            </div>
          ) : (
            <ul className="m-0 list-none space-y-3 p-0">
              {transactions.map((transaction) => {
                const status = statusConfig[transaction.paymentStatus as keyof typeof statusConfig] || statusConfig.pending;
                return (
                  <li key={transaction.id}>
                    <Link
                      href={`/invoice/${transaction.id}`}
                      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-dark">{transaction.productName}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {transaction.transactionNumber} ·{" "}
                          {new Date(transaction.createdAt).toLocaleDateString(localeTag, { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <span className={cn("mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", status.color)}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <p className="text-sm font-bold text-dark">{formatRupiahFull(transaction.totalAmount)}</p>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
