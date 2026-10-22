# ADR-0003: Nilai Enum yang Berhadapan dengan User Memakai Bahasa Indonesia

**Status:** Accepted
**Tanggal:** 2026-07-04

## Context
Donatur menyimpan gender `"laki-laki"/"perempuan"`, mustahiq `"male"/"female"`. Kolom bertipe `text`, jadi tidak ada error TypeScript; bug baru terlihat saat export CSV.

## Decision
Semua nilai enum yang ditampilkan ke user memakai bahasa Indonesia (`"laki-laki"/"perempuan"`). Nilai bahasa Inggris hanya untuk flag internal yang tidak pernah ditampilkan langsung. Saat menambah enum di satu modul, cek modul lain yang punya field serupa dan samakan nilainya.

## Alternatif yang Dipertimbangkan
- Standarkan ke bahasa Inggris — ditolak: nilai tampil langsung di UI/CSV dan preferensi pemilik adalah bahasa Indonesia.

## Konsekuensi
- Modul lama dengan nilai Inggris (mis. mustahiq) perlu migrasi/normalisasi saat disentuh.
