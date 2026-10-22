# ADR-0002: Slot Qurban Direservasi Saat Order Dibuat

**Status:** Accepted
**Tanggal:** 2026-07-04

## Context
Public order create dan admin verify sama-sama menaikkan `slotsFilled`, sehingga terjadi double-counting (sapi 7 slot dianggap penuh setelah 4 order).

## Decision
Filosofi **reservation at creation**: `slotsFilled` naik saat order dibuat dan turun saat order dibatalkan. Tidak ada increment di tempat lain (terutama bukan di verify/payment handler). Berlaku untuk semua jalur order: public, admin, `TransactionService`, dan konversi savings.

## Alternatif yang Dipertimbangkan
- Increment saat pembayaran terverifikasi — ditolak: slot bisa oversold selama pembayaran tertunda.

## Konsekuensi
- Order yang tidak dibayar menahan slot sampai dibatalkan/kedaluwarsa.
- Setiap jalur order baru wajib mengikuti pola: increment di create, decrement di cancel.

Lihat juga: `docs/arsitektur-qurban.md`, `docs/lessons-learned.md` (2026-07-04 dan 2026-07-05 — Dual Flow Qurban).
