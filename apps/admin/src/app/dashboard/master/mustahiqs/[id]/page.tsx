"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  CheckCircleIcon,
  UserIcon,
  BanknotesIcon,
  HeartIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";
import api from "@/lib/api";
import md5 from "crypto-js/md5";
import Image from "next/image";

export default function ViewMustahiqPage() {
  const router = useRouter();
  const params = useParams();
  const mustahiqId = params.id as string;

  // Fetch mustahiq data
  const { data: mustahiqData, isLoading } = useQuery({
    queryKey: ["mustahiq", mustahiqId],
    queryFn: async () => {
      const response = await api.get(`/admin/mustahiqs/${mustahiqId}`);
      return response.data.data;
    },
  });

  // Fetch distributions history
  const { data: distributionsData } = useQuery({
    queryKey: ["distributions-by-mustahiq", mustahiqId],
    queryFn: async () => {
      const response = await api.get(`/admin/zakat/distributions?mustahiqId=${mustahiqId}&limit=1000`);
      return response.data.data || [];
    },
    enabled: !!mustahiqId,
  });

  // Fetch ledger entries for this mustahiq
  const { data: ledgerData } = useQuery({
    queryKey: ["ledger-by-mustahiq", mustahiqId],
    queryFn: async () => {
      try {
        const response = await api.get(`/admin/finance/ledger?refType=zakat_distribution&limit=1000`);
        const allEntries = response.data.data || [];
        
        // Filter entries that reference distributions for this mustahiq
        const mustahiqDistIds = distributionsData?.map((d: any) => d.id) || [];
        const relevantEntries = allEntries.filter((entry: any) => 
          mustahiqDistIds.includes(entry.refId)
        );
        
        return relevantEntries;
      } catch {
        return [];
      }
    },
    enabled: !!mustahiqId && !!distributionsData,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getGravatarUrl = (email: string | undefined) => {
    if (!email) return null;
    const hash = md5(email.trim().toLowerCase()).toString();
    return `https://www.gravatar.com/avatar/${hash}?d=404&s=200`;
  };

  const getAsnafLabel = (category: string) => {
    const labels: Record<string, string> = {
      fakir: "Fakir",
      miskin: "Miskin",
      amil: "Amil",
      mualaf: "Mualaf",
      riqab: "Riqab",
      gharim: "Gharim",
      fisabilillah: "Fisabilillah",
      ibnus_sabil: "Ibnus Sabil",
    };
    return labels[category] || category;
  };

  const getFullAddress = () => {
    if (!mustahiqData) return null;
    
    const parts = [];
    if (mustahiqData.detailAddress) parts.push(mustahiqData.detailAddress);
    if (mustahiqData.village?.name) parts.push(`Desa/Kel. ${mustahiqData.village.name}`);
    if (mustahiqData.district?.name) parts.push(`Kec. ${mustahiqData.district.name}`);
    if (mustahiqData.regency?.name) parts.push(mustahiqData.regency.name);
    if (mustahiqData.province?.name) parts.push(mustahiqData.province.name);
    if (mustahiqData.village?.postalCode) parts.push(mustahiqData.village.postalCode);
    
    return parts.length > 0 ? parts.join(", ") : null;
  };

  // Calculate statistics
  const totalDistributions = distributionsData?.length || 0;
  const uniqueZakatTypes = new Set(distributionsData?.map((d: any) => d.zakatType)).size;
  
  // Calculate total amount from ledger entries (credit = money OUT to mustahiq)
  let totalAmount = 0;
  if (ledgerData && Array.isArray(ledgerData)) {
    ledgerData.forEach((entry: any) => {
      if (entry.lines && Array.isArray(entry.lines)) {
        entry.lines.forEach((line: any) => {
          // Credit entries = money going OUT to mustahiq
          totalAmount += Number(line.credit || 0);
        });
      }
    });
  }

  const gravatarUrl = mustahiqData?.email ? getGravatarUrl(mustahiqData.email) : null;

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!mustahiqData) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Mustahiq tidak ditemukan</p>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={() => router.push("/dashboard/master/mustahiqs")}
          >
            Kembali ke Daftar Mustahiq
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="btn btn-secondary btn-md"
            onClick={() => router.push("/dashboard/master/mustahiqs")}
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Kembali
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detail Mustahiq</h1>
            <p className="text-sm text-gray-500 mt-1">ID: {mustahiqData.id}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile & Stats */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center mb-6">
              {gravatarUrl ? (
                <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden bg-gray-100">
                  <Image
                    src={gravatarUrl}
                    alt={mustahiqData.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // If gravatar fails, hide image and show initial
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center"><span class="text-3xl font-bold text-white">${mustahiqData.name.charAt(0).toUpperCase()}</span></div>`;
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {mustahiqData.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <h2 className="text-xl font-bold text-gray-900">{mustahiqData.name}</h2>
              
              <div className="mt-2 space-y-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  {getAsnafLabel(mustahiqData.asnafCategory)}
                </span>
                <div>
                  {mustahiqData.isActive ? (
                    <span className="badge badge-success">Aktif</span>
                  ) : (
                    <span className="badge badge-secondary">Nonaktif</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {mustahiqData.mustahiqId && (
                <div className="flex items-start gap-3">
                  <UserIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">ID Mustahiq</p>
                    <p className="font-medium text-gray-900">{mustahiqData.mustahiqId}</p>
                  </div>
                </div>
              )}

              {mustahiqData.email && (
                <div className="flex items-start gap-3">
                  <EnvelopeIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900 break-words">{mustahiqData.email}</p>
                  </div>
                </div>
              )}

              {mustahiqData.phone && (
                <div className="flex items-start gap-3">
                  <PhoneIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Nomor HP</p>
                    <p className="font-medium text-gray-900">{mustahiqData.phone}</p>
                  </div>
                </div>
              )}

              {getFullAddress() && (
                <div className="flex items-start gap-3">
                  <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Alamat</p>
                    <p className="font-medium text-gray-900">
                      {getFullAddress()}
                    </p>
                  </div>
                </div>
              )}

              {mustahiqData.nationalId && (
                <div className="flex items-start gap-3">
                  <UserIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">NIK / KTP</p>
                    <p className="font-medium text-gray-900">{mustahiqData.nationalId}</p>
                  </div>
                </div>
              )}

              {(mustahiqData.bankName || mustahiqData.bankAccount) && (
                <div className="flex items-start gap-3">
                  <BuildingLibraryIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Rekening Bank</p>
                    <p className="font-medium text-gray-900">
                      {mustahiqData.bankName} - {mustahiqData.bankAccount}
                    </p>
                    {mustahiqData.bankAccountName && (
                      <p className="text-sm text-gray-600 mt-1">
                        a.n. {mustahiqData.bankAccountName}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Terdaftar</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(mustahiqData.createdAt)}
                  </p>
                </div>
              </div>

              {mustahiqData.notes && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Catatan</p>
                  <p className="text-sm text-gray-700 italic">{mustahiqData.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <BanknotesIcon className="w-5 h-5" />
                <span className="text-sm opacity-90">Dana Diterima</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
            </div>

            <div className="bg-gradient-to-br from-success-500 to-success-600 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <HeartIcon className="w-5 h-5" />
                <span className="text-sm opacity-90">Total Terima</span>
              </div>
              <p className="text-2xl font-bold">{totalDistributions}x</p>
            </div>
          </div>

          {/* Transactions Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm text-gray-500 mb-2">Total Transaksi</h3>
            <p className="text-3xl font-bold text-purple-600">
              {ledgerData?.length || 0} transaksi
            </p>
          </div>
        </div>

        {/* Right Column - Distribution History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Riwayat Penerimaan Zakat</h2>
              <p className="text-sm text-gray-500 mt-1">
                Semua bantuan yang pernah diterima
              </p>
            </div>

            <div className="p-6">
              {distributionsData && distributionsData.length > 0 ? (
                <div className="space-y-4">
                  {distributionsData.map((distribution: any) => (
                    <div
                      key={distribution.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {distribution.zakatType || "Zakat"}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              distribution.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : distribution.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {distribution.status === 'completed' ? 'Selesai' : 
                               distribution.status === 'pending' ? 'Pending' : 
                               distribution.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Tanggal:</span>
                              <span className="ml-2 text-gray-900">
                                {formatDate(distribution.distributionDate || distribution.createdAt)}
                              </span>
                            </div>
                            {distribution.distributionType && (
                              <div>
                                <span className="text-gray-500">Tipe:</span>
                                <span className="ml-2 text-gray-900 capitalize">
                                  {distribution.distributionType}
                                </span>
                              </div>
                            )}
                          </div>

                          {distribution.notes && (
                            <p className="text-xs text-gray-500 mt-2 italic">
                              "{distribution.notes}"
                            </p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold text-purple-600">
                            {formatCurrency(Number(distribution.amount))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <BanknotesIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Belum ada riwayat penerimaan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
