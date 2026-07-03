# Arsitektur Database

> Terakhir di-sync: 2026-07-02

---

## Stack

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM (`drizzle-orm`)
- **Migration CLI**: `drizzle-kit`
- **Runtime driver**: `pg` (`drizzle-orm/node-postgres`) di `packages/db/src/client.ts`
- **Migration manifest driver**: `postgres` (npm) di `packages/db/scripts/run-production-manifest.ts`
- **Schema path**: `packages/db/src/schema/`
- **Migration path**: `packages/db/migrations/`

---

## Konvensi ID

| Konteks | Tipe | Generator |
|---------|------|-----------|
| Entitas utama (users, donatur, campaigns, transaksi, dll.) | `text` (PK) | `createId()` — 21 karakter, alfanumerik lowercase |
| Master data statis (categories, pillars, dll.) | `serial` / `integer` | PostgreSQL auto-increment |
| Fundraiser code (format khusus) | `text` | `FRS6200001` format |

### `createId()` detail

```ts
// packages/db/src/utils.ts
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const ID_LENGTH = 21;

export function createId(): string { ... }
// Contoh output: "4k2x9mq0wr7b1cnd85fji"
```

Bukan nanoid library — implementasi custom dengan crypto.getRandomValues, alphabet URL-safe.

---

## Konvensi Schema

```ts
// FK memakai onDelete sesuai kebutuhan relasi, bukan satu aturan global.
// Contoh cascade untuk junction/child rows:
userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" })

// Contoh set null untuk data profil/master yang boleh dilepas:
jobTitleId: integer("job_title_id").references(() => jobTitles.id, { onDelete: "set null" })

// Semua timestamp utama memakai timestamptz
createdAt: timestamp("created_at", { precision: 3, mode: "date", withTimezone: true }).defaultNow()
```

---

## Daftar Tabel per Modul

### Auth & Users
| Tabel | Fungsi |
|-------|--------|
| `users` | Akun login (donatur, staff, mitra) |
| `user_roles` | Junction users ↔ roles |
| `roles` | Master role sistem |
| `permissions` | Master permission (belum fully implemented) |
| `role_permissions` | Junction roles ↔ permissions |
| `auth_otp_codes` | OTP untuk forgot password via WhatsApp |

### Donatur & Profil
| Tabel | Fungsi |
|-------|--------|
| `donatur` | Profil donatur (linked ke `users.id`) |
| `entity_bank_accounts` | Rekening bank universal untuk entitas: donatur, employee, vendor, mustahiq, mitra, dll. |
| `bank_accounts` | Rekening LAZ/payment/source bank (rekening organisasi), bukan rekening semua entitas |

### Kampanye & Donasi
| Tabel | Fungsi |
|-------|--------|
| `categories` | Kategori campaign |
| `pillars` | Pilar LAZ (dana, daya, dll.) |
| `campaigns` | Program/kampanye donasi |
| `payment_gateways` | Master gateway pembayaran |
| `payment_gateway_credentials` | Kredensial gateway per environment |
| `payment_methods` | Master metode pembayaran per gateway |
| `evidence` | Bukti bayar |
| `donation_evidences` | Bukti donasi terpisah |
| `activity_reports` | Laporan kegiatan program |

### Transaksi Universal
| Tabel | Fungsi |
|-------|--------|
| `transactions` | Transaksi utama (donasi, qurban, zakat, dll.) |
| `transaction_payments` | Pembayaran per transaksi (mendukung multi-payment) |

### Akuntansi
| Tabel | Fungsi |
|-------|--------|
| `coa` | Chart of Accounts |
| `ledger` | Jurnal akuntansi (double-entry) |
| `ledger_categories` | Kategori ledger |
| `disbursements` | Pencairan dana |
| `disbursement_revenue_share_items` | Komponen pencairan revenue share |
| `revenue_shares` | Alokasi bagi hasil per campaign |

### Qurban
| Tabel | Fungsi |
|-------|--------|
| `qurban_periods` | Periode qurban per tahun |
| `qurban_packages` | Paket hewan (sapi/kambing/domba) |
| `qurban_package_periods` | Harga & stok per paket per periode |
| `qurban_shared_groups` | Grup patungan sapi |
| `qurban_orders` | Pesanan qurban |
| `qurban_payments` | Pembayaran qurban (legacy) |
| `qurban_savings` | Tabungan qurban |
| `qurban_savings_transactions` | Setoran tabungan (legacy) |
| `qurban_savings_conversions` | Log konversi savings → order |
| `qurban_executions` | Laporan penyembelihan |

### Zakat
| Tabel | Fungsi |
|-------|--------|
| `zakat_types` | Master jenis zakat (maal, fitrah, profesi, dll.) |
| `zakat_periods` | Periode zakat aktif |
| `zakat_calculator_configs` | Konfigurasi nisab & rate per jenis |
| `zakat_calculation_logs` | Log kalkulasi zakat dari web |
| `zakat_distributions` | Distribusi dana zakat ke mustahiq |

