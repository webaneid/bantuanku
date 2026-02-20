"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";
import Pagination from "@/components/Pagination";
import { BankAccountForm, type BankAccountValue } from "@/components/forms/BankAccountForm";
import RevenueShareDisbursementPanel from "@/components/fundraiser/RevenueShareDisbursementPanel";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || "";

const typeLabelMap: Record<string, string> = {
  campaign: "Campaign",
  zakat: "Zakat",
  qurban: "Qurban",
};

const typeBadgeMap: Record<string, string> = {
  campaign: "bg-primary-50 text-primary-700",
  zakat: "bg-emerald-50 text-emerald-700",
  qurban: "bg-amber-50 text-amber-700",
};

function SocialShareButtons({ url, title }: { url: string; title: string }) {
  const text = encodeURIComponent(`${title} - ${url}`);
  const encodedUrl = encodeURIComponent(url);

  return (
    <div className="flex items-center gap-1">
      {/* Copy */}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(url);
          toast.success("Link tersalin!");
        }}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        title="Copy link"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      {/* WhatsApp */}
      <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title="WhatsApp">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
      {/* Facebook */}
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Facebook">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
      {/* X / Twitter */}
      <a href={`https://twitter.com/intent/tweet?text=${text}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-900 transition-colors" title="X">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      {/* LinkedIn */}
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-700 transition-colors" title="LinkedIn">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
      {/* Threads */}
      <a href={`https://www.threads.net/intent/post?text=${text}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-900 transition-colors" title="Threads">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.695 6.54 2.717 2.227-.017 4.074-.517 5.49-1.482 1.2-.82 2.1-1.97 2.1-3.39 0-1.317-.575-2.16-1.71-2.502-.814-.244-1.747-.261-2.39.015-.452.196-.784.488-.98.866 1.677.226 3.186.712 3.84 2.027.45.903.396 1.965-.15 2.988-.63 1.185-1.775 1.974-3.412 2.353-.87.2-1.79.254-2.74.16-2.31-.228-4.08-1.168-4.88-2.587-.69-1.225-.76-2.82-.186-4.245.667-1.65 2.106-2.942 4.17-3.738.175-.067.353-.13.534-.189-.055-.915-.217-1.727-.485-2.352-.405-.943-1.078-1.48-1.893-1.51h-.063c-.776 0-1.46.357-1.924 1.006-.495.694-.73 1.662-.676 2.797l-2.12.1c-.09-1.653.3-3.09 1.1-4.06.87-1.058 2.13-1.619 3.618-1.619h.093c1.401.051 2.527.788 3.164 2.073.355.715.573 1.58.652 2.548 1.2-.215 2.449-.182 3.575.186 1.907.624 3.091 2.16 3.091 4.352 0 2.163-1.321 3.855-3.066 5.044-1.782 1.214-4.052 1.824-6.69 1.845z" />
        </svg>
      </a>
    </div>
  );
}

const statusBadgeMap: Record<string, string> = {
  pending: "bg-warning-50 text-warning-700",
  active: "bg-success-50 text-success-700",
  suspended: "bg-red-50 text-red-700",
};

const statusLabelMap: Record<string, string> = {
  pending: "Menunggu Persetujuan",
  active: "Aktif",
  suspended: "Ditangguhkan",
};

