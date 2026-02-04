# Rencana Perbaikan Sistem Ledger Bantuanku

> Dokumen ini berisi rencana perbaikan untuk menyelaraskan implementasi sistem dengan filosofi akuntansi yang telah ditetapkan di `01-ledger-philosofi.md`.

---

## 🎯 Tujuan Perbaikan

Menyelaraskan implementasi sistem keuangan Bantuanku agar:
1. **Konsisten** dengan filosofi: Donasi = Titipan (Liability), bukan Revenue
2. **Akurat** dalam pelaporan: Cash flow dan laporan keuangan sesuai standar nonprofit
3. **Traceable**: Setiap transaksi donasi dan penyaluran memiliki jejak ledger yang jelas
4. **Validated**: Sistem menolak konfigurasi COA yang tidak konsisten

---

## 📋 Gap Analysis Summary

| # | Masalah | Dampak | Prioritas |
|---|---------|--------|-----------|
| 1 | Jurnal donasi menggunakan Revenue (4010) bukan Liability (2210) | Saldo liability tidak akurat, pendapatan overstated | **CRITICAL** |
| 2 | Jurnal penyaluran menggunakan Expense (5010) bukan reduce Liability | Expense overstated, liability tidak berkurang | **CRITICAL** |
| 3 | Report logic based on normalBalance, bukan account type | COA type=expense normalBalance=credit salah masuk debit | **HIGH** |
| 4 | Disbursement paid tidak posting ke ledger | Tidak ada jejak akuntansi penyaluran | **HIGH** |
| 5 | Tidak ada validasi COA type vs normalBalance | User bisa buat COA inconsistent | **MEDIUM** |
| 6 | Legacy account codes (1010, 4010, 5010) vs new codes | Inconsistency, confusion | **MEDIUM** |
| 7 | Tidak ada transaction wrapper untuk posting | Risk of partial data saat error | **LOW** |

---

## 🔧 Rencana Perbaikan Detail

### **PHASE 1: Quick Wins (Perbaikan Cepat)**

#### **Perbaikan #1: Fix Report Logic**
**File:** `apps/admin/src/app/dashboard/reports/page.tsx`
**Line:** 79-104
**Status:** ❌ Bug Active

**Masalah:**
```typescript
// Line 93-94: Logic salah
const isExpense = normalBalance === 'debit';
const isIncome = normalBalance === 'credit';

// Line 101-102: Kategorisasi salah
debit: isIncome ? entry.amount : 0,    // ❌ Expense dengan normalBalance=credit masuk DEBIT
credit: isExpense ? entry.amount : 0,
```

**Solusi:**
```typescript
// Ganti dari normalBalance → type
const accountType = entry.expenseAccount?.type || 'expense';

// Cash flow perspective: fokus pada arah uang dari perspektif KAS
// - Expense & Asset: uang KELUAR dari kas → Credit di cash flow
// - Income, Liability, Equity: uang MASUK ke kas → Debit di cash flow
const isCashOutflow = ['expense', 'asset'].includes(accountType);
const isCashInflow = ['income', 'liability', 'equity'].includes(accountType);

return {
  id: entry.id,
  date: new Date(entry.paidAt || entry.approvedAt || entry.createdAt),
  description: `${entry.purpose} untuk program ${programName}. Dikeluarkan oleh ${approverName}, dibayarkan kepada ${recipientName}`,
  category: entry.expenseAccount?.name || "Pengeluaran Program",
  debit: isCashInflow ? entry.amount : 0,   // Uang MASUK ke kas
  credit: isCashOutflow ? entry.amount : 0, // Uang KELUAR dari kas
};
```

**Testing:**
- Buat COA type=expense, normalBalance=credit
- Buat disbursement menggunakan COA tersebut
- Cek di dashboard/reports → harus masuk kolom Credit (pengeluaran)

---

#### **Perbaikan #2: Add COA Validation**
**File:** `apps/api/src/routes/admin/coa.ts`
**Line:** 114-133 (POST), 145-177 (PATCH)
**Status:** ❌ Missing Validation

**Masalah:**
User bisa membuat COA dengan kombinasi type + normalBalance yang salah, misalnya:
- type=expense, normalBalance=credit ❌
- type=liability, normalBalance=debit ❌

