# Arsitektur Disbursement

> Terakhir di-sync: 2026-07-02  
> Menggantikan: `00-helper-rekening.md`

---

## Overview

Disbursement adalah pencairan dana dari LAZ ke pihak penerima (vendor, karyawan, mustahiq, fundraiser, mitra, coordinator). Semua pencairan melewati approval workflow sebelum dibayar.

---

## Schema Database

### `disbursements`
```
id                  text PK (createId)
disbursementNumber  text UNIQUE NOT NULL    -- format: "DSB-20250702-A3XK"

-- Tipe pencairan
disbursementType    text NOT NULL
  -- "campaign"       pencairan dana program
  -- "zakat"          distribusi zakat
  -- "qurban"         penyaluran qurban
  -- "operational"    biaya operasional
  -- "vendor"         pembayaran vendor
  -- "revenue_share"  bagi hasil / komisi fundraiser
  -- "salary"         gaji karyawan

-- Referensi opsional (polymorphic)
referenceType       text        -- "campaign" | "zakat_period" | dll.
referenceId         text
referenceName       text

-- Detail dana
amount              bigint NOT NULL
transactionType     text DEFAULT "expense"
category            text NOT NULL

-- Sumber dana
sourceBankId        text
sourceBankName      text
sourceBankAccount   text

-- Penerima
recipientType       text        -- "vendor" | "employee" | "coordinator" | "mustahiq" | "manual" | "fundraiser" | "mitra"
recipientId         text        -- ID entitas penerima
recipientName       text NOT NULL
recipientContact    text
recipientBankName   text
recipientBankAccount        text
recipientBankAccountName    text

-- Tujuan
purpose             text
description         text
notes               text

-- Bukti bayar
paymentProof        text        -- URL gambar
paymentMethod       text

-- Detail eksekusi transfer
transferProofUrl    text
transferDate        timestamptz
transferredAmount   bigint
additionalFees      bigint DEFAULT 0
destinationBankId   text

-- Workflow status
status              text DEFAULT "draft"
  -- "draft" → "submitted" → "approved" → "paid"
  --                       → "rejected"
rejectionReason     text

-- Audit trail
createdBy           text FK users.id
submittedBy         text FK users.id
approvedBy          text FK users.id
rejectedBy          text FK users.id
paidBy              text FK users.id

createdAt / submittedAt / approvedAt / rejectedAt / paidAt   timestamptz

-- Backward compat
expenseAccountId    text FK chart_of_accounts.id
ledgerEntryId       text FK ledger_entries.id
typeSpecificData    jsonb
```

---

## Rekening Bank Penerima (entityBankAccounts)

### Tabel `entity_bank_accounts`
```
id                  text PK
entityType          text NOT NULL   -- "vendor" | "employee" | "donor" | "mustahiq"
entityId            text NOT NULL   -- ID entitas
bankName            text NOT NULL
accountNumber       text NOT NULL
accountHolderName   text NOT NULL
createdAt / updatedAt   timestamptz
```

### Pattern Query
```ts
// Ambil rekening untuk satu entitas
db.select().from(entityBankAccounts)
  .where(and(
    eq(entityBankAccounts.entityType, "employee"),
    eq(entityBankAccounts.entityId, employeeId)
  ))
  .orderBy(desc(entityBankAccounts.createdAt))
  .limit(1)
```

### Auto-fetch Rekening Employee
Saat buat disbursement dengan `recipientType = "employee"` dan `recipientBankAccount` kosong:
API otomatis fetch rekening dari `entity_bank_accounts` dan isi field bank penerima.
File: `apps/api/src/routes/admin/disbursements.ts`

---

## Approval Workflow

```
draft
  │
  ├── submit → submitted
  │              │
  │              ├── approve → approved
  │              │                │
  │              │                └── mark-paid → paid
  │              │
  │              └── reject → rejected
  │
  └── (dibuat langsung submitted jika auto-submit)
```

Setiap transisi dicatat dengan kolom `*At` dan `*By`.

---

## API Endpoints

### Admin

