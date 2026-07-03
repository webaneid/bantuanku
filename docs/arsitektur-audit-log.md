# Arsitektur Audit Log

Dokumen ini adalah source of truth untuk audit log sistem Bantuanku. Berdasarkan implementasi kode saat ini, audit log memiliki tabel dan endpoint baca, tetapi belum memiliki mekanisme pencatatan event yang aktif dan konsisten.

## Batas Scope

| Area | Masuk Dokumen Ini? | Catatan |
|---|---:|---|
| Tabel `audit_logs` | Ya | Model audit trail formal |
| `/admin/audit` | Ya | API baca audit log |
| `/admin/audit/stats` | Ya | Statistik audit log |
| Audit Kategori COA | Tidak | Itu laporan konsistensi kategori, lihat `docs/arsitektur-laporan.md` |
| Script `packages/db/audit-coa*.ts` | Tidak | Script inspeksi COA/manual, bukan audit log aplikasi |
| Root hardcode audit lama | Tidak | `hardcode-audit-frontend.md` sudah dihapus; substansinya masuk `docs/arsitektur-i18n.md` dan bukan audit log aplikasi |
| Field `createdBy` di domain model | Tidak langsung | Ini ownership/audit metadata domain, bukan event audit trail |

## Dokumen Terkait

| Arsitektur Terkait | Alasan Keterkaitan |
|---|---|
| `docs/arsitektur-auth.md` | User/role yang boleh melihat audit log |
| `docs/arsitektur-database.md` | Schema `audit_logs` dan timestamp |
| `docs/arsitektur-timezone.md` | Filter tanggal dan grouping by date audit |
| `docs/arsitektur-export-import.md` | Export data sensitif membutuhkan audit event |
| `docs/arsitektur-statistik.md` | Export statistik PII membutuhkan audit event |
| `docs/arsitektur-laporan.md` | Audit Kategori COA bukan audit log formal |
| `docs/arsitektur-media.md` | Upload/delete media direkomendasikan punya audit event |
| `docs/arsitektur-notifikasi.md` | WhatsApp AI/tool call belum punya audit trail permanen |
| `docs/arsitektur-observability-logging.md` | Runtime logs dan observability berbeda dari audit trail formal |

## File Implementasi

| Area | File |
|---|---|
| Schema DB | `packages/db/src/schema/audit.ts` |
| Initial migration | `packages/db/drizzle/0000_fluffy_moira_mactaggert.sql` |
| Export schema | `packages/db/src/schema/index.ts` |
| Admin API | `apps/api/src/routes/admin/audit.ts` |
| Admin route registration | `apps/api/src/routes/admin/index.ts` |
| Permission seed | `packages/db/src/seed.ts` |

Tidak ditemukan halaman admin aktif untuk melihat `/admin/audit`. Sidebar hanya menampilkan “Audit Kategori COA”, yang memakai reports consistency check, bukan `audit_logs`.

## Model Data

Tabel: `audit_logs`.

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | `text` PK | Default `createId()` di schema Drizzle |
| `user_id` | `text` FK users | Nullable |
| `action` | `text not null` | Nama aksi, tidak ada enum |
| `entity` | `text not null` | Nama entitas/domain, tidak ada enum |
| `entity_id` | `text` | ID target opsional |
| `old_data` | `jsonb` | Snapshot sebelum perubahan |
| `new_data` | `jsonb` | Snapshot setelah perubahan |
| `ip_address` | `text` | Opsional |
| `user_agent` | `text` | Opsional |
| `created_at` | `timestamptz` di schema aktual | Default now |

Catatan migrasi awal `0000_fluffy_moira_mactaggert.sql` membuat `created_at timestamp (3) DEFAULT now()`. Schema Drizzle saat ini sudah `withTimezone: true`, dan migrasi timezone system-wide mengonversi timestamp ke `timestamptz`.

## API Admin

Base route: `/v1/admin/audit`.

Route admin memasang:

