import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth";

// Cadangan otomatis form panjang (laman, laporan, campaign, zakat, qurban) ke localStorage browser.
// Tujuannya: sesi login habis / tab tertutup / halaman ter-refresh tidak menghapus tulisan yang belum disimpan.
// Ini BUKAN status "draft" di server; cadangan hanya ada di browser ini dan hilang bila dibuang atau kedaluwarsa.
//
// Kunci penyimpanan memuat id pengguna, sehingga cadangan tidak bocor antar akun di komputer yang sama
// dan tetap ada setelah logout/login ulang oleh pengguna yang sama (logout tidak menghapusnya).

const STORAGE_PREFIX = "form-draft";
const DRAFT_VERSION = 1;
const AUTOSAVE_DELAY_MS = 800;
// Komponen anak (editor teks, panel SEO, form alamat) kerap merapikan nilainya sesaat setelah form dimuat.
// Perubahan dalam jendela ini diadopsi sebagai kondisi awal, bukan dianggap suntingan pengguna.
const SETTLE_MS = 1500;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SIZE_CHARS = 1_500_000; // jauh di bawah kuota localStorage (~5 MB)

interface StoredDraft<T> {
  v: number;
  savedAt: number;
  values: T;
}

// Waktu terakhir cadangan dibersihkan per kunci, supaya penulisan tertunda (debounce/pagehide) yang jatuh
// SETELAH simpan berhasil tidak menghidupkan lagi cadangan yang baru dibuang.
const clearedAt = new Map<string, number>();

function storageKey(formKey: string): string | null {
  const userId = useAuth.getState().user?.id;
  return userId ? `${STORAGE_PREFIX}:${userId}:${formKey}` : null;
}

function readDraft<T>(key: string): StoredDraft<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (parsed?.v !== DRAFT_VERSION || typeof parsed.savedAt !== "number" || !parsed.values) {
      localStorage.removeItem(key);
      return null;
    }
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Hapus cadangan sebuah form. Panggil dari `onSuccess` penyimpanan ke server (BUKAN saat tombol ditekan). */
export function clearFormDraft(formKey: string) {
  const key = storageKey(formKey);
  if (!key) return;
  clearedAt.set(key, Date.now());
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage tidak tersedia: tidak ada yang perlu dihapus
  }
}

interface UseFormDraftOptions<T> {
  /** Pengenal form, mis. "page:create" atau "page:<id>". Satu cadangan per kunci per pengguna. */
  formKey: string;
  /** Seluruh nilai form yang perlu dicadangkan (harus bisa di-JSON-kan). */
  values: T;
  /** true setelah data awal form selesai dimuat (create: langsung true). Nilai pada saat ini jadi pembanding. */
  ready: boolean;
  /** Dipanggil saat pengguna menekan "Pulihkan"; terapkan nilai ke state form. */
  onRestore: (values: T) => void;
}

export function useFormDraft<T>({ formKey, values, ready, onRestore }: UseFormDraftOptions<T>) {
  const userId = useAuth((s) => s.user?.id);
  const [pending, setPending] = useState<{ savedAt: number } | null>(null);

  const baselineRef = useRef<string | null>(null);
  const settleUntilRef = useRef(0);
  const latestRef = useRef<string>("");
  const changedAtRef = useRef(0);
  const pendingRef = useRef(false);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  const serialized = JSON.stringify(values);
  latestRef.current = serialized;

  const write = useCallback(() => {
    const key = storageKey(formKey);
    if (!key || baselineRef.current === null || pendingRef.current) return;
    if (latestRef.current === baselineRef.current) return; // belum ada perubahan dari kondisi awal
    if ((clearedAt.get(key) ?? 0) >= changedAtRef.current) return; // sudah disimpan ke server
    if (latestRef.current.length > MAX_SIZE_CHARS) return;
    try {
      const payload: StoredDraft<unknown> = {
        v: DRAFT_VERSION,
        savedAt: Date.now(),
        values: JSON.parse(latestRef.current),
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // kuota penuh / mode privat: cadangan dilewati, form tetap berfungsi
    }
  }, [formKey]);

  // Saat form siap: ambil nilai awal sebagai pembanding dan cari cadangan yang tersisa
  useEffect(() => {
    if (!ready || !userId) return;
    baselineRef.current = latestRef.current;
    settleUntilRef.current = Date.now() + SETTLE_MS;
    const key = storageKey(formKey);
    if (!key) return;
    const stored = readDraft<T>(key);
    if (stored && JSON.stringify(stored.values) !== baselineRef.current) {
      pendingRef.current = true;
      setPending({ savedAt: stored.savedAt });
    } else if (stored) {
      try {
        localStorage.removeItem(key); // identik dengan data di server, tidak berguna
      } catch {
        // abaikan
      }
    }
    // Hanya saat form menjadi siap atau berganti kunci; perubahan nilai ditangani efek autosave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, formKey]);

  // Autosave dengan jeda setelah perubahan terakhir
  useEffect(() => {
    if (!ready || baselineRef.current === null) return;
    if (Date.now() < settleUntilRef.current && !pendingRef.current) {
      baselineRef.current = latestRef.current;
      return;
    }
    changedAtRef.current = Date.now();
    const timer = setTimeout(write, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [serialized, ready, write]);

  // Tab ditutup/di-refresh/dialihkan (mis. ke /login saat sesi habis) sebelum jeda selesai
  useEffect(() => {
    const flush = () => write();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") write();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [write]);

  const restore = useCallback(() => {
    const key = storageKey(formKey);
    const stored = key ? readDraft<T>(key) : null;
    pendingRef.current = false;
    setPending(null);
    if (stored) onRestoreRef.current(stored.values);
  }, [formKey]);

  const discard = useCallback(() => {
    const key = storageKey(formKey);
    pendingRef.current = false;
    setPending(null);
    if (key) {
      try {
        localStorage.removeItem(key);
      } catch {
        // abaikan
      }
    }
  }, [formKey]);

  return { draft: pending, restore, discard };
}
