# Arsitektur Statistik

Dokumen ini adalah source of truth untuk modul statistik admin. Scope utama dokumen ini adalah menu **Statistics** di admin: statistik donatur dan statistik mustahiq. Endpoint lain yang memakai nama `stats` tetap dirujuk ke arsitektur domain masing-masing.

## Batas Scope

| Area | Masuk Dokumen Ini? | Source of Truth |
|---|---:|---|
| `/admin/statistics/donatur` | Ya | Dokumen ini |
| `/admin/statistics/mustahiq` | Ya | Dokumen ini |
| `/admin/statistics/*/export` | Ya, bagian statistik; detail export juga di export-import | Dokumen ini + `docs/arsitektur-export-import.md` |
| Dashboard KPI/admin analytics | Tidak | `docs/arsitektur-laporan.md` |
| Reports finance/cash flow/zakat/qurban | Tidak | `docs/arsitektur-laporan.md` |
| `/admin/zakat/stats` | Tidak | `docs/arsitektur-zakat.md` |
| `/admin/fundraisers/stats` | Tidak | `docs/arsitektur-fundraiser.md` |
| Public stats zakat/qurban | Tidak | `docs/arsitektur-laporan.md`, `docs/arsitektur-activity-reports.md` |

## Dokumen Terkait

| Arsitektur Terkait | Alasan Keterkaitan |
|---|---|
| `docs/arsitektur-auth.md` | Role guard `/admin/statistics/*` |
| `docs/arsitektur-donatur.md` | Sumber data donatur, field pekerjaan/penghasilan, total donasi |
| `docs/arsitektur-mustahiq.md` | Sumber data mustahiq, asnaf, wilayah, rekening |
| `docs/arsitektur-fundraiser.md` | Statistik influencer pada halaman statistik donatur |
| `docs/arsitektur-zakat.md` | Mustahiq beneficiary dan relasi distribusi zakat |
| `docs/arsitektur-alamat.md` | Statistik provinsi memakai tabel alamat Indonesia |
| `docs/arsitektur-master-data.md` | Job title, job category, income range |
| `docs/arsitektur-export-import.md` | Export CSV statistik donatur/mustahiq |
| `docs/arsitektur-timezone.md` | Boundary 30/20 hari dan filter tanggal export |
| `docs/arsitektur-cache-performance.md` | Statistik/report query, cache gap, dan rekomendasi aggregate cache |
| `docs/arsitektur-komponen-admin.md` | Pola dashboard section, KPI card, chart, skeleton |

## File Implementasi

| Area | File |
|---|---|
| Admin statistics API | `apps/api/src/routes/admin/statistics.ts` |
| Admin route registration | `apps/api/src/routes/admin/index.ts` |
| Admin sidebar menu | `apps/admin/src/components/Sidebar.tsx` |
| Statistik donatur UI | `apps/admin/src/app/dashboard/statistics/donatur/page.tsx` |
| Statistik mustahiq UI | `apps/admin/src/app/dashboard/statistics/mustahiq/page.tsx` |
| CSV helper | `apps/api/src/services/export.ts` |
| Admin timezone helper untuk filename UI | `apps/admin/src/lib/timezone.ts` |

## Routing dan Role

Base API: `/v1/admin/statistics`.

Route admin memasang:

1. `authMiddleware` global.
2. `requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator", "employee", "mitra")` global untuk admin.
3. `admin.use("/statistics/*", staffOnly)`, sehingga `mitra` tidak bisa akses.
4. Handler statistics memakai role spesifik: `super_admin`, `admin_finance`, `admin_campaign`.

Endpoint:

| Endpoint | Role Handler | Fungsi |
|---|---|---|
| `GET /admin/statistics/donatur` | `super_admin`, `admin_finance`, `admin_campaign` | Summary dan chart data donatur/influencer |
| `GET /admin/statistics/donatur/export` | `super_admin`, `admin_finance`, `admin_campaign` | Export CSV data donatur |
| `GET /admin/statistics/mustahiq` | `super_admin`, `admin_finance`, `admin_campaign` | Summary dan chart data mustahiq |
| `GET /admin/statistics/mustahiq/export` | `super_admin`, `admin_finance`, `admin_campaign` | Export CSV data mustahiq |

Admin sidebar menampilkan menu `Statistics` untuk role `super_admin`, `admin_finance`, dan `admin_campaign`, dengan submenu:

- `/dashboard/statistics/donatur`
- `/dashboard/statistics/mustahiq`

## Statistik Donatur

### API Summary

Endpoint: `GET /admin/statistics/donatur`.

