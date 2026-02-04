# Cara Migrasi Database yang Benar

## Informasi Database
- **Database Name**: `bantuanku`
- **User**: `webane` (bukan postgres!)
- **Host**: `localhost:5432`
- **Connection String**: `postgresql://webane@localhost:5432/bantuanku`
- **psql Path**: `/opt/homebrew/opt/postgresql@16/bin/psql` (macOS Homebrew)

## ⚠️ PENTING: Jangan Gunakan Ini!

### ❌ SALAH - drizzle-kit push
```bash
npm run db:push
# atau
npx drizzle-kit push
```

**MASALAH**: 
- Akan mendeteksi SEMUA perbedaan schema (termasuk timestamp precision, unique constraints, dll)
- Bisa menyebabkan DATA LOSS pada tabel yang sudah ada data
- Tidak aman untuk production

---

## ✅ Cara yang BENAR

### 1. Membuat Table Baru

**Step 1**: Buat schema file dulu
```typescript
// packages/db/src/schema/nama-table.ts
export const namaTable = pgTable("nama_table", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  // ... fields lainnya
});
```

**Step 2**: Export di index
```typescript
// packages/db/src/schema/index.ts
export * from "./nama-table";
```

**Step 3**: Buat migration SQL manual
```bash
cd /Users/webane/sites/bantuanku
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "
CREATE TABLE IF NOT EXISTS nama_table (
  id text PRIMARY KEY NOT NULL,
  field1 text,
  field2 bigint,
  created_at timestamp(3) DEFAULT now() NOT NULL,
  updated_at timestamp(3) DEFAULT now() NOT NULL
);
"
```

**Atau menggunakan file SQL**:
```bash
cd /Users/webane/sites/bantuanku
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -f packages/db/migrations/XXX_migration.sql
```

**Step 4**: Verifikasi table sudah dibuat
```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "\dt nama_table"
```

---

### 2. Menambah Kolom ke Table yang Sudah Ada

**Step 1**: Update schema file
```typescript
// packages/db/src/schema/nama-table.ts
export const namaTable = pgTable("nama_table", {
  // ... existing fields
  fieldBaru: text("field_baru"), // tambah field baru
});
```

**Step 2**: Jalankan ALTER TABLE
```bash
cd /Users/webane/sites/bantuanku
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "
ALTER TABLE nama_table
ADD COLUMN IF NOT EXISTS field_baru text,
ADD COLUMN IF NOT EXISTS field_baru2 bigint;
"
```

**Step 3**: Verifikasi kolom sudah ditambahkan
```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "\d nama_table"
```

---

### 3. Mengubah Tipe Data Kolom (Hati-hati!)

```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "
ALTER TABLE nama_table
ALTER COLUMN field_name TYPE new_type USING field_name::new_type;
"
```

⚠️ **WARNING**: Bisa menyebabkan data loss! Backup dulu!

---

### 4. Menghapus Kolom (Hati-hati!)

```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "
ALTER TABLE nama_table
DROP COLUMN IF EXISTS field_name;
"
```

⚠️ **WARNING**: Data di kolom tersebut akan hilang!

---

## Template Command yang Sering Dipakai

### Cek Table yang Ada
```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "\dt"
```

### Cek Struktur Table
```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "\d nama_table"
```

### Cek Kolom Tertentu
```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'nama_table';
"
```

### Backup Table Sebelum Migrasi
```bash
/opt/homebrew/opt/postgresql@16/bin/pg_dump postgresql://webane@localhost:5432/bantuanku -t nama_table > backup_nama_table.sql
```

### Restore dari Backup
```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku < backup_nama_table.sql
```

---

## Contoh Kasus Nyata

### Contoh 1: Buat Table Mustahiqs (Yang Berhasil)
```bash
cd /Users/webane/sites/bantuanku
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "
CREATE TABLE IF NOT EXISTS mustahiqs (
  id text PRIMARY KEY NOT NULL,
  mustahiq_id text,
  name text NOT NULL,
  asnaf_category text NOT NULL,
  email text,
  phone text,
  address text,
  national_id text,
  date_of_birth date,
  gender text,
  bank_name text,
  bank_account text,
  bank_account_name text,
  notes text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp(3) DEFAULT now() NOT NULL,
  updated_at timestamp(3) DEFAULT now() NOT NULL,
  CONSTRAINT mustahiqs_mustahiq_id_unique UNIQUE(mustahiq_id)
);
"
```