### SDM & Mitra
| Tabel | Fungsi |
|-------|--------|
| `employees` | Karyawan LAZ |
| `mustahiqs` | Penerima manfaat |
| `vendors` | Penyedia barang/jasa |
| `mitra` | Lembaga mitra partner |
| `fundraisers` | Profil influencer/fundraiser |
| `fundraiser_referrals` | Log komisi per transaksi referral |

### Master Data
| Tabel | Fungsi |
|-------|--------|
| `job_categories` | Kategori pekerjaan donatur |
| `income_ranges` | Rentang penghasilan donatur |
| `settings` | Konfigurasi sistem (key-value) |
| `pages` | Halaman statis CMS |
| `media` | File upload (gambar, dokumen) |
| `audit` | Log audit trail aksi admin |

### Alamat Indonesia
| Tabel | Fungsi |
|-------|--------|
| `indonesia_provinces` | 38 provinsi |
| `indonesia_regencies` | Kabupaten/kota |
| `indonesia_districts` | Kecamatan |
| `indonesia_villages` | Kelurahan/desa |

### Notifikasi & Integrasi
| Tabel | Fungsi |
|-------|--------|
| `notifications` | Notifikasi internal (belum fully used) |

---

## Sistem Migrasi

Dua jalur migrasi yang coexist:

### Jalur 1 — Drizzle Auto Migration
```bash
npm run db:generate   # buat file SQL dari perubahan schema Drizzle
npm run db:migrate    # jalankan file di packages/db/drizzle/
```
Dipakai untuk environment development / fresh setup.

### Jalur 2 — Production Manifest
```bash
npm run db:manifest:run -- --from=NNN_name.sql
npm run db:manifest:run:dry    # preview saja
npm run db:manifest:run:fresh  # jalankan semua dari awal
```
File SQL manual di `packages/db/migrations/`, terdaftar di `packages/db/scripts/run-production-manifest.ts`.

Migration manifest mendukung:
- `optional: true` — skip jika kondisi tidak terpenuhi
- `conditional: "donatur-contact-rename"` — skip berdasarkan kondisi DB
- Mode `existing` (VPS yang sudah jalan) vs `fresh` (install baru)

**Migration terbaru: `114_add_seo_fields_to_activity_reports.sql`**

Root script lama berikut sudah tidak menjadi jalur migrasi resmi:

| File Lama | Keputusan |
|-----------|-----------|
| `run-qurban-migrations.sh` | Dihapus karena hardcode DB lokal dan merujuk migration qurban lama/tidak lengkap. Qurban migration aktif berjalan lewat production manifest. |
| `setup-db.sh` | Dihapus karena memakai flow `db:push`/Neon lama. Setup DB resmi mengikuti Drizzle migration atau production manifest. |
| `bantuanku.db` | Dihapus karena kosong dan tidak ada runtime yang memakai SQLite root tersebut. |
| `packages/db/sqlite.db` | Dihapus karena kosong dan tidak ada source runtime yang memakai SQLite. Database resmi tetap PostgreSQL. |
| `apps/api/bantuanku.db` | Dihapus karena SQLite qurban legacy tidak dipakai runtime. Isinya hanya tabel qurban lama dengan row master kecil; data qurban resmi berada di PostgreSQL/migration manifest. |
| `laznas_be_2026-01-17_09-39-35_pgsql_data.sql` | Dihapus karena dump data lama, bukan migration. Dump berisi tabel Prisma-era seperti `Admin`, `Campaign`, `Transactions`, `app_settings`, dan `zakat_images`. |

Dump database tidak boleh disimpan di root repository. Backup/dump harus berada di lokasi backup terkontrol di luar repo, terenkripsi bila berisi data production, dan tidak dijadikan pengganti migration manifest.

---

## Helper ID Tambahan

```ts
// packages/db/src/utils.ts

generateReferenceId(prefix: string)
// → "DON-20250702-AB3X"  (untuk reference code transaksi)

generateInvoiceNumber()
// → "INV-202507-K9MN"   (untuk nomor invoice)

generateSlug(text: string)
// → "zakat-maal-2025"   (untuk slug URL)
```

---

## Koneksi Database

```ts
// packages/db/src/index.ts (createDb)
// Dipanggil oleh dbMiddleware di setiap request
const db = createDb(process.env.DATABASE_URL);
c.set("db", db);
```

Di route handler: `const db = c.get("db")`

---

## Catatan Penting

1. **`entity_bank_accounts`** — tabel universal untuk rekening entitas (employees, vendors, mustahiqs, donatur, mitra, dll.) via kolom `entity_type` + `entity_id`.
2. **`bank_accounts`** — tabel rekening organisasi/LAZ untuk penerimaan/pengeluaran dan integrasi saldo/COA; berbeda dari `entity_bank_accounts`.
3. **Dual payment model** di Qurban — legacy (`qurban_payments`) dan universal (`transaction_payments`) coexist sampai migrasi selesai.
4. **Timestamps** — semua kolom timestamp sudah `timestamptz` sejak migration 111.
