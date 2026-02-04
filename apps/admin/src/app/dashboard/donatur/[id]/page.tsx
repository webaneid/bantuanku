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
  XCircleIcon,
  BanknotesIcon,
  HeartIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import api from "@/lib/api";

export default function ViewDonaturPage() {
  const router = useRouter();
  const params = useParams();
  const donaturId = params.id as string;

  // Fetch donatur data
  const { data: donaturData, isLoading } = useQuery({
    queryKey: ["donatur", donaturId],
    queryFn: async () => {
      const response = await api.get(`/admin/donatur/${donaturId}`);
      return response.data.data;
    },
  });

  // Fetch donations history (only success)
  const { data: donationsData } = useQuery({
    queryKey: ["donations-by-donatur", donaturId],
    queryFn: async () => {
      const response = await api.get(`/admin/donations?donaturId=${donaturId}&status=success&limit=1000`);
      return response.data.data || [];
    },
    enabled: !!donaturId,
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

  // Calculate statistics
  const totalDonations = donationsData?.length || 0;
  const totalAmount = donationsData?.reduce(
    (sum: number, donation: any) => sum + Number(donation.amount || 0),
    0
  ) || 0;
  const uniqueCampaigns = new Set(donationsData?.map((d: any) => d.campaignId)).size;

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

  if (!donaturData) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Donatur tidak ditemukan</p>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={() => router.push("/dashboard/donatur")}
          >
            Kembali ke Daftar Donatur
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
            onClick={() => router.push("/dashboard/donatur")}
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Kembali
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detail Donatur</h1>
            <p className="text-sm text-gray-500 mt-1">ID: {donaturData.id}</p>
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
              <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {donaturData.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{donaturData.name}</h2>
              <div className="mt-2">
                {donaturData.isActive ? (
                  <span className="badge badge-success">Aktif</span>
                ) : (
                  <span className="badge badge-secondary">Nonaktif</span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <EnvelopeIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900 break-words">{donaturData.email}</p>
                </div>
              </div>

              {donaturData.phone && (
                <div className="flex items-start gap-3">
                  <PhoneIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Nomor HP</p>
                    <p className="font-medium text-gray-900">{donaturData.phone}</p>
                  </div>
                </div>
              )}

              {donaturData.whatsappNumber && (
                <div className="flex items-start gap-3">
                  <PhoneIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">WhatsApp</p>
                    <p className="font-medium text-gray-900">{donaturData.whatsappNumber}</p>
                  </div>
                </div>
              )}

              {donaturData.website && (
                <div className="flex items-start gap-3">
                  <GlobeAltIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Website</p>
                    <a 
                      href={donaturData.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-primary-600 hover:text-primary-700 break-words"
                    >
                      {donaturData.website}
                    </a>
                  </div>
                </div>
              )}

              {(donaturData.detailAddress || donaturData.villageName) && (
                <div className="flex items-start gap-3">
                  <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Alamat</p>
                    <p className="font-medium text-gray-900">
                      {[
                        donaturData.detailAddress,
                        donaturData.villageName,
                        donaturData.districtName,
                        donaturData.regencyName,
                        donaturData.provinceName
                      ].filter(Boolean).join(", ")}
                      {donaturData.villagePostalCode && ` ${donaturData.villagePostalCode}`}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Bergabung</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(donaturData.createdAt)}
                  </p>
                </div>
              </div>

              {donaturData.emailVerifiedAt && (
                <div className="flex items-center gap-2 text-success-600 text-sm pt-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Email terverifikasi</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <BanknotesIcon className="w-5 h-5" />
                <span className="text-sm opacity-90">Total Donasi</span>
              </div>
              <p className="text-2xl font-bold">{totalDonations}x</p>
            </div>

            <div className="bg-gradient-to-br from-success-500 to-success-600 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <HeartIcon className="w-5 h-5" />
                <span className="text-sm opacity-90">Campaign</span>
              </div>
              <p className="text-2xl font-bold">{uniqueCampaigns}</p>
            </div>
          </div>

          {/* Total Amount Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm text-gray-500 mb-2">Total Kontribusi</h3>
            <p className="text-3xl font-bold text-primary-600">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>

        {/* Right Column - Donation History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Riwayat Donasi</h2>
              <p className="text-sm text-gray-500 mt-1">
                Semua donasi yang pernah dilakukan
              </p>
            </div>

            <div className="p-6">
              {donationsData && donationsData.length > 0 ? (
                <div className="space-y-4">
                  {donationsData.map((donation: any) => (
                    <div
                      key={donation.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate mb-2">
                            {donation.campaignTitle || "Campaign"}
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Tanggal:</span>
                              <span className="ml-2 text-gray-900">
                                {formatDate(donation.createdAt)}
                              </span>
                            </div>
                            {donation.paymentMethod && (
                              <div>
                                <span className="text-gray-500">Metode:</span>
                                <span className="ml-2 text-gray-900 uppercase">
                                  {donation.paymentMethod}
                                </span>
                              </div>
                            )}
                          </div>

                          {donation.notes && (
                            <p className="text-xs text-gray-500 mt-2 italic">
                              "{donation.notes}"
                            </p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold text-primary-600">
                            {formatCurrency(Number(donation.amount))}
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
                  <p className="text-gray-500">Belum ada riwayat donasi</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
