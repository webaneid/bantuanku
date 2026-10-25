"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/Modal";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { FUND_LABEL, fundText } from "@/lib/cashbook";
import { todayWIBDateInput } from "@/lib/timezone";

const apiMessage = (err: any) => err?.response?.data?.message || err?.message || "Terjadi kesalahan";

/** Membalik satu baris buku kas (append-only): entri lawan arah dengan catatan wajib. */
export function ReverseDialog({
  entry,
  onClose,
  onDone,
}: {
  entry: { id: string; direction: string; amount: number; fund: string; fundDetail?: string | null; account: { name: string } } | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => api.post(`/admin/cashbook/entries/${entry!.id}/reverse`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      setNote("");
      onDone("Entri berhasil dibalik");
    },
    onError: (err) => setError(apiMessage(err)),
  });

  if (!entry) return null;
  return (
    <Modal isOpen onClose={onClose} title="Balik entri buku kas" size="sm">
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <p>
            {entry.direction === "in" ? "Masuk" : "Keluar"} <strong className="mono">Rp {formatRupiah(entry.amount)}</strong> · {fundText(entry.fund, entry.fundDetail)}
          </p>
          <p className="text-gray-500">Akun: {entry.account.name}</p>
        </div>
        <p className="text-sm text-gray-600">
          Entri tidak dihapus: sistem menambah entri lawan arah sebagai koreksi sehingga jejak tetap utuh dan tercatat di audit log.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alasan koreksi *</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className="form-input" placeholder="Mis. salah catat, pembayaran dibatalkan donatur" />
        </div>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={mutation.isPending}>Batal</button>
          <button className="btn btn-primary btn-sm" disabled={note.trim().length < 5 || mutation.isPending} onClick={() => { setError(""); mutation.mutate(); }}>
            {mutation.isPending ? "Menyimpan..." : "Balik entri"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Penyesuaian manual: uang masuk/keluar yang belum tercatat. Catatan wajib. */
export function AdjustmentDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ direction: "in", amount: "", fund: "campaign", fundDetail: "", accountId: "", date: todayWIBDateInput(), note: "" });
  const [error, setError] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["cashbook", "account-options"],
    queryFn: async () => (await api.get("/admin/cashbook/account-options")).data?.data as Array<{ id: string; name: string; kind: string }>,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      api.post("/admin/cashbook/adjustments", {
        direction: form.direction,
        amount: Number(form.amount),
        fund: form.fund,
        fundDetail: form.fundDetail || undefined,
        accountId: form.accountId,
        date: form.date || undefined,
        note: form.note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      setForm((f) => ({ ...f, amount: "", note: "", fundDetail: "" }));
      onDone("Penyesuaian dicatat");
    },
    onError: (err) => setError(apiMessage(err)),
  });

  if (!open) return null;
  const valid = Number(form.amount) > 0 && Number.isInteger(Number(form.amount)) && form.accountId && form.note.trim().length >= 5;
  return (
    <Modal isOpen onClose={onClose} title="Penyesuaian manual" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Untuk uang masuk/keluar yang belum tercatat di buku kas. Setiap penyesuaian wajib beralasan dan tercatat di audit log.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arah</label>
            <select className="form-input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
              <option value="in">Masuk</option>
              <option value="out">Keluar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp) *</label>
            <input className="form-input mono" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "") })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dana</label>
            <select className="form-input" value={form.fund} onChange={(e) => setForm({ ...form, fund: e.target.value })}>
              {Object.entries(FUND_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rincian dana</label>
            <input className="form-input" value={form.fundDetail} maxLength={60} onChange={(e) => setForm({ ...form, fundDetail: e.target.value })} placeholder="mis. fitrah" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Akun kas *</label>
            <select className="form-input" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">Pilih akun...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alasan *</label>
          <textarea className="form-input" rows={3} maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Jelaskan asal uang dan buktinya" />
        </div>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={mutation.isPending}>Batal</button>
          <button className="btn btn-primary btn-sm" disabled={!valid || mutation.isPending} onClick={() => { setError(""); mutation.mutate(); }}>
            {mutation.isPending ? "Menyimpan..." : "Simpan penyesuaian"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