Sumber data:

| Data | Sumber |
|---|---|
| Donatur | `donatur` |
| Transaksi aktif donatur | raw SQL ke tabel `transactions` |
| Fundraiser/influencer | `fundraisers`, raw SQL ke `fundraiser_referrals`, join `employees` untuk link employee ke donatur |
| Profesi | `job_titles`, `job_categories` |
| Penghasilan | `income_ranges` |
| Provinsi | `indonesia_provinces` |

Definisi metric:

| Metric Response | Definisi Implementasi |
|---|---|
| `totalDonatur` | `count(*)` dari `donatur` |
| `donaturActive` | Donatur yang punya transaksi `paid` dengan `donatur_id` dan `COALESCE(paid_at, created_at) >= now - 30 hari` |
| `donaturInactive` | `totalDonatur - donaturActive` |
| `donaturAsInfluencer` | Donatur yang linked ke `fundraisers.donatur_id` atau linked ke employee yang punya fundraiser |
| `totalInfluencer` | `count(*)` fundraiser dengan `status = 'active'` |
| `influencerActive` | Fundraiser active yang punya row `fundraiser_referrals` dalam 20 hari terakhir |
| `influencerInactive` | Fundraiser active yang tidak pernah punya row `fundraiser_referrals` |

Chart data:

| Field Response | Query |
|---|---|
| `jobStats` | Count donatur per `jobTitles.name` dan `jobCategories.name`, inner join ke `job_titles` |
| `incomeStats` | Count donatur per `incomeRanges.label`, inner join ke `income_ranges`, order by `displayOrder` |
| `provinceStats` | Count donatur per `indonesiaProvinces.name`, inner join ke `indonesia_provinces` |

Catatan: API menghitung `donaturEverDonated` (`totalDonations > 0`) tetapi hasilnya tidak dikembalikan di response.

### Admin UI

File: `apps/admin/src/app/dashboard/statistics/donatur/page.tsx`.

UI memakai React Query:

```text
queryKey: ["statistics-donatur"]
GET /admin/statistics/donatur
```

Komponen visual:

| UI | Data |
|---|---|
| KPI cards | 7 card: total donatur, donatur aktif/tidak aktif, donatur influencer, total influencer, influencer aktif/tidak aktif |
| Pie chart Donatur Aktif vs Tidak Aktif | `donaturActive`, `donaturInactive` |
| Pie chart Influencer Aktif vs Tidak Aktif | `influencerActive`, `influencerInactive` |
| Pie chart Donatur vs Donatur+Influencer | `totalDonatur - donaturAsInfluencer`, `donaturAsInfluencer` |
| Bar chart Profesi | Top 15 `jobStats` |
| Bar chart Penghasilan | Semua `incomeStats` |
| Bar chart Provinsi | Top 20 `provinceStats` |
| Export CSV | Blob download dari `/admin/statistics/donatur/export` |

Warna chart lokal:

```text
["#035a52", "#d2aa55", "#296585", "#e74c3c", "#8b5cf6", "#f59e0b"]
```

Export UI:

- `startDate` dan `endDate` default kosong.
- Jika kosong, export semua data.
- Filename fallback UI memakai `todayWIBDateInput()`.
- Export tidak mempengaruhi data chart; chart selalu memakai summary global tanpa filter tanggal UI.

## Statistik Mustahiq

### API Summary

Endpoint: `GET /admin/statistics/mustahiq`.

Sumber data:

| Data | Sumber |
|---|---|
| Mustahiq | `mustahiqs` |
| Beneficiary zakat | raw SQL ke `zakat_distributions` |
| Asnaf | `mustahiqs.asnafCategory` |
| Provinsi | `indonesia_provinces` |
| Gender | `mustahiqs.gender` |

Definisi metric:

| Metric Response | Definisi Implementasi |
|---|---|
| `totalMustahiq` | `count(*)` dari `mustahiqs` |
| `mustahiqBeneficiary` | Mustahiq yang ID-nya ada di `zakat_distributions.mustahiq_id` |

Chart data:

| Field Response | Query |
|---|---|
| `asnafStats` | Count mustahiq per `asnafCategory`, termasuk potensi null karena tidak ada filter null |
| `provinceStats` | Count mustahiq per provinsi, inner join ke `indonesia_provinces` |
| `genderStats` | Count mustahiq per gender, hanya `gender IS NOT NULL AND gender != ''` |

### Admin UI

File: `apps/admin/src/app/dashboard/statistics/mustahiq/page.tsx`.

UI memakai React Query:

