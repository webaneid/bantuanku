"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatRupiah, formatRupiahShort } from "@/lib/format";

interface CategoryStats {
  income: {
    zakat: number;
    campaign: number;
    qurban: number;
    total: number;
  };
}

interface IncomeBreakdownProps {
  data: CategoryStats | undefined;
}

const SEGMENTS = [
  { key: "zakat", label: "Zakat", color: "#035a52" },
  { key: "campaign", label: "Campaign", color: "#296585" },
  { key: "qurban", label: "Qurban", color: "#d2aa55" },
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-sm">
      <p className="font-medium" style={{ color: payload[0]?.payload?.fill }}>
        {payload[0]?.name}: Rp {formatRupiah(payload[0]?.value || 0)}
      </p>
    </div>
  );
}

export default function IncomeBreakdown({ data }: IncomeBreakdownProps) {
  if (!data) return null;

  const chartData = SEGMENTS.map((seg) => ({
    name: seg.label,
    value: Number((data.income as any)[seg.key]) || 0,
    fill: seg.color,
  })).filter((d) => d.value > 0);

  const total = data.income.total || 0;
  const hasData = chartData.length > 0;

  return (
    <div className="dashboard-section">
      <div className="dashboard-section__header">
        <h3 className="dashboard-section__title">Komposisi Pemasukan</h3>
      </div>
      <div className="dashboard-section__body">
        {!hasData ? (
          <div className="dashboard-chart__empty" style={{ height: 200 }}>
            <p className="text-sm">Belum ada data</p>
          </div>
        ) : (
          <>
            <div style={{ position: "relative", width: "100%", height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center-label">
                <p className="donut-center-label__value">
                  Rp {formatRupiahShort(total)}
                </p>
                <p className="donut-center-label__label">Total</p>
              </div>
            </div>

            <div className="donut-legend">
              {SEGMENTS.map((seg) => {
                const val = Number((data.income as any)[seg.key]) || 0;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
                return (
                  <div key={seg.key} className="donut-legend__item">
                    <div className="donut-legend__indicator">
                      <span
                        className="donut-legend__dot"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="donut-legend__name">
                        {seg.label} ({pct}%)
                      </span>
                    </div>
                    <span className="donut-legend__value">
                      Rp {formatRupiahShort(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