**Solusi:**
Tambahkan validasi setelah line 116 (POST) dan line 148 (PATCH):

```typescript
// Validation function
function validateCOAConsistency(type: string, normalBalance: string): { valid: boolean; error?: string } {
  const rules: Record<string, string> = {
    'asset': 'debit',
    'expense': 'debit',
    'liability': 'credit',
    'equity': 'credit',
    'income': 'credit',
  };

  const expectedBalance = rules[type];
  if (!expectedBalance) {
    return { valid: false, error: `Invalid account type: ${type}` };
  }

  if (expectedBalance !== normalBalance) {
    return {
      valid: false,
      error: `Account type "${type}" must have normalBalance="${expectedBalance}", got "${normalBalance}"`
    };
  }

  return { valid: true };
}

// Di POST handler, setelah line 116:
const validation = validateCOAConsistency(body.type, body.normalBalance);
if (!validation.valid) {
  return errorResponse(c, validation.error, 400);
}

// Di PATCH handler, setelah line 148 (jika body.type atau body.normalBalance diubah):
if (body.type || body.normalBalance) {
  const newType = body.type || existing.type;
  const newBalance = body.normalBalance || existing.normalBalance;
  const validation = validateCOAConsistency(newType, newBalance);
  if (!validation.valid) {
    return errorResponse(c, validation.error, 400);
  }
}
```

**Testing:**
- POST COA dengan type=expense, normalBalance=credit → harus error 400
- PATCH COA ubah normalBalance dari debit ke credit (tapi type=expense) → harus error 400

---

### **PHASE 2: Core Accounting Fixes (Perbaikan Inti)**

#### **Perbaikan #3: Implement Ledger Posting on Disbursement Paid**
**File:** `apps/api/src/routes/admin/ledger.ts`
**Line:** 463-465
**Status:** ❌ TODO Not Implemented

**Masalah:**
```typescript
// TODO: Create ledger entry when paying
// This will be implemented in the ledger service
```

Saat disbursement status → paid, TIDAK ada posting ke ledger.

**Solusi:**
```typescript
// Ganti TODO dengan actual implementation
import { createDisbursementLedgerEntry } from "../../services/ledger";

// Di dalam handler POST /:id/pay, setelah line 449 (setelah update status paid):

// Get campaign for ledger entry
const campaign = await db.query.campaigns.findFirst({
  where: eq(campaigns.id, existing.campaignId),
});

const expenseAccount = await db.query.chartOfAccounts.findFirst({
  where: eq(chartOfAccounts.id, existing.expenseAccountId),
});

// Create ledger entry
await createDisbursementLedgerEntry(db, {
  disbursementId: id,
  amount: existing.amount,
  purpose: existing.purpose,
  recipientName: existing.recipientName,
  campaignTitle: campaign?.title || 'Unknown',
  expenseAccountCode: expenseAccount?.code || '5010',
  createdBy: user.id,
});
```

**Update Service:**
File: `apps/api/src/services/ledger.ts`
Line: 90-110

Tambahkan parameter `expenseAccountCode` dan `campaignTitle`:
```typescript
export async function createDisbursementLedgerEntry(
  db: Database,
  params: {
    disbursementId: string;
    amount: number;
    purpose: string;
    recipientName: string;
    campaignTitle: string;         // ← Tambah
    expenseAccountCode: string;     // ← Tambah
    createdBy?: string;
  }
) {
  return createLedgerEntry(db, {
    refType: "disbursement",
    refId: params.disbursementId,
    memo: `Penyaluran: ${params.purpose} kepada ${params.recipientName} untuk ${params.campaignTitle}`,
    createdBy: params.createdBy,
    lines: [
      {
        accountCode: params.expenseAccountCode,
        debit: params.amount,
        description: `${params.purpose} - ${params.campaignTitle}`
      },
      {
        accountCode: "1120", // Bank BCA (atau dynamic berdasarkan payment method)
        credit: params.amount,
        description: "Cash/Bank Out"
      },
    ],
  });
}
```

**Testing:**
- Buat disbursement → submit → approve → pay
- Cek tabel `ledger_entries` dan `ledger_lines` → harus ada entry baru
- Verify: debit = expense account, credit = bank account

---

