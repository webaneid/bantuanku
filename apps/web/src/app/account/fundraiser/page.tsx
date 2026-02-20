"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatRupiahFull } from "@/lib/format";
import { cn } from "@/lib/cn";
import toast from "@/lib/feedback-toast";
import RevenueShareDisbursementPanel from "@/components/account/RevenueShareDisbursementPanel";
import { useI18n } from "@/lib/i18n/provider";

interface Fundraiser {
  id: string;
  code: string;
  slug: string;
  status: string;
  commissionPercentage: string;
  totalReferrals: number;
  totalDonationAmount: number;
  totalCommissionEarned: number;
  currentBalance: number;
  totalWithdrawn: number;
  createdAt: string;
  bankAccounts: Array<{
    id: string;
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  }>;
}

interface Referral {
  id: string;
  donationAmount: number;
  commissionPercentage: string;
  commissionAmount: number;
  status: string;
  createdAt: string;
  productName: string;
  donorName: string;
}

function SocialShareButtons({ url, title }: { url: string; title: string }) {
  const { t } = useI18n();
  const text = encodeURIComponent(`${title} - ${url}`);
  const encodedUrl = encodeURIComponent(url);

  return (
    <div className="flex items-center gap-1">
      {/* Copy */}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(url);
          toast.success(t("account.fundraiser.share.copySuccess"));
        }}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        title={t("account.fundraiser.copy")}
      >
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      {/* WhatsApp */}
      <a
        href={`https://wa.me/?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
        title={t("account.fundraiser.whatsapp")}
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
        title="Facebook"
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
      {/* X / Twitter */}
      <a
        href={`https://twitter.com/intent/tweet?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-900 transition-colors"
        title="X"
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      {/* LinkedIn */}
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-lg hover:bg-blue-50 text-blue-700 transition-colors"
        title="LinkedIn"
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
      {/* Threads */}
      <a
        href={`https://threads.net/intent/post?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-900 transition-colors"
        title="Threads"
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.18.408-2.26 1.33-3.04.88-.744 2.107-1.17 3.456-1.2 1.005-.022 1.93.112 2.768.4-.07-.6-.222-1.09-.455-1.467-.39-.631-1.058-.953-1.986-.96h-.043c-.71 0-1.63.206-2.089.793l-1.588-1.207c.76-1 2.032-1.548 3.586-1.586h.088c1.467.024 2.59.56 3.336 1.593.582.803.922 1.848 1.017 3.11.448.216.856.47 1.223.76 1.07.843 1.81 1.983 2.2 3.386.523 1.886.267 4.14-1.537 5.964-1.816 1.838-4.092 2.634-7.165 2.66zM12.033 14.2c-.86.019-1.57.203-2.046.532-.433.3-.648.695-.625 1.143.036.66.546 1.467 2.157 1.38 1.063-.057 1.876-.46 2.41-1.197.36-.496.604-1.12.73-1.87-.83-.273-1.729-.405-2.626-.388z" />
        </svg>
      </a>
    </div>
  );
}

export default function FundraiserPage() {
  const { user, isHydrated } = useAuth();
  const { t, locale } = useI18n();
  const localeTag = locale === "id" ? "id-ID" : "en-US";
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [referralPage, setReferralPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"share" | "pendapatan" | "pencairan">("share");
  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: t("account.fundraiser.statusBadge.pending"), color: "bg-warning-50 text-warning-700 border-warning-200" },
    active: { label: t("account.fundraiser.statusBadge.active"), color: "bg-success-50 text-success-700 border-success-200" },
    suspended: { label: t("account.fundraiser.statusBadge.suspended"), color: "bg-danger-50 text-danger-700 border-danger-200" },
  };

  const typeBadgeMap: Record<string, { label: string; color: string }> = {
    campaign: { label: t("account.fundraiser.typeBadge.campaign"), color: "bg-blue-50 text-blue-700" },
    zakat: { label: t("account.fundraiser.typeBadge.zakat"), color: "bg-green-50 text-green-700" },
    qurban: { label: t("account.fundraiser.typeBadge.qurban"), color: "bg-orange-50 text-orange-700" },
  };

  const formatDateShort = (date: string) =>
    new Intl.DateTimeFormat(localeTag, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date(date));

  const formatDateLong = (date: string) =>
    new Intl.DateTimeFormat(localeTag, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date(date));

  const referralStatusLabel = (status: string) => {
    if (status === "paid") return t("account.fundraiser.referrals.statusValues.paid");
    if (status === "pending") return t("account.fundraiser.referrals.statusValues.pending");
    if (status === "processing") return t("account.fundraiser.referrals.statusValues.processing");
    if (status === "rejected") return t("account.fundraiser.referrals.statusValues.rejected");
    return status;
  };

  const { data: fundraiser, isLoading, isError } = useQuery<Fundraiser>({
    queryKey: ["fundraiser-me"],
    queryFn: async () => {
      const res = await api.get("/fundraisers/me");
      return res.data.data;
    },
    enabled: isHydrated && !!user,
    retry: false,
  });

  const { data: referralsData } = useQuery({
    queryKey: ["fundraiser-me-referrals", referralPage],
    queryFn: async () => {
      const res = await api.get("/fundraisers/me/referrals", {
        params: { page: referralPage, limit: 10 },
      });
      return res.data;
    },
    enabled: !!fundraiser && fundraiser.status === "active",
  });

  const { data: programs } = useQuery({
    queryKey: ["fundraiser-active-programs"],
    queryFn: async () => {
      const res = await api.get("/fundraisers/active-programs");
      return res.data?.data || [];
    },
    enabled: !!fundraiser && fundraiser.status === "active",
  });

  const { data: payoutAvailabilityData } = useQuery({
    queryKey: ["fundraiser-disbursements", "availability"],
    queryFn: async () => {
      const res = await api.get("/fundraisers/me/disbursement-availability");
      return res.data?.data;
    },
    enabled: !!fundraiser && fundraiser.status === "active",
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      return api.post("/fundraisers/register", {});
    },
    onSuccess: (res) => {
      toast.success(res.data.message || t("account.fundraiser.toasts.registerSuccess"));
      queryClient.invalidateQueries({ queryKey: ["fundraiser-me"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t("account.fundraiser.toasts.registerFailed"));
    },
  });

  const referrals: Referral[] = referralsData?.data || [];
  const referralPagination = referralsData?.pagination;
  const totalKomisiPaid = payoutAvailabilityData?.availability?.totalEntitled ?? (fundraiser?.totalCommissionEarned || 0);
  const saldoKomisi = payoutAvailabilityData
    ? Math.max(0, Number(payoutAvailabilityData.availability?.totalEntitled || 0) - Number(payoutAvailabilityData.availability?.totalPaid || 0))
    : (fundraiser?.currentBalance || 0);

  const webUrl = typeof window !== "undefined" ? window.location.origin : "";

  const handleCopyLink = () => {
    if (!fundraiser) return;
    const link = `${webUrl}?ref=${fundraiser.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!fundraiser) return;
    const link = `${webUrl}?ref=${fundraiser.code}`;
    const text = t("account.fundraiser.share.whatsappShareText", { link });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (!isHydrated || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Not registered yet
  if (isError || !fundraiser) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("account.fundraiser.title")}</h1>
          <p className="text-gray-600 mt-1">{t("account.fundraiser.introSubtitle")}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t("account.fundraiser.registerTitle")}
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {t("account.fundraiser.registerDesc")}
          </p>
          <button
            type="button"
            onClick={() => registerMutation.mutate()}
            disabled={registerMutation.isPending}
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {registerMutation.isPending ? t("account.fundraiser.registerProcessing") : t("account.fundraiser.registerAction")}
          </button>
        </div>
      </div>
    );
  }

  const status = statusConfig[fundraiser.status] || statusConfig.pending;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("account.fundraiser.title")}</h1>
        <p className="text-gray-600 mt-1">{t("account.fundraiser.subtitle")}</p>
      </div>

      {/* Pending notice */}
      {fundraiser.status === "pending" && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
          <p className="text-sm text-warning-800">
            {t("account.fundraiser.pendingNotice")}
          </p>
        </div>
      )}

      {/* Suspended notice */}
      {fundraiser.status === "suspended" && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-4">
          <p className="text-sm text-danger-800">
            {t("account.fundraiser.suspendedNotice")}
          </p>
        </div>
      )}

      {/* Status & Link Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm text-gray-500">{t("account.fundraiser.status")}</span>
            <div className="mt-1">
              <span className={cn("inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border", status.color)}>
                {status.label}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500">{t("account.fundraiser.code")}</span>
            <div className="text-2xl font-bold font-mono text-primary-600">{fundraiser.code}</div>
          </div>
        </div>

        {fundraiser.status === "active" && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("account.fundraiser.referralLink")}</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${webUrl}?ref=${fundraiser.code}`}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm text-gray-700"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copied ? t("account.fundraiser.copied") : t("account.fundraiser.copy")}
              </button>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                {t("account.fundraiser.whatsapp")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {fundraiser.status === "active" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">{t("account.fundraiser.cards.totalReferral")}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{fundraiser.totalReferrals || 0}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">{t("account.fundraiser.cards.totalDonation")}</div>
            <div className="text-lg font-bold text-gray-900 mt-1">{formatRupiahFull(fundraiser.totalDonationAmount || 0)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">{t("account.fundraiser.cards.totalCommission")}</div>
            <div className="text-lg font-bold text-primary-600 mt-1">{formatRupiahFull(totalKomisiPaid)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">{t("account.fundraiser.cards.balance")}</div>
            <div className="text-lg font-bold text-success-600 mt-1">{formatRupiahFull(saldoKomisi)}</div>
          </div>
        </div>
      )}

      {/* Tabs: Share Program | Pendapatan */}
      {fundraiser.status === "active" && (
        <>
          <div className="border-b border-gray-200">
            <nav className="flex gap-0 -mb-px">
              <button
                type="button"
                onClick={() => setActiveTab("share")}
                className={cn(
                  "px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "share"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {t("account.fundraiser.tabs.shareProgram")}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pendapatan")}
                className={cn(
                  "px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "pendapatan"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {t("account.fundraiser.tabs.income")}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pencairan")}
                className={cn(
                  "px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "pencairan"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {t("account.fundraiser.tabs.disbursement")}
              </button>
            </nav>
          </div>

          {/* Tab: Share Program */}
          {activeTab === "share" && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <p className="text-sm text-gray-500">{t("account.fundraiser.share.hint")}</p>
              </div>

              {!programs ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : programs.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">{t("account.fundraiser.share.emptyPrograms")}</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {programs.map((p: any) => {
                    const type = typeBadgeMap[p.type] || typeBadgeMap.campaign;
                    const shareUrl = `${webUrl}${p.shareUrl}?ref=${fundraiser.code}`;
                    return (
                      <div key={`${p.type}-${p.id}`} className="flex items-center justify-between px-6 py-4 gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full shrink-0", type.color)}>
                            {type.label}
                          </span>
                          <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                        </div>
                        <SocialShareButtons url={shareUrl} title={p.name} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab: Pendapatan */}
          {activeTab === "pendapatan" && (
            <>
              {/* Info & Bank */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">{t("account.fundraiser.info.title")}</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("account.fundraiser.info.commission")}</span>
                      <span className="font-medium">{fundraiser.commissionPercentage || "5.00"}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("account.fundraiser.info.totalWithdrawn")}</span>
                      <span className="font-medium">{formatRupiahFull(fundraiser.totalWithdrawn || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("account.fundraiser.info.registeredAt")}</span>
                      <span className="font-medium">{formatDateLong(fundraiser.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">{t("account.fundraiser.bankAccount.title")}</h3>
                  {fundraiser.bankAccounts && fundraiser.bankAccounts.length > 0 ? (
                    <div className="space-y-3 text-sm">
                      {fundraiser.bankAccounts.map((acc, i) => (
                        <div key={acc.id || i} className={i > 0 ? "pt-3 border-t border-gray-100" : ""}>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{t("account.fundraiser.bankAccount.bank")}</span>
                            <span className="font-medium">{acc.bankName}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-gray-500">{t("account.fundraiser.bankAccount.accountNumber")}</span>
                            <span className="font-mono font-medium">{acc.accountNumber}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-gray-500">{t("account.fundraiser.bankAccount.accountName")}</span>
                            <span className="font-medium">{acc.accountHolderName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">{t("account.fundraiser.bankAccount.empty")}</p>
                  )}
                </div>
              </div>

              {/* Referrals */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-base font-semibold text-gray-900">{t("account.fundraiser.referrals.title")}</h3>
                </div>

                {referrals.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">{t("account.fundraiser.referrals.empty")}</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="divide-y divide-gray-200 sm:hidden">
                      {referrals.map((ref) => (
                        <div key={ref.id} className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{ref.productName || "-"}</span>
                            <span className={cn(
                              "px-2 py-0.5 text-xs font-medium rounded-full",
                              ref.status === "paid" ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700"
                            )}>
                              {referralStatusLabel(ref.status)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">{ref.donorName || "-"}</span>
                            <span className="font-medium text-primary-600">{formatRupiahFull(ref.commissionAmount || 0)}</span>
                          </div>
                          <div className="text-xs text-gray-400">{formatDateShort(ref.createdAt)}</div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("account.fundraiser.referrals.date")}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("account.fundraiser.referrals.donor")}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("account.fundraiser.referrals.product")}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("account.fundraiser.referrals.amount")}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("account.fundraiser.referrals.commission")}</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t("account.fundraiser.referrals.status")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {referrals.map((ref) => (
                            <tr key={ref.id}>
                              <td className="px-6 py-4 text-sm text-gray-500">{formatDateShort(ref.createdAt)}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{ref.donorName || "-"}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{ref.productName || "-"}</td>
                              <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatRupiahFull(ref.donationAmount || 0)}</td>
                              <td className="px-6 py-4 text-sm font-medium text-primary-600 text-right">{formatRupiahFull(ref.commissionAmount || 0)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={cn(
                                  "px-2 py-0.5 text-xs font-medium rounded-full",
                                  ref.status === "paid" ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700"
                                )}>
                                  {referralStatusLabel(ref.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {referralPagination && referralPagination.totalPages > 1 && (
                      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                          {t("account.fundraiser.referrals.pageOf", { page: referralPage, total: referralPagination.totalPages })}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setReferralPage((p) => Math.max(1, p - 1))}
                            disabled={referralPage <= 1}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                          >
                            {t("account.fundraiser.referrals.previous")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setReferralPage((p) => Math.min(referralPagination.totalPages, p + 1))}
                            disabled={referralPage >= referralPagination.totalPages}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                          >
                            {t("account.fundraiser.referrals.next")}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {activeTab === "pencairan" && (
            <RevenueShareDisbursementPanel
              availabilityEndpoint="/fundraisers/me/disbursement-availability"
              listEndpoint="/fundraisers/me/disbursements"
              createEndpoint="/fundraisers/me/disbursements"
              disbursementTypeLabel={t("account.revenueShareDisbursement.typeLabel")}
              categoryLabel={t("account.revenueShareDisbursement.categoryLabel")}
              queryKeyPrefix="fundraiser-disbursements"
            />
          )}
        </>
      )}
    </div>
  );
}
