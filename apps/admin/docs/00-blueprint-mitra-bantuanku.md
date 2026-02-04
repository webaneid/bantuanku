# Blueprint: Sistem Mitra Bantuanku

## 1. Konsep & Tujuan

**Mitra Bantuanku** adalah sistem referral/tracking yang memungkinkan donatur atau karyawan (employees) untuk menjadi mitra penggalang dana. Setiap mitra akan mendapatkan link unik untuk dibagikan, dan akan mendapatkan persentase komisi dari setiap donasi yang masuk melalui link mereka.

### Tujuan Sistem:
- Meningkatkan jangkauan kampanye donasi melalui word-of-mouth marketing
- Memberikan insentif kepada donatur/karyawan yang aktif mempromosikan organisasi
- Tracking yang jelas untuk setiap donasi yang datang dari referral
- Membangun community of fundraisers yang termotivasi

---

## 2. Terminologi

- **Mitra**: Donatur atau Employee yang terdaftar sebagai fundraiser
- **Kode Mitra**: Unique identifier untuk setiap mitra (contoh: `AHMAD123`, `DN001`, dll)
- **Link Mitra**: URL unik untuk tracking (contoh: `bantuanku.org/donate?ref=AHMAD123` atau `bantuanku.org/m/ahmad123`)
- **Komisi Mitra**: Persentase dari donasi yang didapat mitra (default: 5%)
- **Saldo Mitra**: Akumulasi komisi yang belum ditarik/dicairkan

---

## 3. User Roles & Akses

### A. Admin
- Dapat melihat semua mitra dan statistik mereka
- Approve/reject pendaftaran mitra (opsional - bisa auto-approve)
- Set persentase komisi global di settings
- Set persentase komisi custom per-mitra (override global)
- Melihat laporan semua transaksi mitra
- Proses pencairan/withdrawal komisi mitra

### B. Mitra (Donatur/Employee yang jadi mitra)
- Daftar sebagai mitra
- Dapat kode & link unik
- Share link via WhatsApp, social media, dll
- Lihat dashboard: total donasi dari referral, komisi earned, saldo
- Request pencairan komisi (jika diimplementasikan)

### C. Donatur Umum
- Donasi via link mitra
- Secara otomatis ter-tracking ke mitra yang punya link

---

## 4. Flow Sistem

### A. Pendaftaran Mitra

```
1. User (Donatur/Employee) klik "Jadi Mitra" di profil mereka
2. Isi form pendaftaran (jika ada requirement tambahan)
3. Sistem generate kode unik untuk mitra
4. Status:
   - Auto-approved: Langsung active, dapat link
   - Manual approval: Pending, admin harus approve dulu
5. Mitra dapat akses ke dashboard & link sharing
```

### B. Sharing & Tracking

```
1. Mitra copy link atau klik tombol "Share via WhatsApp"
2. Link format:
   - Query param: bantuanku.org/donate?ref=KODE_MITRA
   - Slug: bantuanku.org/m/kode-mitra
   - Short link: bantuanku.org/m/ABC123
3. Link disimpan di cookies/localStorage visitor (expire: 30 hari)
4. Ketika visitor donasi, sistem cek ada ref code atau tidak
5. Jika ada ref code valid, donasi di-link ke mitra tersebut
```

### C. Perhitungan Komisi

```
1. Donasi masuk dengan ref code mitra
2. Sistem catat:
   - ID Donasi
   - ID Mitra
   - Amount donasi
   - Persentase komisi (ambil dari setting atau custom per-mitra)
3. Hitung komisi: Amount × Persentase
4. Catat ke tabel `mitra_commissions`
5. Update `saldo_mitra` di profil mitra
```

### D. Pencairan Komisi (Opsional - fase 2)

```
1. Mitra request withdrawal dari dashboard
2. Admin review & approve
3. Opsi pencairan:
   - Transfer ke rekening mitra
   - Konversi jadi donasi (saldo mitra jadi donasi atas nama mitra)
   - Voucher/credit untuk donasi berikutnya
```