#### **Perbaikan #4: Migrate to Liability Model (Core Fix)**
**File:** `apps/api/src/services/ledger.ts`
**Line:** 68-110
**Status:** ❌ Wrong Accounting Model

**Masalah:**
Sistem menggunakan model Income/Expense (for-profit), seharusnya Liability (nonprofit).

**Current:**
```typescript
// Donasi
Debit  1010 (Cash)
Credit 4010 (Revenue) ❌

// Penyaluran
Debit  5010 (Expense) ❌
Credit 1010 (Cash)
```

**Target (sesuai filosofi):**
```typescript
// Donasi
Debit  1120 (Bank BCA)
Credit 2210 (Titipan Dana Campaign) ✅

// Penyaluran
Debit  2210 (Titipan Dana Campaign) ✅
Credit 1120 (Bank BCA)
```

**Solusi:**

1. **Update createDonationLedgerEntry:**
```typescript
export async function createDonationLedgerEntry(
  db: Database,
  params: {
    donationId: string;
    amount: number;
    campaignTitle: string;
    donorName: string;
    paymentMethod?: string;      // ← Tambah untuk dynamic bank account
    bankAccountCode?: string;    // ← Tambah
    createdBy?: string;
  }
) {
  // Tentukan kode bank berdasarkan payment method
  const bankCode = params.bankAccountCode || "1120"; // Default: Bank BCA

  return createLedgerEntry(db, {
    refType: "donation",
    refId: params.donationId,
    memo: `Donasi dari ${params.donorName} untuk ${params.campaignTitle}`,
    createdBy: params.createdBy,
    lines: [
      {
        accountCode: bankCode,
        debit: params.amount,
        description: `Terima donasi via ${params.paymentMethod || 'Transfer Bank'}`
      },
      {
        accountCode: "2210", // Titipan Dana Campaign (LIABILITY)
        credit: params.amount,
        description: `Titipan donasi untuk ${params.campaignTitle}`
      },
    ],
  });
}
```

2. **Update createDisbursementLedgerEntry:**
```typescript
export async function createDisbursementLedgerEntry(
  db: Database,
  params: {
    disbursementId: string;
    amount: number;
    purpose: string;
    recipientName: string;
    campaignTitle: string;
    paymentMethod?: string;      // ← Tambah
    bankAccountCode?: string;    // ← Tambah
    createdBy?: string;
  }
) {
  const bankCode = params.bankAccountCode || "1120";

  return createLedgerEntry(db, {
    refType: "disbursement",
    refId: params.disbursementId,
    memo: `Penyaluran: ${params.purpose} kepada ${params.recipientName} untuk ${params.campaignTitle}`,
    createdBy: params.createdBy,
    lines: [
      {
        accountCode: "2210", // Titipan Dana Campaign (LIABILITY)
        debit: params.amount,
        description: `Penyaluran titipan untuk ${params.campaignTitle}`
      },
      {
        accountCode: bankCode,
        credit: params.amount,
        description: `Bayar ke ${params.recipientName} via ${params.paymentMethod || 'Transfer Bank'}`
      },
    ],
  });
}
```

3. **Update caller di payments.ts:**
File: `apps/api/src/routes/payments.ts`
Line: 328-333

```typescript
// Ambil payment method info
const payment = await db.query.payments.findFirst({
  where: eq(payments.donationId, donation.id),
});

const method = payment?.methodId ? await db.query.paymentMethods.findFirst({
  where: eq(paymentMethods.id, payment.methodId),
}) : null;

await createDonationLedgerEntry(db, {
  donationId: donation.id,
  amount: donation.amount,
  campaignTitle: campaign.title,
  donorName: donation.donorName,
  paymentMethod: method?.name || donation.paymentMethodId || 'Unknown',
  bankAccountCode: determineBankCode(donation.paymentMethodId), // Helper function
});
```

