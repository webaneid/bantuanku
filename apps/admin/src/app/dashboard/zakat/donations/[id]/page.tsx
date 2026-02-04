"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function ZakatDonationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  // Fetch donation detail
  const { data: donationData, isLoading } = useQuery({
    queryKey: ["zakat-donation", id],
    queryFn: async () => {
      const response = await api.get(`/admin/zakat/donations/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="dashboard-container">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!donationData) {
    return (
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="dashboard-container">
          <div className="text-center py-12">
            <p className="text-gray-500">Pembayaran tidak ditemukan</p>
            <button
              onClick={() => router.push("/dashboard/zakat/donations")}
              className="btn btn-primary btn-md mt-4"
            >
              Kembali ke Daftar Pembayaran
            </button>
          </div>
        </div>
      </main>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      success: { label: "Berhasil", className: "bg-success-100 text-success-800" },
      pending: { label: "Pending", className: "bg-warning-100 text-warning-800" },
      failed: { label: "Gagal", className: "bg-danger-100 text-danger-800" },
      expired: { label: "Kadaluarsa", className: "bg-gray-100 text-gray-800" },
    };

    const badge = badges[status] || { label: status, className: "bg-gray-100 text-gray-800" };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const handleImageClick = (url: string) => {
    setSelectedImage(url);
    setIsImageModalOpen(true);
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/zakat/donations")}
              className="btn btn-secondary btn-md"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Kembali
            </button>
            <div>
              <h1 className="dashboard-title">Detail Pembayaran Zakat</h1>
              <p className="dashboard-subtitle">
                Referensi ID: {donationData.referenceId}
              </p>
            </div>
          </div>
          <div>{getStatusBadge(donationData.paymentStatus)}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donatur Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Informasi Donatur</h3>
            </div>
            <div className="card-content space-y-4">
              <div>
                <div className="detail-label">Nama Donatur</div>
                <div className="detail-value">
                  {donationData.donorName}
                  {donationData.isAnonymous && (
                    <span className="text-sm text-gray-500 ml-2 font-normal">(Anonim)</span>
                  )}
                </div>
              </div>

              {donationData.donorEmail && (
                <div>
                  <div className="detail-label">Email</div>
                  <div className="detail-value">{donationData.donorEmail}</div>
                </div>
              )}

              {donationData.donorPhone && (
                <div>
                  <div className="detail-label">Nomor Telepon</div>
                  <div className="detail-value">{donationData.donorPhone}</div>
                </div>
              )}

              {donationData.donatur && (
                <div>
                  <div className="detail-label">Terdaftar sebagai Donatur</div>
                  <button
                    onClick={() => router.push(`/dashboard/donatur/${donationData.donatur.id}`)}
                    className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
                  >
                    Lihat Profil Donatur →
                  </button>
                </div>
              )}

              {donationData.message && (
                <div>
                  <div className="detail-label mb-2">Pesan dari Donatur</div>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 italic">
                    "{donationData.message}"
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Donation Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Informasi Pembayaran</h3>
            </div>
            <div className="card-content space-y-4">
              <div>
                <div className="detail-label">Jenis Zakat</div>
                <div className="flex items-center gap-2">
                  {donationData.zakatType?.icon && (
                    <span className="text-2xl">{donationData.zakatType.icon}</span>
                  )}
                  <div className="detail-value">
                    {donationData.zakatType?.name || donationData.zakatTypeName}
                  </div>
                </div>
              </div>

              <div>
                <div className="detail-label">Jumlah Pembayaran</div>
                <div className="text-2xl font-bold text-success-700">
                  {formatCurrency(donationData.amount)}
                </div>
              </div>

              {donationData.calculatedZakat && (
                <div>
                  <div className="detail-label">Hasil Kalkulator</div>
                  <div className="detail-value">
                    {formatCurrency(donationData.calculatedZakat)}
                  </div>
                </div>
              )}

              {donationData.notes && (
                <div>
                  <div className="detail-label">Catatan</div>
                  <div className="text-sm text-gray-900">{donationData.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Informasi Pembayaran</h3>
            </div>
            <div className="card-content space-y-4">
              <div>
                <div className="detail-label">Status Pembayaran</div>
                <div className="mt-1">{getStatusBadge(donationData.paymentStatus)}</div>
              </div>

              {donationData.paymentGateway && (
                <div>
                  <div className="detail-label">Payment Gateway</div>
                  <div className="detail-value">{donationData.paymentGateway}</div>
                </div>
              )}

              {donationData.paymentReference && (
                <div>
                  <div className="detail-label">Referensi Pembayaran / Bukti Transfer</div>
                  {donationData.paymentReference.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <div className="mt-2">
                      <img
                        src={donationData.paymentReference}
                        alt="Bukti Transfer"
                        className="w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => handleImageClick(donationData.paymentReference)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Klik gambar untuk melihat ukuran penuh</p>
                    </div>
                  ) : (
                    <div className="font-mono text-sm text-gray-900 break-all">
                      {donationData.paymentReference}
                    </div>
                  )}
                </div>
              )}

              {donationData.paidAt && (
                <div>
                  <div className="detail-label">Waktu Pembayaran</div>
                  <div className="detail-value">
                    {new Date(donationData.paidAt).toLocaleString("id-ID", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Timeline</h3>
            </div>
            <div className="card-content space-y-4">
              <div>
                <div className="detail-label">Dibuat pada</div>
                <div className="detail-value">
                  {new Date(donationData.createdAt).toLocaleString("id-ID", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </div>
              </div>

              <div>
                <div className="detail-label">Terakhir diperbarui</div>
                <div className="detail-value">
                  {new Date(donationData.updatedAt).toLocaleString("id-ID", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calculator Data (if exists) */}
        {donationData.calculatorData && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Data Kalkulator</h3>
            </div>
            <div className="card-content">
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 overflow-x-auto">
                  {JSON.stringify(donationData.calculatorData, null, 2)}
                </pre>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Data input dari kalkulator zakat yang digunakan donatur
              </p>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {isImageModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
            onClick={() => setIsImageModalOpen(false)}
          >
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
              onClick={() => setIsImageModalOpen(false)}
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
            <img
              src={selectedImage}
              alt="Bukti Transfer - Full Size"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </main>
  );
}
