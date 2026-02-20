"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface TrendItem {
  date: string;
  count: number;
  amount: number;
}

interface RevenueChartProps {
  data: TrendItem[];
  period: string;
  onPeriodChange: (period: string) => void;
}

const periods = [
  { value: "7d", label: "7 Hari" },
  { value: "30d", label: "30 Hari" },
  { value: "90d", label: "90 Hari" },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  let dateStr = label;
  try {
    dateStr = format(parseISO(label), "d MMMM yyyy", { locale: idLocale });
  } catch {}

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-900 mb-1">{dateStr}</p>
      <p className="text-primary-600">
        Rp {formatRupiah(payload[0]?.value || 0)}
      </p>
      <p className="text-gray-500 text-xs mt-0.5">
        {payload[0]?.payload?.count || 0} transaksi
      </p>
    </div>
  );
}

export default function RevenueChart({
  data,
  period,
  onPeriodChange,
}: RevenueChartProps) {
  return (
    <div className="dashboard-section">
      <div className="dashboard-section__header">
        <h3 className="dashboard-section__title">Tren Pemasukan</h3>
        <div className="period-selector">
          {periods.map((p) => (
            <button
              key={p.value}
              className={`period-selector__btn ${period === p.value ? "period-selector__btn--active" : ""}`}
              onClick={() => onPeriodChange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="dashboard-section__body">
        {data.length === 0 ? (
          <div className="dashboard-chart__empty">
            <BarChart3 className="w-10 h-10" />
            <p className="text-sm">Belum ada data transaksi</p>
          </div>
        ) : (
          <div className="dashboard-chart__container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#035a52" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#035a52" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(val) => {
                    try {
                      return format(parseISO(val), "d MMM", { locale: idLocale });
                    } catch {
                      return val;
                    }
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(0)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
                    return val;
                  }}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#035a52"
                  strokeWidth={2}
                  fill="url(#colorAmount)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#035a52", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