**Helper function (UPDATED - Dynamic from settings.payment_bank_accounts):**
```typescript
async function determineBankCode(db: Database, paymentMethodId?: string): Promise<string> {
  // Handle cash
  if (paymentMethodId === 'cash') return '1110';

  // Get bank accounts from settings JSON
  const allSettings = await db.query.settings.findMany();
  const paymentSettings = allSettings.filter((s: any) => s.category === "payment");
  const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");

  let bankAccounts: any[] = [];
  if (bankAccountsSetting?.value) {
    try {
      bankAccounts = JSON.parse(bankAccountsSetting.value);
    } catch (e) {
      console.error("Failed to parse bank accounts:", e);
    }
  }

  if (!paymentMethodId) {
    // Get first bank or default to 1120
    return bankAccounts[0]?.coaCode || '1120';
  }

  // Try to find bank by matching payment method ID
  const bank = bankAccounts.find((b: any) =>
    paymentMethodId.toLowerCase().includes(b.id.toLowerCase())
  );

  return bank?.coaCode || '1120';
}
```

**Data Source:**
- Bank data stored in `settings` table with key `payment_bank_accounts` as JSON
- JSON structure: `{ id, bankName, accountNumber, accountName, branch, coaCode }`
- Admin manages banks via UI at `/dashboard/settings/payments`
- When adding bank, admin must select COA code from dropdown (filtered 1110-1129)
- No hardcoded bank mappings - all dynamic from admin input

**Testing:**
- Buat donasi → success → cek ledger_entries
  - Debit: 1120 (Bank)
  - Credit: 2210 (Titipan Dana)
- Buat disbursement → paid → cek ledger_entries
  - Debit: 2210 (Titipan Dana)
  - Credit: 1120 (Bank)
- Query saldo akun 2210 → harus = total donasi - total penyaluran

---

### **PHASE 3: Data Migration & Cleanup**

#### **Perbaikan #5: Migrate Existing Ledger Entries**
**File:** `packages/db/src/migrations/migrate-to-liability-model.ts`
**Status:** ✅ COMPLETED

**Masalah:**
Ledger entries yang sudah ada menggunakan akun lama (1010, 4010, 5010).

**Solusi:**
Migration script telah dibuat dengan fitur:

- ✅ Account mapping: 1010 → 1120, 4010 → 2210, 5010 → 2210
- ✅ Balance integrity check (ensure debit = credit)
- ✅ Idempotent (safe to run multiple times)
- ✅ Audit trail (legacy accounts marked, not deleted)
- ✅ Progress reporting
- ✅ Error handling

**Cara menjalankan:**
```bash
# 1. Backup database
pg_dump -h localhost -U postgres -d bantuanku > backup.sql

# 2. Run migration
cd packages/db
npm run migrate:liability -- migrate

# 3. Verify results
# Check SQL queries di packages/db/src/migrations/README.md
```

**Dokumentasi lengkap:** `packages/db/src/migrations/README.md`

**Testing:**
- [ ] Backup database
- [ ] Run migration di staging
- [ ] Verify balance integrity
- [ ] Test new donation → check ledger uses 1120 & 2210
- [ ] Test disbursement → check ledger uses 2210 & 1120
- [ ] If pass, run di production

---

#### **Perbaikan #6: Remove Legacy Accounts**
**File:** `packages/db/src/seed.ts`
**Line:** 257-267
**Status:** ⚠️ Deprecation

**Masalah:**
Ada legacy accounts (1010, 4010, 5010) yang conflict dengan COA baru.

**Solusi:**
1. Pastikan semua referensi sudah migrate ke COA baru
2. Hapus seed legacy accounts (line 257-272)
3. Update semua hardcoded references di codebase

**Verification:**
```bash
# Search for hardcoded account codes
grep -r "1010\|4010\|5010" apps/api/src/
```

---

### **PHASE 4: Enhancements**

#### **Perbaikan #7: Add Transaction Wrapper**
**File:** `apps/api/src/routes/payments.ts`, `apps/api/src/routes/admin/ledger.ts`
**Status:** 🔄 Enhancement

**Tujuan:**
Ensure atomicity: jika posting ledger gagal, rollback update status donation/disbursement.

**Solusi:**
```typescript
// Wrap dalam transaction
await db.transaction(async (tx) => {
  // 1. Update donation/disbursement status
  await tx.update(donations).set({ paymentStatus: 'success' }).where(...);

  // 2. Update campaign collected
  await tx.update(campaigns).set({ collected: ... }).where(...);

  // 3. Create ledger entry
  await createDonationLedgerEntry(tx, { ... });

  // Jika salah satu gagal, semua di-rollback
});
```

---

