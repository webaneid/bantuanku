"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Users, TrendingUp, Printer, Eye, CheckCircle2, Clock, Scissors, MapPin, Weight, Camera, X, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import FeedbackDialog from "@/components/FeedbackDialog";
import MediaLibrary from "@/components/MediaLibrary";
import Pagination from "@/components/Pagination";
import { formatDateWIB, toWIBDateInput } from "@/lib/timezone";

const ITEMS_PER_PAGE = 10;

interface PeriodDetail {
  id: string;
  name: string;
  hijriYear: string;
  gregorianYear: number;
  startDate: string;
  endDate: string;
  executionDate: string;
  status: string;
  description?: string;
}

interface OrderDetail {
  order_id: string;
  order_number: string;
  animal_type: "goat" | "cow";
  package_name: string;
  package_type: "individual" | "shared";
  price: number;
  donor_name: string;
  donor_phone: string;
  on_behalf_of: string;
  quantity: number;
  payment_status: "pending" | "partial" | "paid";
  order_status: string;
  shared_group_id?: string | null;
  group_number?: number | null;
  group_max_slots?: number | null;
  created_at: string;
}

interface ExecutionRecord {
  id: string;
  executionNumber: string;
  sharedGroupId: string | null;
  transactionId: string | null;
  executionDate: string;
  location: string;
  butcherName: string | null;
  animalType: string;
  animalWeight: string | null;
  animalCondition: string | null;
  distributionMethod: string | null;
  distributionNotes: string | null;
  photos: string | null;
  videoUrl: string | null;
  recipientCount: number | null;
  recipientList: string | null;
  executedBy: string | null;
  createdAt: string;
  executorName: string | null;
}

interface SharedGroupInfo {
  groupId: string;
  groupNumber: number;
  maxSlots: number;
  slotsFilled: number;
  packageName: string;
  members: OrderDetail[];
}

interface Stats {
  totalOrders: number;
  totalGoats: number;
  totalCows: number;
  totalRevenue: number;
}

