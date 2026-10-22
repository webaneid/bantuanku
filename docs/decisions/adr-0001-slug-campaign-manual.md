# ADR-0001: Slug Campaign Tidak Auto-Update Saat Judul Diedit

**Status:** Accepted
**Tanggal:** 2026-09-13

## Context
Modul kategori dan pilar meregenerasi slug otomatis setiap `name` berubah. Modul campaign tidak menyentuh slug sama sekali di PUT/PATCH. URL publik campaign aktif (`/program/:slug`) sudah dibagikan ke publik: invoice donatur, broadcast WA `wa_tpl_campaign_new`, link fundraiser, indeks Google.

## Decision
Slug campaign **tidak** berubah otomatis. Admin mengubahnya manual lewat field "URL Campaign" di form edit (read-only + tombol "Ubah URL"). Backend memvalidasi format `^[a-z0-9]+(-[a-z0-9]+)*$` dan keunikan (exclude id sendiri), lalu mengembalikan `409` kalau bentrok.

## Alternatif yang Dipertimbangkan
- Auto-regenerate seperti kategori/pilar — ditolak: memperbaiki typo judul akan mematikan semua link yang sudah dibagikan (404).

## Konsekuensi
- Link publik stabil.
- Slug bisa tidak sinkron dengan judul sampai admin mengubahnya sendiri (diterima).
- Mengubah URL publik yang sudah live adalah keputusan desain, bukan bugfix.

Lihat juga: `docs/lessons-learned.md` (2026-09-13 — Slug Campaign).
