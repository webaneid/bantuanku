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

_(diisi saat Fase 1–5 berjalan)_