1. `authMiddleware` global.
2. Global admin role.
3. `admin.use("/audit/*", staffOnly)`.
4. Handler audit memakai `requireRole("super_admin")`.

Jadi hanya `super_admin` yang boleh membaca audit log.

### `GET /admin/audit`

Fungsi: list audit logs dengan pagination dan filter.

Query:

| Query | Implementasi |
|---|---|
| `page` | Default `1` |
| `limit` | Default `20` |
| `entity` | `eq(auditLogs.entity, entity)` |
| `action` | `eq(auditLogs.action, action)` |
| `userId` | `eq(auditLogs.userId, userId)` |
| `startDate` | `gte(auditLogs.createdAt, new Date(startDate))` |
| `endDate` | `lte(auditLogs.createdAt, new Date(endDate))` |

Response memakai helper `paginated(c, data, { page, limit, total })`.

Implementasi mencoba memuat relasi:

```ts
with: {
  user: {
    columns: { id: true, name: true, email: true }
  }
}
```

Namun `packages/db/src/schema/audit.ts` tidak mendefinisikan `auditLogsRelations`. Ini berisiko membuat `db.query.auditLogs.findMany({ with: { user } })` gagal atau tidak tersedia tergantung konfigurasi Drizzle runtime.

### `GET /admin/audit/stats`

Fungsi: agregasi audit log.

Query:

| Query | Implementasi |
|---|---|
| `startDate` | `gte(auditLogs.createdAt, new Date(startDate))` |
| `endDate` | `lte(auditLogs.createdAt, new Date(endDate))` |

Response:

| Field | Query |
|---|---|
| `byEntity` | Count group by `auditLogs.entity` |
| `byAction` | Count group by `auditLogs.action` |
| `byDate` | Count group by `date(createdAt AT TIME ZONE 'Asia/Jakarta')` |

`byDate` sudah eksplisit memakai `Asia/Jakarta` untuk bucket tanggal.

## Permission Seed

`packages/db/src/seed.ts` memiliki permission:

```text
audit.view - View Audit Logs - module audit
```

Namun route `/admin/audit` saat ini tidak memakai permission granular ini. Akses ditentukan oleh role `super_admin` lewat `requireRole`.

## Status Writer Audit

Tidak ditemukan implementasi aktif untuk menulis audit log:

- Tidak ada `insert(auditLogs)` di route/service aplikasi.
- Tidak ada helper seperti `logAudit`, `createAuditLog`, atau middleware audit.
- Tidak ada event audit untuk create/update/delete master data.
- Tidak ada event audit untuk approve/reject/payment/disbursement.
- Tidak ada event audit untuk export data sensitif.
- Tidak ada event audit untuk login/logout atau perubahan role.

Artinya tabel `audit_logs` kemungkinan kosong kecuali ada proses eksternal/manual yang tidak ada di repository.

## UI Admin

Tidak ditemukan halaman seperti:

- `/dashboard/audit`
- `/dashboard/audit-log`
- menu sidebar Audit Log

Yang ada adalah:

- `/dashboard/reports/category-audit`

Halaman tersebut memakai `/admin/reports/consistency-check/details` untuk mendeteksi mismatch kategori `transactions` dan `disbursements`. Itu bukan audit trail user action.

## Perbedaan Audit Log vs Metadata Domain

Banyak tabel domain punya field seperti:

- `createdBy`
- `createdAt`
- `updatedAt`
- `approvedAt`
- `paidAt`
- `verifiedAt`

Field tersebut berguna, tetapi bukan pengganti audit log karena:

1. Tidak menyimpan before/after data.
2. Tidak menyimpan IP/user agent.
3. Tidak menyimpan alasan aksi.
4. Tidak mencatat event read/export.
5. Tidak selalu ada pada semua mutasi.

## Gap Implementasi