export default function MyFundraiserPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [referralPage, setReferralPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"share" | "pendapatan" | "pencairan">("share");
  const [bankAccountsFormData, setBankAccountsFormData] = useState<BankAccountValue[]>([]);

  const { data: fundraiser, isLoading, isError } = useQuery({
    queryKey: ["my-fundraiser"],
    queryFn: async () => {
      const response = await api.get("/admin/fundraisers/me");
      return response.data?.data;
    },
    retry: false,
  });

  // Check if employee has bank account (only when not yet a fundraiser)
  const { data: bankData, isLoading: bankLoading } = useQuery({
    queryKey: ["my-bank-account"],
    queryFn: async () => {
      const response = await api.get("/admin/fundraisers/me/has-bank-account");
      return response.data?.data;
    },
    enabled: isError || !fundraiser,
    retry: false,
  });

  const { data: referralsData } = useQuery({
    queryKey: ["my-fundraiser-referrals", referralPage],
    queryFn: async () => {
      const response = await api.get("/admin/fundraisers/me/referrals", {
        params: { page: referralPage, limit: 10 },
      });
      return response.data;
    },
    enabled: !!fundraiser,
  });

  const { data: programs } = useQuery({
    queryKey: ["fundraiser-active-programs"],
    queryFn: async () => {
      const response = await api.get("/admin/fundraisers/active-programs");
      return response.data?.data || [];
    },
    enabled: !!fundraiser && fundraiser.status === "active",
  });

  const { data: payoutAvailabilityData } = useQuery({
    queryKey: ["my-fundraiser-disbursements", "availability"],
    queryFn: async () => {
      const response = await api.get("/admin/fundraisers/me/disbursement-availability");
      return response.data?.data;
    },
    enabled: !!fundraiser && fundraiser.status === "active",
  });

  const saveBankMutation = useMutation({
    mutationFn: async (data: { bankAccounts: BankAccountValue[] }) => {
      return api.post("/admin/fundraisers/me/save-bank-account", data);
    },
    onSuccess: () => {
      toast.success("Rekening berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["my-bank-account"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menyimpan rekening");
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      return api.post("/admin/fundraisers/me/apply", {});
    },
    onSuccess: () => {
      toast.success("Pengajuan fundraiser berhasil dikirim! Menunggu persetujuan admin.");
      queryClient.invalidateQueries({ queryKey: ["my-fundraiser"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal mengajukan fundraiser");
    },
  });

  const referrals = referralsData?.data || [];
  const referralPagination = referralsData?.pagination;
  const totalKomisiPaid = payoutAvailabilityData?.availability?.totalEntitled ?? (fundraiser?.totalCommissionEarned || 0);
  const saldoKomisi = payoutAvailabilityData
    ? Math.max(0, Number(payoutAvailabilityData.availability?.totalEntitled || 0) - Number(payoutAvailabilityData.availability?.totalPaid || 0))
    : (fundraiser?.currentBalance || 0);

  const handleCopyLink = () => {
    if (!fundraiser) return;
    const link = `${window.location.origin}?ref=${fundraiser.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveBankAndApply = () => {
    if (bankAccountsFormData.length === 0 || !bankAccountsFormData[0]?.bankName) {
      toast.error("Silakan isi data rekening bank terlebih dahulu");
      return;
    }
    saveBankMutation.mutate({ bankAccounts: bankAccountsFormData }, {
      onSuccess: () => {
        applyMutation.mutate();
      },
    });
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Not registered as fundraiser - show apply flow
  if (isError || !fundraiser) {
    const hasBankAccount = bankData?.hasBankAccount || false;

    return (
      <div className="dashboard-container">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Fundraiser</h1>
          <p className="text-gray-600 mt-1">Dashboard penggalang dana Anda</p>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Belum Terdaftar sebagai Fundraiser
            </h2>
            <p className="text-gray-600">
              Ajukan diri Anda sebagai fundraiser untuk mulai mendapatkan komisi dari setiap donasi yang masuk melalui link referral Anda.
            </p>
          </div>

          {hasBankAccount ? (
            /* Has bank account - direct apply */
            <div className="text-center">
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending ? "Mengirim..." : "Daftar sebagai Fundraiser"}
              </button>
            </div>
          ) : (
            /* No bank account - show BankAccountForm first */
            <div className="max-w-lg mx-auto">
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-warning-800">
                  Anda belum memiliki rekening bank. Silakan tambahkan rekening terlebih dahulu untuk pencairan komisi.
                </p>
              </div>

              <h3 className="text-base font-semibold text-gray-900 mb-3">Informasi Rekening Bank</h3>
              <BankAccountForm
                value={[]}
                onChange={setBankAccountsFormData}
                required={true}
              />

              <div className="mt-6 text-center">
                <button
                  type="button"
                  className="btn btn-primary btn-md"
                  onClick={handleSaveBankAndApply}
                  disabled={saveBankMutation.isPending || applyMutation.isPending}
                >
                  {saveBankMutation.isPending || applyMutation.isPending
                    ? "Memproses..."
                    : "Simpan Rekening & Daftar Fundraiser"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const statusClass = statusBadgeMap[fundraiser.status] || "bg-gray-100 text-gray-700";
  const statusLabel = statusLabelMap[fundraiser.status] || fundraiser.status;
  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}?ref=${fundraiser.code}`
    : "";

  // Bank accounts from entity_bank_accounts
  const bankAccounts = fundraiser.bankAccounts || [];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Fundraiser</h1>
        <p className="text-gray-600 mt-1">Dashboard penggalang dana Anda</p>
      </div>

      {/* Pending notice */}
      {fundraiser.status === "pending" && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-warning-800">
            Pengajuan fundraiser Anda sedang menunggu persetujuan admin. Anda akan mendapatkan link referral setelah disetujui.
          </p>
        </div>
      )}

      {/* Suspended notice */}
      {fundraiser.status === "suspended" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">
            Akun fundraiser Anda sedang ditangguhkan. Hubungi admin untuk informasi lebih lanjut.
          </p>
        </div>
      )}

      {/* Status & Link */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm text-gray-500">Status</span>
            <div className="mt-1">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500">Kode Fundraiser</span>
            <div className="text-2xl font-bold font-mono text-primary-600">{fundraiser.code}</div>
          </div>
        </div>

        {fundraiser.status === "active" && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Link Referral</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="form-input flex-1 bg-gray-50 font-mono text-sm"
              />
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={handleCopyLink}
              >
                {copied ? "Tersalin!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Referral</div>
          <div className="text-2xl font-bold">{fundraiser.totalReferrals || 0}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Donasi</div>
          <div className="text-xl font-bold">Rp {formatRupiah(fundraiser.totalDonationAmount || 0)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Komisi</div>
          <div className="text-xl font-bold text-primary-600">Rp {formatRupiah(totalKomisiPaid)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Saldo</div>
          <div className="text-xl font-bold text-success-600">Rp {formatRupiah(saldoKomisi)}</div>
        </div>
      </div>

      {/* Tabs */}
      {fundraiser.status === "active" && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-0 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab("share")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "share"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Share Program
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pendapatan")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "pendapatan"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Pendapatan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pencairan")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "pencairan"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Pencairan
            </button>
          </nav>
        </div>
      )}

      {/* Tab: Share Program */}
      {fundraiser.status === "active" && activeTab === "share" && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-4">
            Bagikan program berikut dengan kode referral <span className="font-mono font-semibold text-primary-600">{fundraiser.code}</span>
          </p>
          {programs && programs.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Jenis</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((p: any) => {
                    const fullUrl = `${WEB_URL}${p.shareUrl}?ref=${fundraiser.code}`;
                    return (
                      <tr key={`${p.type}-${p.id}`}>
                        <td className="text-sm font-medium text-gray-900">{p.name}</td>
                        <td>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeBadgeMap[p.type] || "bg-gray-100 text-gray-700"}`}>
                            {typeLabelMap[p.type] || p.type}
                          </span>
                        </td>
                        <td>
                          <SocialShareButtons url={fullUrl} title={p.name} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Belum ada program aktif</p>
          )}
        </div>
      )}

      {/* Tab: Pendapatan */}
      {(fundraiser.status !== "active" || activeTab === "pendapatan") && (
        <>
          {/* Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Informasi</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Komisi</span>
                  <span>{fundraiser.commissionPercentage || "5.00"}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Ditarik</span>
                  <span>Rp {formatRupiah(fundraiser.totalWithdrawn || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Terdaftar</span>
                  <span>{format(new Date(fundraiser.createdAt), "dd MMM yyyy", { locale: idLocale })}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Rekening Bank</h3>
              {bankAccounts.length > 0 ? (
                <div className="space-y-3 text-sm">
                  {bankAccounts.map((acc: any, i: number) => (
                    <div key={acc.id || i} className={i > 0 ? "pt-3 border-t border-gray-100" : ""}>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Bank</span>
                        <span>{acc.bankName}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-500">No. Rekening</span>
                        <span className="font-mono">{acc.accountNumber}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-500">Atas Nama</span>
                        <span>{acc.accountHolderName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Belum ada rekening bank</p>
              )}
            </div>
          </div>

          {/* Referrals */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Riwayat Referral</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Donatur</th>
                    <th>Produk</th>
                    <th>Nominal</th>
                    <th>Komisi</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        Belum ada referral. Bagikan link Anda untuk mulai mendapatkan komisi.
                      </td>
                    </tr>
                  ) : (
                    referrals.map((ref: any) => (
                      <tr key={ref.id}>
                        <td className="text-sm">
                          {format(new Date(ref.createdAt), "dd MMM yyyy", { locale: idLocale })}
                        </td>
                        <td className="text-sm">{ref.donorName || "-"}</td>
                        <td className="text-sm">{ref.productName || "-"}</td>
                        <td className="mono text-sm">Rp {formatRupiah(ref.donationAmount || 0)}</td>
                        <td className="mono text-sm">Rp {formatRupiah(ref.commissionAmount || 0)}</td>
                        <td>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            ref.status === "paid" ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700"
                          }`}>
                            {ref.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {referralPagination && referralPagination.totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={referralPage}
                  totalPages={referralPagination.totalPages}
                  totalItems={referralPagination.total}
                  onPageChange={setReferralPage}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab: Pencairan */}
      {fundraiser.status === "active" && activeTab === "pencairan" && (
        <RevenueShareDisbursementPanel
          availabilityEndpoint="/admin/fundraisers/me/disbursement-availability"
          listEndpoint="/admin/fundraisers/me/disbursements"
          createEndpoint="/admin/fundraisers/me/disbursements"
          disbursementTypeLabel="Revenue Share"
          categoryLabel="Pencairan Komisi Fundraiser"
          queryKeyPrefix="my-fundraiser-disbursements"
        />
      )}

    </div>
  );
}
