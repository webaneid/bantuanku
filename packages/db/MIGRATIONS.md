# Database Migrations

## Migration Order

Semua migrasi database harus dijalankan dalam urutan berikut:

1. **0000_fluffy_moira_mactaggert.sql** - Base schema (users, campaigns, donations, dll)
2. **0001_update_disbursements.sql** - Create chart_of_accounts table
3. **0002_add_media_category.sql** - Add category column to media table
4. **0003_broad_slipstream.sql** - Create vendors & employees tables
5. **0004_rename_disbursements_to_ledger.sql** - Rename disbursements → ledger
6. **0005_create_accounting_tables.sql** - Create ledger_entries & ledger_lines
7. **0006_remove_payment_methods_fk.sql** - Remove FK payment_method_id
8. **0007_create_donation_evidences.sql** - Create donation_evidences table
9. **0008_create_activity_reports.sql** - Create activity_reports table

## Testing Migrations

Untuk test migrasi di database baru:

```bash
cd packages/db
node test-migration.mjs
```

Script ini akan:
1. Create temporary test database
2. Run semua migrasi dalam urutan
3. Verify tidak ada error
4. Cleanup test database

## Deployment ke Production

Ketika deploy ke server baru:

```bash
# 1. Pastikan PostgreSQL sudah running
# 2. Create database
createdb bantuanku

# 3. Run semua migrasi dalam urutan
cd packages/db/drizzle
for f in $(ls *.sql | sort); do
  psql bantuanku < $f
done
```

## Catatan Penting

⚠️ **JANGAN** mengubah nomor urut file migrasi yang sudah ada!

⚠️ **JANGAN** menghapus file migrasi lama!

⚠️ **SELALU** buat file migrasi baru dengan nomor berikutnya (0009, 0010, dst)

⚠️ **SELALU** test migrasi dengan `test-migration.mjs` sebelum deploy

## Struktur Tables

Setelah semua migrasi dijalankan, database akan memiliki tables:

- **Authentication**: users, roles, permissions, user_roles, role_permissions, audit_logs
- **Campaigns**: campaigns, campaign_updates, categories, pillars
- **Donations**: donations, donatur, payments, donation_evidences
- **Accounting**: ledger, ledger_entries, ledger_lines, chart_of_accounts, bank_accounts, invoices
- **HR**: employees, vendors
- **Media**: media
- **Zakat**: zakat_calculator_configs, zakat_calculation_logs
- **Content**: pages, notifications
- **Settings**: settings, payment_gateways, payment_gateway_credentials, payment_methods
- **Reports**: activity_reports
- **Evidence**: evidences

## Troubleshooting

### Error: table already exists

Jika migrasi gagal dengan error "table already exists", cek:
1. Apakah migrasi pernah dijalankan sebelumnya?
2. Apakah ada duplikat CREATE TABLE di beberapa file migrasi?

### Error: column already exists

Jika migrasi gagal dengan error "column already exists", cek:
1. Apakah ada duplikat ALTER TABLE ADD COLUMN?
2. Gunakan `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` untuk safety

### Error: foreign key constraint

Jika migrasi gagal dengan foreign key error, pastikan:
1. Table referensi sudah dibuat lebih dulu
2. Column referensi ada di table referensi
3. Urutan migrasi sudah benar