---

## 5. Database Schema

### Tabel: `mitras`
Menyimpan data mitra dan status mereka.

```sql
CREATE TABLE mitras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relasi
  donor_id UUID REFERENCES donors(id) ON DELETE CASCADE, -- jika mitra adalah donatur
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE, -- jika mitra adalah employee

  -- Data Mitra
  kode_mitra VARCHAR(20) UNIQUE NOT NULL, -- contoh: AHMAD123, DN001
  slug VARCHAR(50) UNIQUE, -- untuk pretty URL: bantuanku.org/m/ahmad-fundraiser

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, inactive, suspended
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,

  -- Komisi & Saldo
  commission_percentage DECIMAL(5,2) DEFAULT 5.00, -- override dari global setting jika ada
  total_referrals INT DEFAULT 0, -- total donasi yang di-refer
  total_donation_amount DECIMAL(15,2) DEFAULT 0, -- total amount dari semua referral
  total_commission_earned DECIMAL(15,2) DEFAULT 0, -- total komisi yang didapat
  current_balance DECIMAL(15,2) DEFAULT 0, -- saldo komisi yang belum ditarik
  total_withdrawn DECIMAL(15,2) DEFAULT 0, -- total yang sudah ditarik

  -- Bank Info (untuk withdrawal)
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_account_name VARCHAR(100),

  -- Metadata
  notes TEXT, -- catatan admin
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraint: harus salah satu dari donor atau employee
  CONSTRAINT mitra_type_check CHECK (
    (donor_id IS NOT NULL AND employee_id IS NULL) OR
    (donor_id IS NULL AND employee_id IS NOT NULL)
  )
);

CREATE INDEX idx_mitras_kode ON mitras(kode_mitra);
CREATE INDEX idx_mitras_slug ON mitras(slug);
CREATE INDEX idx_mitras_donor ON mitras(donor_id);
CREATE INDEX idx_mitras_employee ON mitras(employee_id);
CREATE INDEX idx_mitras_status ON mitras(status);
```

### Tabel: `mitra_referrals`
Tracking setiap donasi yang datang dari link mitra.

```sql
CREATE TABLE mitra_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relasi
  mitra_id UUID NOT NULL REFERENCES mitras(id) ON DELETE CASCADE,
  donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,

  -- Detail Komisi
  donation_amount DECIMAL(15,2) NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL, -- snapshot saat transaksi
  commission_amount DECIMAL(15,2) NOT NULL, -- calculated: donation_amount × commission_percentage

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, cancelled
  paid_at TIMESTAMP,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mitra_referrals_mitra ON mitra_referrals(mitra_id);
CREATE INDEX idx_mitra_referrals_donation ON mitra_referrals(donation_id);
CREATE INDEX idx_mitra_referrals_status ON mitra_referrals(status);
CREATE INDEX idx_mitra_referrals_created ON mitra_referrals(created_at);
```

### Tabel: `mitra_withdrawals` (Opsional - Fase 2)
Jika ada fitur pencairan komisi.

```sql
CREATE TABLE mitra_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relasi
  mitra_id UUID NOT NULL REFERENCES mitras(id) ON DELETE CASCADE,

  -- Detail Withdrawal
  amount DECIMAL(15,2) NOT NULL,
  method VARCHAR(50) NOT NULL, -- bank_transfer, donation_conversion, voucher

  -- Bank Transfer Info
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_account_name VARCHAR(100),

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, processed, rejected, cancelled
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  processed_at TIMESTAMP,

  -- Bukti
  receipt_url TEXT, -- bukti transfer jika ada

  -- Metadata
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mitra_withdrawals_mitra ON mitra_withdrawals(mitra_id);
CREATE INDEX idx_mitra_withdrawals_status ON mitra_withdrawals(status);
```

### Perubahan Tabel: `donations`
Tambahkan kolom untuk tracking referral.

```sql
ALTER TABLE donations ADD COLUMN referred_by_mitra_id UUID REFERENCES mitras(id);
CREATE INDEX idx_donations_referred_by ON donations(referred_by_mitra_id);
```

