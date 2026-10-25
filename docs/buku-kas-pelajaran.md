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

### Audit produksi (2026-10-26, sebagian: bagian 0–4a)

| Temuan | Angka |
|---|---|
| Transaksi / pembayaran / pencairan / bagi hasil | 348 / 232 / 9 / 225 (items penghubung: 42) |
| Lingkungan | DB UTC, `paid_at` `timestamptz` (migrasi 111 terpasang) |
| Kelompok **A**: transaksi `paid` TANPA pembayaran verified | **51 transaksi, Rp 320.231.250** (kemungkinan diubah manual / jalur tanpa catatan pembayaran) |
| Kelompok B (verified = total, tanpa kode unik) | 21 transaksi, Rp 106.334.099 |
| Kelompok C (verified = total + kode unik) | 158 transaksi, Rp 93.923.000 (+ kode unik 78.895) |
| Kelompok E (verified > tagihan: ganda/lebih bayar) | 9 transaksi; verified 1.268.444 untuk tagihan ±614 ribu |
| Status lain | `partial` 3 (Rp 11,3 jt), `processing` 11, `failed` 6, `pending` 89 |

Implikasi: (1) **Kelompok A sangat besar** (zakat fitrah paid 66 transaksi Rp 276 jt, paid_amount hanya Rp 103 jt); menentukan D3: apakah dicatat sebagai uang masuk (data eksisting) atau tidak. Hook Fase 2 hanya mencatat pembayaran terverifikasi, jadi A tidak masuk buku kas sampai ada keputusan. (2) Bagi hasil: 225 `revenue_shares` untuk 239 transaksi paid (14 selisih; wakaf/fidyah dilewati dan jalur gateway tidak menghitung sebelum Fase 2). (3) Bagian audit 4b–11 belum diterima (daftar tak cocok, kode unik per metode, rekening, pencairan, bagi hasil, legacy).

### Fase 2 — temuan teknis

1. Webhook gateway **tidak menghitung bagi hasil** (hanya approve manual); ditambahkan pasca-commit, non-fatal.
2. `PUT /transactions/:id` bisa memaksa `paid` tanpa pembayaran verified (sumber kelompok A).
3. Ada dua jalur pencairan `paid` (`updateStatus` dan `markAsPaid`) ditambah penyaluran zakat lama yang membuat baris pencairan langsung berstatus paid; kategori pencairan zakat lama berupa `zakat` (bukan `zakat_to_*`), sehingga aturan dana memakai `disbursement_type` dan `typeSpecificData.asnaf`.
4. Tabel penghubung bagi hasil (`disbursement_revenue_share_items`) ditulis saat submit pencairan; di produksi terisi (42), jadi bukan gap.
5. Posting dijalankan di SAVEPOINT agar kegagalan tidak membatalkan transaksi induk (diuji).

### Keputusan kelompok A (2026-10-26)

Pemilik produk memilih **mencatat semua transaksi paid tanpa pembayaran terverifikasi sebagai uang masuk**. Diimplementasikan sebagai pemasukan sintetis berlabel (`ref_type = transaction_paid`) dengan pembalikan otomatis bila pembayaran asli muncul; transaksi non-tunai dikecualikan. Dampak: pada produksi, buku kas akan memuat sekitar Rp 320 jt tambahan yang **tidak** punya bukti pembayaran; tampil di laporan sebagai komponen/catatan "Data eksisting" sehingga dapat difilter dan diperbaiki kelak.

### Fase 3 — temuan

1. **Identitas paritas** masuk = A(dashboard) − non-tunai + kurang bayar + pokok non-paid + kode unik diterima + kelebihan terbukti tepat pada data dev; ini menjadi uji penerimaan produksi (jalankan `npm run cashbook:parity`; selisih ≠ 0 berarti ada jalur uang yang belum terbaca).
2. **Rumus hak pihak lain** = `donation_amount − program_amount` berlaku untuk campaign, zakat (= amil_total) dan qurban (= biaya admin penuh); wakaf/fidyah tidak punya bagi hasil (dilewati oleh service), jadi seluruh masuknya menjadi sisa program.
3. **Penyaluran zakat/qurban tidak terpetakan ke program** pada level produk (hanya campaign yang membawa `reference_id`); laporan per program menandainya dan Dana per Sumber menampilkan di level dana.
4. `/review` mengungkap transaksi gateway tanpa bagi hasil (Rp 400.000 di dev). Di produksi jumlahnya kemungkinan besar; menghitung ulang bagi hasil transaksi lama adalah keputusan terpisah (service idempoten).
5. Pada tampilan Bagi Hasil, "dibayar amil" = pengeluaran operasional (basis tanggal pengeluaran), bukan alokasi per transaksi; dijelaskan di `keterangan`.
