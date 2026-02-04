# Database Migration: Legacy Accounting → Liability Model

## Overview

Migration script untuk mengubah model akuntansi dari **Income/Expense** (for-profit) menjadi **Liability** (nonprofit) sesuai dengan filosofi akuntansi Bantuanku.

## Changes

### Account Code Mapping

| Legacy Code | Legacy Name | → | New Code | New Name |
|-------------|-------------|---|----------|----------|
| 1010 | Kas Legacy | → | 1020 | Bank - Operasional |
| 4010 | Pendapatan Donasi | → | 2010 | Titipan Dana Campaign |
| 5010 | Beban Program | → | 2010 | Titipan Dana Campaign |

### Journal Entry Changes

**Before (Legacy):**
```
Donation Received:
  Debit  1010 (Kas)                 Rp 100,000
  Credit 4010 (Pendapatan Donasi)   Rp 100,000

Disbursement Paid:
  Debit  5010 (Beban Program)       Rp 50,000
  Credit 1010 (Kas)                 Rp 50,000
```

**After (Liability Model):**
```
Donation Received:
  Debit  1020 (Bank Operasional)    Rp 100,000
  Credit 2010 (Titipan Dana)        Rp 100,000

Disbursement Paid:
  Debit  2010 (Titipan Dana)        Rp 50,000
  Credit 1020 (Bank Operasional)    Rp 50,000
```

## Prerequisites

1. **Backup Database** (CRITICAL!)
   ```bash
   pg_dump -h localhost -U postgres -d bantuanku > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Ensure seed has been run**
   ```bash
   cd packages/db
   npm run db:seed
   ```

3. **Verify target accounts exist**
   ```sql
   SELECT code, name FROM ledger_accounts WHERE code IN ('1010', '1020', '2010');
   ```

## How to Run

### 1. Dry Run (Check what will be migrated)

```bash
cd packages/db

# Set DATABASE_URL if not already set
export DATABASE_URL="postgresql://user:password@localhost:5432/bantuanku"

# Run migration in check mode (script will detect if migration is needed)
npm run migrate:liability -- migrate
```

### 2. Run Migration

```bash
cd packages/db
npm run migrate:liability -- migrate
```

### 3. Verify Results

After migration, verify:

```sql
-- Check if legacy accounts are marked
SELECT code, name FROM ledger_accounts
WHERE code IN ('1010', '4010', '5010');
-- Should return names with "(LEGACY - DO NOT USE)" suffix

-- Check balance integrity
SELECT
  le.entry_number,
  SUM(ll.debit) as total_debit,
  SUM(ll.credit) as total_credit,
  SUM(ll.debit) - SUM(ll.credit) as difference
FROM ledger_entries le
JOIN ledger_lines ll ON ll.entry_id = le.id
GROUP BY le.entry_number
HAVING SUM(ll.debit) != SUM(ll.credit);
-- Should return 0 rows (all entries balanced)

-- Check migrated entries
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
-- Should show entries using codes 1020 and 2010
```

## Migration Steps (Internal)

The script performs these steps:

1. **Check if migration needed** - Looks for legacy accounts (1010, 4010, 5010)
2. **Verify target accounts** - Ensures new accounts (1020, 2010) exist
3. **Build account mapping** - Maps old account IDs to new account IDs
4. **Analyze affected entries** - Finds all ledger lines using legacy accounts
5. **Migrate ledger lines** - Updates `ledger_lines.account_id` to new accounts
6. **Verify balance integrity** - Ensures all entries still balanced (debit = credit)
7. **Deactivate legacy accounts** - Marks old accounts as "LEGACY - DO NOT USE"
8. **Summary report** - Shows migration statistics

## Safety Features

- ✅ **Idempotent** - Safe to run multiple times (will skip if already migrated)
- ✅ **Balance verification** - Ensures debit = credit after migration
- ✅ **Audit trail** - Legacy accounts marked, not deleted
- ✅ **Progress reporting** - Shows detailed steps and counts
- ✅ **Error handling** - Stops on errors, doesn't corrupt data

## Rollback

### Option 1: Restore from Backup (RECOMMENDED)

```bash
# Stop application
# Restore database
psql -h localhost -U postgres -d bantuanku < backup_20260120_143000.sql

# Restart application
```

### Option 2: Manual Rollback

Script includes rollback function but it's **NOT fully implemented** due to complexity of distinguishing donation (4010) vs disbursement (5010) entries.

**Restore from backup is strongly recommended.**

## Testing

### Test on Staging First

1. Clone production database to staging
2. Run migration on staging
3. Test application thoroughly:
   - Create new donation → verify ledger entry uses 1020 & 2010
   - Process disbursement → verify ledger entry uses 2010 & 1020
   - Check reports → verify balance calculations correct
4. If all tests pass, proceed to production

### Test Cases

```bash
# After migration, test these scenarios:

# 1. New donation
curl -X POST http://localhost:50245/v1/donations \
  -H "Content-Type: application/json" \
  -d '{...}'
# Check: ledger entry should use 1020 (debit) and 2010 (credit)

# 2. Disbursement payment
# Admin UI: Create disbursement → Approve → Pay
# Check: ledger entry should use 2010 (debit) and 1020 (credit)

# 3. Balance report
# Check: Saldo 2010 = Total donations - Total disbursements
```

## Troubleshooting

### Error: "Target account X not found"

**Solution:** Run seed first
```bash
cd packages/db
npm run db:seed
```

### Error: "Balance integrity check failed"

**Cause:** Some ledger entries have debit ≠ credit (data corruption)

**Solution:**
1. Restore from backup
2. Fix unbalanced entries manually
3. Re-run migration

### Migration already completed

If you see "✓ No legacy accounts found", migration was already completed or accounts never existed.

## Impact

### Database Changes

- **ledger_lines table**: Updates `account_id` for all affected rows
- **ledger_accounts table**: Updates `name` for legacy accounts (adds "LEGACY" suffix)
- **No deletions**: All data preserved for audit trail

### Application Impact

- ✅ No code changes required (already using new model)
- ✅ No downtime (can run while app is running)
- ⚠️ Recommend running during low-traffic period

## Support

If migration fails or you encounter issues:

1. **DO NOT PANIC** - Data is not lost
2. Restore from backup
3. Document the error message
4. Check application logs
5. Contact developer for assistance

---

**Remember: Always backup before migration!**
