# ADR-0009: Jenis Token JWT Dibedakan dengan Claim `typ` / `purpose`

**Status:** Accepted
**Tanggal:** 2026-10-22

## Context
Semua token memakai `JWT_SECRET` yang sama dan `verifyRefreshToken` hanya mengembalikan `sub` dari token apa pun. Akibatnya (1) access token 15 menit bisa ditukar menjadi refresh token 7 hari lewat `/auth/refresh`, dan (2) token unsubscribe WA (30 hari, `sub` = donaturId) lolos `verifyToken` sebagai access token.

## Decision
- `signToken` menambah `typ: "access"`; `signRefreshToken` menambah `typ: "refresh"`; token unsubscribe tetap `purpose: "wa-unsubscribe"`.
- `verifyToken` menolak token ber-`purpose`, ber-`typ` selain `access`, atau tanpa `roles` array.
- `verifyRefreshToken` menolak token ber-`purpose`, ber-`typ` selain `refresh`, dan token tanpa `typ` yang memuat `roles`/`email` (access token lama).
- Token lama tanpa `typ` tetap diterima bila bentuknya cocok (access lama punya `roles`; refresh lama hanya `sub`), jadi tidak ada logout massal saat deploy.

## Alternatif yang Dipertimbangkan
- Secret terpisah per jenis token — lebih kuat, tetapi memutus semua sesi aktif dan menambah env; bisa dipertimbangkan bersama refresh token store.
- Mewajibkan `typ` langsung — ditolak: memutus sesi refresh 7 hari yang sedang berjalan.

## Konsekuensi
- Kelonggaran untuk token tanpa `typ` bisa dihapus setelah 7 hari sejak deploy (semua refresh lama kedaluwarsa); buat ADR baru yang mensupersede bagian ini saat itu.
- Jenis token baru wajib punya `typ`/`purpose` sendiri dan dicek di fungsi verify-nya.
