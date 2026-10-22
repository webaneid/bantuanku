# ADR-0007: Timezone Aplikasi Konstanta Tunggal `Asia/Jakarta`

**Status:** Accepted
**Tanggal:** 2026-09-22

## Context
Tidak ada setting timezone di halaman Settings; seluruh app mengasumsikan WIB. Laporan memakai batas hari UTC sehingga transaksi 00:00–06:59 WIB hilang dari filter satu hari. Produksi memakai `timestamptz` dengan timezone DB UTC.

## Decision
Satu konstanta `APP_TIMEZONE` di `utils/timezone.ts`. Batas hari dihitung dengan `startOfDayWIB`/`endOfDayWIB` atau `'YYYY-MM-DD'::timestamp AT TIME ZONE 'Asia/Jakarta'`, sehingga hasil tidak bergantung `TimeZone` sesi DB.

## Alternatif yang Dipertimbangkan
- Setting timezone per tenant — ditolak untuk saat ini: belum ada kebutuhan, menambah kompleksitas.

## Konsekuensi
- Tenant di luar WIB memerlukan ADR baru yang menggantikan ini.
- Uji batas waktu harus memakai DB yang meniru produksi, bukan DB dev.

Lihat juga: `docs/arsitektur-timezone.md`, `docs/lessons-learned.md` (2026-09-22 — Boundary Tanggal Laporan).
