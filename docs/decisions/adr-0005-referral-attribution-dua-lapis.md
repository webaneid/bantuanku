# ADR-0005: Atribusi Referral Dua Lapis (localStorage + httpOnly Cookie)

**Status:** Accepted
**Tanggal:** 2026-07-03

## Context
Atribusi referral hanya memakai localStorage 24 jam, terlalu pendek untuk konversi tidak langsung.

## Decision
Dua lapis: (1) localStorage sebagai primary (mudah dibaca di client), (2) httpOnly cookie `fundraiser_ref` sebagai fallback yang lebih lama. Fallback dibaca server di `POST /transactions` via `getCookie(c, "fundraiser_ref")`; frontend tidak perlu mengirim apa pun saat checkout.

## Alternatif yang Dipertimbangkan
- Hanya localStorage — ditolak: atribusi hilang setelah 24 jam.
- Hanya cookie — ditolak: client tidak bisa membacanya untuk UI.

## Konsekuensi
- Aturan komisi dan daftar program yang dibagikan harus konsisten (Wakaf/Fidyah tidak menghasilkan komisi, jadi dikecualikan dari `active-programs`).

Lihat juga: `docs/arsitektur-fundraiser.md`.
