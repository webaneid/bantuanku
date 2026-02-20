"use client";

import { useState, useEffect } from "react";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface DatePreset {
  value: string;
  label: string;
}

const DEFAULT_PRESETS: DatePreset[] = [
  { value: "today", label: "Hari Ini" },
  { value: "last7days", label: "7 Hari" },
  { value: "thisMonth", label: "Bulan Ini" },
  { value: "thisYear", label: "Tahun Ini" },
  { value: "custom", label: "Custom" },
];

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetDates(preset: string): { start: string; end: string } {
  const now = new Date();
  const end = formatLocalDate(now);

  switch (preset) {
    case "today":
      return { start: end, end };
    case "last7days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { start: formatLocalDate(d), end };
    }
    case "thisMonth": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: formatLocalDate(first), end };
    }
    case "thisYear": {
      const first = new Date(now.getFullYear(), 0, 1);
      return { start: formatLocalDate(first), end };
    }
    default:
      return { start: "", end: "" };
  }
}

interface ReportFiltersProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  datePresets?: boolean;
  filters?: FilterConfig[];
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

export default function ReportFilters({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  datePresets = true,
  filters,
  searchable = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Cari...",
  children,
}: ReportFiltersProps) {
  const [activePreset, setActivePreset] = useState("thisMonth");

  const handlePresetClick = (preset: string) => {
    setActivePreset(preset);
    if (preset !== "custom") {
      const { start, end } = getPresetDates(preset);
      onStartDateChange(start);
      onEndDateChange(end);
    }
  };

  return (
    <div className="card mb-6 report-filters no-print">
      {/* Date presets */}
      {datePresets && (
        <div className="flex flex-wrap gap-2 mb-4">
          {DEFAULT_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePresetClick(preset.value)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                activePreset === preset.value
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-primary-400"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Date inputs + filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              onStartDateChange(e.target.value);
              setActivePreset("custom");
            }}
            className="form-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              onEndDateChange(e.target.value);
              setActivePreset("custom");
            }}
            className="form-input"
          />
        </div>

        {/* Dynamic filters */}
        {filters?.map((filter) => (
          <div key={filter.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{filter.label}</label>
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="form-input"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Search */}
        {searchable && (
          <div className={filters?.length ? "" : "md:col-span-2"}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="form-input"
            />
          </div>
        )}
      </div>

      {/* Extra content (export buttons etc) */}
      {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
