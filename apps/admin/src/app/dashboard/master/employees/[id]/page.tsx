"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  BriefcaseIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  BuildingLibraryIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import api from "@/lib/api";
import md5 from "crypto-js/md5";
import Image from "next/image";
import FeedbackDialog from "@/components/FeedbackDialog";

export default function ViewEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const employeeId = params.id as string;
  const [showActivateForm, setShowActivateForm] = useState(false);
  const [activatePassword, setActivatePassword] = useState("");
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  // Fetch employee data
  const { data: employeeData, isLoading, refetch } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const response = await api.get(`/admin/employees/${employeeId}`);
      return response.data.data;
    },
  });

  // Fetch programs handled (if coordinator)
  const { data: programsData } = useQuery({
    queryKey: ["programs-by-coordinator", employeeId],
    queryFn: async () => {
      try {
        const response = await api.get(`/admin/campaigns?limit=1000`);
        const allCampaigns = response.data.data || [];
        
        // Filter campaigns where this employee is coordinator
        // and enrich with stats
        const employeeCampaigns = await Promise.all(
          allCampaigns
            .filter((campaign: any) => campaign.coordinatorId === employeeId)
            .map(async (campaign: any) => {
              // Fetch stats for each campaign
              try {
                const [reportsRes, donationsRes] = await Promise.all([
                  api.get(`/admin/activity-reports?campaignId=${campaign.id}&limit=1000`),
                  api.get(`/admin/donations?campaignId=${campaign.id}&limit=1000`)
                ]);

                const reports = reportsRes.data.data || [];
                const donations = donationsRes.data.data || [];

                // Calculate total received from donations
                const totalReceived = donations.reduce(
                  (sum: number, donation: any) => sum + Number(donation.amount || 0),
                  0
                );

                return {
                  ...campaign,
                  totalReports: reports.length,
                  totalReceived,
                  totalTransactions: donations.length,
                };
              } catch {
                return {
                  ...campaign,
                  totalReports: 0,
                  totalReceived: 0,
                  totalDistributed: 0,
                  totalTransactions: 0,
                };
              }
            })
        );

        return employeeCampaigns;
      } catch (error) {
        return [];
      }
    },
    enabled: !!employeeId,
  });

  // Fetch distributions done by this employee (as coordinator)
  const { data: distributionsData } = useQuery({
    queryKey: ["distributions-by-coordinator", employeeId],
    queryFn: async () => {
      try {
        const response = await api.get(`/admin/zakat/distributions?coordinatorId=${employeeId}&limit=1000`);
        const distributions = response.data.data || [];
        
        // Enrich each distribution with ledger data
        const enrichedDistributions = await Promise.all(
          distributions.map(async (dist: any) => {
            try {
              // Fetch ledger entries for this distribution
              const ledgerRes = await api.get(`/admin/finance/ledger?refType=zakat_distribution&refId=${dist.id}&limit=100`);
              const ledgerEntries = ledgerRes.data.data || [];
              
              // Calculate total from ledger lines (credit = money OUT)
              let totalFromLedger = 0;
              let totalTransactions = 0;
              
              ledgerEntries.forEach((entry: any) => {
                if (entry.lines && Array.isArray(entry.lines)) {
                  entry.lines.forEach((line: any) => {
                    totalFromLedger += Number(line.credit || 0);
                  });
                  totalTransactions++;
                }
              });
              
              return {
                ...dist,
                totalFromLedger,
                totalTransactions,
              };
            } catch {
              return dist;
            }
          })
        );
        
        return enrichedDistributions;
      } catch (error) {
        return [];
      }
    },
    enabled: !!employeeId,
  });

  // Fetch activity reports created by employee
  const { data: reportsData } = useQuery({
    queryKey: ["reports-by-employee", employeeId],
    queryFn: async () => {
      try {
        // Note: Activity reports don't have createdBy filter yet
        // This will return all reports for now
        const response = await api.get(`/admin/activity-reports?limit=1000`);
        return response.data.data || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!employeeId,
  });

  // Activate user mutation
  const activateUserMutation = useMutation({
    mutationFn: (payload: { email: string; password: string; roleSlug: string }) =>
      api.post(`/admin/employees/${employeeId}/activate-user`, payload),
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Akun employee berhasil diaktifkan",
      });
      setShowActivateForm(false);
      setActivatePassword("");
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
      refetch();
    },
    onError: (err: any) =>
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err.response?.data?.message || "Gagal mengaktifkan akun",
      }),
  });

  const handleActivateUser = () => {
    if (!activatePassword || activatePassword.length < 8) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: "Password minimal 8 karakter",
      });
      return;
    }
    activateUserMutation.mutate({
      email: employeeData?.email || "",
      password: activatePassword,
      roleSlug: "employee",
    });
  };

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

  const getFullAddress = () => {
    if (!employeeData) return null;
    
    const parts = [];
    if (employeeData.detailAddress) parts.push(employeeData.detailAddress);
    if (employeeData.villageName) parts.push(`Desa/Kel. ${employeeData.villageName}`);
    if (employeeData.districtName) parts.push(`Kec. ${employeeData.districtName}`);
    if (employeeData.regencyName) parts.push(employeeData.regencyName);
    if (employeeData.provinceName) parts.push(employeeData.provinceName);
    if (employeeData.villagePostalCode) parts.push(employeeData.villagePostalCode);
    
    return parts.length > 0 ? parts.join(", ") : null;
  };

  // Calculate statistics
  const totalPrograms = programsData?.length || 0;
  const totalReports = reportsData?.length || 0;
  const totalDistributions = distributionsData?.length || 0;
  const totalDistributionAmount = distributionsData?.reduce(
    (sum: number, dist: any) => sum + Number(dist.amount || 0),
    0
  ) || 0;

  const gravatarUrl = employeeData?.email ? getGravatarUrl(employeeData.email) : null;

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

  if (!employeeData) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Karyawan tidak ditemukan</p>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={() => router.push("/dashboard/master/employees")}
          >
            Kembali ke Daftar Karyawan
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
            onClick={() => router.push("/dashboard/master/employees")}
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Kembali
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detail Karyawan</h1>
            <p className="text-sm text-gray-500 mt-1">ID: {employeeData.id}</p>
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
                    alt={employeeData.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center"><span class="text-3xl font-bold text-white">${employeeData.name.charAt(0).toUpperCase()}</span></div>`;
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {employeeData.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <h2 className="text-xl font-bold text-gray-900">{employeeData.name}</h2>
              
              <div className="mt-2 space-y-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {employeeData.position}
                </span>
                {employeeData.department && (
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {employeeData.department}
                    </span>
                  </div>
                )}
                <div>
                  {employeeData.isActive ? (
                    <span className="badge badge-success">Aktif</span>
                  ) : (
                    <span className="badge badge-secondary">Nonaktif</span>
                  )}
                </div>
              </div>
            </div>

            {/* Akun Login Indicator */}
            <div className="mb-4">
              {employeeData.userId ? (
                <div className="flex items-center gap-2 justify-center text-success-600 text-sm">
                  <UserIcon className="w-4 h-4" />
                  <span>Akun Employee Aktif</span>
                </div>
              ) : (
                <div className="text-center">
                  {showActivateForm ? (
                    <div className="space-y-2 text-left bg-gray-50 rounded-lg p-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Email</label>
                        <input
                          type="text"
                          value={employeeData.email || ""}
                          disabled
                          className="form-input bg-gray-100 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Password</label>
                        <input
                          type="text"
                          value={activatePassword}
                          onChange={(e) => setActivatePassword(e.target.value)}
                          className="form-input text-sm"
                          placeholder="Minimal 8 karakter"
                          minLength={8}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm flex-1"
                          onClick={handleActivateUser}
                          disabled={activateUserMutation.isPending}
                        >
                          {activateUserMutation.isPending ? "..." : "Aktifkan"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setShowActivateForm(false);
                            setActivatePassword("");
                          }}
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      onClick={() => setShowActivateForm(true)}
                    >
                      Aktifkan Akun Employee
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {employeeData.employeeId && (
                <div className="flex items-start gap-3">
                  <UserIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">ID Karyawan</p>
                    <p className="font-medium text-gray-900">{employeeData.employeeId}</p>
                  </div>
                </div>
              )}

              {employeeData.email && (
                <div className="flex items-start gap-3">
                  <EnvelopeIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900 break-words">{employeeData.email}</p>
                  </div>
                </div>
              )}

              {employeeData.phone && (
                <div className="flex items-start gap-3">
                  <PhoneIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Nomor HP</p>
                    <p className="font-medium text-gray-900">{employeeData.phone}</p>
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

              {employeeData.joinDate && (
                <div className="flex items-start gap-3">
                  <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Tanggal Bergabung</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(employeeData.joinDate)}
                    </p>
                  </div>
                </div>
              )}

              {(employeeData.bankName || employeeData.bankAccount) && (
                <div className="flex items-start gap-3">
                  <BuildingLibraryIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Rekening Bank</p>
                    <p className="font-medium text-gray-900">
                      {employeeData.bankName} - {employeeData.bankAccount}
                    </p>
                    {employeeData.bankAccountName && (
                      <p className="text-sm text-gray-600 mt-1">
                        a.n. {employeeData.bankAccountName}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {employeeData.notes && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Catatan</p>
                  <p className="text-sm text-gray-700 italic">{employeeData.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <BriefcaseIcon className="w-5 h-5" />
                <span className="text-sm opacity-90">Program Ditangani</span>
              </div>
              <p className="text-2xl font-bold">{totalPrograms}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <DocumentTextIcon className="w-5 h-5" />
                <span className="text-sm opacity-90">Laporan Dibuat</span>
              </div>
              <p className="text-2xl font-bold">{totalReports}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <BanknotesIcon className="w-5 h-5" />
                <span className="text-sm opacity-90">Distribusi Zakat</span>
              </div>
              <p className="text-2xl font-bold">{totalDistributions}x</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border-2 border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <BanknotesIcon className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600">Total Distribusi</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(totalDistributionAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Programs Section */}
          {totalPrograms > 0 && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Program yang Ditangani</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Daftar program/kampanye yang menjadi tanggung jawab
                </p>
              </div>

              <div className="p-6">
                {programsData && programsData.length > 0 ? (
                  <div className="space-y-4">
                    {programsData.map((program: any) => (
                      <div
                        key={program.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/campaigns/${program.id}`)}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1 hover:text-blue-600">
                              {program.title || program.name}
                            </h3>
                            {program.status && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                program.status === 'active' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {program.status}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Total Laporan</p>
                            <p className="text-lg font-bold text-blue-600">{program.totalReports}x</p>
                          </div>
                        </div>

                        {/* Financial Stats */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="bg-white rounded-md p-3">
                            <p className="text-xs text-gray-500 mb-1">Dana yang Disalurkan</p>
                            <p className="text-lg font-semibold text-blue-600">
                              {formatCurrency(program.totalReceived || 0)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {program.totalTransactions || 0} transaksi
                            </p>
                          </div>
                        </div>

                        {/* Action hint */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-blue-600 hover:text-blue-700">
                            Klik untuk lihat detail program →
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BriefcaseIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Belum menangani program</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Reports Section */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Laporan Kegiatan</h2>
              <p className="text-sm text-gray-500 mt-1">
                Riwayat laporan kegiatan yang telah dibuat
              </p>
            </div>

            <div className="p-6">
              {reportsData && reportsData.length > 0 ? (
                <div className="space-y-4">
                  {reportsData.map((report: any) => (
                    <div
                      key={report.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-green-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {report.title}
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Tanggal:</span>
                              <span className="ml-2 text-gray-900">
                                {formatDate(report.activityDate || report.createdAt)}
                              </span>
                            </div>
                            {report.campaignTitle && (
                              <div>
                                <span className="text-gray-500">Kampanye:</span>
                                <span className="ml-2 text-gray-900">
                                  {report.campaignTitle}
                                </span>
                              </div>
                            )}
                          </div>

                          {report.description && (
                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                              {report.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <DocumentTextIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Belum ada laporan kegiatan</p>
                </div>
              )}
            </div>
          </div>

          {/* Zakat Distributions Section */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Distribusi Zakat</h2>
              <p className="text-sm text-gray-500 mt-1">
                Riwayat distribusi zakat yang telah dilakukan
              </p>
            </div>

            <div className="p-6">
              {distributionsData && distributionsData.length > 0 ? (
                <div className="space-y-4">
                  {distributionsData.map((distribution: any) => (
                    <div
                      key={distribution.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/zakat/distributions/${distribution.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 hover:text-purple-600">
                              {distribution.zakatTypeName || "Zakat"}
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
                            <div>
                              <span className="text-gray-500">Penerima:</span>
                              <span className="ml-2 text-gray-900">
                                {distribution.recipientName || distribution.recipientCategory || '-'}
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
                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                              {distribution.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Financial Stats - sama seperti program card */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="bg-white rounded-md p-3">
                          <p className="text-xs text-gray-500 mb-1">Dana yang Disalurkan</p>
                          <p className="text-lg font-semibold text-purple-600">
                            {formatCurrency(distribution.totalFromLedger || Number(distribution.amount) || 0)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {distribution.totalTransactions || 0} transaksi
                          </p>
                        </div>
                      </div>

                      {/* Action hint */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-purple-600 hover:text-purple-700">
                          Klik untuk lihat detail distribusi →
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <BanknotesIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Belum ada distribusi zakat</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
