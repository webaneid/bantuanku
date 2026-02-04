"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  PencilIcon,
  CalendarIcon,
  TagIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import api from "@/lib/api";
import Link from "next/link";

export default function ViewCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const [activeTab, setActiveTab] = useState<"keuangan" | "laporan" | "donatur">("keuangan");

  // Fetch campaign data
  const { data: campaignData, isLoading } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: async () => {
      const response = await api.get(`/admin/campaigns/${campaignId}`);
      return response.data.data;
    },
  });

  // Fetch activity reports for this campaign
  const { data: activityReports } = useQuery({
    queryKey: ["activity-reports", campaignId],
    queryFn: async () => {
      const response = await api.get(`/admin/activity-reports?campaignId=${campaignId}`);
      return response.data.data || [];
    },
    enabled: !!campaignId,
  });

  // Fetch donations for this campaign
  const { data: donationsData } = useQuery({
    queryKey: ["donations", campaignId],
    queryFn: async () => {
      const response = await api.get(`/admin/donations?campaignId=${campaignId}&limit=100`);
      return response.data.data || [];
    },
    enabled: !!campaignId,
  });

  // Fetch disbursements (ledger) for this campaign
  const { data: disbursementsData } = useQuery({
    queryKey: ["disbursements", campaignId],
    queryFn: async () => {
      const response = await api.get(`/admin/ledger?campaignId=${campaignId}&status=paid&limit=1000`);
      return response.data.data || [];
    },
    enabled: !!campaignId,
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "badge-warning" },
      active: { label: "Aktif", className: "badge-success" },
      completed: { label: "Selesai", className: "badge-info" },
      cancelled: { label: "Dibatalkan", className: "badge-danger" },
    };
    const statusInfo = statusMap[status] || { label: status, className: "badge-secondary" };
    return <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>;
  };

  const calculateProgress = () => {
    if (!campaignData) return 0;
    const collected = Number(campaignData.collected || 0);
    const goal = Number(campaignData.goal || 1);
    return Math.min((collected / goal) * 100, 100);
  };

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

  if (!campaignData) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Campaign tidak ditemukan</p>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={() => router.push("/dashboard/campaigns")}
          >
            Kembali ke Daftar Campaign
          </button>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="btn btn-secondary btn-md"
            onClick={() => router.push("/dashboard/campaigns")}
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Kembali
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detail Campaign</h1>
            <p className="text-sm text-gray-500 mt-1">
              ID: {campaignData.id}
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/campaigns/${campaignId}/edit`}
          className="btn btn-primary btn-md"
        >
          <PencilIcon className="w-5 h-5" />
          Edit Campaign
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Image */}
          {campaignData.imageUrl && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <img
                src={campaignData.imageUrl}
                alt={campaignData.title}
                className="w-full h-96 object-cover"
              />
            </div>
          )}

          {/* Title & Description */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {campaignData.title}
                </h2>
                <p className="text-lg text-gray-600">
                  {campaignData.description}
                </p>
              </div>
              <div className="ml-4">
                {getStatusBadge(campaignData.status)}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <CurrencyDollarIcon className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Target Donasi</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(Number(campaignData.goal))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-success-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Terkumpul</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(Number(campaignData.collected || 0))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-info-100 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="w-6 h-6 text-info-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Donatur</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {campaignData.donorCount || 0} orang
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                  <ClockIcon className="w-6 h-6 text-warning-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Progress</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {progress.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Content */}
          {campaignData.content && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Deskripsi Lengkap
              </h3>
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: campaignData.content }}
              />
            </div>
          )}

          {/* Additional Images */}
          {campaignData.images && campaignData.images.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Galeri Gambar
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {campaignData.images.map((image: string, index: number) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden">
                    <img
                      src={image}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video */}
          {campaignData.videoUrl && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Video Campaign
              </h3>
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={campaignData.videoUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

          {/* Tabs Section: Laporan */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">Laporan</h2>
            </div>
            {/* Tab Headers */}
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab("keuangan")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "keuangan"
                      ? "border-primary-600 text-primary-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Keuangan
                </button>
                <button
                  onClick={() => setActiveTab("laporan")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "laporan"
                      ? "border-primary-600 text-primary-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Laporan Kegiatan
                </button>
                <button
                  onClick={() => setActiveTab("donatur")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "donatur"
                      ? "border-primary-600 text-primary-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Donatur
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Tab 1: Keuangan */}
              {activeTab === "keuangan" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">Penyaluran</h3>

                  {/* Progress Bar - Penyaluran dari Total Pendapatan */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Total Pendapatan</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(Number(campaignData.collected || 0))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Sudah Disalurkan</span>
                      <span className="text-sm font-semibold text-warning-600">
                        {formatCurrency(Number(campaignData.disbursed || 0))}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-10">
                      <div
                        className="h-10 rounded-full flex items-center justify-end pr-4 transition-all duration-300"
                        style={{
                          width: `${Math.min((Number(campaignData.disbursed || 0) / Number(campaignData.collected || 1)) * 100, 100)}%`,
                          background: 'linear-gradient(to right, #f59e0b, #d97706)',
                        }}
                      >
                        <span className="text-sm font-semibold text-white">
                          {((Number(campaignData.disbursed || 0) / Number(campaignData.collected || 1)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* History Penyaluran */}
                  <div className="mt-8">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">Riwayat Penyaluran</h4>

                    {disbursementsData && disbursementsData.length > 0 ? (
                      <div className="space-y-3">
                        {disbursementsData.map((disbursement: any) => (
                          <div key={disbursement.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-semibold text-gray-900">{disbursement.purpose}</h5>
                                  <span className="badge badge-success text-xs">Paid</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  Kepada: {disbursement.recipientName}
                                </p>
                                {disbursement.description && (
                                  <p className="text-xs text-gray-500">{disbursement.description}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-2">
                                  {new Date(disbursement.paidAt).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-danger-600">
                                  {formatCurrency(Number(disbursement.amount))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-500">Belum ada penyaluran untuk campaign ini</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Laporan Kegiatan */}
              {activeTab === "laporan" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">Timeline Kegiatan</h3>

                  {activityReports && activityReports.length > 0 ? (
                    <div className="relative">
                      {/* Vertical Line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                      {/* Timeline Items */}
                      <div className="space-y-8">
                        {activityReports.map((report: any, index: number) => (
                          <div key={report.id} className="relative pl-12">
                            <div className="absolute left-0 top-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                              <div className="w-3 h-3 bg-white rounded-full"></div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">{report.title}</h4>
                                <span className="text-xs text-gray-500">
                                  {new Date(report.activityDate).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                              <div
                                className="prose prose-sm max-w-none text-gray-700 mb-3"
                                dangerouslySetInnerHTML={{ __html: report.description }}
                              />

                              {/* Gallery */}
                              {report.gallery && report.gallery.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mt-3">
                                  {report.gallery.map((imageUrl: string, imgIndex: number) => (
                                    <div key={imgIndex} className="aspect-square rounded-lg overflow-hidden">
                                      <img
                                        src={imageUrl}
                                        alt={`${report.title} - ${imgIndex + 1}`}
                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Belum ada laporan kegiatan untuk campaign ini</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Donatur */}
              {activeTab === "donatur" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">Daftar Donatur</h3>
                    <span className="text-sm text-gray-500">
                      Total: {donationsData?.length || 0} donasi
                    </span>
                  </div>

                  {donationsData && donationsData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nama
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Jumlah
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tanggal
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {donationsData.map((donation: any) => (
                            <tr key={donation.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {donation.donorName || "Anonim"}
                                    </div>
                                    {donation.donorEmail && (
                                      <div className="text-xs text-gray-500">{donation.donorEmail}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(Number(donation.amount))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">
                                  {new Date(donation.createdAt).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {donation.paymentStatus === "success" && (
                                  <span className="badge badge-success">Berhasil</span>
                                )}
                                {donation.paymentStatus === "pending" && (
                                  <span className="badge badge-warning">Pending</span>
                                )}
                                {donation.paymentStatus === "failed" && (
                                  <span className="badge badge-danger">Gagal</span>
                                )}
                                {donation.paymentStatus === "expired" && (
                                  <span className="badge badge-secondary">Kadaluarsa</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Belum ada donatur untuk campaign ini</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar Info */}
        <div className="space-y-6">
          {/* Campaign Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Informasi Campaign
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <TagIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Kategori</p>
                  <p className="font-medium text-gray-900">
                    {campaignData.categoryName || "-"}
                  </p>
                </div>
              </div>

              {campaignData.coordinatorName && (
                <div className="flex items-start gap-3">
                  <UserIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Penanggung Jawab Program</p>
                    <Link
                      href={`/dashboard/master/employees/${campaignData.coordinatorId}`}
                      className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      {campaignData.coordinatorName}
                    </Link>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Tanggal Mulai</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(campaignData.startDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Tanggal Selesai</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(campaignData.endDate)}
                  </p>
                </div>
              </div>

              {campaignData.pillar && (
                <div className="flex items-start gap-3">
                  <TagIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Pilar</p>
                    <p className="font-medium text-gray-900">
                      {campaignData.pillar}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Status & Fitur
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Campaign Unggulan</span>
                {campaignData.isFeatured ? (
                  <CheckCircleIcon className="w-5 h-5 text-success-600" />
                ) : (
                  <XCircleIcon className="w-5 h-5 text-gray-300" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Campaign Mendesak</span>
                {campaignData.isUrgent ? (
                  <CheckCircleIcon className="w-5 h-5 text-success-600" />
                ) : (
                  <XCircleIcon className="w-5 h-5 text-gray-300" />
                )}
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Riwayat
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Dibuat</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(campaignData.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Terakhir Diperbarui</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(campaignData.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