---

## 6. Settings & Configuration

### Lokasi: `/dashboard/settings/amil`

Tambahkan section baru untuk konfigurasi Mitra:

```typescript
// Setting keys di database
{
  key: "mitra_enabled",
  value: "true", // atau "false" untuk disable sistem
  category: "mitra",
  type: "boolean",
  label: "Aktifkan Sistem Mitra",
  description: "Enable/disable sistem mitra donasi"
}

{
  key: "mitra_commission_percentage",
  value: "5.00", // default 5%
  category: "mitra",
  type: "decimal",
  label: "Persentase Komisi Mitra (%)",
  description: "Persentase komisi default untuk semua mitra (dapat di-override per mitra)"
}

{
  key: "mitra_auto_approve",
  value: "true", // auto approve atau manual
  category: "mitra",
  type: "boolean",
  label: "Auto-Approve Mitra Baru",
  description: "Otomatis approve pendaftaran mitra baru tanpa review admin"
}

{
  key: "mitra_min_withdrawal",
  value: "100000", // minimum Rp 100.000 untuk withdraw
  category: "mitra",
  type: "number",
  label: "Minimum Pencairan (Rp)",
  description: "Minimum saldo untuk request pencairan komisi"
}

{
  key: "mitra_cookie_days",
  value: "30", // berapa hari ref cookie disimpan
  category: "mitra",
  type: "number",
  label: "Durasi Tracking (hari)",
  description: "Berapa lama referral link berlaku sejak klik pertama"
}
```

---

## 7. API Endpoints

### Admin API

```typescript
// Mitra Management
GET    /api/admin/mitras                    // List semua mitra
GET    /api/admin/mitras/:id                // Detail mitra
POST   /api/admin/mitras                    // Buat mitra (manual by admin)
PUT    /api/admin/mitras/:id                // Update data mitra
DELETE /api/admin/mitras/:id                // Hapus mitra
POST   /api/admin/mitras/:id/approve        // Approve mitra pending
POST   /api/admin/mitras/:id/suspend        // Suspend mitra
POST   /api/admin/mitras/:id/activate       // Activate mitra suspended

// Referrals & Commissions
GET    /api/admin/mitras/:id/referrals      // List donasi dari mitra ini
GET    /api/admin/mitra-referrals           // List semua referral
PUT    /api/admin/mitra-referrals/:id       // Update status referral

// Withdrawals (Fase 2)
GET    /api/admin/mitra-withdrawals         // List semua withdrawal request
PUT    /api/admin/mitra-withdrawals/:id/approve   // Approve withdrawal
PUT    /api/admin/mitra-withdrawals/:id/reject    // Reject withdrawal
POST   /api/admin/mitra-withdrawals/:id/process   // Mark as processed

// Reports
GET    /api/admin/mitras/stats              // Overall statistics
GET    /api/admin/mitras/:id/stats          // Statistik per mitra
```

### Public/Donor API

```typescript
// Registration
POST   /api/mitras/register                 // Daftar jadi mitra (donor/employee)

// Tracking
GET    /api/mitras/validate/:kode           // Validasi kode mitra (untuk front-end)
POST   /api/track-referral                  // Track klik link mitra (set cookie)

// Mitra Dashboard (authenticated)
GET    /api/mitras/me                       // Data mitra login
GET    /api/mitras/me/stats                 // Statistik mitra login
GET    /api/mitras/me/referrals             // List donasi dari mitra login
GET    /api/mitras/me/commissions           // List komisi mitra login

// Withdrawal (Fase 2)
POST   /api/mitras/me/withdrawals           // Request withdrawal
GET    /api/mitras/me/withdrawals           // List withdrawal requests
```

---

## 8. UI/UX - Admin Dashboard

### A. Halaman: `/dashboard/mitras`

