"use client";

import { formatDateTimeWIB } from "@/lib/timezone";

interface DraftRestoreBannerProps {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}

// Muncul di atas form bila ada cadangan otomatis (browser) yang belum pernah disimpan ke server.
export default function DraftRestoreBanner({ savedAt, onRestore, onDiscard }: DraftRestoreBannerProps) {
  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-900"
    >
      <p>
        Ditemukan cadangan otomatis dari <strong>{formatDateTimeWIB(new Date(savedAt))}</strong> yang belum
        disimpan ke server. Pulihkan untuk melanjutkan tulisan Anda.
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDiscard}>
          Buang
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={onRestore}>
          Pulihkan
        </button>
      </div>
    </div>
  );
}