### Contoh 2: Tambah Kolom ke Zakat Distributions (Yang Berhasil)
```bash
cd /Users/webane/sites/bantuanku
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "
ALTER TABLE zakat_distributions
ADD COLUMN IF NOT EXISTS recipient_type text,
ADD COLUMN IF NOT EXISTS coordinator_id text,
ADD COLUMN IF NOT EXISTS mustahiq_id text,
ADD COLUMN IF NOT EXISTS distribution_location text,
ADD COLUMN IF NOT EXISTS recipient_count bigint;
"
```

### Contoh 3: Jalankan Migration File (Qurban Savings)
```bash
cd /Users/webane/sites/bantuanku
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -f packages/db/migrations/012_create_qurban_savings.sql
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -f packages/db/migrations/013_create_qurban_savings_transactions.sql
```

---

## Troubleshooting

### Error: role "postgres" does not exist
**Penyebab**: Salah user, database ini pakai user `webane`
**Solusi**: Ganti dari `postgres:password@localhost` ke `webane@localhost`

### Error: relation "..." already exists
**Penyebab**: Table sudah ada
**Solusi**: Gunakan `CREATE TABLE IF NOT EXISTS` atau `ADD COLUMN IF NOT EXISTS`

### Error: column "..." does not exist
**Penyebab**: Typo nama kolom atau kolom belum dibuat
**Solusi**: Cek pakai `\d nama_table` untuk lihat kolom yang ada

### Warning: DATA LOSS dari drizzle-kit push
**Penyebab**: Ada perubahan yang incompatible (tipe data, constraints, dll)
**Solusi**: JANGAN lanjutkan! Pakai ALTER TABLE manual untuk kontrol penuh

---

## Best Practices

1. ✅ **Selalu gunakan SQL manual** untuk production database
2. ✅ **Gunakan IF NOT EXISTS / IF EXISTS** untuk idempotency
3. ✅ **Backup sebelum migrasi** yang berisiko (ALTER/DROP)
4. ✅ **Test di development** dulu sebelum production
5. ✅ **Update schema TypeScript** dulu baru database (untuk type safety)
6. ✅ **Verifikasi hasil migrasi** dengan SELECT atau \d

7. ❌ **Jangan pakai drizzle-kit push** untuk database yang sudah ada data
8. ❌ **Jangan DROP kolom/table** kecuali yakin 100%
9. ❌ **Jangan ALTER TYPE** tanpa backup
10. ❌ **Jangan lupa export schema** di index.ts

---

## Workflow Lengkap

```bash
# 1. Update TypeScript schema
vim packages/db/src/schema/nama-table.ts

# 2. Export schema
vim packages/db/src/schema/index.ts

# 3. Buat SQL migration file (opsional, untuk dokumentasi)
vim packages/db/migrations/XXX_nama_migration.sql

# 4. Jalankan migration
cd /Users/webane/sites/bantuanku
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "
-- SQL commands here
"

# 5. Verifikasi
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "\d nama_table"

# 6. Test di aplikasi
npm run dev
```

---

## Kapan Boleh Pakai drizzle-kit push?

**HANYA untuk**:
- Database kosong (baru pertama kali setup)
- Development lokal yang boleh di-reset
- Testing environment yang tidak masalah data hilang

**JANGAN untuk**:
- Production database
- Database yang sudah ada data penting
- Staging environment

---

## Kesimpulan

**Yang BERHASIL tadi**:
```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "SQL_COMMAND"
```

**Atau dengan file**:
```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -f packages/db/migrations/XXX.sql
```

**Kenapa berhasil**:
- Kontrol penuh atas perubahan
- Tidak ada surprise data loss
- Bisa pakai IF NOT EXISTS untuk safety
- Langsung ke database tanpa deteksi otomatis yang berlebihan

**Catatan macOS**:
- psql tidak ada di PATH secara default dengan Homebrew
- Harus menggunakan path lengkap: `/opt/homebrew/opt/postgresql@16/bin/psql`
- Alternatif: tambahkan ke PATH di `~/.zshrc`:
  ```bash
  export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
  ```