#### **Perbaikan #8: Add Liability Balance Report**
**File:** Buat baru `apps/admin/src/app/dashboard/reports/liability-balance/page.tsx`
**Status:** 🆕 New Feature

**Tujuan:**
Tampilkan saldo titipan dana per campaign.

**UI:**
```
Campaign                | Donasi Masuk | Disalurkan | Sisa Titipan
------------------------|--------------|------------|-------------
Bencana Alam           | 500.000.000  | 300.000.000| 200.000.000
Wakaf Sumur            | 300.000.000  | 150.000.000| 150.000.000
```

**Query:**
```sql
SELECT
  c.title,
  COALESCE(SUM(CASE WHEN ll.debit > 0 THEN ll.credit ELSE 0 END), 0) as donasi_masuk,
  COALESCE(SUM(CASE WHEN ll.debit > 0 AND la.code = '2210' THEN ll.debit ELSE 0 END), 0) as disalurkan,
  ... as sisa_titipan
FROM campaigns c
LEFT JOIN ledger_entries le ON le.ref_type = 'donation' AND le.ref_id IN (SELECT id FROM donations WHERE campaign_id = c.id)
LEFT JOIN ledger_lines ll ON ll.entry_id = le.id
LEFT JOIN chart_of_accounts la ON la.id = ll.account_id
WHERE la.code = '2210'
GROUP BY c.id
```

---

## 📊 Implementation Timeline

| Phase | Task | Estimasi | Prioritas |
|-------|------|----------|-----------|
| 1 | Fix Report Logic | 1 jam | HIGH |
| 1 | Add COA Validation | 1 jam | MEDIUM |
| 2 | Implement Disbursement Posting | 2 jam | HIGH |
| 2 | Migrate to Liability Model | 4 jam | CRITICAL |
| 3 | Data Migration Script | 3 jam | CRITICAL |
| 3 | Remove Legacy Accounts | 1 jam | MEDIUM |
| 4 | Add Transaction Wrapper | 2 jam | LOW |
| 4 | Liability Balance Report | 4 jam | LOW |
| **TOTAL** | | **18 jam** | |

---

## ✅ Testing Checklist

### Manual Testing
- [ ] Donasi baru → verify ledger entry (Debit: Bank, Credit: Liability 2210)
- [ ] Disbursement paid → verify ledger entry (Debit: Liability 2210, Credit: Bank)
- [ ] Report page → verify expense dengan normalBalance=credit masuk kolom Credit
- [ ] COA create → verify validation reject type=expense + normalBalance=credit
- [ ] COA update → verify validation saat ubah type/normalBalance
- [ ] Liability balance → verify saldo = donasi - penyaluran per campaign

### Automated Testing
- [ ] Unit test: validateCOAConsistency()
- [ ] Unit test: determineBankCode()
- [ ] Integration test: donation flow + ledger posting
- [ ] Integration test: disbursement flow + ledger posting
- [ ] Integration test: transaction rollback saat error

---

## 🚨 Rollback Plan

Jika terjadi masalah setelah deployment:

1. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Restore database (jika sudah migration):**
   ```bash
   # Restore dari backup sebelum migration
   pg_restore -d bantuanku backup_before_migration.sql
   ```

3. **Disable new features via feature flag:**
   - Set `USE_LIABILITY_MODEL=false` di env
   - Fallback ke logic lama

---

## 📚 References

- Filosofi: `01-ledger-philosofi.md`
- Current Code:
  - `apps/api/src/services/ledger.ts`
  - `apps/api/src/routes/admin/ledger.ts`
  - `apps/api/src/routes/payments.ts`
  - `apps/admin/src/app/dashboard/reports/page.tsx`
- Schema: `packages/db/src/schema/accounting.ts`, `packages/db/src/schema/coa.ts`

---

## 👥 Stakeholders

- **Developer:** Implementor perubahan code
- **Finance Admin:** Validator logic akuntansi
- **QA:** Testing sebelum production
- **Super Admin:** Final approval sebelum deployment

---

**Catatan Penting:**
- Backup database sebelum menjalankan migration
- Test di staging environment dulu
- Monitor error logs setelah deployment
- Siapkan rollback plan

---

*Dokumen ini akan di-update seiring progress implementasi.*
