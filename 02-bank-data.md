# Arsitektur Data Bank

## Ringkasan

Data rekening bank organisasi disimpan sebagai **JSON di tabel `settings`**, bukan di tabel `bank_accounts`.

## Struktur Penyimpanan

### Database Schema

**Tabel: `settings`**
```sql
CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,      -- JSON string disimpan di sini
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  label TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Data Bank Example:**
```sql
INSERT INTO settings (key, value, category, type) VALUES (
  'payment_bank_accounts',
  '[
    {
      "id": "bank-1705123456",
      "bankName": "Bank BCA",
      "accountNumber": "1234567890",
      "accountName": "Yayasan ABC",
      "branch": "KCP Jakarta",
      "coaCode": "1120"
    },
    {
      "id": "bank-1705123789",
      "bankName": "Bank Mandiri",
      "accountNumber": "9876543210",
      "accountName": "Yayasan ABC",
      "branch": "",
      "coaCode": "1121"
    }
  ]',
  'payment',
  'json'
);
```

### TypeScript Interface

```typescript
interface BankAccountData {
  id: string;              // Format: "bank-{timestamp}"
  bankName: string;        // e.g., "Bank BCA"
  accountNumber: string;   // e.g., "1234567890"
  accountName: string;     // e.g., "Yayasan ABC"
  branch: string;          // e.g., "KCP Jakarta" (optional)
  coaCode: string;         // e.g., "1120" - Kode akun di chart of accounts
}
```

## Cara Mengakses Data Bank

### ❌ SALAH - Jangan Pakai Ini

```typescript
// JANGAN LAKUKAN INI
const banks = await db.query.bankAccounts.findMany();  // ❌ Table kosong!
```

### ✅ BENAR - Pakai Ini

```typescript
// 1. Ambil dari settings
const allSettings = await db.query.settings.findMany();
const paymentSettings = allSettings.filter((s: any) => s.category === "payment");
const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");

// 2. Parse JSON
let bankAccounts: BankAccountData[] = [];
if (bankAccountsSetting?.value) {
  try {
    bankAccounts = JSON.parse(bankAccountsSetting.value);
  } catch (e) {
    console.error("Failed to parse bank accounts:", e);
  }
}

// 3. Gunakan data
const bankBCA = bankAccounts.find(b => b.bankName.includes("BCA"));
console.log(bankBCA?.coaCode); // "1120"
```

## Lokasi Kode yang Menggunakan Data Bank

### 1. Admin UI - Manage Banks
**File:** `apps/admin/src/app/dashboard/settings/payments/page.tsx`

Fungsi:
- Admin menambah/hapus rekening bank
- Memilih COA code untuk setiap bank
- Menyimpan data sebagai JSON di settings

```typescript
// Load data
const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");
const accounts = JSON.parse(bankAccountsSetting.value);

// Save data
await api.put("/admin/settings/batch", [{
  key: "payment_bank_accounts",
  value: JSON.stringify(updatedAccounts),
  category: "payment",
  type: "json"
}]);
```

### 2. Payment Methods API
**File:** `apps/api/src/routes/payments.ts`

Fungsi:
- Menampilkan metode pembayaran yang tersedia untuk donatur
- Mengambil daftar bank dari settings

```typescript
// GET /methods endpoint (line 44-138)
const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");
if (bankAccountsSetting?.value) {
  const bankAccounts = JSON.parse(bankAccountsSetting.value);
  bankAccounts.forEach((bank: any) => {
    methods.push({
      id: bank.id,
      code: bank.id,
      name: `${bank.bankName} - ${bank.accountNumber}`,
      type: "bank_transfer",
      details: {
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        accountName: bank.accountName,
      },
    });
  });
}
```

### 3. Ledger Posting - Determine Bank Code
**File:** `apps/api/src/routes/payments.ts`

Fungsi:
- Menentukan kode akun bank untuk posting ledger
- Map dari payment method ID ke COA code

```typescript
// Helper function determineBankCode() (line 17-47)
async function determineBankCode(db: Database, paymentMethodId?: string): Promise<string> {
  if (paymentMethodId === 'cash') return '1110';

  const allSettings = await db.query.settings.findMany();
  const paymentSettings = allSettings.filter((s: any) => s.category === "payment");
  const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");

  let bankAccounts: any[] = [];
  if (bankAccountsSetting?.value) {
    bankAccounts = JSON.parse(bankAccountsSetting.value);
  }

  if (!paymentMethodId) {
    return bankAccounts[0]?.coaCode || '1120';
  }

  const bank = bankAccounts.find((b: any) =>
    paymentMethodId.toLowerCase().includes(b.id.toLowerCase())
  );

  return bank?.coaCode || '1120';
}

