# Summary: PHASE 3 - Data Migration Script

## Status: ✅ COMPLETED

Migration script untuk mengubah model akuntansi dari Income/Expense ke Liability model telah selesai dibuat.

## Files Created

1. **Migration Script**
   - Path: `packages/db/src/migrations/migrate-to-liability-model.ts`
   - Size: ~300 lines
   - Language: TypeScript

2. **Migration Documentation**
   - Path: `packages/db/src/migrations/README.md`
   - Contains: Usage guide, test cases, troubleshooting

3. **Package Script**
   - File: `packages/db/package.json`
   - Added: `migrate:liability` command

## What the Migration Does

### Account Code Changes

```
1010 (Kas Legacy)          → 1020 (Bank - Operasional)
4010 (Pendapatan Donasi)   → 2010 (Titipan Dana Campaign)
5010 (Beban Program)       → 2010 (Titipan Dana Campaign)
```

### Journal Entry Changes

**BEFORE (Legacy - Income/Expense Model):**
```
Donasi masuk:
  Debit  1010 (Kas)                Rp 100,000
  Credit 4010 (Pendapatan Donasi)  Rp 100,000  ❌ Salah: Donasi = Revenue

Penyaluran:
  Debit  5010 (Beban Program)      Rp 50,000   ❌ Salah: Penyaluran = Expense
  Credit 1010 (Kas)                Rp 50,000
```

**AFTER (Liability Model - Nonprofit Standard):**
```
Donasi masuk:
  Debit  1020 (Bank Operasional)   Rp 100,000
  Credit 2010 (Titipan Dana)       Rp 100,000  ✅ Benar: Donasi = Liability

Penyaluran:
  Debit  2010 (Titipan Dana)       Rp 50,000   ✅ Benar: Penyaluran = Reduce Liability
  Credit 1020 (Bank Operasional)   Rp 50,000
```

## Migration Features

✅ **Idempotent** - Aman dijalankan berulang kali (skip jika sudah migrate)
✅ **Balance Check** - Verifikasi debit = credit setelah migration
✅ **Audit Trail** - Akun lama di-mark "LEGACY", tidak dihapus
✅ **Progress Report** - Tampilkan detail step dan jumlah data
✅ **Error Handling** - Stop saat error, tidak corrupt data
✅ **Dry Run Support** - Cek apa yang akan dimigrate sebelum eksekusi

## How to Use

### Step 1: Backup Database (CRITICAL!)

```bash
# PostgreSQL
pg_dump -h localhost -U postgres -d bantuanku > backup_$(date +%Y%m%d_%H%M%S).sql

# Atau via GUI (TablePlus, pgAdmin, dll)
```

### Step 2: Run Migration

```bash
cd packages/db

# Set DATABASE_URL jika belum
export DATABASE_URL="postgresql://user:password@localhost:5432/bantuanku"

# Run migration
npm run migrate:liability -- migrate
```

### Step 3: Verify Results

```sql
-- Cek legacy accounts sudah di-mark
SELECT code, name FROM ledger_accounts
WHERE code IN ('1010', '4010', '5010');
-- Should show: "... (LEGACY - DO NOT USE)"

-- Cek balance integrity
SELECT
  le.entry_number,
  SUM(ll.debit) as total_debit,
  SUM(ll.credit) as total_credit
FROM ledger_entries le
JOIN ledger_lines ll ON ll.entry_id = le.id
GROUP BY le.entry_number
HAVING SUM(ll.debit) != SUM(ll.credit);
-- Should return 0 rows (semua balance)

-- Cek migrated entries
SELECT
  le.entry_number,
  la.code,
  la.name,
  ll.debit,
  ll.credit,
  ll.description
FROM ledger_lines ll
JOIN ledger_entries le ON le.id = ll.entry_id
JOIN ledger_accounts la ON la.id = ll.account_id
WHERE le.ref_type IN ('donation', 'disbursement')
ORDER BY le.posted_at DESC
LIMIT 20;
-- Should show entries menggunakan 1020 dan 2010
```

## Migration Output Example