export default function PeriodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const periodId = params.id as string;
  const [activeTab, setActiveTab] = useState<"penerimaan" | "penyembelihan" | "penyaluran" | "laporan" | "kegiatan">("penerimaan");
  const queryClient = useQueryClient();
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [executionTarget, setExecutionTarget] = useState<{
    type: "individual" | "shared";
    transactionId?: string;
    sharedGroupId?: string;
    animalType: string;
    label: string;
  } | null>(null);
  const [viewExecution, setViewExecution] = useState<ExecutionRecord | null>(null);
  const [feedback, setFeedback] = useState<{ open: boolean; type: "success" | "error"; title: string; message?: string }>({
    open: false, type: "success", title: "",
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [mediaOpen, setMediaOpen] = useState(false);
  const [execForm, setExecForm] = useState({
    execution_date: "",
    location: "",
    animal_weight: "",
    animal_condition: "",
    distribution_method: "",
    distribution_notes: "",
    photos: [] as string[],
    video_url: "",
    recipient_count: "",
  });
  const [goatPage, setGoatPage] = useState(1);
  const [cowPage, setCowPage] = useState(1);
  const [disbursementPage, setDisbursementPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

  // Fetch period detail with orders
  const { data, isLoading } = useQuery({
    queryKey: ["qurban-period-detail", periodId],
    queryFn: async () => {
      const response = await api.get(`/admin/qurban/periods/${periodId}/detail`);
      return response.data;
    },
  });

  // Fetch disbursements for this period
  const { data: disbursementsData } = useQuery({
    queryKey: ["disbursements-period", periodId],
    queryFn: async () => {
      const response = await api.get("/admin/disbursements", {
        params: {
          reference_id: periodId,
          limit: 1000,
        },
      });
      return response.data;
    },
    enabled: !!periodId,
  });

  // Fetch activity reports for this period
  const { data: activityReportsData } = useQuery({
    queryKey: ["activity-reports-period", periodId],
    queryFn: async () => {
      const response = await api.get("/admin/activity-reports", {
        params: {
          reference_type: "qurban_period",
          reference_id: periodId,
        },
      });
      return response.data;
    },
    enabled: !!periodId,
  });

  // Fetch executions for this period
  const { data: executionsData } = useQuery({
    queryKey: ["qurban-executions", periodId],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/executions", {
        params: { period_id: periodId },
      });
      return response.data;
    },
    enabled: !!periodId,
  });

  // Create execution mutation
  const createExecutionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post("/admin/qurban/executions", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-executions", periodId] });
      setShowExecutionModal(false);
      setExecutionTarget(null);
      setExecForm({
        execution_date: "", location: "", animal_weight: "",
        animal_condition: "", distribution_method: "", distribution_notes: "",
        photos: [], video_url: "", recipient_count: "",
      });
      setFeedback({ open: true, type: "success", title: "Penyembelihan berhasil dicatat" });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || "Gagal mencatat penyembelihan";
      setFeedback({ open: true, type: "error", title: msg });
    },
  });

  // Delete execution mutation
  const deleteExecutionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/qurban/executions/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-executions", periodId] });
      setViewExecution(null);
      setFeedback({ open: true, type: "success", title: "Data penyembelihan berhasil dihapus" });
    },
    onError: () => {
      setFeedback({ open: true, type: "error", title: "Gagal menghapus data penyembelihan" });
    },
  });

  const period: PeriodDetail = data?.period;
  const orders: OrderDetail[] = data?.orders || [];
  const stats: Stats = data?.stats || {
    totalOrders: 0,
    totalGoats: 0,
    totalCows: 0,
    totalRevenue: 0,
  };

  // Calculate disbursement data
  const disbursements = disbursementsData?.data || [];
  const paidDisbursements = disbursements.filter((d: any) => d.status === "paid");
  const totalDisbursed = paidDisbursements.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
  const disbursementCount = paidDisbursements.length;

  // Activity reports data
  const activityReports = activityReportsData?.data || [];

  const formatCurrencyValue = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      partial: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      confirmed: "bg-purple-100 text-purple-800",
      executed: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Belum Bayar",
      partial: "Cicilan",
      paid: "Lunas",
      confirmed: "Dikonfirmasi",
      executed: "Selesai",
    };
    return labels[status] || status;
  };

  const handlePrint = () => {
    window.print();
  };

  // Group orders by animal type (must be before early returns to keep hooks stable)
  const goatOrders = orders.filter(o => o.animal_type === "goat");
  const cowOrders = orders.filter(o => o.animal_type === "cow");

  // Execution data maps
  const executions: ExecutionRecord[] = executionsData?.data || [];
  const executionByTxId = useMemo(() => {
    const map = new Map<string, ExecutionRecord>();
    executions.forEach((e) => { if (e.transactionId) map.set(e.transactionId, e); });
    return map;
  }, [executions]);
  const executionByGroupId = useMemo(() => {
    const map = new Map<string, ExecutionRecord>();
    executions.forEach((e) => { if (e.sharedGroupId) map.set(e.sharedGroupId, e); });
    return map;
  }, [executions]);

  // Paid goat orders for execution tracking
  const paidGoatOrders = goatOrders.filter((o) => o.payment_status === "paid");

  // Build shared group info from cow orders
  const sharedGroupsInfo = useMemo(() => {
    const groups = new Map<string, SharedGroupInfo>();
    cowOrders
      .filter((o) => o.package_type === "shared" && o.shared_group_id)
      .forEach((o) => {
        const gid = o.shared_group_id!;
        if (!groups.has(gid)) {
          groups.set(gid, {
            groupId: gid,
            groupNumber: o.group_number || 0,
            maxSlots: o.group_max_slots || 7,
            slotsFilled: 0,
            packageName: o.package_name,
            members: [],
          });
        }
        const g = groups.get(gid)!;
        g.members.push(o);
        g.slotsFilled = g.members.length;
      });
    return Array.from(groups.values()).sort((a, b) => a.groupNumber - b.groupNumber);
  }, [cowOrders]);

  // Individual cow orders (bought whole)
  const individualCowOrders = cowOrders.filter((o) => o.package_type === "individual" && o.payment_status === "paid");

  // Execution summary stats
  const totalAnimals = paidGoatOrders.length + sharedGroupsInfo.length + individualCowOrders.length;
  const executedCount = useMemo(() => {
    let count = 0;
    paidGoatOrders.forEach((o) => { if (executionByTxId.has(o.order_id)) count++; });
    sharedGroupsInfo.forEach((g) => { if (executionByGroupId.has(g.groupId)) count++; });
    individualCowOrders.forEach((o) => { if (executionByTxId.has(o.order_id)) count++; });
    return count;
  }, [paidGoatOrders, sharedGroupsInfo, individualCowOrders, executionByTxId, executionByGroupId]);
  const pendingCount = totalAnimals - executedCount;

  // Calculate total quantities for section headers
  const totalGoatQuantity = goatOrders.reduce((sum, o) => sum + Number(o.quantity), 0);

  // Paginated data
  const goatTotalPages = Math.ceil(goatOrders.length / ITEMS_PER_PAGE);
  const paginatedGoats = goatOrders.slice((goatPage - 1) * ITEMS_PER_PAGE, goatPage * ITEMS_PER_PAGE);
  const cowTotalPages = Math.ceil(cowOrders.length / ITEMS_PER_PAGE);
  const paginatedCows = cowOrders.slice((cowPage - 1) * ITEMS_PER_PAGE, cowPage * ITEMS_PER_PAGE);
  const disbursementTotalPages = Math.ceil(disbursements.length / ITEMS_PER_PAGE);
  const paginatedDisbursements = disbursements.slice((disbursementPage - 1) * ITEMS_PER_PAGE, disbursementPage * ITEMS_PER_PAGE);
  const activityTotalPages = Math.ceil(activityReports.length / ITEMS_PER_PAGE);
  const paginatedActivities = activityReports.slice((activityPage - 1) * ITEMS_PER_PAGE, activityPage * ITEMS_PER_PAGE);

  // --- Early returns (after all hooks) ---

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Periode tidak ditemukan</p>
          <button onClick={() => router.back()} className="btn-secondary mt-4">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const openExecutionForm = (target: typeof executionTarget) => {
    setExecutionTarget(target);
    setExecForm({
      execution_date: period?.executionDate ? toWIBDateInput(period.executionDate) : "",
      location: "", animal_weight: "", animal_condition: "",
      distribution_method: "", distribution_notes: "", photos: [], video_url: "", recipient_count: "",
    });
    setShowExecutionModal(true);
  };

  const handleSubmitExecution = () => {
    if (!executionTarget) return;
    createExecutionMutation.mutate({
      shared_group_id: executionTarget.sharedGroupId || null,
      transaction_id: executionTarget.transactionId || null,
      execution_date: execForm.execution_date,
      location: execForm.location,
      animal_type: executionTarget.animalType,
      animal_weight: execForm.animal_weight ? parseFloat(execForm.animal_weight) : null,
      animal_condition: execForm.animal_condition || null,
      distribution_method: execForm.distribution_method || null,
      distribution_notes: execForm.distribution_notes || null,
      photos: execForm.photos.length > 0 ? execForm.photos : null,
      video_url: execForm.video_url || null,
      recipient_count: execForm.recipient_count ? parseInt(execForm.recipient_count) : null,
    });
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // For cows: count individual cows + unique shared groups
  const totalCowQuantity = (() => {
    const individualCows = cowOrders
      .filter(o => o.package_type === "individual")
      .reduce((sum, o) => sum + Number(o.quantity), 0);

    const sharedGroups = new Set(
      cowOrders
        .filter(o => o.package_type === "shared" && o.group_number)
        .map(o => o.group_number)
    );

    return individualCows + sharedGroups.size;
  })();

  return (
    <div className="p-6">
      {/* Header - Hidden on Print */}
      <div className="mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="btn-secondary mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">{period.name}</h1>
            <div className="flex gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDateWIB(period.startDate, "dd MMM yyyy")} -
                {formatDateWIB(period.endDate, "dd MMM yyyy")}
              </span>
              <span>Tahun Hijriah: {period.hijriYear}</span>
            </div>
            {period.description && (
              <p className="text-sm text-gray-600 mt-2">{period.description}</p>
            )}
          </div>

          <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* Print Header - Visible only on Print */}
      <div className="hidden print:block mb-6">
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold mb-2">LAPORAN QURBAN</h1>
          <h2 className="text-xl font-semibold">{period.name}</h2>
          <p className="text-sm mt-2">
            Periode: {formatDateWIB(period.startDate, "dd MMM yyyy")} - {formatDateWIB(period.endDate, "dd MMM yyyy")}
          </p>
          <p className="text-sm">Tahun Hijriah: {period.hijriYear}</p>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Kambing</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalGoats}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
              🐐
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Sapi</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalCows}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-3xl">
              🐄
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Pesanan Lunas</p>
              <p className="text-3xl font-bold text-purple-600">{stats.totalOrders}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex min-w-max">
            <button
              onClick={() => setActiveTab("penerimaan")}
              className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "penerimaan"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Penerimaan ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab("penyaluran")}
              className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "penyaluran"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Penyaluran ({disbursements.length})
            </button>
            <button
              onClick={() => setActiveTab("penyembelihan")}
              className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "penyembelihan"
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Penyembelihan ({executedCount}/{totalAnimals})
            </button>
            <button
              onClick={() => setActiveTab("kegiatan")}
              className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "kegiatan"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Laporan Kegiatan ({activityReports.length})
            </button>
            <button
              onClick={() => setActiveTab("laporan")}
              className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "laporan"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Laporan Umum
            </button>
          </div>
        </div>

        {/* Penerimaan Uang Tab */}
        {activeTab === "penerimaan" && (
          <>
            {/* Kambing Section */}
            {goatOrders.length > 0 && (
              <div className="mb-6">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-bold">Kambing ({totalGoatQuantity} ekor)</h2>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Paket</th>
                        <th>Jumlah</th>
                        <th>Harga</th>
                        <th>Pemesan</th>
                        <th>Telepon</th>
                        <th>Atas Nama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedGoats.map((order, index) => (
                        <tr key={order.order_id}>
                          <td>{(goatPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                          <td>{order.package_name}</td>
                          <td className="font-semibold">{order.quantity} ekor</td>
                          <td className="mono">{formatCurrencyValue(order.price)}</td>
                          <td className="font-medium">{order.donor_name}</td>
                          <td className="text-gray-600">{order.donor_phone}</td>
                          <td>{order.on_behalf_of || order.donor_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-mobile-cards">
                  {paginatedGoats.map((order, index) => (
                    <div key={order.order_id} className="table-card">
                      <div className="table-card-header">
                        <div className="table-card-header-left">
                          <div className="table-card-header-title">{order.package_name}</div>
                          <div className="table-card-header-subtitle">{order.donor_name}</div>
                        </div>
                        <span className="table-card-header-badge bg-success-50 text-success-700">
                          {order.quantity} ekor
                        </span>
                      </div>
                      <div className="table-card-row">
                        <span className="table-card-row-label">Harga</span>
                        <span className="table-card-row-value mono">{formatCurrencyValue(order.price)}</span>
                      </div>
                      <div className="table-card-row">
                        <span className="table-card-row-label">Telepon</span>
                        <span className="table-card-row-value">{order.donor_phone}</span>
                      </div>
                      <div className="table-card-row">
                        <span className="table-card-row-label">Atas Nama</span>
                        <span className="table-card-row-value">{order.on_behalf_of || order.donor_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination currentPage={goatPage} totalPages={goatTotalPages} totalItems={goatOrders.length} onPageChange={setGoatPage} />
              </div>
            )}

            {/* Sapi Section */}
            {cowOrders.length > 0 && (
              <div className="mb-6">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-bold">Sapi ({totalCowQuantity} ekor)</h2>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Paket</th>
                        <th>Group</th>
                        <th>Jumlah</th>
                        <th>Harga</th>
                        <th>Pemesan</th>
                        <th>Telepon</th>
                        <th>Atas Nama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCows.map((order, index) => (
                        <tr key={order.order_id}>
                          <td>{(cowPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                          <td>{order.package_name}</td>
                          <td>
                            {order.package_type === "shared" && order.group_number ? (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-50 text-primary-700">
                                Group #{order.group_number}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="font-semibold">
                            {order.package_type === "shared" && order.group_max_slots ? (
                              `1/${order.group_max_slots} ekor`
                            ) : (
                              `${order.quantity} ekor`
                            )}
                          </td>
                          <td className="mono">{formatCurrencyValue(order.price)}</td>
                          <td className="font-medium">{order.donor_name}</td>
                          <td className="text-gray-600">{order.donor_phone}</td>
                          <td>{order.on_behalf_of || order.donor_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-mobile-cards">
                  {paginatedCows.map((order) => (
                    <div key={order.order_id} className="table-card">
                      <div className="table-card-header">
                        <div className="table-card-header-left">
                          <div className="table-card-header-title">{order.package_name}</div>
                          <div className="table-card-header-subtitle">{order.donor_name}</div>
                        </div>
                        {order.package_type === "shared" && order.group_number ? (
                          <span className="table-card-header-badge bg-primary-50 text-primary-700">
                            Group #{order.group_number}
                          </span>
                        ) : null}
                      </div>
                      <div className="table-card-row">
                        <span className="table-card-row-label">Jumlah</span>
                        <span className="table-card-row-value">
                          {order.package_type === "shared" && order.group_max_slots
                            ? `1/${order.group_max_slots} ekor`
                            : `${order.quantity} ekor`}
                        </span>
                      </div>
                      <div className="table-card-row">
                        <span className="table-card-row-label">Harga</span>
                        <span className="table-card-row-value mono">{formatCurrencyValue(order.price)}</span>
                      </div>
                      <div className="table-card-row">
                        <span className="table-card-row-label">Telepon</span>
                        <span className="table-card-row-value">{order.donor_phone}</span>
                      </div>
                      <div className="table-card-row">
                        <span className="table-card-row-label">Atas Nama</span>
                        <span className="table-card-row-value">{order.on_behalf_of || order.donor_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination currentPage={cowPage} totalPages={cowTotalPages} totalItems={cowOrders.length} onPageChange={setCowPage} />
              </div>
            )}

            {orders.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-gray-500">Belum ada pesanan lunas untuk periode ini</p>
              </div>
            )}
          </>
        )}

        {/* Penyembelihan Tab */}
        {activeTab === "penyembelihan" && (
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center">
                    <Scissors className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-700">Total Hewan</p>
                    <p className="text-2xl font-bold text-amber-900">{totalAnimals}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Sudah Disembelih</p>
                    <p className="text-2xl font-bold text-green-900">{executedCount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-200 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-700" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-700">Belum Disembelih</p>
                    <p className="text-2xl font-bold text-orange-900">{pendingCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {totalAnimals > 0 && (
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress Penyembelihan</span>
                  <span className="text-sm font-bold text-amber-700">
                    {totalAnimals > 0 ? Math.round((executedCount / totalAnimals) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${totalAnimals > 0 ? (executedCount / totalAnimals) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Kambing Section */}
            {paidGoatOrders.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🐐</span> Kambing ({paidGoatOrders.length} ekor)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paidGoatOrders.map((order) => {
                    const exec = executionByTxId.get(order.order_id);
                    const isExecuted = !!exec;
                    return (
                      <div
                        key={order.order_id}
                        className={`rounded-xl border-2 p-4 transition-all ${
                          isExecuted
                            ? "border-green-200 bg-green-50/50"
                            : "border-orange-200 bg-white hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{order.package_name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">a.n. {order.on_behalf_of || order.donor_name}</p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              isExecuted
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {isExecuted ? (
                              <><CheckCircle2 className="h-3.5 w-3.5" /> Sudah</>
                            ) : (
                              <><Clock className="h-3.5 w-3.5" /> Belum</>
                            )}
                          </span>
                        </div>
                        {isExecuted && exec && (
                          <div className="text-xs text-gray-600 space-y-1 mb-3 bg-green-50 rounded-lg p-2.5">
                            <p className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              {formatDateWIB(exec.executionDate, "dd MMM yyyy")}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" />
                              {exec.location}
                            </p>
                            {exec.animalWeight && (
                              <p className="flex items-center gap-1.5">
                                <Weight className="h-3 w-3" />
                                {exec.animalWeight} kg
                              </p>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (isExecuted && exec) {
                              setViewExecution(exec);
                            } else {
                              openExecutionForm({
                                type: "individual",
                                transactionId: order.order_id,
                                animalType: "goat",
                                label: `${order.package_name} - ${order.on_behalf_of || order.donor_name}`,
                              });
                            }
                          }}
                          className={`w-full text-center text-sm font-medium py-2 rounded-lg transition-colors ${
                            isExecuted
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-amber-500 text-white hover:bg-amber-600"
                          }`}
                        >
                          {isExecuted ? "Lihat Detail" : "Catat Penyembelihan"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sapi Shared Groups Section */}
            {sharedGroupsInfo.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🐄</span> Sapi Patungan ({sharedGroupsInfo.length} ekor)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sharedGroupsInfo.map((group) => {
                    const exec = executionByGroupId.get(group.groupId);
                    const isExecuted = !!exec;
                    const isExpanded = expandedGroups.has(group.groupId);
                    return (
                      <div
                        key={group.groupId}
                        className={`rounded-xl border-2 p-4 transition-all ${
                          isExecuted
                            ? "border-green-200 bg-green-50/50"
                            : "border-orange-200 bg-white hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {group.packageName}
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                Grup #{group.groupNumber}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {group.slotsFilled}/{group.maxSlots} anggota terpenuhi
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              isExecuted
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {isExecuted ? (
                              <><CheckCircle2 className="h-3.5 w-3.5" /> Sudah</>
                            ) : (
                              <><Clock className="h-3.5 w-3.5" /> Belum</>
                            )}
                          </span>
                        </div>

                        {/* Slot progress mini bar */}
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${(group.slotsFilled / group.maxSlots) * 100}%` }}
                          />
                        </div>

                        {/* Expandable members list */}
                        <button
                          type="button"
                          onClick={() => toggleGroupExpand(group.groupId)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {isExpanded ? "Sembunyikan" : "Lihat"} anggota
                        </button>
                        {isExpanded && (
                          <div className="mb-3 space-y-1.5">
                            {group.members.map((m, i) => (
                              <div key={m.order_id} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                                <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-[10px]">
                                  {i + 1}
                                </span>
                                <span className="text-gray-700">{m.on_behalf_of || m.donor_name}</span>
                                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(m.payment_status)}`}>
                                  {getStatusLabel(m.payment_status)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {isExecuted && exec && (
                          <div className="text-xs text-gray-600 space-y-1 mb-3 bg-green-50 rounded-lg p-2.5">
                            <p className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              {formatDateWIB(exec.executionDate, "dd MMM yyyy")}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" />
                              {exec.location}
                            </p>
                            {exec.animalWeight && (
                              <p className="flex items-center gap-1.5">
                                <Weight className="h-3 w-3" />
                                {exec.animalWeight} kg
                              </p>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (isExecuted && exec) {
                              setViewExecution(exec);
                            } else {
                              openExecutionForm({
                                type: "shared",
                                sharedGroupId: group.groupId,
                                animalType: "cow",
                                label: `${group.packageName} - Grup #${group.groupNumber}`,
                              });
                            }
                          }}
                          className={`w-full text-center text-sm font-medium py-2 rounded-lg transition-colors ${
                            isExecuted
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-amber-500 text-white hover:bg-amber-600"
                          }`}
                        >
                          {isExecuted ? "Lihat Detail" : "Catat Penyembelihan"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual Cow Section */}
            {individualCowOrders.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🐄</span> Sapi Individual ({individualCowOrders.length} ekor)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {individualCowOrders.map((order) => {
                    const exec = executionByTxId.get(order.order_id);
                    const isExecuted = !!exec;
                    return (
                      <div
                        key={order.order_id}
                        className={`rounded-xl border-2 p-4 transition-all ${
                          isExecuted
                            ? "border-green-200 bg-green-50/50"
                            : "border-orange-200 bg-white hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{order.package_name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">a.n. {order.on_behalf_of || order.donor_name}</p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              isExecuted
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {isExecuted ? (
                              <><CheckCircle2 className="h-3.5 w-3.5" /> Sudah</>
                            ) : (
                              <><Clock className="h-3.5 w-3.5" /> Belum</>
                            )}
                          </span>
                        </div>
                        {isExecuted && exec && (
                          <div className="text-xs text-gray-600 space-y-1 mb-3 bg-green-50 rounded-lg p-2.5">
                            <p className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              {formatDateWIB(exec.executionDate, "dd MMM yyyy")}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" />
                              {exec.location}
                            </p>
                            {exec.animalWeight && (
                              <p className="flex items-center gap-1.5">
                                <Weight className="h-3 w-3" />
                                {exec.animalWeight} kg
                              </p>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (isExecuted && exec) {
                              setViewExecution(exec);
                            } else {
                              openExecutionForm({
                                type: "individual",
                                transactionId: order.order_id,
                                animalType: "cow",
                                label: `${order.package_name} - ${order.on_behalf_of || order.donor_name}`,
                              });
                            }
                          }}
                          className={`w-full text-center text-sm font-medium py-2 rounded-lg transition-colors ${
                            isExecuted
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-amber-500 text-white hover:bg-amber-600"
                          }`}
                        >
                          {isExecuted ? "Lihat Detail" : "Catat Penyembelihan"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {totalAnimals === 0 && (
              <div className="p-12 text-center">
                <p className="text-gray-500">Belum ada pesanan lunas untuk dicatat penyembelihannya</p>
              </div>
            )}
          </div>
        )}

        {/* Penyaluran Tab */}
        {activeTab === "penyaluran" && disbursements.length > 0 && (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>No. Penyaluran</th>
                    <th>Penerima</th>
                    <th>Kategori</th>
                    <th>Jumlah</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                    <th className="print:hidden">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDisbursements.map((d: any, index: number) => (
                    <tr key={d.id}>
                      <td>{(disbursementPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                      <td>
                        <div className="font-medium text-gray-900">{d.disbursementNumber}</div>
                      </td>
                      <td>
                        <div className="font-medium text-gray-900">{d.recipientName}</div>
                        {d.recipientContact && (
                          <div className="text-xs text-gray-500">{d.recipientContact}</div>
                        )}
                      </td>
                      <td className="text-gray-600">{d.category || "-"}</td>
                      <td className="mono font-semibold">
                        {formatCurrencyValue(d.amount)}
                      </td>
                      <td>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            d.status === "paid"
                              ? "bg-success-50 text-success-700"
                              : d.status === "pending"
                              ? "bg-warning-50 text-warning-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {d.status === "paid" ? "Lunas" : d.status === "pending" ? "Pending" : d.status}
                        </span>
                      </td>
                      <td className="text-gray-600">
                        {d.paidAt
                          ? formatDateWIB(d.paidAt, "dd MMM yyyy")
                          : d.createdAt
                          ? formatDateWIB(d.createdAt, "dd MMM yyyy")
                          : "-"}
                      </td>
                      <td className="print:hidden">
                        <div className="table-actions">
                          <button
                            type="button"
                            className="action-btn action-view"
                            onClick={() => router.push(`/dashboard/disbursements/${d.id}`)}
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={4} className="text-right">Total:</td>
                    <td className="mono">{formatCurrencyValue(totalDisbursed)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="table-mobile-cards">
              {paginatedDisbursements.map((d: any, index: number) => (
                <div key={d.id} className="table-card">
                  <div className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title">{d.recipientName}</div>
                      <div className="table-card-header-subtitle">{d.disbursementNumber}</div>
                    </div>
                    <span className={`table-card-header-badge ${
                      d.status === "paid" ? "bg-success-50 text-success-700"
                        : d.status === "pending" ? "bg-warning-50 text-warning-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {d.status === "paid" ? "Lunas" : d.status === "pending" ? "Pending" : d.status}
                    </span>
                  </div>
                  <div className="table-card-row">
                    <span className="table-card-row-label">Kategori</span>
                    <span className="table-card-row-value">{d.category || "-"}</span>
                  </div>
                  <div className="table-card-row">
                    <span className="table-card-row-label">Jumlah</span>
                    <span className="table-card-row-value mono">{formatCurrencyValue(d.amount)}</span>
                  </div>
                  <div className="table-card-row">
                    <span className="table-card-row-label">Tanggal</span>
                    <span className="table-card-row-value">
                      {d.paidAt
                        ? formatDateWIB(d.paidAt, "dd MMM yyyy")
                        : d.createdAt
                        ? formatDateWIB(d.createdAt, "dd MMM yyyy")
                        : "-"}
                    </span>
                  </div>
                  <div className="table-card-footer">
                    <button
                      type="button"
                      className="action-btn action-view"
                      onClick={() => router.push(`/dashboard/disbursements/${d.id}`)}
                      title="Lihat Detail"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination currentPage={disbursementPage} totalPages={disbursementTotalPages} totalItems={disbursements.length} onPageChange={setDisbursementPage} />
          </>
        )}

        {activeTab === "penyaluran" && disbursements.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">Belum ada penyaluran untuk periode ini</p>
          </div>
        )}

        {/* Laporan Tab */}
        {activeTab === "laporan" && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Laporan Keuangan Periode</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
                <p className="text-sm text-green-700 mb-1">Total Penerimaan</p>
                <p className="text-2xl font-bold text-green-800">
                  {formatCurrencyValue(stats.totalRevenue)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.totalOrders} pesanan
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
                <p className="text-sm text-blue-700 mb-1">Total Penyaluran</p>
                <p className="text-2xl font-bold text-blue-800">
                  {formatCurrencyValue(totalDisbursed)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {disbursementCount} penyaluran
                </p>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
                <p className="text-sm text-purple-700 mb-1">Saldo</p>
                <p className="text-2xl font-bold text-purple-800">
                  {formatCurrencyValue(stats.totalRevenue - totalDisbursed)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {((1 - (totalDisbursed / stats.totalRevenue)) * 100 || 0).toFixed(1)}% dari total
                </p>
              </div>
            </div>

            {/* Detail Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Penerimaan Detail */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4 text-gray-800">Rincian Penerimaan</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-sm text-gray-600">Kambing ({stats.totalGoats} ekor)</span>
                    <span className="text-sm font-medium">
                      {formatCurrencyValue(
                        goatOrders.reduce((sum, o) => sum + Number(o.price), 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-sm text-gray-600">Sapi ({stats.totalCows} ekor)</span>
                    <span className="text-sm font-medium">
                      {formatCurrencyValue(
                        cowOrders.reduce((sum, o) => sum + Number(o.price), 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="font-bold text-green-600">
                      {formatCurrencyValue(stats.totalRevenue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Penyembelihan */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4 text-gray-800">Status Penyembelihan</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      <span className="text-sm text-gray-600">Sudah Disembelih</span>
                    </div>
                    <span className="text-sm font-medium">{executedCount} ekor</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                      <span className="text-sm text-gray-600">Belum Disembelih</span>
                    </div>
                    <span className="text-sm font-medium">{pendingCount} ekor</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold text-gray-800">Total Hewan</span>
                    <span className="font-bold text-purple-600">
                      {totalAnimals}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Laporan Kegiatan Tab */}
        {activeTab === "kegiatan" && activityReports.length > 0 && (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Judul</th>
                    <th>Tanggal Kegiatan</th>
                    <th>Status</th>
                    <th>Dibuat Oleh</th>
                    <th className="print:hidden">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedActivities.map((report: any, index: number) => (
                    <tr key={report.id}>
                      <td>{(activityPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                      <td>
                        <div className="font-medium text-gray-900">{report.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-2">{report.description}</div>
                      </td>
                      <td className="text-gray-600">
                        {report.activityDate
                          ? formatDateWIB(report.activityDate, "dd MMM yyyy")
                          : "-"}
                      </td>
                      <td>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            report.status === "published"
                              ? "bg-success-50 text-success-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {report.status === "published" ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="text-gray-600">
                        {report.creator?.name || "-"}
                      </td>
                      <td className="print:hidden">
                        <div className="table-actions">
                          <button
                            type="button"
                            className="action-btn action-view"
                            onClick={() => router.push(`/dashboard/activity-reports/${report.id}`)}
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-mobile-cards">
              {paginatedActivities.map((report: any) => (
                <div key={report.id} className="table-card">
                  <div className="table-card-header">
                    <div className="table-card-header-left">
                      <div className="table-card-header-title">{report.title}</div>
                      <div className="table-card-header-subtitle">
                        {report.activityDate
                          ? formatDateWIB(report.activityDate, "dd MMM yyyy")
                          : "-"}
                      </div>
                    </div>
                    <span className={`table-card-header-badge ${
                      report.status === "published"
                        ? "bg-success-50 text-success-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {report.status === "published" ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="table-card-row">
                    <span className="table-card-row-label">Dibuat Oleh</span>
                    <span className="table-card-row-value">{report.creator?.name || "-"}</span>
                  </div>
                  <div className="table-card-footer">
                    <button
                      type="button"
                      className="action-btn action-view"
                      onClick={() => router.push(`/dashboard/activity-reports/${report.id}`)}
                      title="Lihat Detail"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination currentPage={activityPage} totalPages={activityTotalPages} totalItems={activityReports.length} onPageChange={setActivityPage} />
          </>
        )}

        {activeTab === "kegiatan" && activityReports.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">Belum ada laporan kegiatan untuk periode ini</p>
          </div>
        )}
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-12 pt-6 border-t-2 border-gray-800">
        <div className="flex justify-between text-sm">
          <div>
            <p>Dicetak pada: {formatDateWIB(new Date(), "dd MMMM yyyy HH:mm")}</p>
          </div>
          <div className="text-right">
            <p className="mb-12">Panitia Qurban</p>
            <p>_____________________</p>
            <p className="mt-1">Tanda Tangan & Nama</p>
          </div>
        </div>
      </div>

      {/* ===== Execution Form Modal ===== */}
      {showExecutionModal && executionTarget && (
        <div className="fixed inset-0 z-[1100] bg-black/50 flex items-center justify-center px-4" onClick={() => setShowExecutionModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Catat Penyembelihan</h2>
                <p className="text-sm text-gray-500 mt-0.5">{executionTarget.label}</p>
              </div>
              <button type="button" onClick={() => setShowExecutionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Penyembelihan *</label>
                  <input
                    type="date"
                    value={execForm.execution_date}
                    onChange={(e) => setExecForm({ ...execForm, execution_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Penyembelihan *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Lapangan Masjid Al-Ikhlas"
                    value={execForm.location}
                    onChange={(e) => setExecForm({ ...execForm, location: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Berat Hewan (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Contoh: 45.5"
                    value={execForm.animal_weight}
                    onChange={(e) => setExecForm({ ...execForm, animal_weight: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kondisi Hewan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Sehat, gemuk, tidak cacat"
                    value={execForm.animal_condition}
                    onChange={(e) => setExecForm({ ...execForm, animal_condition: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metode Distribusi</label>
                  <select
                    value={execForm.distribution_method}
                    onChange={(e) => setExecForm({ ...execForm, distribution_method: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">-- Pilih --</option>
                    <option value="direct_pickup">Ambil Langsung</option>
                    <option value="distribution">Distribusi</option>
                    <option value="donation">Donasi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Penerima</label>
                  <input
                    type="number"
                    placeholder="Contoh: 50"
                    value={execForm.recipient_count}
                    onChange={(e) => setExecForm({ ...execForm, recipient_count: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Distribusi</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan terkait distribusi daging..."
                  value={execForm.distribution_notes}
                  onChange={(e) => setExecForm({ ...execForm, distribution_notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Photos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto Dokumentasi</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {execForm.photos.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border">
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setExecForm({ ...execForm, photos: execForm.photos.filter((_, idx) => idx !== i) })}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMediaOpen(true)}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-amber-400 hover:text-amber-500 transition-colors"
                  >
                    <Camera className="h-5 w-5" />
                    <span className="text-[10px] mt-1">Tambah</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={execForm.video_url}
                  onChange={(e) => setExecForm({ ...execForm, video_url: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowExecutionModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitExecution}
                disabled={!execForm.execution_date || !execForm.location || createExecutionMutation.isPending}
                className="px-6 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createExecutionMutation.isPending ? "Menyimpan..." : "Simpan Penyembelihan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== View Execution Detail Modal ===== */}
      {viewExecution && (
        <div className="fixed inset-0 z-[1100] bg-black/50 flex items-center justify-center px-4" onClick={() => setViewExecution(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Detail Penyembelihan</h2>
                <p className="text-xs text-gray-500 mt-0.5">{viewExecution.executionNumber}</p>
              </div>
              <button type="button" onClick={() => setViewExecution(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Tanggal</span>
                  <p className="text-gray-900 mt-1 font-medium">
                    {formatDateWIB(viewExecution.executionDate, "dd MMMM yyyy")}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Lokasi</span>
                  <p className="text-gray-900 mt-1">{viewExecution.location}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50 rounded-xl p-4">
                <div>
                  <span className="text-xs text-gray-500">Jenis Hewan</span>
                  <p className="font-semibold text-gray-900 text-sm">{viewExecution.animalType === "cow" ? "Sapi" : "Kambing"}</p>
                </div>
                {viewExecution.animalWeight && (
                  <div>
                    <span className="text-xs text-gray-500">Berat</span>
                    <p className="font-semibold text-gray-900 text-sm">{viewExecution.animalWeight} kg</p>
                  </div>
                )}
                {viewExecution.animalCondition && (
                  <div>
                    <span className="text-xs text-gray-500">Kondisi</span>
                    <p className="font-semibold text-gray-900 text-sm">{viewExecution.animalCondition}</p>
                  </div>
                )}
                {viewExecution.distributionMethod && (
                  <div>
                    <span className="text-xs text-gray-500">Distribusi</span>
                    <p className="font-semibold text-gray-900 text-sm">
                      {viewExecution.distributionMethod === "direct_pickup" ? "Ambil Langsung"
                        : viewExecution.distributionMethod === "distribution" ? "Distribusi"
                        : viewExecution.distributionMethod === "donation" ? "Donasi"
                        : viewExecution.distributionMethod}
                    </p>
                  </div>
                )}
                {viewExecution.recipientCount && (
                  <div>
                    <span className="text-xs text-gray-500">Jumlah Penerima</span>
                    <p className="font-semibold text-gray-900 text-sm">{viewExecution.recipientCount}</p>
                  </div>
                )}
              </div>

              {viewExecution.distributionNotes && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Catatan Distribusi</span>
                  <p className="text-gray-700 mt-1 text-sm">{viewExecution.distributionNotes}</p>
                </div>
              )}

              {/* Photos Gallery */}
              {viewExecution.photos && (() => {
                try {
                  const photos = JSON.parse(viewExecution.photos);
                  if (Array.isArray(photos) && photos.length > 0) {
                    return (
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">Foto Dokumentasi</span>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {photos.map((url: string, i: number) => (
                            <div key={i} className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                } catch { return null; }
              })()}

              {viewExecution.videoUrl && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Video</span>
                  <a href={viewExecution.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block mt-1">
                    {viewExecution.videoUrl}
                  </a>
                </div>
              )}

              {viewExecution.executorName && (
                <div className="border-t pt-4 text-sm text-gray-500">
                  Dicatat oleh: {viewExecution.executorName}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Yakin ingin menghapus data penyembelihan ini?")) {
                    deleteExecutionMutation.mutate(viewExecution.id);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={() => setViewExecution(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Library */}
      <MediaLibrary
        isOpen={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={(url) => {
          setExecForm((prev) => ({ ...prev, photos: [...prev.photos, url] }));
          setMediaOpen(false);
        }}
        accept="image/*"
        category="activity"
      />

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback({ ...feedback, open: false })}
      />
    </div>
  );
}