| Method | Path | Guard | Fungsi |
|--------|------|-------|--------|
| `GET` | `/v1/admin/disbursements` | staff + mitra | List disbursement (filter: type, status) |
| `GET` | `/v1/admin/disbursements/:id` | staff + mitra | Detail + history |
| `POST` | `/v1/admin/disbursements` | staff + mitra | Buat disbursement baru |
| `PUT` | `/v1/admin/disbursements/:id` | staff + mitra | Update disbursement (draft only) |
| `PATCH` | `/v1/admin/disbursements/:id/status` | role-based | Transisi status (lihat di bawah) |
| `POST` | `/v1/admin/disbursements/:id/mark-paid` | super_admin, admin_finance | Tandai sudah dibayar |

**Tidak ada** endpoint `/submit`, `/approve`, `/reject` terpisah — semua via `PATCH /:id/status` dengan body `{ status, rejection_reason? }`.

### Role Constraints pada PATCH /status

| Role | Status yang boleh di-set |
|------|--------------------------|
| `super_admin`, `admin_finance` | semua status |
| `admin_campaign` | hanya `"submitted"` |
| `program_coordinator` | hanya `"submitted"` (disbursement miliknya) |
| `employee` | hanya `"submitted"` (disbursement miliknya) |
| `mitra` | hanya `"submitted"` (disbursement miliknya) |

### Fundraiser (self-service)

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/fundraisers/me/disbursements` | List pencairan sendiri |
| `POST` | `/v1/fundraisers/me/disbursements` | Ajukan pencairan |

---

## Komponen Admin — BankAccountForm

File: `apps/admin/src/components/forms/BankAccountForm.tsx`

```ts
interface BankAccountValue {
  id?: string;              // ada jika sudah tersimpan di DB
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}
```

**Fitur**: repeater (bisa banyak rekening), tambah/hapus, disabled mode untuk view-only.

### Pattern penggunaan di modal

```tsx
// useMemo untuk data awal dari API
const bankAccountsData = useMemo<BankAccountValue[]>(() => {
  return entity?.bankAccounts ?? [];
}, [entity]);

// useState untuk perubahan user
const [bankAccountsFormData, setBankAccountsFormData] = useState<BankAccountValue[]>([]);

// Render
<BankAccountForm
  value={bankAccountsData}
  onChange={setBankAccountsFormData}
  disabled={isViewMode}
/>