| Gap | Dampak | Rekomendasi |
|---|---|---|
| Tidak ada writer audit log | Endpoint audit tidak punya data operasional | Buat helper `createAuditLog()` dan panggil dari mutasi penting |
| Tidak ada middleware audit umum | Mutasi admin mudah lupa dicatat | Tambahkan pattern helper route-level, bukan otomatis buta untuk semua request |
| `auditLogsRelations` tidak didefinisikan | `GET /admin/audit` berisiko gagal saat memakai `with.user` | Tambahkan relation `auditLogs.user` atau ubah query ke explicit join |
| Tidak ada UI untuk melihat audit log formal | Super admin tidak punya cara admin panel untuk memakai endpoint | Buat halaman `/dashboard/audit` jika audit log mulai ditulis |
| Permission `audit.view` tidak dipakai | RBAC permission granular tidak efektif | Integrasikan permission check atau hapus/arsipkan permission jika role-only |
| `action` dan `entity` bebas string | Nilai audit tidak konsisten | Definisikan konstanta action/entity |
| Tidak ada audit event untuk export PII | Unduhan NIK/rekening/email tidak tercatat | Catat event export statistik/export report |
| Tidak ada audit untuk auth/role changes | Perubahan akses sulit dilacak | Catat login gagal berulang, role assignment, password reset admin |
| Tidak ada masking/redaction old/new data | PII/secret bisa tersimpan mentah di audit log | Redact password/token/secret dan masking field sensitif |
| Tidak ada retention policy | Tabel bisa tumbuh tanpa batas atau menyimpan PII terlalu lama | Tentukan retensi dan archive policy |
| Filter tanggal memakai `new Date("yyyy-MM-dd")` | Boundary list/stats bisa tidak sesuai WIB | Parse date input sebagai WIB sesuai `docs/arsitektur-timezone.md` |
| End date list tidak memakai end-of-day | Filter `endDate` hanya sampai midnight parse result | Gunakan end-of-day WIB |
| Tidak ada index eksplisit di schema Drizzle | Query filter entity/action/user/date bisa lambat | Tambahkan index untuk `createdAt`, `entity`, `action`, `userId` |
| Tidak ada audit integrity control | Row audit bisa diedit/dihapus oleh akses DB | Pertimbangkan append-only policy atau checksum jika high assurance dibutuhkan |

## Rekomendasi Event Minimal

Jika audit writer dibuat, event prioritas:

| Domain | Event |
|---|---|
| Auth/RBAC | login failed threshold, role assigned/revoked, password reset by admin |
| User/admin | create/update/delete users, employees, donatur, mustahiq, mitra |
| Finance | approve/reject/pay disbursement, ledger/manual finance action |
| Payment | approve/reject payment proof, manual payment adjustment |
| Export | export CSV/Excel yang berisi PII atau data finansial |
| Media | upload/delete media penting |
| Settings | update payment, WhatsApp, SEO, frontend/general settings |
| Campaign/Zakat/Qurban | create/update/delete program/periode/paket penting |

Minimal payload audit:

| Field | Isi |
|---|---|
| `userId` | Actor dari auth context |
| `action` | Konstanta aksi, contoh `update`, `delete`, `approve`, `export` |
| `entity` | Konstanta domain, contoh `donatur`, `disbursement`, `settings` |
| `entityId` | ID target jika ada |
| `oldData` | Snapshot terbatas sebelum perubahan |
| `newData` | Snapshot terbatas setelah perubahan |
| `ipAddress` | Header/request IP yang dipercaya |
| `userAgent` | Header `user-agent` |

## SOP Perubahan

1. Jangan menyebut “sudah ada audit trail” untuk suatu domain hanya karena ada `createdBy`; cek apakah ada insert ke `audit_logs`.
2. Jika menambah event audit, update dokumen ini dengan action/entity yang dipakai.
3. Jika export data sensitif ditambah, catat audit event di dokumen ini dan `docs/arsitektur-export-import.md`.
4. Jika audit log mulai menyimpan PII, wajib tentukan masking dan retention.
5. Jika UI audit dibuat, pastikan hanya `super_admin` atau permission setara yang bisa melihatnya.
6. Audit Kategori COA tetap didokumentasikan di laporan, bukan di dokumen audit log ini.