List semua mitra dengan tabel:
- Kolom: Nama Mitra, Kode, Status, Total Referral, Total Donasi, Total Komisi, Saldo, Aksi
- Filter: Status (All, Pending, Active, Suspended)
- Search: by nama atau kode
- Sorting: by total referrals, total komisi, dll
- Tombol: Tambah Mitra Manual

### B. Halaman: `/dashboard/mitras/:id`

Detail mitra:
- Info Mitra: Nama, Kode, Slug, Status
- Statistik: Total referrals, total donasi amount, total komisi, saldo
- Form edit: Persentase komisi custom, status, catatan
- Tabel donasi dari mitra ini
- Tombol: Approve, Suspend, Edit

### C. Halaman: `/dashboard/settings/amil`

Tambahkan section "Konfigurasi Mitra":
- Toggle: Aktifkan Sistem Mitra
- Input: Persentase Komisi Default (%)
- Toggle: Auto-Approve Mitra Baru
- Input: Minimum Pencairan (Rp)
- Input: Durasi Tracking (hari)

### D. Halaman: `/dashboard/reports/mitras` (baru)

Laporan sistem mitra:
- Total mitra active
- Total donasi via mitra
- Total komisi dibayarkan
- Chart: Donasi via mitra vs direct
- Top performing mitras

---

## 9. UI/UX - Front-End (Public)

### A. Halaman: `/mitra` atau `/fundraiser`

Landing page sistem mitra:
- Penjelasan cara kerja
- Benefit jadi mitra
- Form pendaftaran (jika belum login, redirect ke login dulu)
- Testimonial dari mitra existing

### B. Component: Tombol "Jadi Mitra"

Di halaman profil donor atau employee:
- Tombol: "Jadi Mitra Bantuanku"
- Jika sudah jadi mitra: tampilkan dashboard mitra

### C. Dashboard Mitra (untuk donor/employee yang jadi mitra)

Lokasi: `/my-mitra` atau `/dashboard/mitra`

Konten:
- Kode & Link Mitra (copy button)
- Tombol Share:
  - Share via WhatsApp
  - Share via Facebook
  - Share via Twitter
  - Copy Link
- Statistik:
  - Total Referral
  - Total Donasi dari Referral
  - Total Komisi Earned
  - Saldo Tersedia
- Tabel: Riwayat Donasi dari Referral
- Button: Request Pencairan (jika saldo >= minimum)

### D. Donasi Page dengan Referral

Ketika user buka link: `bantuanku.org/donate?ref=AHMAD123`

1. Set cookie/localStorage: `mitra_ref=AHMAD123` (expire 30 hari)
2. Tampilkan banner kecil: "Anda berdonasi melalui referral Mitra Ahmad" (opsional)
3. Proses donasi normal
4. Saat submit donasi, backend cek ada ref cookie, jika ada link ke mitra

---

## 10. Kode Mitra - Format & Generation

### Format Kode

Opsi 1: **Prefix + ID Number**
- Contoh: `MTR001`, `MTR002`, `MTR123`
- Pro: Mudah, konsisten, auto-increment
- Con: Tidak personal

Opsi 2: **Nama + Random**
- Contoh: `AHMAD123`, `FATIMAH456`
- Pro: Lebih personal, mudah diingat
- Con: Bisa collision jika nama sama

Opsi 3: **Random Alphanumeric**
- Contoh: `A3F2K9`, `X7M2P1`
- Pro: Unik, short
- Con: Sulit diingat

**Rekomendasi**: Opsi 2 (Nama + Random 3-4 digit)
- Normalize nama: uppercase, remove special chars
- Ambil max 10 karakter pertama
- Append 3-4 digit random
- Contoh: `AHMAD123`, `FATIMAH456`, `SITI789`

### Slug untuk Pretty URL

- Lowercase nama + random short string
- Contoh: `ahmad-fundraiser`, `fatimah-donor`, `siti-f3k2`
- URL: `bantuanku.org/m/ahmad-fundraiser`

---

## 11. Tracking Flow Detail

### Step-by-Step Tracking

1. **Mitra share link**: `bantuanku.org/donate?ref=AHMAD123`