// Submit
const payload = { ...formData, bankAccounts: bankAccountsFormData };
```

### Entity Types yang Pakai BankAccountForm

| Entity | entityType |
|--------|------------|
| Vendor | `"vendor"` |
| Employee | `"employee"` |
| Donatur | `"donor"` |
| Mustahiq | `"mustahiq"` |

---

## Halaman Admin

| Route | Fungsi |
|-------|--------|
| `/dashboard/disbursements` | List semua disbursement |
| `/dashboard/disbursements/new` | Buat disbursement baru |
| `/dashboard/disbursements/:id` | Detail + approve/reject/mark-paid |
| `/dashboard/master/employees/:id` | Detail employee dengan rekening bank |
| `/dashboard/master/vendors/:id` | Detail vendor dengan rekening bank |

---

## Disbursement Revenue Share

Detail arsitektur revenue share, formula kalkulasi, dan semua pihak penerima: lihat `arsitektur-revenue-share.md`.

### Fundraiser

Pencairan komisi fundraiser:
- `disbursementType = "revenue_share"`, `category = "revenue_share_fundraiser"`
- `recipientType = "fundraiser"`, `recipientId = fundraiser.id`
- Minimum Rp 500.000, biaya transfer Rp 6.500
- Dibuat via `POST /v1/fundraisers/me/disbursements` (self-service)
- Tabel `disbursement_revenue_share_items` menyimpan alokasi per `revenue_shares` record — di-INSERT saat disbursement berpindah ke status `"submitted"`, di-DELETE+re-INSERT jika diubah

### Mitra

Pencairan bagian mitra dari revenue share:
- `disbursementType = "revenue_share"`, `category = "revenue_share_mitra"`
- `recipientType = "mitra"`, `recipientId = mitra.id`
- Saldo berasal dari `mitra.currentBalance` yang naik setiap transaksi `paid` via `applyMitraRevenue()`
- Dibuat manual oleh admin

---

---

## API Bank Accounts

Route: `apps/api/src/routes/admin/bank-accounts.ts`, mounted di `/admin/bank-accounts`, guard `staffOnly`.

**Perbedaan penting**: dua sumber rekening bank berbeda di sistem ini:

| Sumber | Tabel | Dipakai untuk |
|--------|-------|---------------|
| `payment_bank_accounts` (settings JSON) | `settings` | Rekening penerima donasi (tujuan transfer donatur) + source bank disbursement |
| `entity_bank_accounts` | `entity_bank_accounts` | Rekening penerima disbursement (vendor/employee/mustahiq/mitra/donor) |

| Method | Path | Role | Fungsi |
|--------|------|------|--------|
| `GET` | `/admin/bank-accounts` | `super_admin`, `admin_finance` | List rekening penerima donasi dari settings JSON |
| `GET` | `/admin/bank-accounts/source` | staff | Sama + field `isForZakat` berdasarkan `programs[]` |
| `POST` | `/admin/bank-accounts/entity` | `super_admin`, `admin_finance`, `admin_campaign` | Create rekening di `entity_bank_accounts` |

---

## API Evidences (Bukti Dokumen Disbursement)

Route: `apps/api/src/routes/admin/evidences.ts`, mounted di `/admin/evidences`, guard `staffOnly`.

Tabel `evidences` menyimpan dokumen pendukung (foto/PDF) untuk satu disbursement (via `disbursementId` FK ke tabel `ledger`).

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/admin/evidences?disbursementId=xxx` | List evidences untuk satu disbursement |
| `GET` | `/admin/evidences/:id` | Detail satu evidence (include relasi `ledgerEntry` + `uploader`) |
| `POST` | `/admin/evidences` | Upload evidence baru (url, type, title, amount, description) |
| `DELETE` | `/admin/evidences/:id` | Hapus evidence (hanya jika disbursement status `draft` atau `submitted`) |

**Relasi Drizzle**: di `evidencesRelations`, relasi ke `ledger` dinamai `ledgerEntry` (bukan `disbursement`). GET /:id dan DELETE /:id menggunakan `with: { ledgerEntry: ... }` untuk load status disbursement.

---

## Dokumen Terkait

| Dokumen | Keterkaitan |
|---------|-------------|
| `arsitektur-revenue-share.md` | Formula, kalkulasi, dan semua pihak penerima revenue share |
| `arsitektur-fundraiser.md` | Detail fundraiser, pencairan komisi, saldo |
| `arsitektur-mitra.md` | Detail mitra, saldo, ownership program |
| `arsitektur-akuntansi.md` | Jurnal double-entry untuk setiap disbursement |
| `arsitektur-transaksi.md` | Sumber dana transaksi yang menghasilkan revenue share |

---

## Catatan Penting

1. **Rekening otomatis**: Saat create disbursement untuk employee, API auto-fetch rekening dari `entity_bank_accounts` jika field bank kosong.
2. **Rekening di detail & mark-paid**: Jika `recipientBankAccount` kosong (data lama), frontend fallback ke `employeeFallbackData.bankAccounts` via query kondisional.
3. **`bankAccountId` legacy**: Kolom `disbursements.bankAccountId` adalah field lama yang masih ada untuk backward compat — bukan FK ke `entity_bank_accounts`.
4. **Legacy `ledger` route** (`apps/api/src/routes/admin/finance.ts`): Route lama untuk disbursement via tabel `ledger`. Hanya endpoint GET yang aktif dipakai frontend. Status yang valid: `draft`, `submitted`, `approved`, `rejected`, `paid` (bukan `"pending"` atau `"completed"` — nama lama yang sudah tidak ada di schema).
5. **`donation-evidences.ts`**: Dead code, sudah dihapus — referensi ke tabel `donationEvidences` dan `donations` yang tidak ada di schema, dan tidak pernah di-mount di `admin/index.ts`.
