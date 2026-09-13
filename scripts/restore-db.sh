#!/usr/bin/env bash
# Restore database bantuanku dari file backup .sql.gz (hasil scripts/backup-db.sh).
#
# PERINGATAN: ini menjalankan SQL restore ke database tujuan. Kalau tabelnya
# sudah ada isi, restore bisa gagal karena constraint atau menduplikasi data
# tergantung isi dump. Untuk restore penuh ke DB kosong, buat database baru
# dulu dan arahkan DATABASE_URL ke situ — jangan restore ke DB production
# yang sedang aktif dipakai tanpa perencanaan matang.
#
# Usage:
#   ./scripts/restore-db.sh <path-ke-backup.sql.gz> [DATABASE_URL]
# Kalau DATABASE_URL tidak diberikan, diambil dari apps/api/.env

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_DIR/apps/api/.env"

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <path-ke-backup.sql.gz> [DATABASE_URL]" >&2
  exit 1
fi

DATABASE_URL="${2:-}"
if [[ -z "$DATABASE_URL" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "[restore-db] ENV file tidak ditemukan dan DATABASE_URL tidak diberikan: $ENV_FILE" >&2
    exit 1
  fi
  DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d '=' -f2-)
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "[restore-db] psql tidak ditemukan. Install: apt-get install postgresql-client" >&2
  exit 1
fi

REDACTED_URL=$(echo "$DATABASE_URL" | sed -E 's#(:)([^:@/]+)(@)#\1***\3#')
echo "[restore-db] Target: $REDACTED_URL"
echo "[restore-db] Sumber: $BACKUP_FILE"
echo "[restore-db] PERINGATAN: proses ini akan menjalankan SQL restore ke database di atas."
read -r -p "Ketik 'ya' untuk lanjut: " CONFIRM
if [[ "$CONFIRM" != "ya" ]]; then
  echo "[restore-db] Dibatalkan."
  exit 0
fi

gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
echo "[restore-db] $(date -Iseconds) Restore selesai."