```text
queryKey: ["statistics-mustahiq"]
GET /admin/statistics/mustahiq
```

Komponen visual:

| UI | Data |
|---|---|
| KPI cards | Total mustahiq, penerima manfaat |
| Pie chart Asnaf | `asnafStats` |
| Pie chart Gender | `genderStats` |
| Bar chart Provinsi | Top 20 `provinceStats` |
| Export CSV | Blob download dari `/admin/statistics/mustahiq/export` |

Label asnaf lokal di UI:

| Value | Label |
|---|---|
| `fakir` | Fakir |
| `miskin` | Miskin |
| `amil` | Amil |
| `mualaf` | Mualaf |
| `riqab` | Riqab |
| `gharim` | Gharim |
| `fisabilillah` | Fisabilillah |
| `ibnus_sabil` | Ibnus Sabil |

Warna chart lokal:

```text
["#035a52", "#d2aa55", "#296585", "#e74c3c", "#8b5cf6", "#f59e0b", "#10b981", "#6366f1"]
```

Export UI:

- `startDate` dan `endDate` default kosong.
- Jika kosong, export semua data.
- Filename fallback UI memakai `todayWIBDateInput()`.
- Export tidak mempengaruhi data chart; chart selalu memakai summary global tanpa filter tanggal UI.

## Export CSV Statistik

Detail export lintas modul ada di `docs/arsitektur-export-import.md`; bagian ini hanya mencatat perilaku khusus statistik.

### Donatur Export

Endpoint: `GET /admin/statistics/donatur/export`.

Filter:

| Query | Implementasi |
|---|---|
| `startDate` | `gte(donatur.createdAt, new Date(startDate))` |
| `endDate` | `lte(donatur.createdAt, endDate 23:59:59.999)` |

Kolom CSV:

| Header | Source |
|---|---|
| Nama | `donatur.name` |
| Email | `donatur.email` |
| Telepon | `donatur.phone` |
| NIK | `donatur.nik` |
| Jenis Kelamin | Mapping `male/female` |
| Tempat Lahir | `donatur.birthPlace` |
| Tanggal Lahir | `donatur.birthDate` |
| Pekerjaan | `jobTitles.name` |
| Kategori Pekerjaan | `jobCategories.name` |
| Penghasilan | `incomeRanges.label` |
| Total Donasi | `donatur.totalDonations` |
| Total Nominal | `donatur.totalAmount`, format currency |
| Terdaftar | `donatur.createdAt`, format date |

### Mustahiq Export

Endpoint: `GET /admin/statistics/mustahiq/export`.

Filter:

| Query | Implementasi |
|---|---|
| `startDate` | `gte(mustahiqs.createdAt, new Date(startDate))` |
| `endDate` | `lte(mustahiqs.createdAt, endDate 23:59:59.999)` |

Kolom CSV:

| Header | Source |
|---|---|
| ID Mustahiq | `mustahiqs.mustahiqId` |
| Nama | `mustahiqs.name` |
| Kategori Asnaf | Mapping lokal `asnafLabels` |
| NIK | `mustahiqs.nationalId` |
| Jenis Kelamin | Mapping `male/female` |
| Tempat Lahir | `mustahiqs.birthPlace` |
| Tanggal Lahir | `mustahiqs.dateOfBirth`, format date |
| Nama Ibu Kandung | `mustahiqs.motherName` |
| Status Perkawinan | Mapping lokal `maritalLabels` |
| Jumlah Tanggungan | `mustahiqs.dependents` |
| Pekerjaan | `jobTitles.name` |
| Kategori Pekerjaan | `jobCategories.name` |
| Penghasilan | `incomeRanges.label` |
| Email | `mustahiqs.email` |
| Telepon | `mustahiqs.phone` |
| WhatsApp | `mustahiqs.whatsappNumber` |
| Provinsi | `indonesiaProvinces.name` |
| Alamat Detail | `mustahiqs.detailAddress` |
| Bank | `mustahiqs.bankName` |
| No Rekening | `mustahiqs.bankAccount` |
| Nama Rekening | `mustahiqs.bankAccountName` |
| Catatan | `mustahiqs.notes` |
| Status | `isActive ? "Aktif" : "Nonaktif"` |
| Terdaftar | `mustahiqs.createdAt`, format date |

## Data Semantics

### Donatur Aktif

Donatur aktif bukan berdasarkan `donatur.isActive`. Implementasi mendefinisikan aktif sebagai pernah melakukan transaksi paid dalam 30 hari terakhir dan transaksi tersebut memiliki `donatur_id`.

Konsekuensi:

