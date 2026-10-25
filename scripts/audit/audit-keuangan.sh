#!/usr/bin/env bash
# Audit data keuangan — READ-ONLY. Aman dijalankan di produksi: sesi dipaksa read-only, hanya SELECT.
# Pemakaian (di VPS, user bantuanku):
#   bash scripts/audit/audit-keuangan.sh                       # baca DATABASE_URL dari /var/www/bantuanku/shared/.env
#   bash scripts/audit/audit-keuangan.sh /path/ke/.env         # file env lain
#   DATABASE_URL=postgres://... bash scripts/audit/audit-keuangan.sh
#   bash scripts/audit/audit-keuangan.sh > audit-$(date +%F).txt   # simpan hasil
# URL koneksi TIDAK pernah dicetak. Output tidak memuat nama/email/telepon donatur.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-/var/www/bantuanku/shared/.env}"

if [ -z "${DATABASE_URL:-}" ]; then
  if [ ! -f "$ENV_FILE" ]; then
    # fallback pengembangan lokal
    ENV_FILE="$DIR/../../apps/api/.env"
  fi
  [ -f "$ENV_FILE" ] || { echo "DATABASE_URL tidak ditemukan (env: $ENV_FILE)" >&2; exit 1; }
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
fi
[ -n "$DATABASE_URL" ] || { echo "DATABASE_URL kosong" >&2; exit 1; }
command -v psql >/dev/null || { echo "psql tidak ditemukan" >&2; exit 1; }

# Sesi read-only di tingkat server: perintah tulis apa pun akan ditolak Postgres.
export PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=120000"
psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=0 -f "$DIR/audit-keuangan.sql" 2>&1
