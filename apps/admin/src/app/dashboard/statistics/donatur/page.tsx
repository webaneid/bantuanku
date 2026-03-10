"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Users,
  UserCheck,
  UserX,
  Megaphone,
  Download,
} from "lucide-react";
import api from "@/lib/api";

const PIE_COLORS = ["#035a52", "#d2aa55", "#296585", "#e74c3c", "#8b5cf6", "#f59e0b"];

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-sm">
      <p className="font-medium" style={{ color: payload[0]?.payload?.fill }}>
        {payload[0]?.name}: {payload[0]?.value?.toLocaleString("id-ID")}
      </p>
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-sm">
      <p className="font-medium text-gray-900">{label}</p>
      <p className="text-primary-600">{payload[0]?.value?.toLocaleString("id-ID")} donatur</p>
    </div>
  );
}

export default function StatistikDonaturPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["statistics-donatur"],
    queryFn: async () => {
      const response = await api.get("/admin/statistics/donatur");
      return response.data?.data;
    },
  });

  const summary = stats?.summary;
  const jobStats = stats?.jobStats || [];
  const incomeStats = stats?.incomeStats || [];
  const provinceStats = stats?.provinceStats || [];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await api.get(`/admin/statistics/donatur/export?${params.toString()}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const filename = startDate && endDate
        ? `donatur-${startDate}-to-${endDate}.csv`
        : `donatur-all-${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Pie data: Donatur aktif vs tidak aktif
  const donaturPieData = summary
    ? [
        { name: "Aktif", value: summary.donaturActive, fill: "#035a52" },
        { name: "Tidak Aktif", value: summary.donaturInactive, fill: "#d2aa55" },
      ].filter((d) => d.value > 0)
    : [];

  // Pie data: Influencer aktif vs tidak aktif
  const influencerPieData = summary
    ? [
        { name: "Aktif", value: summary.influencerActive, fill: "#035a52" },
        { name: "Tidak Aktif", value: summary.influencerInactive, fill: "#e74c3c" },
      ].filter((d) => d.value > 0)
    : [];

  // Pie data: Donatur saja vs donatur + influencer
  const donaturInfluencerPieData = summary
    ? [
        { name: "Donatur Saja", value: summary.totalDonatur - summary.donaturAsInfluencer, fill: "#296585" },
        { name: "Donatur + Influencer", value: summary.donaturAsInfluencer, fill: "#035a52" },
      ].filter((d) => d.value > 0)
    : [];

  // Bar data: Job stats
  const jobBarData = jobStats.slice(0, 15).map((j: any) => ({
    name: j.jobTitleName,
    value: j.count,
  }));

  // Bar data: Income stats
  const incomeBarData = incomeStats.map((i: any) => ({
    name: i.label,
    value: i.count,
  }));

  // Bar data: Province stats
  const provinceBarData = provinceStats.slice(0, 20).map((p: any) => ({
    name: p.name,
    value: p.count,
  }));

  const kpiCards = summary
    ? [
        { label: "Total Donatur", value: summary.totalDonatur, icon: Users, modifier: "primary" },
        { label: "Donatur Aktif", value: summary.donaturActive, icon: UserCheck, modifier: "success" },
        { label: "Donatur Tidak Aktif", value: summary.donaturInactive, icon: UserX, modifier: "danger" },
        { label: "Donatur Influencer", value: summary.donaturAsInfluencer, icon: Megaphone, modifier: "accent" },
        { label: "Total Influencer", value: summary.totalInfluencer, icon: Megaphone, modifier: "info" },
        { label: "Influencer Aktif", value: summary.influencerActive, icon: UserCheck, modifier: "success" },
        { label: "Influencer Tidak Aktif", value: summary.influencerInactive, icon: UserX, modifier: "danger" },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Statistik Donatur</h1>
        </div>
        <div className="dashboard-kpi-grid">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="dashboard-skeleton__kpi" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Statistik Donatur</h1>
        <p className="text-gray-600 mt-1">Rangkuman statistik donatur dan influencer</p>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-kpi-grid mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`kpi-card kpi-card--${card.modifier}`}>
              <div className="kpi-card__header">
                <div className="kpi-card__icon">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="kpi-card__label">{card.label}</p>
              <p className="kpi-card__value">{card.value.toLocaleString("id-ID")}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1: Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Donatur Aktif vs Tidak Aktif */}
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <h3 className="dashboard-section__title">Donatur Aktif vs Tidak Aktif</h3>
          </div>
          <div className="dashboard-section__body">
            {donaturPieData.length === 0 ? (
              <div className="dashboard-chart__empty" style={{ height: 200 }}>
                <p className="text-sm">Belum ada data</p>
              </div>
            ) : (
              <>
                <div style={{ position: "relative", width: "100%", height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donaturPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                        {donaturPieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center-label">
                    <p className="donut-center-label__value">{summary?.totalDonatur?.toLocaleString("id-ID")}</p>
                    <p className="donut-center-label__label">Total</p>
                  </div>
                </div>
                <div className="donut-legend">
                  {donaturPieData.map((d) => {
                    const pct = summary?.totalDonatur ? ((d.value / summary.totalDonatur) * 100).toFixed(1) : "0";
                    return (
                      <div key={d.name} className="donut-legend__item">
                        <div className="donut-legend__indicator">
                          <span className="donut-legend__dot" style={{ backgroundColor: d.fill }} />
                          <span className="donut-legend__name">{d.name} ({pct}%)</span>
                        </div>
                        <span className="donut-legend__value">{d.value.toLocaleString("id-ID")}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Influencer Aktif vs Tidak Aktif */}
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <h3 className="dashboard-section__title">Influencer Aktif vs Tidak Aktif</h3>
          </div>
          <div className="dashboard-section__body">
            {influencerPieData.length === 0 ? (
              <div className="dashboard-chart__empty" style={{ height: 200 }}>
                <p className="text-sm">Belum ada data</p>
              </div>
            ) : (
              <>
                <div style={{ position: "relative", width: "100%", height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={influencerPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                        {influencerPieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center-label">
                    <p className="donut-center-label__value">{summary?.totalInfluencer?.toLocaleString("id-ID")}</p>
                    <p className="donut-center-label__label">Total</p>
                  </div>
                </div>
                <div className="donut-legend">
                  {influencerPieData.map((d) => {
                    const pct = summary?.totalInfluencer ? ((d.value / summary.totalInfluencer) * 100).toFixed(1) : "0";
                    return (
                      <div key={d.name} className="donut-legend__item">
                        <div className="donut-legend__indicator">
                          <span className="donut-legend__dot" style={{ backgroundColor: d.fill }} />
                          <span className="donut-legend__name">{d.name} ({pct}%)</span>
                        </div>
                        <span className="donut-legend__value">{d.value.toLocaleString("id-ID")}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Donatur Saja vs Donatur+Influencer */}
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <h3 className="dashboard-section__title">Donatur vs Donatur+Influencer</h3>
          </div>
          <div className="dashboard-section__body">
            {donaturInfluencerPieData.length === 0 ? (
              <div className="dashboard-chart__empty" style={{ height: 200 }}>
                <p className="text-sm">Belum ada data</p>
              </div>
            ) : (
              <>
                <div style={{ position: "relative", width: "100%", height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donaturInfluencerPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                        {donaturInfluencerPieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center-label">
                    <p className="donut-center-label__value">{summary?.totalDonatur?.toLocaleString("id-ID")}</p>
                    <p className="donut-center-label__label">Total</p>
                  </div>
                </div>
                <div className="donut-legend">
                  {donaturInfluencerPieData.map((d) => {
                    const pct = summary?.totalDonatur ? ((d.value / summary.totalDonatur) * 100).toFixed(1) : "0";
                    return (
                      <div key={d.name} className="donut-legend__item">
                        <div className="donut-legend__indicator">
                          <span className="donut-legend__dot" style={{ backgroundColor: d.fill }} />
                          <span className="donut-legend__name">{d.name} ({pct}%)</span>
                        </div>
                        <span className="donut-legend__value">{d.value.toLocaleString("id-ID")}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Berdasarkan Profesi */}
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <h3 className="dashboard-section__title">Donatur Berdasarkan Profesi</h3>
          </div>
          <div className="dashboard-section__body">
            {jobBarData.length === 0 ? (
              <div className="dashboard-chart__empty" style={{ height: 300 }}>
                <p className="text-sm">Belum ada data profesi</p>
              </div>
            ) : (
              <div style={{ width: "100%", height: Math.max(300, jobBarData.length * 35) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={jobBarData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis type="category" dataKey="name" width={140} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="value" fill="#035a52" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Berdasarkan Income */}
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <h3 className="dashboard-section__title">Donatur Berdasarkan Penghasilan</h3>
          </div>
          <div className="dashboard-section__body">
            {incomeBarData.length === 0 ? (
              <div className="dashboard-chart__empty" style={{ height: 300 }}>
                <p className="text-sm">Belum ada data penghasilan</p>
              </div>
            ) : (
              <div style={{ width: "100%", height: Math.max(300, incomeBarData.length * 35) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeBarData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis type="category" dataKey="name" width={160} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="value" fill="#296585" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Berdasarkan Provinsi */}
      <div className="dashboard-section mb-6">
        <div className="dashboard-section__header">
          <h3 className="dashboard-section__title">Donatur Berdasarkan Provinsi</h3>
        </div>
        <div className="dashboard-section__body">
          {provinceBarData.length === 0 ? (
            <div className="dashboard-chart__empty" style={{ height: 300 }}>
              <p className="text-sm">Belum ada data provinsi</p>
            </div>
          ) : (
            <div style={{ width: "100%", height: Math.max(300, provinceBarData.length * 35) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={provinceBarData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis type="category" dataKey="name" width={160} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="value" fill="#d2aa55" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Export Section */}
      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <h3 className="dashboard-section__title">Export Data Donatur</h3>
        </div>
        <div className="dashboard-section__body">
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input w-full"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input w-full"
              />
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Kosongkan tanggal untuk export semua data donatur
          </p>
        </div>
      </div>
    </div>
  );
}
