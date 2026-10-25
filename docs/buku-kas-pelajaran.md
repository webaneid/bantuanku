# Catatan Pembelajaran Offline — Buku Kas

> Dicatat selama Tahap Offline (lihat `arsitektur-buku-kas.md` §8). Tujuan: bekal sebelum menyentuh produksi. Isi tiap temuan: **apa yang terjadi, penyebab, dampak ke rencana online, perbaikan data eksisting yang diperlukan.**

## Temuan awal (audit kode + data dev, 2026-10-26)

| # | Temuan | Dampak ke rencana online |
|---|---|---|
| 1 | Laporan memakai `transactions.total_amount`, bukan pembayaran terverifikasi | Buku kas dibangun dari `transaction_payments` verified |
| 2 | `paid_amount` tidak konsisten (0, termasuk kode unik, tidak termasuk) | Jangan dipakai sebagai sumber; perbaikan data eksisting menyusul |
| 3 | Pembayaran verified ganda (3× pada satu transaksi) | Dicatat sebagai pemasukan komponen `kelebihan` (D6) |
| 4 | Kode unik tidak selalu diterima pada gateway (Flip) | Komponen `kode_unik` hanya bila diterima |
| 5 | `bank_accounts` kosong, `transactions.bank_account_id` tak pernah terisi | Akun kas dipetakan dari metode bayar (settings/gateway) |
| 6 | `revenue_shares` ada, `disbursement_revenue_share_items` kosong | Pastikan pencairan bagi hasil selalu menulis item penghubung |
| 7 | Transaksi paid tanpa pembayaran verified (diubah manual) | Tidak menjadi uang masuk; daftar informasi |

## Catatan Tahap Offline

### Fase 1 — dry-run pada DB dev (2026-10-26)

Backfill menghasilkan 18 baris dari 11 pembayaran verified + 1 pencairan paid, paritas 0. Angka ini **menjelaskan** selisih antar laporan lama:

| Definisi | Nilai | Arti di buku kas |
|---|---|---|
| `dashboard` (Σ total_amount paid) | 4.295.000 | = komponen `pokok` |
| `financial-statement` (+ semua kode unik) | 4.298.781 | = pokok + kode unik **tercatat** 3.781; yang benar-benar diterima hanya 2.575 (Flip tanpa kode unik) |
| Pembayaran verified | 4.498.001 | = pokok 4.295.000 + kode_unik 2.575 + kelebihan 200.426 |

Pelajaran: (1) kelebihan 200.426 berasal satu transaksi wakaf yang dibayar 3× (pembayaran ganda) — kini tampak sebagai komponen `kelebihan` yang bisa difilter; (2) `fund = wakaf` tertangkap dari pilar campaign (300.639 termasuk kelebihan itu); (3) metode bayar dikenal semua (4 akun kas: 2 QRIS, 1 bank, flip) pada data dev, produksi mungkin punya `unmapped`; (4) 2 dari 3 transaksi paid tanpa revenue share adalah campaign `sedekah` (perlu dicek penyebabnya di Fase 2/3).

Catatan teknis: `postVerifiedPayment` memakai alokasi kumulatif sehingga **urutan** pembayaran per transaksi penting; backfill mengurutkan per transaksi + `verified_at`.