2. **User klik link**:
   - Front-end detect query param `ref=AHMAD123`
   - Call API: `POST /api/track-referral { kode: "AHMAD123" }`
   - Backend:
     - Validasi kode ada & mitra active
     - Set cookie: `mitra_ref=AHMAD123` (httpOnly, expire 30 hari)
     - Return success
   - Front-end redirect ke halaman donate (tanpa query param)

3. **User browse website** (30 hari ke depan):
   - Cookie tetap tersimpan
   - User bisa explore program, read articles, dll
   - Cookie tidak expire selama 30 hari

4. **User donasi**:
   - Fill form donasi
   - Submit donation
   - Backend:
     - Process donation seperti biasa
     - Cek cookie `mitra_ref`
     - Jika ada & valid:
       - Set `donations.referred_by_mitra_id = mitra.id`
       - Calculate commission
       - Insert ke `mitra_referrals`
       - Update `mitras.total_referrals`, `total_donation_amount`, `total_commission_earned`, `current_balance`
     - Clear/update cookie

5. **Komisi credited**:
   - Mitra lihat di dashboard: ada donasi baru + komisi earned
   - Saldo bertambah

---

## 12. Share Buttons - WhatsApp Integration

### Template Pesan WhatsApp

```
🌟 *Assalamu'alaikum*

Saya mengajak Bapak/Ibu untuk berdonasi melalui Bantuanku.org

✅ Organisasi terpercaya
✅ Laporan transparan
✅ Berbagai program sosial

Silakan donasi melalui link ini:
👉 {{LINK_MITRA}}

Jazakumullahu khairan 🤲

---
Salam,
{{NAMA_MITRA}}
```

### Share Button Logic

```typescript
const shareToWhatsApp = () => {
  const message = encodeURIComponent(`
🌟 *Assalamu'alaikum*

Saya mengajak Bapak/Ibu untuk berdonasi melalui Bantuanku.org

✅ Organisasi terpercaya
✅ Laporan transparan
✅ Berbagai program sosial

Silakan donasi melalui link ini:
👉 ${mitraLink}

Jazakumullahu khairan 🤲

