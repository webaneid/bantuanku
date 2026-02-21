"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { BankAccountForm, type BankAccountValue } from "@/components/forms/BankAccountForm";
import SettingsLayout from "@/components/SettingsLayout";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

export default function DeveloperSettingsPage() {
  const { user } = useAuth();
  const isDeveloper = Boolean(user?.isDeveloper);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"info" | "rekening" | "pendapatan">("info");
  const [bankAccountsFormData, setBankAccountsFormData] = useState<BankAccountValue[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [webUrl, setWebUrl] = useState(() => process.env.NEXT_PUBLIC_WEB_URL?.trim().replace(/\/+$/, "") || "");

  const normalizeBankAccounts = (items: any[] = []): BankAccountValue[] =>
    items.map((account) => ({
      id: account.id,
      bankName: account.bankName || "",
      accountNumber: account.accountNumber || "",
      accountHolderName: account.accountHolderName || "",
    }));

  const isSameBankAccounts = (a: BankAccountValue[], b: BankAccountValue[]) =>
    JSON.stringify(a) === JSON.stringify(b);

  const developerBankAccountsQuery = useQuery({
    queryKey: ["developer-bank-accounts"],
    enabled: isDeveloper,
    queryFn: async () => {
      const response = await api.get("/admin/settings/developer/rekening");
      return response.data?.data?.bankAccounts || [];
    },
  });

  const developerIncomeQuery = useQuery({
    queryKey: ["developer-income-monthly"],
    enabled: isDeveloper && activeTab === "pendapatan",
    queryFn: async () => {
      const response = await api.get("/admin/settings/developer/pendapatan");
      return response.data?.data?.rows || [];
    },
  });

  useEffect(() => {
    if (!isDeveloper && (activeTab === "rekening" || activeTab === "pendapatan")) {
      setActiveTab("info");
    }
  }, [activeTab, isDeveloper]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isBrowserLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const hasLocalhostWebUrl =
      webUrl.includes("localhost") || webUrl.includes("127.0.0.1");

    // If env URL is empty or still localhost while app runs on real domain,
    // derive public web URL from current host.
    if (webUrl && !(hasLocalhostWebUrl && !isBrowserLocalhost)) return;

    const { protocol, hostname, origin } = window.location;
    if (hostname.startsWith("admin.")) {
      setWebUrl(`${protocol}//${hostname.replace(/^admin\./, "")}`);
      return;
    }
    setWebUrl(origin);
  }, [webUrl]);

  useEffect(() => {
    if (!developerBankAccountsQuery.data) return;

    const nextAccounts = normalizeBankAccounts(developerBankAccountsQuery.data);
    setBankAccountsFormData((prev) =>
      isSameBankAccounts(prev, nextAccounts) ? prev : nextAccounts
    );
  }, [developerBankAccountsQuery.dataUpdatedAt]);

  const saveDeveloperBankAccountsMutation = useMutation({
    mutationFn: async (bankAccounts: BankAccountValue[]) => {
      const normalizedAccounts = bankAccounts
        .map((account) => ({
          bankName: account.bankName.trim(),
          accountNumber: account.accountNumber.trim(),
          accountHolderName: account.accountHolderName.trim(),
        }))
        .filter((account) => account.bankName && account.accountNumber && account.accountHolderName);

      await api.put("/admin/settings/developer/rekening", {
        bankAccounts: normalizedAccounts,
      });
    },
    onSuccess: async () => {
      setSaveMessage("Rekening developer berhasil disimpan.");
      await queryClient.invalidateQueries({ queryKey: ["developer-bank-accounts"] });
    },
    onError: () => {
      setSaveMessage("Gagal menyimpan rekening developer.");
    },
  });

  const handleSaveDeveloperBankAccounts = () => {
    setSaveMessage("");
    saveDeveloperBankAccountsMutation.mutate(bankAccountsFormData);
  };

  return (
    <SettingsLayout>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:p-8 space-y-8">
        <div className="border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "info"
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab("info")}
            >
              Informasi
            </button>
            {isDeveloper && (
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "rekening"
                    ? "border-primary-600 text-primary-700"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab("rekening")}
              >
                Rekening
              </button>
            )}
            {isDeveloper && (
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "pendapatan"
                    ? "border-primary-600 text-primary-700"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab("pendapatan")}
              >
                Pendapatan
              </button>
            )}
          </div>
        </div>

        {activeTab === "info" && (
          <>
            <div className="text-center space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-webane.svg"
                alt="Webane Indonesia"
                className="h-20 w-auto mx-auto"
              />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Webane Indonesia</h2>
                <p className="text-sm text-gray-600 mt-1">
                  JalaBagi Versi 1.0.1 - Februari 2026
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-2">About Webane</h3>
              <p className="text-sm text-gray-700 leading-6">
                Webane Indonesia adalah software house dan konsultan digital yang
                berfokus pada pengembangan aplikasi web, mobile, automasi bisnis,
                integrasi AI, serta pendampingan transformasi digital dari strategi
                hingga implementasi.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Resources</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://webane.com"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                >
                  Tentang Webane
                </a>
                <a
                  href={`${webUrl || ""}/documentation`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                >
                  Dokumentasi
                </a>
              </div>
            </div>
          </>
        )}

        {isDeveloper && activeTab === "rekening" && (
          <div className="rounded-lg border border-gray-200 p-5 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Rekening Developer</h3>
              <p className="text-sm text-gray-600 mt-1">
                Kelola rekening penerimaan developer.
              </p>
            </div>

            <BankAccountForm
              value={bankAccountsFormData}
              onChange={setBankAccountsFormData}
              disabled={developerBankAccountsQuery.isLoading || saveDeveloperBankAccountsMutation.isPending}
            />

            {saveMessage && (
              <p className={`text-sm ${saveDeveloperBankAccountsMutation.isError ? "text-danger-600" : "text-success-600"}`}>
                {saveMessage}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveDeveloperBankAccounts}
                disabled={saveDeveloperBankAccountsMutation.isPending}
              >
                {saveDeveloperBankAccountsMutation.isPending ? "Menyimpan..." : "Simpan Rekening"}
              </button>
            </div>
          </div>
        )}

        {isDeveloper && activeTab === "pendapatan" && (
          <div className="rounded-lg border border-gray-200 p-5 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Pendapatan Developer</h3>
              <p className="text-sm text-gray-600 mt-1">
                Periode bulanan dihitung dari tanggal 20 ke tanggal 20 bulan berikutnya.
              </p>
            </div>

            {developerIncomeQuery.isLoading ? (
              <div className="text-sm text-gray-500">Memuat data pendapatan...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Bulan</th>
                      <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Revenue Share</th>
                      <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Disbursements</th>
                      <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Saldo</th>
                      <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3">Pengajuan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {developerIncomeQuery.data.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-sm text-gray-500 text-center">
                          Belum ada data pendapatan.
                        </td>
                      </tr>
                    ) : (
                      developerIncomeQuery.data.map((row: any) => (
                        <tr key={`${row.month}-${row.periodStart}`} className="border-t border-gray-200">
                          <td className="px-4 py-3 text-sm text-gray-900 capitalize">{row.month}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 mono">
                            Rp {Number(row.revenueShare || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 mono">
                            Rp {Number(row.disbursements || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 mono">
                            Rp {Number(row.saldo || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <Link
                              href="/dashboard/disbursements/create?type=revenue_share"
                              className={`inline-flex items-center justify-center rounded-md border px-3 py-2 ${
                                Number(row.saldo || 0) > 0
                                  ? "border-primary-600 text-primary-700 hover:bg-primary-50"
                                  : "border-gray-200 text-gray-400 pointer-events-none"
                              }`}
                              title="Ajukan pencairan"
                            >
                              <BanknotesIcon className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