- Donatur guest tanpa `donatur_id` tidak masuk statistik aktif.
- Donatur dengan `isActive=false` masih bisa dihitung aktif jika punya transaksi paid terbaru, karena query tidak mengecek `donatur.isActive`.
- Boundary 30 hari memakai `new Date()` runtime, bukan helper WIB.

### Influencer Aktif

Influencer aktif adalah fundraiser `status='active'` yang memiliki referral dalam 20 hari terakhir.

`influencerInactive` di response bukan komplemen penuh dari active. Implementasi saat ini menghitung fundraiser active yang **tidak pernah punya referral sama sekali**. Fundraiser yang pernah punya referral tetapi terakhir lebih dari 20 hari tidak masuk active dan juga tidak masuk inactive metric ini.

### Mustahiq Beneficiary

Mustahiq penerima manfaat dihitung dari tabel `zakat_distributions`, bukan dari universal `disbursements`. Jika flow distribusi zakat modern sudah berpindah ke disbursement universal, metric ini dapat undercount.

## Gap Implementasi

| Gap | Dampak | Rekomendasi |
|---|---|---|
| `donaturEverDonated` dihitung tapi tidak dikembalikan | Query ekstra tanpa manfaat UI/API | Hapus query atau expose metric jika dibutuhkan |
| `donaturActive` tidak cek `donatur.isActive` | Donatur nonaktif bisa tetap dihitung aktif | Tegaskan definisi atau tambahkan filter `donatur.isActive=true` |
| Donatur guest tanpa `donatur_id` tidak dihitung aktif | Aktivitas donasi guest bisa hilang dari statistik donatur | Jika guest auto-create donatur, pastikan `transactions.donaturId` terisi konsisten |
| `influencerInactive` hanya menghitung active fundraiser yang tidak pernah punya referral | Label UI “Influencer Tidak Aktif” tidak sesuai definisi 20 hari | Ubah metric menjadi `totalInfluencer - influencerActive`, atau rename label menjadi “Belum Pernah Referral” |
| `donaturAsInfluencer` tidak memfilter status fundraiser | Donatur yang pernah linked ke fundraiser nonaktif tetap dihitung | Tambahkan status filter jika metric harus aktif saja |
| Boundary 30/20 hari memakai `new Date()` runtime | Bisa tidak selaras WIB | Pakai helper dari `docs/arsitektur-timezone.md` |
| Export filter memakai `new Date("yyyy-MM-dd")` | Boundary tanggal export bisa UTC, bukan tanggal bisnis WIB | Parse date input sebagai WIB |
| Chart summary tidak ikut filter tanggal export | User bisa mengira filter export memfilter chart | Pisahkan UI copy atau tambahkan filter chart |
| Statistik job/income/province memakai inner join | Donatur/mustahiq tanpa FK tidak masuk chart distribusi | Tambahkan bucket “Tidak diketahui” dengan left join jika perlu akurat |
| `asnafStats` tidak filter null/kosong | Pie asnaf bisa punya label kosong/null | Tambahkan filter atau bucket eksplisit |
| Mustahiq beneficiary masih memakai `zakat_distributions` | Jika distribusi modern memakai `disbursements`, angka penerima manfaat bisa undercount | Sinkronkan sumber dengan arsitektur zakat/disbursement aktual |
| CSV export membawa PII sensitif | NIK, rekening, email, telepon bisa diunduh oleh `admin_campaign` | Evaluasi masking/role granular dan audit log |
| CSV export tidak punya pagination/limit | Export besar bisa berat | Tambahkan streaming/background job atau limit |
| Tidak ada audit log export statistik | Aktivitas unduh data sensitif tidak tercatat | Tambahkan audit event export |
| Mapping label gender/asnaf/marital tersebar di API dan UI | Risiko inkonsistensi label | Pindahkan ke shared constants |

## SOP Perubahan

1. Jika definisi aktif/tidak aktif berubah, update dokumen ini dan UI label.
2. Jika export statistik berubah, update dokumen ini dan `docs/arsitektur-export-import.md`.
3. Jika sumber mustahiq beneficiary berpindah ke universal disbursement, update dokumen ini, `docs/arsitektur-zakat.md`, dan `docs/arsitektur-disbursement.md`.
4. Jika chart memakai filter tanggal, jelaskan apakah filter berlaku untuk chart, export, atau keduanya.
5. Jika data personal baru ditambahkan ke export, evaluasi role, masking, dan audit log.
6. Jangan mencampur statistik domain lain ke dokumen ini kecuali endpoint berada di `/admin/statistics/*`.