---
Salam,
${mitraNama}
  `);

  const whatsappUrl = `https://wa.me/?text=${message}`;
  window.open(whatsappUrl, '_blank');
};
```

---

## 13. Business Rules & Validations

### Pendaftaran Mitra

- User harus sudah terdaftar sebagai Donor atau Employee
- 1 Donor/Employee hanya bisa jadi 1 Mitra (tidak bisa double)
- Kode mitra harus unique
- Slug harus unique

### Komisi

- Komisi dihitung dari gross donation amount (sebelum dikurangi biaya apapun)
- Komisi tidak berlaku untuk donasi dari diri sendiri (self-referral)
- Jika setting global diubah, tidak affect komisi yang sudah ter-record (historical data tetap)
- Komisi per-mitra bisa di-override oleh admin

### Tracking

- Cookie expire: 30 hari (configurable di settings)
- Last-click attribution: jika user klik 2 link mitra berbeda, yang terakhir yang menang
- Self-referral: jika mitra donasi lewat link sendiri, tidak dapat komisi (prevent abuse)

### Status Mitra

- **Pending**: Baru daftar, belum approved (jika manual approval)
- **Active**: Mitra aktif, bisa dapat komisi
- **Inactive**: Mitra non-aktif, link masih valid tapi tidak dapat komisi baru
- **Suspended**: Mitra di-suspend admin, link tidak valid

---

## 14. Reporting & Analytics

### Dashboard Admin - Metrics

- Total Mitra (breakdown by status)
- Total Donasi via Mitra (amount & count)
- Total Komisi Dibayarkan
- Conversion rate: klik link → donasi
- Top 10 Mitras by referrals
- Top 10 Mitras by komisi earned
- Chart: Trend donasi via mitra vs direct donation

### Dashboard Mitra - Metrics

- Total Klik Link (jika tracking implemented)
- Total Donasi dari Referral (count)
- Total Amount Donasi dari Referral
- Total Komisi Earned
- Saldo Tersedia
- Total Withdrawn
- Conversion Rate
- Chart: Donasi per bulan

---

## 15. Pencairan Komisi (Fase 2 - Opsional)

### Metode Pencairan

**Opsi 1: Transfer Bank**
- Mitra input data bank
- Request withdrawal
- Admin approve & transfer manual
- Upload bukti transfer

**Opsi 2: Konversi Donasi**
- Saldo komisi langsung jadi donasi atas nama mitra
- Otomatis, tanpa approval
- Mitra dapat bukti donasi untuk tax deduction

**Opsi 3: Voucher/Credit**
- Saldo jadi credit untuk donasi berikutnya
- Mitra donasi tanpa bayar lagi (pakai credit)

### Withdrawal Flow

1. Mitra request withdrawal (jika saldo >= minimum)
2. Admin dapat notifikasi
3. Admin review & approve/reject
4. Jika approve:
   - Transfer ke bank mitra
   - Upload bukti
   - Update status jadi "processed"
5. Saldo mitra dikurangi
6. `total_withdrawn` bertambah

---

## 16. Security & Anti-Abuse

### Prevent Abuse

1. **Self-Referral Protection**:
   - Cek jika donor ID sama dengan mitra ID
   - Jika sama, donasi tetap valid tapi tidak dapat komisi

2. **Rate Limiting**:
   - Limit track-referral API: max 10 request/IP per menit
   - Prevent spam klik link

3. **Cookie Validation**:
   - HttpOnly cookie untuk prevent JS manipulation
   - Validasi kode mitra setiap kali donasi submit

4. **Suspicious Activity Detection**:
   - Alert admin jika ada pola aneh:
     - Mitra dengan banyak donasi kecil dalam waktu singkat
     - Donasi dari IP/device yang sama berkali-kali
     - Pattern yang mencurigakan

5. **Manual Review**:
   - Admin bisa suspend mitra jika ada abuse
   - Admin bisa reject/cancel komisi jika donasi fraudulent

---

## 17. Notifications

### Email/WA Notifications

**Untuk Mitra:**
- Welcome email saat approved
- Notifikasi setiap ada donasi baru dari referral
- Monthly report: summary donasi & komisi bulan ini
- Notifikasi saat withdrawal approved/rejected

**Untuk Admin:**
- Notifikasi saat ada pendaftaran mitra baru (jika manual approval)
- Notifikasi saat ada withdrawal request
- Weekly summary: total mitra baru, total donasi via mitra

---

## 18. Future Enhancements (Fase 3+)

1. **Gamification**:
   - Badge/achievement untuk mitra: "Top Fundraiser", "100 Referrals", dll
   - Leaderboard: ranking mitra by performance
   - Reward tambahan untuk top performers

2. **Mitra Tiers**:
   - Bronze: 0-10 referrals (komisi 5%)
   - Silver: 11-50 referrals (komisi 7%)
   - Gold: 51+ referrals (komisi 10%)
   - Auto-upgrade berdasarkan performa

3. **Campaign-Specific Referrals**:
   - Mitra bisa dapat link khusus untuk campaign tertentu
   - Contoh: `bantuanku.org/ramadan?ref=AHMAD123`
   - Tracking & komisi per-campaign

4. **Team/Downline System**:
   - Mitra bisa recruit mitra baru
   - Dapat komisi dari downline (MLM-style, tapi ethical)
   - Max 2 level untuk prevent pyramid scheme

5. **QR Code**:
   - Generate QR code untuk setiap mitra
   - Bisa di-print untuk offline sharing

6. **Advanced Analytics**:
   - Cohort analysis
   - Attribution modeling (first-click vs last-click)
   - Geographic distribution of referrals
   - Device/platform analysis

---

## 19. Implementation Phases

### Fase 1: MVP (Minimum Viable Product)

**Backend:**
- Database schema: `mitras`, `mitra_referrals`
- Alter `donations` table
- Settings di `/dashboard/settings/amil`
- Basic API: register, track, list

**Admin:**
- `/dashboard/mitras` - list & detail
- Edit persentase komisi
- Approve/suspend mitra

**Front-End:**
- Link tracking via cookie
- Tombol "Jadi Mitra" di profil
- Dashboard mitra sederhana: kode, link, statistik
- Share button (WhatsApp)

**Deliverables:**
✅ Mitra bisa daftar
✅ Link tracking works
✅ Komisi calculated & recorded
✅ Admin bisa manage mitras
✅ Mitra bisa lihat stats & share link

---

### Fase 2: Withdrawals & Reporting

**Backend:**
- Table `mitra_withdrawals`
- Withdrawal API
- Advanced reporting API

**Admin:**
- `/dashboard/mitra-withdrawals` - manage withdrawals
- `/dashboard/reports/mitras` - comprehensive reports
- Approve/process withdrawals

**Front-End:**
- Request withdrawal feature di dashboard mitra
- Bank account form
- Withdrawal history

**Deliverables:**
✅ Mitra bisa request pencairan
✅ Admin bisa process withdrawals
✅ Detailed reporting untuk admin

---

### Fase 3: Advanced Features

- Gamification (badges, leaderboard)
- Mitra tiers
- Campaign-specific tracking
- QR code generation
- Advanced analytics

---

## 20. Technical Considerations

### Performance

- Index semua foreign keys untuk fast joins
- Cache statistik mitra (update setiap donasi baru)
- Pagination untuk list mitras & referrals

### Data Integrity

- Use transactions untuk:
  - Create donation + create mitra_referral + update mitra stats
  - Process withdrawal + update balance
- Constraint: prevent negative balance
- Audit log untuk setiap perubahan saldo

### Scalability

- Jika jutaan mitra: consider sharding by region
- Background job untuk update statistik (jangan realtime jika volume tinggi)
- CDN untuk share images/QR codes

---

## 21. Testing Checklist

### Unit Tests
- [ ] Generate kode mitra unique
- [ ] Calculate commission correctly
- [ ] Validate self-referral (should not get commission)
- [ ] Cookie tracking logic
- [ ] Balance calculation

### Integration Tests
- [ ] End-to-end flow: register → track → donate → commission recorded
- [ ] Withdrawal request → approve → balance updated
- [ ] Status change (suspend mitra → link invalid)

### Manual Testing
- [ ] Share link via WhatsApp (mobile)
- [ ] Cookie persist setelah browse multiple pages
- [ ] Dashboard loading performance dengan 1000+ referrals

---

## 22. Documentation Needed

1. **User Guide untuk Mitra**:
   - Cara daftar jadi mitra
   - Cara share link
   - Cara baca dashboard
   - FAQ

2. **Admin Guide**:
   - Cara approve mitra
   - Cara custom komisi per-mitra
   - Cara process withdrawals
   - Cara baca reports

3. **API Documentation**:
   - Semua endpoint dengan examples
   - Authentication requirements
   - Rate limits

---

## 23. Kesimpulan

Sistem Mitra Bantuanku adalah fitur powerful untuk scale donasi melalui word-of-mouth marketing. Dengan implementasi yang tepat, sistem ini akan:

- ✅ Meningkatkan jangkauan donasi
- ✅ Engage donors & employees lebih dalam
- ✅ Provide win-win situation (organisasi dapat donasi lebih banyak, mitra dapat reward)
- ✅ Tracking yang transparent & accurate
- ✅ Scalable untuk growth jangka panjang

**Key Success Factors:**
1. Mudah digunakan (simple registration & sharing)
2. Tracking yang akurat & reliable
3. Dashboard yang clear & informative
4. Fair commission structure
5. Transparent reporting
6. Anti-abuse measures yang kuat

---

**Prepared by**: Claude AI Assistant
**Date**: 2026-01-26
**Version**: 1.0 - Draft Blueprint
**Status**: Awaiting Approval untuk Implementation
