#!/usr/bin/env bash
# Backup database bantuanku ke file .sql.gz lokal, plus upload opsional ke
# remote rclone (mis. Google Drive) kalau sudah dikonfigurasi.
#
# Manual: ./scripts/backup-db.sh
# Cron (VPS, user non-root — log ke ~/logs/, BUKAN /var/log/ karena user
# biasa tidak punya izin tulis ke sana):
#   0 2 * * * /var/www/bantuanku/repo/scripts/backup-db.sh >> ~/logs/backup-db.log 2>&1
#
# Env override:
#   BACKUP_DIR      - lokasi simpan backup lokal (default: ~/backups/bantuanku-db)
#   RETENTION_DAYS  - hapus backup lokal lebih tua dari ini (default: 14)
#   RCLONE_REMOTE   - target rclone, mis. "gdrive:bantuanku-backups" (kosong = skip upload)

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_DIR/apps/api/.env"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/bantuanku-db}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[backup-db] ENV file tidak ditemukan: $ENV_FILE" >&2
  exit 1
fi

DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d '=' -f2-)
if [[ -z "$DATABASE_URL" ]]; then
  echo "[backup-db] DATABASE_URL tidak ditemukan di $ENV_FILE" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "[backup-db] pg_dump tidak ditemukan. Install: apt-get install postgresql-client" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP_FILE="$BACKUP_DIR/bantuanku-${TIMESTAMP}.sql.gz"
TMP_FILE="${DUMP_FILE}.tmp"

echo "[backup-db] $(date -Iseconds) Dumping database ke $DUMP_FILE ..."
# --no-owner/--no-privileges: dump portable, tidak terikat role DB tujuan saat restore
if ! pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$TMP_FILE"; then
  echo "[backup-db] pg_dump GAGAL — hapus file parsial." >&2
  rm -f "$TMP_FILE"
  exit 1
fi
mv "$TMP_FILE" "$DUMP_FILE"

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "[backup-db] Dump selesai. Ukuran: $DUMP_SIZE"

if [[ -n "$RCLONE_REMOTE" ]]; then
  if command -v rclone >/dev/null 2>&1; then
    echo "[backup-db] Upload ke $RCLONE_REMOTE ..."
    if rclone copy "$DUMP_FILE" "$RCLONE_REMOTE" --quiet; then
      echo "[backup-db] Upload selesai."
    else
      echo "[backup-db] Upload GAGAL — backup lokal tetap ada di $DUMP_FILE" >&2
    fi
  else
    echo "[backup-db] RCLONE_REMOTE diset tapi rclone belum terpasang — skip upload." >&2
  fi
else
  echo "[backup-db] RCLONE_REMOTE belum diset — backup hanya tersimpan lokal di $DUMP_FILE"
fi

echo "[backup-db] Hapus backup lokal lebih dari $RETENTION_DAYS hari ..."
find "$BACKUP_DIR" -name "bantuanku-*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete

echo "[backup-db] $(date -Iseconds) Selesai."
