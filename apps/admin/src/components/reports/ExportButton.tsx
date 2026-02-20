"use client";

import { Download, Printer } from "lucide-react";

interface ExportButtonProps {
  onExportExcel?: () => void;
  onPrint?: () => void;
}

export default function ExportButton({ onExportExcel, onPrint }: ExportButtonProps) {
  return (
    <div className="flex gap-2 no-print">
      {onExportExcel && (
        <button
          onClick={onExportExcel}
          className="btn btn-outline btn-sm flex items-center gap-2"
        >
          <Download size={16} />
          Export Excel
        </button>
      )}
      {onPrint && (
        <button
          onClick={onPrint}
          className="btn btn-outline btn-sm flex items-center gap-2"
        >
          <Printer size={16} />
          Cetak
        </button>
      )}
    </div>
  );
}