```
============================================================
MIGRATION: Legacy Accounting → Liability Model
============================================================

Step 1: Checking if migration is needed...
Found 3 legacy accounts. Starting migration...

Step 2: Verifying target accounts exist...
✓ Account 1010 - Kas exists
✓ Account 1020 - Bank - Operasional exists
✓ Account 2010 - Titipan Dana Campaign exists

Step 3: Building account mapping...
Account Mapping:
  1010 (Kas) → 1020 (Bank Operasional)
  4010 (Revenue) → 2010 (Titipan Dana Campaign)
  5010 (Expense) → 2010 (Titipan Dana Campaign)

Step 4: Analyzing affected ledger entries...
Found 45 ledger lines to migrate

Step 5: Migrating ledger lines...
  Migrated 10/45 lines...
  Migrated 20/45 lines...
  Migrated 30/45 lines...
  Migrated 40/45 lines...
✓ Migrated 45 ledger lines

Step 6: Verifying balance integrity...
✓ All ledger entries are balanced (debit = credit)

Step 7: Deactivating legacy accounts...
✓ Legacy accounts marked as LEGACY

============================================================
MIGRATION SUMMARY
============================================================
Ledger lines migrated: 45
Legacy accounts deactivated: 3
Balance check: PASSED ✓

Migration completed successfully!
============================================================
```

## Rollback Plan

### Option 1: Restore from Backup (RECOMMENDED)

```bash
# Stop application
systemctl stop bantuanku-api

# Restore database
psql -h localhost -U postgres -d bantuanku < backup_20260120_143000.sql

# Restart application
systemctl start bantuanku-api
```

### Option 2: Manual Rollback

Script includes rollback function tapi **TIDAK fully implemented** karena kompleksitas membedakan donation (4010) vs disbursement (5010).

**Restore from backup strongly recommended.**

## Testing Checklist

### Pre-Migration

- [ ] Backup database completed
- [ ] Verified backup can be restored
- [ ] Noted current record counts:
  - [ ] Total ledger_entries
  - [ ] Total ledger_lines
  - [ ] Legacy account usage count

### Post-Migration

- [ ] Migration completed without errors
- [ ] Balance integrity check passed
- [ ] Legacy accounts marked correctly
- [ ] New donation creates ledger with 1020 & 2010
- [ ] New disbursement creates ledger with 2010 & 1020
- [ ] Reports show correct balances
- [ ] Account 2010 balance = donations - disbursements

## Impact Assessment

### Database Changes

- **Modified Tables**: `ledger_lines`, `ledger_accounts`
- **Rows Updated**: Varies (depends on existing data)
- **Data Deleted**: None (audit trail preserved)
- **Schema Changes**: None

### Application Impact

- **Code Changes**: None required (already using new model)
- **Downtime**: None (can run while app is running)
- **Recommended**: Run during low-traffic period for safety

### User Impact

- **End Users**: No impact (transparent change)
- **Finance Admin**: May see "(LEGACY - DO NOT USE)" in old account names
- **Reports**: Should show same totals (just different account codes)

## Next Steps After Migration

Once migration is successful:

1. ✅ Mark PHASE 3 as completed in [01-ledger-perbaikan.md](01-ledger-perbaikan.md:414-455)
2. ⏭️ Proceed to PHASE 4: Enhancements
   - Transaction wrapper for atomicity
   - Liability balance report per campaign

## Support & Troubleshooting

Detailed troubleshooting guide available in:
- `packages/db/src/migrations/README.md`

Common issues:
- "Target account not found" → Run `npm run db:seed` first
- "Balance integrity failed" → Data corruption, restore from backup
- "Already migrated" → Safe to ignore, migration is idempotent

## References

- Philosophy: [01-ledger-philosofi.md](01-ledger-philosofi.md)
- Repair Plan: [01-ledger-perbaikan.md](01-ledger-perbaikan.md)
- Migration Script: `packages/db/src/migrations/migrate-to-liability-model.ts`
- Migration Guide: `packages/db/src/migrations/README.md`

---

**REMEMBER: Always backup before running migration in production!**
