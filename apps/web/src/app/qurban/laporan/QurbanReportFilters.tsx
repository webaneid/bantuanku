"use client";

import { useMemo, useState } from "react";
import Autocomplete from "@/components/Autocomplete";

type Option = { value: string; label: string };

interface QurbanReportFiltersProps {
  initialProgram: string;
  initialPeriodId: string;
  programOptions: Option[];
  periodOptions: Option[];
}

export default function QurbanReportFilters({
  initialProgram,
  initialPeriodId,
  programOptions,
  periodOptions,
}: QurbanReportFiltersProps) {
  const [program, setProgram] = useState(initialProgram);
  const [periodId, setPeriodId] = useState(initialPeriodId);

  const mergedProgramOptions = useMemo(
    () => [{ value: "", label: "Semua Program" }, ...programOptions],
    [programOptions]
  );

  const mergedPeriodOptions = useMemo(
    () => [{ value: "", label: "Semua Periode" }, ...periodOptions],
    [periodOptions]
  );

  return (
    <form className="bg-white border border-gray-200 rounded-xl p-4" method="GET">
      <input type="hidden" name="program" value={program} />
      <input type="hidden" name="periodId" value={periodId} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Program</label>
          <Autocomplete
            options={mergedProgramOptions}
            value={program}
            onChange={setProgram}
            placeholder="Semua Program"
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
        <button className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700">Terapkan Filter</button>
      </div>
    </form>
  );
}
