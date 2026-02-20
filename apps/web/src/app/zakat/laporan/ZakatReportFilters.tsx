"use client";

import { useMemo, useState } from "react";
import Autocomplete from "@/components/Autocomplete";

type Option = { value: string; label: string };

interface ZakatReportFiltersProps {
  tab: "titipan" | "kegiatan";
  initialProgram: string;
  initialZakatTypeId: string;
  initialPeriodId: string;
  programOptions: Option[];
  zakatTypeOptions: Option[];
  periodOptions: Option[];
}

export default function ZakatReportFilters({
  tab,
  initialProgram,
  initialZakatTypeId,
  initialPeriodId,
  programOptions,
  zakatTypeOptions,
  periodOptions,
}: ZakatReportFiltersProps) {
  const [program, setProgram] = useState(initialProgram);
  const [zakatTypeId, setZakatTypeId] = useState(initialZakatTypeId);
  const [periodId, setPeriodId] = useState(initialPeriodId);

  const mergedProgramOptions = useMemo(
    () => [{ value: "", label: "Semua Program" }, ...programOptions],
    [programOptions]
  );

  const mergedTypeOptions = useMemo(
    () => [{ value: "", label: "Semua Jenis" }, ...zakatTypeOptions],
    [zakatTypeOptions]
  );

  const mergedPeriodOptions = useMemo(
    () => [{ value: "", label: "Semua Periode" }, ...periodOptions],
    [periodOptions]
  );

  return (
    <form className="bg-white border border-gray-200 rounded-xl p-4" method="GET">
      <input type="hidden" name="tab" value={tab} />
      <input type="hidden" name="program" value={program} />
      <input type="hidden" name="zakatTypeId" value={zakatTypeId} />
      <input type="hidden" name="periodId" value={periodId} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Mitra / Program</label>
          <Autocomplete
            options={mergedProgramOptions}
            value={program}
            onChange={setProgram}
            placeholder="Semua Program"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Jenis Zakat</label>
          <Autocomplete
            options={mergedTypeOptions}
            value={zakatTypeId}
            onChange={setZakatTypeId}
            placeholder="Semua Jenis"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Periode</label>
          <Autocomplete
            options={mergedPeriodOptions}
            value={periodId}
            onChange={setPeriodId}
            placeholder="Semua Periode"
          />
        </div>
        <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Terapkan Filter</button>
      </div>
    </form>
  );
}