// Usage in webhook handler (line 333)
const bankCode = await determineBankCode(db, donation.paymentMethodId);
await createDonationLedgerEntry(db, {
  bankAccountCode: bankCode,  // Digunakan untuk posting ledger
  // ...
});
```

## Status Tabel `bank_accounts`

**⚠️ PENTING:** Tabel `bank_accounts` ADA di schema tapi **TIDAK DIGUNAKAN**

**File:** `packages/db/src/schema/bank.ts`

```typescript
export const bankAccounts = pgTable("bank_accounts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  bankCode: text("bank_code").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  branch: text("branch"),
  coaCode: text("coa_code").default("1120"),  // ← Field ini ditambahkan tapi tidak terpakai
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});
```

**Status:**
- ✅ Table exists in database
- ❌ No data seeded (`packages/db/src/seed.ts` line 271-273)
- ❌ Not used by any API or service
- 💡 Kept for potential future migration to relational model

## Alur Data: Admin → Database → Ledger

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Admin mengelola bank via UI                                     │
│    /dashboard/settings/payments                                     │
│                                                                     │
│    - Tambah bank: BCA, no rek 123, COA code 1120                   │
│    - Tambah bank: Mandiri, no rek 456, COA code 1121               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Data disimpan ke database                                       │
│    Table: settings                                                  │
│                                                                     │
│    key: "payment_bank_accounts"                                     │
│    value: '[{"id":"bank-123","bankName":"BCA",...}]'               │
│    category: "payment"                                              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Donatur pilih metode pembayaran                                 │
│    GET /methods → menampilkan list bank dari settings JSON         │
│                                                                     │
│    Donatur pilih: "Bank BCA - 1234567890"                          │
│    paymentMethodId = "bank-123"                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Pembayaran sukses → webhook                                     │
│    POST /payments/:gateway/webhook                                  │
│                                                                     │
│    determineBankCode(db, "bank-123")                                │
│      → Parse settings JSON                                          │
│      → Find bank dengan id "bank-123"                               │
│      → Return coaCode "1120"                                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Posting ke ledger                                               │
│    createDonationLedgerEntry(db, { bankAccountCode: "1120" })      │
│                                                                     │
│    Debit  1120 (Bank BCA)           Rp 100,000                     │
│    Credit 2210 (Titipan Dana)       Rp 100,000                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Perbandingan: JSON vs Relational

| Aspek | Settings JSON (Current) | bank_accounts Table |
|-------|------------------------|---------------------|
| **Storage** | 1 row, JSON di kolom `value` | Multiple rows, relational |
| **Schema Flexibility** | ✅ Flexible (bisa tambah field tanpa migration) | ❌ Rigid (butuh migration) |
| **Query Performance** | ⚠️ Harus parse JSON setiap query | ✅ Native SQL query, indexed |
| **Data Validation** | ⚠️ No schema enforcement | ✅ Database constraints |
| **Joins/Relations** | ❌ Tidak bisa JOIN | ✅ Bisa JOIN dengan tables lain |
| **Admin UI** | ✅ Sederhana, form langsung save JSON | ✅ Sama saja |
| **Current Status** | ✅ **DIGUNAKAN SEKARANG** | ❌ Tidak digunakan |

## FAQ

### Q: Kenapa tidak pakai tabel `bank_accounts`?
**A:** Karena sistem payment sudah menggunakan settings JSON sejak awal. Tabel `bank_accounts` dibuat untuk persiapan migrasi tapi belum diimplementasikan.

### Q: Apakah boleh menggunakan `bank_accounts` table?
**A:** **TIDAK untuk saat ini.** Semua kode existing menggunakan settings JSON. Jika ingin migrasi, harus:
1. Migrasi data dari settings JSON → bank_accounts table
2. Update semua kode di payments.ts, page.tsx
3. Test thoroughly
4. Deploy bersama-sama

### Q: Bagaimana cara menambah bank baru?
**A:** Admin ke `/dashboard/settings/payments` → Enable "Bank Transfer" → Tambah rekening → Pilih COA code → Simpan

### Q: Bagaimana cara mapping bank ke COA code?
**A:** Saat tambah bank, admin **wajib pilih COA code** dari dropdown (1110-1129). Dropdown diambil dari `chart_of_accounts` table dengan filter type=asset dan code 1110-1129.

### Q: Apa yang terjadi jika bank tidak punya `coaCode`?
**A:** Fungsi `determineBankCode()` akan return default `"1120"`. Tapi seharusnya tidak terjadi karena field COA Code **required** di form.

### Q: Bisakah satu bank digunakan untuk multiple campaign?
**A:** Ya. Bank account adalah metode pembayaran global. Semua campaign bisa menerima donasi via bank yang sama. Yang dibedakan adalah campaign_id di ledger entry.

## Migration Path (Future)

Jika suatu saat ingin migrasi ke relational model:

### 1. Buat migration script
```typescript
// Baca data dari settings JSON
const setting = await db.query.settings.findFirst({
  where: eq(settings.key, "payment_bank_accounts")
});

const banks = JSON.parse(setting.value);

// Insert ke bank_accounts table
for (const bank of banks) {
  await db.insert(bankAccounts).values({
    id: bank.id,
    bankCode: extractBankCode(bank.bankName),  // BCA, MANDIRI, etc
    bankName: bank.bankName,
    accountNumber: bank.accountNumber,
    accountName: bank.accountName,
    branch: bank.branch || "",
    coaCode: bank.coaCode,
    isActive: true,
    isDefault: false,
    sortOrder: 0,
  });
}
```

### 2. Update kode
- `apps/api/src/routes/payments.ts` → ganti query settings dengan query bank_accounts
- `apps/admin/src/app/dashboard/settings/payments/page.tsx` → buat API baru untuk CRUD bank_accounts

### 3. Deploy
- Run migration
- Deploy API changes
- Deploy admin UI changes
- Monitor for errors

### 4. Cleanup
- Remove settings.payment_bank_accounts
- Update dokumentasi

## Catatan Penting untuk Developer

⚠️ **JANGAN:**
- Menggunakan `db.query.bankAccounts` untuk ambil data bank
- Hardcode nama bank atau COA code
- Assume bank BCA selalu ada

✅ **LAKUKAN:**
- Selalu parse dari `settings.payment_bank_accounts`
- Handle case ketika JSON parse gagal
- Handle case ketika bank tidak ditemukan (return default "1120")
- Validasi `coaCode` exists di admin UI

## Kesimpulan

Data bank disimpan di **`settings` table dengan key `payment_bank_accounts` sebagai JSON string**. Bukan di tabel `bank_accounts`. Semua kode yang perlu akses data bank harus parse JSON dari settings.
