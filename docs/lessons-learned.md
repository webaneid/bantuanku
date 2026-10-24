# Lessons Learned

> Catatan dari eksekusi nyata untuk mencegah kesalahan berulang. Wajib dibaca
> sebelum menyentuh modul terkait. Dipindahkan dari `CLAUDE.md` (gitignored)
> ke sini supaya ikut ter-track git.
>
> Format entri: `### [Tanggal] Judul` → **Konteks** / **Masalah** / **Pelajaran**.
> Keputusan desain non-trivial yang sifatnya tetap → tulis sebagai ADR di
> `docs/decisions/`, lalu tautkan dari entri di sini.
> Entri baru ditambahkan di bagian bawah.

### 2026-07-02 — Hono Typing Wajib di Setiap Route File

**Konteks:** Banyak route file menggunakan `new Hono()` tanpa generik.
**Masalah:** `c.get("db")` dan `c.get("user")` bertipe `unknown`, menyebabkan ~170 TypeScript error di apps/api. Semua route admin yang mengakses `user.id`, `user.roles`, dll. perlu `user!.xxx` karena `Variables.user` optional (middleware bisa saja belum dijalankan).
**Pelajaran:** Selalu gunakan `new Hono<{ Bindings: Env; Variables: Variables }>()`. Untuk `user` di route yang sudah di-guard auth, gunakan `user!` (non-null assertion). Jangan tambahkan `user` ke `Variables` sebagai required — middleware tidak menjamin itu.

### 2026-07-02 — Drizzle `eq()` Tidak Menerima `null`

**Konteks:** Column FK yang nullable (misal `campaignId: text().references(...)`) bisa bernilai `null`.
**Masalah:** `eq(campaigns.id, campaignId)` error TypeScript jika `campaignId` bisa `null`. Drizzle `eq()` overload tidak menerima `null` sebagai argumen kedua.
**Pelajaran:** Selalu guard dengan `if (campaignId) { ... eq(campaigns.id, campaignId) ... }` sebelum memanggil `eq()` pada kolom yang nilainya bisa `null`.

### 2026-07-02 — `postalCode` di Zod vs Schema DB

**Konteks:** Form mitra (publik dan admin) menerima `postalCode` di Zod schema.
**Masalah:** Tabel `mitra` tidak punya kolom `postal_code`. Field divalidasi tapi langsung dibuang saat destruktur — data hilang diam-diam tanpa error.
**Pelajaran:** Sebelum menambah field ke Zod schema, pastikan kolom ada di schema DB. Audit via `grep` atau baca `packages/db/src/schema/` terkait.

### 2026-07-02 — `TransactionService.list()` Tidak Return Array

**Konteks:** Test file menggunakan `list.length`, `list[0]`, `list.forEach()`.
**Masalah:** `TransactionService.list()` mengembalikan `{ data: [...], pagination: {...} }` bukan array langsung. Semua akses langsung ke array gagal runtime dan TypeScript.
**Pelajaran:** Semua service/API yang paginated menggunakan `paginated()` helper mengembalikan objek dengan `.data` dan `.pagination`. Selalu akses `.data` untuk list item.

### 2026-07-02 — macOS `sed` Tidak Support `\b` Word Boundary

**Konteks:** Mass-replace `user.id` → `user!.id` di banyak file menggunakan `sed`.
**Masalah:** BSD `sed` di macOS tidak mendukung `\b` word boundary — penggantian parsial, hasilnya tidak konsisten.
**Pelajaran:** Gunakan `perl -i -pe 's/pattern/replacement/g'` untuk mass-replace dengan word boundary di macOS. Contoh: `perl -i -pe 's/(?<![!?])user\.(id|email)\b/user!.$1/g'`

### 2026-07-02 — Dua Context Query di File yang Sama

**Konteks:** `apps/api/src/routes/qurban.ts` memiliki dua bagian kode yang menggunakan variabel `pkgPeriod` dari query berbeda.
**Masalah:** Mass-replace `pkgPeriod.packageType` → `pkgPeriod.package?.packageType` merusak bagian flat `db.select()` yang sudah benar, karena di flat select tidak ada relasi `.package`.
**Pelajaran:** Sebelum mass-replace, identifikasi semua konteks penggunaan variabel. Query `db.select()` (flat) vs `db.query.findFirst({ with: {} })` (relational) menghasilkan shape object yang berbeda meski nama variabel sama.

### 2026-07-03 — Delete Guard Hanya Cek Campaign, Lupa Zakat & Qurban

**Konteks:** `DELETE /admin/mitra/:id` hanya mengecek apakah mitra punya campaign aktif.
**Masalah:** Mitra yang punya zakat type atau qurban package (linked via `mitra.userId`) bisa dihapus, data program menjadi orphan karena link via `createdBy = mitra.userId`.
**Pelajaran:** Saat menulis delete guard untuk entitas yang punya ownership via `userId` (bukan FK langsung), cek semua tabel yang link ke `userId` tersebut. Pola ownership mitra: campaign via `mitraId` FK langsung, zakat/qurban via `createdBy = mitra.userId` (indirect).

### 2026-07-03 — Upload Publik Butuh Endpoint Sendiri

**Konteks:** Form registrasi mitra di web publik butuh upload dokumen (KTP, NPWP, buku rekening).
**Masalah:** `POST /admin/media/upload` memerlukan auth. User yang belum punya akun tidak bisa upload.
**Pelajaran:** Untuk upload publik (pre-registration), buat endpoint sendiri `POST /mitra/upload-document` yang: (1) tanpa auth, (2) kategori fixed `document`, (3) reuse infrastruktur GCS/local yang sama, (4) buat row `media` dengan `uploadedBy: null`. Row orphan jika registrasi dibatalkan — perlu cleanup job di masa depan.

### 2026-07-03 — URL Registry Wajib untuk Semua Halaman Frontend

**Konteks:** Halaman `/daftar-mitra` sudah ada tapi tidak ada di `apps/admin/src/lib/url-registry.ts`.
**Masalah:** URL tidak bisa dipilih di `URLAutocomplete` component (dipakai di settings frontend, SEO panel, dll).
**Pelajaran:** Setiap halaman publik baru yang dibuat di `apps/web` **wajib** didaftarkan di `url-registry.ts` di STATIC_URLS atau via fetch dinamis. Cek file ini setelah membuat halaman baru.

### 2026-07-03 — Audit Temuan "totalWithdrawn Tidak Diupdate" Ternyata Salah

**Konteks:** Audit influencer system menemukan dugaan bug bahwa `fundraisers.totalWithdrawn` tidak pernah diupdate.
**Masalah:** Audit agent hanya melihat route `POST /me/disbursements` tapi tidak menelusuri `DisbursementService.markAsPaid()` yang dipanggil dari `POST /admin/disbursements/:id/mark-paid`.
**Pelajaran:** Sebelum menganggap sesuatu sebagai bug berdasarkan audit, baca seluruh code path sampai service layer. Update di `totalWithdrawn` ada di `DisbursementService` (bukan di route handler) dan terjadi saat status disbursement berubah ke `paid`.

### 2026-07-03 — Helper Functions Duplikat di Route Paralel

**Konteks:** `apps/api/src/routes/fundraisers.ts` (public) dan `apps/api/src/routes/admin/fundraisers.ts` (admin) punya helper functions yang identik.
**Masalah:** `getDefaultSourceBankFromSettings`, `findMyFundraiser`, `getMyBankAccounts` duplikat di dua file — risiko drift saat salah satu diupdate.
**Pelajaran:** Helper functions yang dipakai di lebih dari satu route file → pindahkan ke `apps/api/src/lib/`. Untuk fundraiser helpers sudah ada di `apps/api/src/lib/fundraiser-helpers.ts`.

### 2026-07-03 — Audit Arsitektur vs Kode: Jalankan Sebelum Menambah Fitur Baru

**Konteks:** Sebelum menambah fitur referral persistence, dilakukan audit menyeluruh `arsitektur-fundraiser.md` vs kode aktual.
**Masalah:** Ditemukan 16+ ketidaksesuaian: status `"inactive"` tidak ada di kode, endpoint `/me/stats` tidak ada, formula availability salah, cookie tracking belum terhubung frontend, `active-programs` tidak filter Wakaf/Fidyah.
**Pelajaran:** Sebelum menambah fitur pada modul yang kompleks, selalu audit arsitektur vs kode aktual terlebih dahulu. Spawn agent dengan prompt audit yang spesifik (per-file, per-section). Dokumen arsitektur yang tidak sinkron lebih berbahaya dari tidak ada dokumen — developer akan build di atas asumsi yang salah.

### 2026-07-03 — Referral Persistence: Dua Lapis (localStorage + httpOnly Cookie)

**Konteks:** Sistem referral awalnya hanya pakai localStorage 24 jam — terlalu pendek untuk konversi indirect.
**Masalah:** Donatur yang datang via link referral tapi tidak langsung donasi kehilangan atribusi setelah 24 jam. Cookie server sudah ada tapi tidak terhubung ke frontend maupun checkout.
**Pelajaran:** Untuk referral attribution yang robust: (1) localStorage sebagai primary (mudah dibaca di client), (2) httpOnly cookie sebagai fallback (persist lebih lama, browser kirim otomatis ke API). Fallback cookie dibaca di `POST /transactions` via `getCookie(c, "fundraiser_ref")` — frontend tidak perlu melakukan apa-apa saat checkout karena browser otomatis kirim cookie.

### 2026-07-03 — Filter `active-programs` Harus Konsisten dengan Aturan Komisi

**Konteks:** Portal fundraiser menampilkan daftar program untuk dibagikan, termasuk Wakaf dan Fidyah.
**Masalah:** `RevenueShareService` tidak menghitung komisi untuk Wakaf/Fidyah, tapi kedua program ini tetap muncul di portal fundraiser. Fundraiser share link Wakaf → ada donasi → komisi = Rp 0 tanpa peringatan.
**Pelajaran:** Daftar program yang ditampilkan untuk dibagikan harus selalu konsisten dengan aturan komisi. Setiap kali aturan pengecualian komisi berubah di `RevenueShareService`, cek juga filter di `GET /active-programs` di kedua route (`fundraisers.ts` dan `admin/fundraisers.ts`).

### 2026-07-03 — `or(...conditions)` vs `and(...conditions)` di Filter List

**Konteks:** List endpoint mustahiq menggunakan `or(...conditions)` untuk menggabungkan filter `search`, `asnafCategory`, dan `status`.
**Masalah:** Dengan OR, query "cari nama Ali yang asnafnya fakir" malah mengembalikan semua Ali (apapun asnafnya) PLUS semua fakir (apapun namanya). Filter multi-kriteria tidak presisi.
**Pelajaran:** Saat membangun filter list dengan beberapa kondisi independen: kondisi ANTAR filter harus AND (harus memenuhi semua kriteria); kondisi DALAM satu filter (misal search = name OR phone OR email) boleh OR. Selalu cek baris `where: conditions.length > 1 ? and(...) : or(...)` saat membuat atau mereview endpoint list baru.

### 2026-07-03 — Delete Guard Wajib untuk Master Data yang Direferensi

**Konteks:** `DELETE /admin/mustahiqs/:id` tidak punya guard — mustahiq yang sudah punya riwayat distribusi zakat bisa dihapus, data distribusinya jadi orphan.
**Masalah:** Tidak ada FK constraint di `zakat_distributions.mustahiq_id` dan tidak ada cek di route sebelum delete. Data historis distribusi kehilangan referensi ke penerima.
**Pelajaran:** Setiap endpoint DELETE untuk master data yang dipakai sebagai referensi di tabel lain wajib punya delete guard: (1) cek COUNT dari tabel yang mereferensi, (2) jika ada → block dengan pesan yang menyebut jumlah dan sarankan nonaktifkan. Selain itu, tambahkan FK constraint `ON DELETE SET NULL` di schema DB sebagai lapisan kedua. Pattern: cek dulu di CLAUDE.md lesson "Delete Guard Hanya Cek Campaign" untuk reminder bahwa guard harus cover SEMUA tabel yang mereferensi, bukan hanya satu.

### 2026-07-04 — Nilai Enum Harus Distandardisasi Lintas Modul Sejak Awal

**Konteks:** Donatur menyimpan gender `"laki-laki"/"perempuan"`, mustahiq menyimpan `"male"/"female"`. CSV formatter ditulis untuk salah satu lalu dipakai untuk keduanya — hasilnya salah untuk modul yang tidak match.
**Masalah:** Nilai enum yang "hanya di satu modul" sering copy-paste ke modul lain dengan nilai berbeda. Tidak ada error TypeScript karena kolom bertipe `text`. Bug baru terdeteksi saat audit atau saat export CSV tampil aneh.
**Pelajaran:** Saat menambah field enum baru (gender, status, tipe, dll.) ke satu modul, segera cek apakah modul lain punya field serupa dan samakan nilainya. Untuk project ini: gunakan bahasa Indonesia untuk semua nilai enum yang berhadapan dengan user (`"laki-laki"/"perempuan"`, bukan `"male"/"female"`). Nilai English hanya untuk internal flags yang tidak pernah ditampilkan langsung.

### 2026-07-04 — Export CSV Selalu Tertinggal dari Form

**Konteks:** Export CSV donatur hanya 13 kolom padahal form donatur punya ~22 field. Mustahiq export tidak menyertakan alamat kabupaten/kecamatan/desa padahal form sudah mengumpulkan data ini.
**Masalah:** Saat kolom baru ditambahkan ke schema/form, export CSV tidak ikut diupdate. Ini terjadi berkali-kali (donatur, mustahiq) karena export ada di file berbeda (`statistics.ts`) dan mudah terlupa.
**Pelajaran:** Setiap kali menambah kolom ke schema DB atau field ke form admin/web, langsung cek dan update export CSV yang terkait di `apps/api/src/routes/admin/statistics.ts`. Checklist: (1) kolom address → pastikan join ke semua 4 tabel Indonesia dan export 4 kolom nama, (2) field kontak baru → tambahkan ke export, (3) field status/flag → tambahkan dengan format yang readable.

### 2026-07-04 — Frontend Bisa Memanggil Endpoint dengan Role yang Salah (Silent 403)

**Konteks:** Halaman detail donatur di admin memanggil `GET /transactions?donatur_id=X` untuk tampilkan riwayat transaksi. Endpoint itu hanya boleh `super_admin` dan `admin_finance`. `admin_campaign` yang buka halaman tersebut mendapat 403 — transaksi tampil kosong tanpa pesan error.
**Masalah:** Endpoint yang benar (`GET /admin/donatur/:id/donations`, accessible semua staff) sudah ada tapi tidak dipakai. Frontend menggunakan endpoint lama yang lebih restriktif. Tidak ada TypeScript error, tidak ada runtime crash — hanya data hilang secara silent.
**Pelajaran:** Saat membuat endpoint baru yang menggantikan fungsi endpoint lama, langsung update frontend-nya di commit yang sama. Setelah selesai, cek: apakah role requirement di endpoint yang dipanggil frontend sudah konsisten dengan role user yang mengakses halaman tersebut? Endpoint admin yang dipanggil dari halaman yang accessible semua staff → harus menggunakan path `/admin/*` tanpa `requireRole` tambahan (sudah terlindungi `staffOnly` middleware).

### 2026-07-04 — Manifest Runner di VPS: Pakai `tsx` Langsung, Bukan `npm run`

**Konteks:** `npm run db:manifest:run -- --from=115_...` dari root repo tidak meneruskan argument `--from` ke script, menyebabkan manifest runner mulai dari awal dan gagal di migration yang sudah diapply.
**Masalah:** npm workspace script tidak selalu meneruskan `--` args dengan benar ke workspace child. Tidak ada error saat args diabaikan — runner hanya jalan dari awal tanpa warning.
**Pelajaran:** Di VPS, selalu jalankan manifest runner langsung via tsx: `cd /var/www/bantuanku/repo/packages/db && npx tsx scripts/run-production-manifest.ts --from=NNN_nama_file.sql`. Jangan gunakan `npm run db:manifest:run -- --from=` dari root — args tidak dijamin sampai.

### 2026-07-04 — Stok/Slot Qurban: Pilih Satu Filosofi dan Pegang Teguh

**Konteks:** Public order create increment `slotsFilled` saat order dibuat. Admin verify juga increment `slotsFilled` saat payment di-verify. Dua filosofi bertentangan dalam satu codebase → double-counting.
**Masalah:** Sapi 7 slot bisa dianggap "full" setelah 4 orang pesan (bukan 7) karena masing-masing order increment dua kali. Bug tidak terdeteksi TypeScript, hanya kelihatan saat data hidup.
**Pelajaran:** Pilih filosofi **reservation at creation** (increment saat order dibuat, decrement saat cancel). Jangan increment di tempat lain (terutama bukan di verify/payment handler). Setiap kali ada jalur order baru (public, admin, konversi savings), pastikan: (1) increment di create, (2) decrement di cancel, (3) tidak ada increment di tempat lain.

### 2026-07-04 — Guard Auth Public Endpoint: Cek `userId !== user?.id` Bukan `user && userId`

**Konteks:** `GET /qurban/orders/:id` punya guard `if (user && orderData[0].userId && userId !== user.id)`. Jika request tanpa token, `user = undefined` → seluruh kondisi false → guard dilewati.
**Masalah:** Guest bisa akses order siapapun selama tahu ID-nya. Email, HP donatur bocor.
**Pelajaran:** Pattern yang benar untuk ownership check di endpoint publik (bisa guest): `if (resource.userId && resource.userId !== user?.id) → 403`. Tidak perlu cek `user` dulu — optional chaining `user?.id` sudah handle undefined.

### 2026-07-05 — Fitur Produk Spesifik: Wajib Update TransactionService, Bukan Hanya Route Legacy

**Konteks:** Fitur discount qurban diimplementasikan di `POST /qurban/orders` (route legacy) dan di `POST /qurban/savings`. Tetapi web checkout menggunakan `POST /transactions` → `TransactionService.create()`.
**Masalah:** `TransactionService.create()` tidak membaca `discount_amount` dari request — ia recalculate `totalAmount = subtotal + adminFee`. Akibatnya, semua order via web checkout tidak menyimpan discount di DB (`transactions.totalAmount` = harga penuh), `qurban_discount_usages` tidak terbuat, `usage_count` tidak terupdate. Fitur kelihatan benar di UI tapi data di DB salah.
**Pelajaran:** Setiap kali menambah fitur yang mengubah cara kalkulasi harga (discount, promo, unique code, dll) untuk product type tertentu, **wajib update `TransactionService.create()`** sekaligus. Ada dua jalur order yang harus selalu sinkron: (1) route legacy (`POST /qurban/orders`) dan (2) universal service (`TransactionService`). `CreateTransactionDTO` di `apps/api/src/services/transaction.ts` adalah gerbang tunggal untuk universal flow — jika field tidak ada di DTO, tidak akan masuk ke DB.

### 2026-07-05 — Dual Flow Qurban: Legacy Route vs Universal TransactionService

**Konteks:** Modul qurban punya dua flow payment yang coexist: legacy (`qurban_orders` + `qurban_payments`) dan universal (`transactions` + `transaction_payments`). Web checkout pakai universal, tapi banyak fitur di-build di legacy.
**Masalah:** Fitur yang di-build di legacy route (`POST /qurban/orders`) tidak otomatis tersedia di universal flow. Ini menyebabkan divergensi — legacy benar, universal salah — tanpa ada error TypeScript atau runtime crash.
**Pelajaran:** Sebelum mengimplementasi fitur apapun di modul qurban yang mengubah data order, cek: "apakah ini perlu diimplementasikan di KEDUA flow?" Checklist: (1) `POST /qurban/orders` (legacy), (2) `TransactionService.create()` (universal via web checkout), (3) `POST /qurban/savings` (tabungan), (4) `POST /qurban/savings/:id/convert` (konversi). Kalau hanya satu yang diupdate, catat sebagai gap di arsitektur.

### 2026-07-05 — WhatsApp Service adalah Instance, Bukan Static

**Konteks:** `WhatsAppService` di `apps/api/src/services/whatsapp.ts` mempunyai constructor `constructor(private db: Database, envFrontendUrl?: string)`. Semua method termasuk `send()` adalah instance method.
**Masalah:** Memanggil `WhatsAppService.send(db, ...)` sebagai static method akan gagal — TypeScript error "Property 'send' does not exist on type 'typeof WhatsAppService'" atau runtime crash.
**Pelajaran:** Selalu instantiate dulu: `const waService = new WhatsAppService(c.get("db"))`, lalu panggil `waService.send({ phone, templateKey, variables })`. `send()` menerima satu object `SendParams`, bukan argumen terpisah.

### 2026-07-05 — Savings Reminder: Dual-Check Pattern untuk Dual-Flow Deposit

**Konteks:** Tabungan qurban bisa dibayar via dua jalur: (1) legacy `qurban_savings_transactions`, (2) universal `transactions` dengan `typeSpecificData->>'savings_id'`.
**Masalah:** Reminder yang cek hanya legacy table akan mengirim reminder ke donatur yang sudah bayar via universal flow — memberikan kesan sistem tidak mengenali pembayaran mereka.
**Pelajaran:** Untuk query apa pun yang menentukan apakah savings sudah dibayar, selalu cek KEDUA jalur. Universal check: `WHERE typeSpecificData->>'savings_id' = $id AND payment_status = 'paid' AND paid_at BETWEEN $start AND $end`. Pattern ini sudah ada di `syncSavingsBalance()` di `transactions.ts` — ikuti pola yang sama.

### 2026-07-05 — `useSearchParams()` di Next.js App Router Wajib Dalam `<Suspense>`

**Konteks:** Halaman `/berhenti` (unsubscribe WA) menggunakan `useSearchParams()` untuk membaca query param `?t=TOKEN`.
**Masalah:** Di Next.js 13+ App Router, komponen yang memanggil `useSearchParams()` menyebabkan seluruh route menjadi dinamis (tidak bisa di-static render). Jika tidak di-wrap dalam `<Suspense>`, Next.js akan throw error saat build: "useSearchParams() should be wrapped in a suspense boundary". Tidak ada TypeScript error — bug hanya muncul saat `npm run build`.
**Pelajaran:** Setiap halaman yang menggunakan `useSearchParams()`, `usePathname()`, atau `useRouter()` di App Router dan perlu SSR/static — pisahkan ke inner component dan wrap di-parent dengan `<Suspense fallback={...}>`. Pattern: `export default function Page() { return <Suspense><Inner /></Suspense> }` — inner component yang pegang `useSearchParams()`.

### 2026-07-05 — `wa_broadcast_logs.job_id NOT NULL` vs Arsitektur Tanpa Job Entry

**Konteks:** Arsitektur WA Community Care menyatakan birthday/re-engagement cron tidak perlu membuat entry di `wa_broadcast_jobs` — langsung kirim dan log ke `wa_broadcast_logs` untuk anti-spam.
**Masalah:** Schema DB (migration 119) mendefinisikan `wa_broadcast_logs.job_id TEXT NOT NULL REFERENCES wa_broadcast_jobs(id)`. Tidak mungkin insert log tanpa job entry yang valid. Tidak ada error TypeScript — hanya crash saat runtime saat insert pertama.
**Pelajaran:** Saat merancang skema log dengan FK NOT NULL ke tabel lain, pastikan SEMUA jalur yang mengisi log (termasuk cron yang tidak pakai job table) sudah diperhitungkan. Solusi yang dipilih: buat **synthetic job entry** per run cron (`type='birthday'`, `status='processing'→'completed'`). Ini justru lebih baik dari arsitektur awal — memberikan audit trail run harian yang bisa dilihat admin.

### 2026-07-05 — Endpoint Path di Arsitektur vs Implementasi Aktual

**Konteks:** Arsitektur `arsitektur-wa-community-care.md` mendokumentasikan `POST /v1/account/wa/opt-in` untuk opt-in kembali WA. Implementasi aktual menggunakan `POST /v1/wa/opt-in` (mount di `/v1/wa`, bukan `/v1/account`).
**Masalah:** Tidak ada error TypeScript atau runtime — frontend memanggil path yang salah, mendapat 404, dan fitur gagal diam-diam. Hanya ketahuan saat review dokumentasi vs kode.
**Pelajaran:** Saat menulis arsitektur endpoint path sebelum implementasi, selalu verifikasi path mount di `apps/api/src/index.ts` setelah selesai. Checklist pasca-implementasi: (1) baca `index.ts` untuk konfirmasi prefix `/v1/xxx`, (2) cek route file untuk konfirmasi method dan sub-path, (3) update arsitektur jika ada perbedaan.

### 2026-07-05 — Cron Secret Jangan Pakai JWT_SECRET, Jangan di Query Param

**Konteks:** Empat cron endpoint (`/cron/wa-birthday`, `/cron/wa-reengagement`, `/cron/wa-broadcast`, `/cron/savings-reminder`) menggunakan `?secret=JWT_SECRET` untuk auth.
**Masalah:** (1) `JWT_SECRET` juga dipakai untuk menandatangani session JWT donatur — jika secret bocor via access log, penyerang bisa memalsukan token login. (2) Query param muncul di Nginx/proxy access log secara default, sehingga secret terlindungi terburuk. (3) Perbandingan `secret !== expected` rentan timing attack.
**Pelajaran:** Untuk cron auth yang ideal: (a) gunakan env var dedicated (`CRON_SECRET`, bukan `JWT_SECRET`), (b) kirim via `Authorization: Bearer` header bukan query param, (c) bandingkan dengan `crypto.timingSafeEqual`. Kode sudah difix ke (b) dan (c). Untuk (a): update VPS `.env` dan crontab setelah ada window deploy. Crontab lama yang pakai `?secret=` masih berfungsi (backward-compat) tapi harus dimigrasikan.

### 2026-07-05 — Broadcast Pagination: NOT EXISTS di DB, Bukan In-Memory Set

**Konteks:** `broadcast-processor.ts` membangun `Set<donaturId>` dari semua log sebelumnya, lalu filter di loop. `queryAudienceBatch` tetap menggunakan OFFSET/LIMIT pada seluruh audience (termasuk yang sudah dikirim).
**Masalah:** OFFSET maju sejauh `batch.length` (total row yang difetch, termasuk yang sudah dikirim). Donatur yang "dilewati" oleh Set tidak mengurangi offset, sehingga halaman berikutnya mulai terlalu jauh — recipient yang belum dikirim terlewati tanpa log. Untuk `campaign_donors`, join tanpa DISTINCT menghasilkan satu donatur muncul N kali (N = jumlah transaksi) — semakin memperparah corruption offset.
**Pelajaran:** Untuk broadcast pagination yang benar: (1) tambahkan `NOT EXISTS (SELECT 1 FROM wa_broadcast_logs WHERE donatur_id = $id AND job_id = $jobId)` ke WHERE clause SQL — bukan in-memory filter, (2) tambahkan `GROUP BY donatur.id` pada branch yang pakai JOIN ke tabel many-side, (3) hapus Set in-memory sepenuhnya. Dengan ini OFFSET/LIMIT hanya menghitung baris yang belum terkirim, tidak ada skipping.

### 2026-07-05 — Synthetic Job birthday/reengagement Tidak Boleh Diproses Ulang oleh broadcast-processor

**Konteks:** `birthday-reminder.ts` dan `reengagement-reminder.ts` masing-masing meng-insert entry `wa_broadcast_jobs` dengan `status: 'processing'` dan `nextBatchAt: now` (untuk audit trail dan FK requirement).
**Masalah:** `broadcast-processor.ts` query mencari job dengan `status IN ('pending','processing') AND nextBatchAt <= now` — tanpa filter `type`. Akibatnya synthetic job bisa dipick-up oleh cron broadcast-processor saat cron reengagement masih berjalan. Untuk `birthday_today` (tidak ada branch di queryAudienceBatch), batch kosong dan job langsung ditandai selesai — benign tapi mengganggu. Untuk `inactive_62d` (ada branch), broadcast-processor bisa mengirim ulang ke donatur yang sama.
**Pelajaran:** Selalu filter `type NOT IN ('birthday','reengagement')` di query broadcast-processor. Prinsip: synthetic job milik cron-nya sendiri, bukan untuk broadcast-processor. Sudah difix dengan `notInArray(waBroadcastJobs.type, ["birthday", "reengagement"])`.

### 2026-07-05 — Template Key Endpoint Wajib Whitelist Prefix

**Konteks:** `GET /admin/whatsapp/templates/:key` membaca settings berdasarkan key yang dikirim langsung oleh admin tanpa validasi.
**Masalah:** Settings table menyimpan `whatsapp_password`, `whatsapp_username`, `whatsapp_api_url` (kategori `whatsapp`). Admin finance bisa memanggil `GET /admin/whatsapp/templates/whatsapp_password` dan mendapatkan password GOWA gateway dalam response JSON — cukup untuk mengirim pesan WA ke nomor manapun melalui gateway organisasi.
**Pelajaran:** Endpoint yang membaca settings berdasarkan key dari user input WAJIB memvalidasi format key dengan regex sebelum query. Untuk template WA: `if (!/^wa_tpl_[a-z0-9_]+$/.test(key)) return error(c, 400)`. Prinsip umum: allowlist prefix/pattern, bukan blocklist nama spesifik.

### 2026-07-05 — Unsubscribe Token Replay Setelah Opt-In

**Konteks:** Donatur opt-out via link WA (JWT 30 hari), lalu opt-in kembali, lalu link lama masih bisa digunakan.
**Masalah:** `verifyUnsubscribeToken` hanya validasi signature dan expiry JWT. Guard `if (existing.waOptOut)` gagal melindungi setelah opt-in karena `waOptOut` sudah kembali `false`. Link lama bisa berulang kali meng-opt-out donatur selama 30 hari tanpa sepengetahuan mereka.
**Pelajaran:** Untuk token yang bisa dibatalkan (unsubscribe, password reset, dll), simpan timestamp "last state change" di DB. Pada validasi, bandingkan `token.iat * 1000 < lastStateChangeAt`. Fix yang diaplikasikan: (1) `verifyUnsubscribeToken` kini return `{ donaturId, issuedAt }`, (2) opt-in handler tidak lagi null-kan `waOptOutAt` (tetap simpan sebagai timestamp opt-out terakhir), (3) unsubscribe handler cek `issuedAt * 1000 < waOptOutAt` untuk deteksi stale token.

### 2026-07-06 — Cron Endpoint Wajib Respond Segera untuk Proses Panjang

**Konteks:** `/cron/wa-broadcast` memproses satu batch (50 pesan × 2s delay = ~100s) secara sinkron — HTTP response baru dikirim setelah seluruh batch selesai.
**Masalah:** Cloudflare memutus koneksi setelah ~60s (504 Gateway Timeout). Cron melaporkan berhasil di sisi crontab (`curl` exit 0) tapi tidak ada pesan yang terkirim. Bug tidak terdeteksi tanpa monitoring aktif.
**Pelajaran:** Setiap cron endpoint yang prosesnya bisa memakan waktu > 30 detik harus: (1) validasi secret, (2) **return respons 202 segera**, (3) jalankan proses di background via `setImmediate(() => { longProcess().catch(console.error) })`. Pattern ini aman di Node.js — process tetap hidup selama event loop aktif. Berlaku untuk: broadcast, savings-reminder (jika base besar), dan semua cron yang melakukan loop kirim pesan.

### 2026-07-06 — `buildSharedVars` Harus Cover Semua Variable di Template

**Konteks:** Template `wa_tpl_campaign_new` menggunakan `{campaign_description}`, `{campaign_target}`, `{campaign_url}`. Namun `buildSharedVars()` di `broadcast-processor.ts` hanya mengisi `campaign_title`, `campaign_name`, `campaign_slug`.
**Masalah:** Variable yang tidak ada di `buildSharedVars` dikirim apa adanya ke GOWA sebagai literal `{campaign_description}` dll — donatur menerima teks dengan placeholder tidak tergantikan. Tidak ada error TypeScript, tidak ada runtime error. Bug hanya ketahuan saat pesan WA benar-benar diterima oleh donatur.
**Pelajaran:** Setiap kali menambah variable baru ke template WA, wajib update `buildSharedVars()` sekaligus. Checklist: (1) buka template text di settings, (2) ekstrak semua `{...}` yang bukan global var (`customer_name`, `store_name`, `frontend_url`, dll), (3) pastikan setiap variable itu ada di `buildSharedVars`. Juga perhatikan nama field DB yang sebenarnya: `campaigns.goal` (bukan `targetAmount`), `campaigns.slug` (untuk build URL).

### 2026-07-06 — Cron Log di VPS: Jangan Tulis ke `/var/log/`, Pakai `~/logs/`

**Konteks:** Crontab awalnya redirect output ke `/var/log/cron-wa-broadcast.log` dll. Cron firing tapi curl tidak pernah jalan — log file tidak pernah terbuat.
**Masalah:** User `bantuanku` tidak punya write permission ke `/var/log/`. Bash menyiapkan redirect sebelum menjalankan command — jika redirect gagal (`Permission denied`), command-nya tidak jalan sama sekali. Tidak ada error yang terlihat karena errornya sendiri juga gagal ditulis ke tempat yang sama.
**Pelajaran:** Untuk cron yang berjalan sebagai non-root user di VPS: selalu tulis log ke `~/logs/` (home directory user). Prasyarat: `mkdir -p ~/logs` sebelum edit crontab. Template crontab yang benar ada di `docs/arsitektur-wa-community-care.md` section "Crontab VPS".

### 2026-07-06 — Platform Bernama Jaladana, Bukan Bantuanku

**Konteks:** Selama development awal, nama "Bantuanku" masuk ke banyak teks hardcode karena diasumsikan sebagai nama platform.
**Masalah:** "Bantuanku" adalah nama tenant/client pertama, bukan nama platform. Platform kita bernama **Jaladana**. Kode yang hardcode "Bantuanku" akan menampilkan nama client lain (bukan nama tenant yang sedang login) ke semua tenant lain.
**Pelajaran:**
- Nama **Jaladana** = nama produk/platform kita. Boleh muncul HANYA di `/dashboard/settings/developer` dan `/documentation`.
- Nama tenant (`site_name`, `organization_name`) = selalu dari settings DB.
- Fallback yang benar: `settings.site_name || ''` — **BUKAN** `|| 'Bantuanku'`.
- Setiap kali menulis teks UI yang menyebut nama organisasi/platform, tanya: "apakah ini hardcode?" Jika iya → ganti dengan `settings.site_name`.
- Identifier internal (`@bantuanku/db`, `bantuanku_cart`) boleh tetap menggunakan "bantuanku" karena tidak terlihat user.

### 2026-09-13 — Mengosongkan Field Nullable di Edit Form: `|| undefined` vs `|| null`

**Konteks:** Admin melaporkan URL video YouTube di form edit campaign tidak bisa dihapus — dikosongkan lalu disimpan, tapi nilai lama tetap muncul lagi setelah reload.
**Masalah:** `apps/admin/src/app/dashboard/campaigns/[id]/edit/page.tsx` membangun payload dengan `videoUrl: data.videoUrl || undefined`. Saat field dikosongkan, `data.videoUrl` adalah `""`, sehingga `"" || undefined` menghasilkan `undefined`. Axios memakai `JSON.stringify` untuk body request, dan `JSON.stringify` **membuang key yang valuenya `undefined`** — jadi `videoUrl` tidak pernah sampai ke API sama sekali. Di sisi API, `apps/api/src/routes/admin/campaigns.ts` memakai pola `if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;` — pola ini benar untuk partial update, tapi karena key tidak pernah ada di body, kondisi selalu `false` dan kolom lama tidak pernah tersentuh. Field lain di file yang sama (`content`, `startDate`, `endDate`) punya bug yang identik; sementara `metaTitle`, `canonicalUrl`, dll. di bawahnya sudah benar pakai `|| null`.
**Pelajaran:**
- Pola `if (body.field !== undefined) updateData.field = body.field` di route PUT/PATCH **mengharuskan frontend mengirim `null` secara eksplisit** untuk mengosongkan field nullable — bukan `undefined` (yang akan hilang saat `JSON.stringify`) dan bukan `""` (yang tersimpan sebagai string kosong, bukan `NULL`).
- **Sebelum mengubah `|| undefined` menjadi `|| null` di satu field, cek dulu nullability kolom di schema** (`packages/db/src/schema/*.ts`). Kolom `NOT NULL` (contoh: `campaigns.imageUrl`, `campaigns.pillar`) tidak boleh pernah dikirim `null` — jika form mengizinkan field itu dikosongkan, gunakan validasi wajib-isi di client, bukan `|| null`.
- Saat audit satu field yang bermasalah, cek field lain di payload builder yang sama — pola yang salah biasanya diulang copy-paste ke beberapa field sekaligus (lihat juga lesson "Nilai Enum Harus Distandardisasi").

### 2026-09-13 — Slug Campaign Tidak Ikut Berubah Saat Judul Diedit (by design, bukan bug lupa)

**Konteks:** Admin melaporkan judul campaign berhasil diubah tapi URL publik (`/program/:slug`) tetap sama. Audit vs konvensi modul lain: `categories.ts` dan `pillars.ts` regenerate slug otomatis tiap `name` berubah (`updateData.slug = generateSlug(body.name)`); `activity-reports.ts` malah punya helper `generateUniqueSlug(db, title, excludeId)` yang lebih matang. `campaigns.ts` adalah satu-satunya modul yang PUT/PATCH-nya tidak menyentuh `slug` sama sekali — gap murni, bukan pola yang disengaja.
**Masalah:** Kalau langsung disamakan dengan konvensi kategori/pilar (auto-regenerate tiap title berubah), risikonya berbeda — campaign yang sudah aktif/publish URL-nya sudah dibagikan ke publik (invoice donatur, WA broadcast `wa_tpl_campaign_new`, share link fundraiser, indexed Google). Auto-regenerate akan bikin semua link itu 404 mendadak setiap kali admin memperbaiki typo di judul.
**Keputusan (dikonfirmasi user):** Slug **tidak** auto-update sama sekali. Sebagai gantinya, tambah kontrol manual: field "URL Campaign" di form edit (read-only + tombol "Ubah URL"), admin yang putuskan kapan slug perlu diganti. Backend validasi format slug (`^[a-z0-9]+(-[a-z0-9]+)*$`) dan uniqueness (query `eq(campaigns.slug, body.slug)`, exclude `id` sendiri) sebelum simpan, return `409` kalau bentrok — pola exclude-self ini meniru `generateUniqueSlug` di `activity-reports.ts` tapi untuk validasi input manual, bukan generate otomatis.
**Pelajaran:**
- Sebelum menyamakan sebuah modul dengan "konvensi" modul lain, cek dulu apakah konsekuensi publiknya sama. Kategori/pilar hampir tidak pernah dibagikan sebagai link individual; campaign aktif hampir selalu sudah dibagikan. Konvensi yang aman untuk satu entitas belum tentu aman untuk entitas lain yang textbox-nya sama tapi audiensnya beda.
- Perubahan yang mengubah URL publik yang sudah live = keputusan desain, bukan sekadar bugfix — tanyakan dulu ke user sebelum implementasi (sesuai SOP Langkah 4 di file ini), jangan asumsikan "auto-update seperti modul lain" adalah jawaban yang benar secara default.

### 2026-09-13 — Audit Import Donatur: Dua Dokumen Arsitektur Saling Bertentangan + Gap Uniqueness WhatsApp

**Konteks:** User minta cek struktur import donatur. Ditemukan `docs/arsitektur-export-import.md` dan `docs/arsitektur-import-donatur.md` sama-sama mengklaim "terakhir di-sync: 2026-07-04" tapi isinya kontradiktif total — role berbeda (`admin_finance` disebut di satu dokumen, tidak ada di kode), kolom template berbeda (satu dokumen menyebut kolom Kota/Provinsi/Pekerjaan yang sama sekali tidak ada di kode), bahkan response shape API berbeda nama field (`total` vs `totalRows`, status `skip` vs `duplicate`).
**Masalah:** Dua dokumen arsitektur untuk fitur yang sama, ditulis di waktu berbeda dari draft desain yang berbeda, tidak pernah direkonsiliasi. Developer yang baca dokumen "ringkasan" (`arsitektur-export-import.md`) akan salah asumsi soal role dan kolom template.
**Temuan tambahan dari testing langsung** (bukan hanya baca kode — generate file XLSX asli, panggil `/preview` dan `/commit` sungguhan, cek DB sebelum/sesudah):
1. Mode `update` pada `donatur-import.ts` **tidak pernah** meng-update kolom `email` maupun `whatsappNumber`, walau file punya nilai baru untuk baris yang match sebagai duplicate — dikonfirmasi lewat testing nyata, bukan cuma baca kode (nilai lama di DB tetap setelah commit). Modul `mustahiq-import.ts` yang serupa justru MENGUPDATE `whatsappNumber`/`email` di mode `update` — dua modul dengan pola "sama-sama import dengan mode skip/update" ternyata beda semantik untuk field identitas.
2. Kolom `donatur.whatsapp_number` **tidak punya unique constraint di DB** (`psql \d donatur` — hanya `email` yang `UNIQUE`). Dedup WhatsApp saat import murni `SELECT` lalu `INSERT` di application code, berpotensi race condition antar dua commit import yang berbarengan.
**Pelajaran:**
- Kalau ada lebih dari satu dokumen arsitektur yang membahas fitur yang sama (dokumen khusus + dokumen ringkasan lintas-modul), **cek dulu apakah keduanya konsisten** sebelum mempercayai salah satu — jangan asumsikan dokumen yang lebih baru/lebih detail otomatis benar tanpa verifikasi ke kode.
- Audit "apakah data masuk dengan benar" tidak cukup dengan membaca kode saja — generate file test asli, panggil endpoint sungguhan, dan bandingkan state DB sebelum/sesudah. Racun paling berbahaya adalah asumsi "kodenya kelihatan benar" tanpa verifikasi runtime, terutama untuk field yang sengaja TIDAK diupdate (`if (d.field) updateData.field = ...` yang tidak menyebut suatu field terlihat rapi, tapi baru ketahuan konsekuensinya kalau benar-benar dites).
- Untuk kolom yang jadi kunci dedup aplikasi (WhatsApp donatur) tapi tidak punya constraint DB, jangan buru-buru tambah unique index tanpa cek dulu ada/tidaknya data duplikat existing — index bisa gagal dibuat kalau sudah ada pelanggaran, dan ini butuh keputusan sadar (partial unique index vs terima risiko) bukan silent fix.

### 2026-09-13 — Import Donatur: Conflict Resolution untuk Dedup Key (Email/WhatsApp)

**Konteks:** Setelah audit di atas menemukan mode `update` tidak bisa mengubah email/WhatsApp sama sekali, user minta logika yang lebih pintar: kalau salah satu dedup key match tapi yang satunya beda, tanya admin mau ditimpa atau tidak — bukan blanket "boleh semua" (seperti mustahiq-import) atau blanket "tidak boleh sama sekali" (perilaku lama donatur-import).
**Implementasi:** Preview mendeteksi `conflict` per-baris (field yang beda, nilai lama, nilai baru) memakai data yang SUDAH di-fetch untuk batch dedup query — tidak ada query tambahan per-baris. Admin pilih resolusi per-baris via checkbox di step Preview (default tidak dicentang = aman/keep). Commit menerima field `resolutions` (JSON `{rowNumber: "overwrite"}`) di multipart form data; tanpa entry = keep (backward compatible, tidak mengubah perilaku existing kalau frontend lama masih dipakai).
**Kasus tersembunyi yang ketemu saat testing** (bukan dari membaca kode, dari benar-benar generate test file dengan data yang sengaja "menyilang" dua donatur): kalau baris file match WhatsApp ke donatur A, TAPI emailnya sama persis dengan donatur B yang berbeda — deteksi conflict harus cek kepemilikan nilai baru terhadap SEMUA donatur di batch (bukan cuma bandingkan dengan A), lalu set `conflictsWithOtherDonatur: true`. Kalau tidak dicek, admin bisa "berhasil" menimpa email A dengan email yang sebenarnya milik B, lalu commit gagal karena UNIQUE constraint — atau lebih parah, kalau constraint tidak ada, dua row jadi punya email sama.
**Pelajaran:**
- Saat merancang mekanisme "izinkan admin override field yang biasanya dilindungi", jangan cuma expose toggle boolean global (overwrite semua / tidak sama sekali) — surface conflict per-baris di preview dengan nilai lama vs baru, biar admin lihat konsekuensi konkret sebelum commit, bukan menebak.
- Guard "apakah nilai baru sudah dipakai ENTITY LAIN" harus dicek terhadap seluruh dataset yang relevan (di sini: semua donatur yang match di batch import), bukan cuma terhadap row yang sedang diproses — kalau tidak, kasus "data menyilang dua entity" lolos validasi dan baru meledak di constraint DB atau data silently korup kalau tidak ada constraint.
- Reuse data yang sudah di-fetch untuk keperluan lain (di sini: batch dedup query yang sudah jalan untuk klasifikasi valid/duplicate) untuk deteksi conflict — jangan tambah query per-baris kalau datanya sudah ada di memori.

### 2026-09-13 — Import Donatur: Field Opsional Invalid Menggagalkan Seluruh Baris

**Konteks:** Client kirim file CSV hasil export donatur (bukan file template import) untuk diimport ulang, gagal 26%. Root cause: file export pakai kolom "Tanggal Lahir" format Indonesia (`"22 Mei 2003 pukul 07.00"`) dan banyak "NIK" berisi placeholder (`"0"`, `"123"`, `"-"`, `"000000"`) dari sistem lama — sementara `validateAndNormalizeRow()` di `donatur-import.ts` menganggap NIK/Tanggal Lahir yang formatnya salah sebagai error yang menggagalkan **seluruh baris**, padahal keduanya field opsional.
**Masalah:** Prinsip "field opsional" ternyata cuma berlaku untuk "boleh kosong", bukan "boleh formatnya salah". Baris dengan data PALING lengkap (justru donatur paling berharga) yang paling sering kena tolak, karena mereka yang paling mungkin punya NIK/tanggal lahir terisi (walau formatnya berantakan dari sistem asal).
**Solusi:** (1) `parseBirthDate()` terima dua format: `YYYY-MM-DD` dan `"D MMMM YYYY[ pukul HH.MM]"` (nama bulan Indonesia). (2) NIK dan Tanggal Lahir yang tetap tidak valid setelah dicoba parse → masuk ke `RowResult.warnings` (array baru, terpisah dari `errors`) dan field itu di-skip saja — baris tetap `valid`, bukan `error`. (3) Kolom alamat menerima alias: "Alamat Lengkap" (nama template) ATAU "Alamat Detail" (nama kolom di file export) — sebelumnya beda nama = alamat selalu kosong tanpa peringatan apapun.
**Diverifikasi dengan file client asli** (194 baris nyata, bukan data buatan): sebelum fix 142 valid/51 error, sesudah fix 186 valid/6 error (sisa murni WhatsApp duplikat dalam file, proteksi yang memang harus tetap jalan).
**Pelajaran:**
- Kalau field ditandai "opsional" di validasi, tanyakan eksplisit: opsional berarti boleh KOSONG, atau boleh SALAH FORMAT juga? Kalau desainnya "field opsional yang keliru formatnya tetap menggagalkan baris", itu bukan lagi opsional secara efektif — audit semua `errors.push(...)` untuk field yang didokumentasikan opsional, pastikan konsisten dengan makna "opsional" yang dimaksud.
- Saat client bilang "import gagal", jangan asumsikan dari nama kolom template yang "harusnya" dipakai — **minta atau cek file asli yang benar-benar mereka upload**. Di kasus ini file yang diupload adalah hasil EXPORT sistem (kolom "Total Donasi", "Status", "Login Terakhir", dll — jelas bukan format import), bukan yang diisi manual dari template. Analisa dengan menjalankan file itu (atau sample-nya) lewat endpoint preview sungguhan, bukan menebak dari mata baca CSV — dengan >100 baris, pola error (frequency per jenis pesan) jauh lebih cepat ketemu lewat script daripada baca manual satu-satu.
- Perbaikan validasi longgar (skip field vs gagalkan baris) tetap harus dites dengan data ASLI yang bermasalah, bukan cuma data buatan sendiri yang "bersih" — data client sungguhan penuh inkonsistensi nyata (placeholder, format campur-campur) yang tidak akan kepikiran kalau cuma bikin test case sendiri.

### 2026-09-13 — Retrofit Keamanan: Rate Limit Store Dibagi Antar Limiter & Delete Media Stub

**Konteks:** Eksekusi berurutan item quick-win dari `docs/RETROFIT-GAPS.md` (dotenv boot order, backup DB, timing-safe webhook signature, rate limit `/auth/refresh`, magic-byte upload validation). Dua temuan tak terduga muncul murni karena SETIAP fix diverifikasi dengan hammer-test/end-to-end, bukan cuma baca kode dan asumsi benar.
**Temuan 1 — Rate limit store shared antar instance:** `middleware/ratelimit.ts` punya SATU `Map` module-level yang dipakai bareng oleh `apiRateLimit` (global, `app.use("*", ...)`) dan `authRateLimit` (khusus rute auth). Key-nya cuma `identifier:path`, tidak membedakan limiter mana yang punya entry itu. Karena keduanya jalan di request yang sama untuk rute `/v1/auth/*`, masing-masing menaikkan counter yang SAMA — limit 20/15menit yang dikonfigurasi diam-diam trip di request ke-11, bukan ke-21. Ini bug yang SUDAH ADA sejak awal di `/login`, `/register`, `/forgot-password`, `/reset-password` — bukan sesuatu yang baru muncul dari perubahan saat ini, cuma baru ketahuan karena kebetulan menambah `authRateLimit` ke `/refresh` lalu MENGUJI-nya dengan hammer test 22x request, dan hasilnya tidak sesuai limit yang dikonfigurasi. Fix: tiap `rateLimit()` dapat store sendiri (closure), bukan shared.
**Temuan 2 — `DELETE /admin/media/:id` adalah stub kosong:** Saat membersihkan 2 file test hasil verifikasi fix magic-byte, panggil endpoint delete media resmi → response `success: true` → tapi row di DB (dicek via `psql` langsung) MASIH ADA. Baca kode: handler-nya cuma `// TODO: Delete from database and R2 storage` lalu langsung return sukses. Sudah berjalan begini sejak entah kapan, tidak ada yang ketahuan karena UI admin kemungkinan cuma percaya response `success: true` tanpa refetch list untuk verifikasi.
**Pelajaran:**
- **Selalu hammer-test angka limit yang eksplisit** (rate limit, kuota, batas ukuran) dengan jumlah request yang PAS di angka konfigurasinya (bukan cuma "coba beberapa kali") — off-by-factor bugs seperti ini (limit jadi setengahnya) tidak akan ketahuan dari uji fungsional biasa, cuma dari uji yang menghitung persis.
- **Jangan percaya response `success: true` begitu saja** saat membersihkan data test sendiri — selalu verifikasi lewat query langsung ke DB/storage bahwa aksi itu BENAR-BENAR terjadi. Kalau tidak, kamu berjalan dengan asumsi salah bahwa environment sudah bersih, padahal masih ada sisa.
- Store/cache module-level yang dipakai bareng oleh beberapa instance dari factory function (`rateLimit(config)` dipanggil 3x menghasilkan 3 const berbeda) HARUS diperiksa: apakah instance-instance itu benar-benar independen, atau diam-diam berbagi state lewat closure atas variabel module-level yang sama? Ini pola bug yang mudah lolos review karena kodenya terlihat rapi (tiap instance punya config sendiri) padahal storage-nya satu.

### 2026-09-22 — Audit Laporan: SQL Injection `sql.raw` & ID Rekening Dua Bentuk

**Konteks:** Sinkronisasi `docs/arsitektur-laporan.md` dengan `apps/api/src/routes/admin/reports.ts` (27 endpoint). Selain deskripsi yang melenceng, verifikasi runtime menemukan dua cacat nyata.
**Masalah 1 — SQL injection:** `/rekening-detail` menginterpolasi `bankAccountId` (query string) langsung ke `sql.raw(...)`; hanya tanggal yang divalidasi regex. Komentar "Validate date format to prevent SQL injection" memberi rasa aman palsu — param lain di query yang sama tidak ikut tervalidasi.
**Masalah 2 — laporan rekening selalu kosong untuk checkout publik:** id rekening di settings berformat `bank-<ts>` dan checkout publik menyimpan `transactions.payment_method_id` apa adanya, sementara laporan mencocokkan `'bank_' + id`. Hanya form admin qurban yang menyimpan `bank_<id>`. Ketahuan hanya karena laporan dicoba dengan data nyata (1 transaksi paid → `totalIn: 0`).
**Pelajaran:**
- Setiap `sql.raw` yang memuat nilai dari request adalah injection sampai terbukti sebaliknya. Pakai template `sql` (parameter terikat); validasi regex tanggal tidak melindungi param lain.
- Kolom yang menyimpan referensi "bentuk bebas" (`payment_method_id`) bisa berisi lebih dari satu format hasil jalur pembuatan berbeda. Sebelum menulis query pencocokan, `SELECT DISTINCT` isi kolom itu di data nyata, jangan asumsikan dari satu jalur kode.
- Audit dokumen vs kode untuk laporan harus menjalankan endpoint dengan data nyata, bukan hanya membaca handler — nama endpoint (`/ledger-summary`) dan docstring (`liability-balance` "berdasarkan ledger 2010") ternyata menyesatkan, dan `/account-balance/:code` sudah `410` tetapi masih terdaftar aktif di dokumen.

### 2026-09-22 — Boundary Tanggal Laporan: Tidak Ada Setting Timezone, dan DB Dev ≠ DB Produksi

**Konteks:** Diminta membuat filter tanggal laporan mengikuti "setting timezone" di halaman Settings. Ternyata tidak ada setting/key timezone sama sekali — seluruh app hardcode `Asia/Jakarta`. Laporan (`reports.ts`, `analytics.ts`, `export.ts`) memakai `setUTCHours`/`new Date('YYYY-MM-DD')` (UTC) dan raw SQL `::timestamp` yang bergantung `TimeZone` sesi DB; produksi = `timestamptz` + timezone DB UTC (migrasi 111), sehingga transaksi 00:00–06:59 WIB hilang dari filter satu hari.
**Masalah:** (1) Jangan berasumsi sebuah setting ada — cek dulu di tabel `settings`/halaman Settings; kalau tidak ada, pakai satu konstanta (`APP_TIMEZONE` di `utils/timezone.ts`) dan katakan ke user. (2) DB dev lokal belum menjalankan migrasi 111 (180 kolom masih `timestamp` tanpa zona), jadi uji boundary di dev memberi hasil yang berbeda dari produksi — sempat menyimpulkan salah (6 vs 5 transaksi). (3) Ekspresi `to_char(col, $1)` dengan format sebagai parameter terikat membuat `SELECT` dan `GROUP BY` menjadi placeholder berbeda → Postgres error "must appear in the GROUP BY clause"; endpoint `/analytics/growth` `500` sejak awal karena ini dan tak ada yang sadar karena tak punya konsumen UI. (4) Dua handler `GET /ledger` dalam satu file: yang pertama menutupi yang kedua tanpa peringatan.
**Pelajaran:** Verifikasi perubahan boundary waktu pada DB scratch yang meniru produksi (salin data + migrasi 111 + `ALTER DATABASE SET timezone='UTC'`), bukan DB dev. Gunakan `'YYYY-MM-DD'::timestamp AT TIME ZONE 'Asia/Jakarta'` (atau helper `startOfDayWIB`/`endOfDayWIB`) agar hasil tak bergantung `TimeZone` sesi. Untuk ekspresi yang muncul di SELECT dan GROUP BY, pakai satu ekspresi yang identik (literal dari whitelist), bukan parameter terikat. Endpoint tanpa konsumen UI bisa rusak bertahun-tahun — panggil sungguhan saat mengaudit. Rute Hono duplikat tidak error; grep `\.get\("/path"` untuk duplikasi.

### 2026-09-22 — Audit Activity Reports: Handler PUT Parsial + Form Full-Payload Menimpa State

**Konteks:** Sinkronisasi `docs/arsitektur-activity-reports.md` dengan kode. Dokumen "sudah sinkron" ternyata melewatkan beberapa perilaku yang baru kelihatan saat endpoint benar-benar dipanggil.
**Masalah:** (1) `PUT /admin/activity-reports/:id` menimpa `publishedAt = now()` setiap kali body memuat `status`, dan form edit SELALU mengirim `status` — jadi setiap simpan laporan published mereset tanggal publish (dokumen hanya menyebut reset saat unpublish/republish). (2) `videoUrl` tidak bisa dikosongkan: form kirim `|| undefined` dan Zod `preprocess` juga mengubah `""` jadi `undefined` — pola yang sama dengan bug campaign 2026-09-13, muncul lagi karena tidak ada yang mencari pola itu di modul lain. (3) Form edit selalu mengirim `title`, dan handler me-generate ulang slug tiap kali `title` ada → slug berubah diam-diam (`x-1` → `x`) tanpa judul berubah. (4) Dropdown "Zakat - Pencairan" memakai `disbursement_type=zakat_distribution`, nilai yang tidak ada → selalu kosong tanpa error. (5) WA publish tidak cek `waOptOut` dan dikirim sinkron dalam request. (6) Dokumen menulis fallback `referenceId` untuk `product_name`, kode memakai `referenceName || ""`.
**Pelajaran:** Untuk handler PUT/PATCH parsial yang dipanggil form full-payload, cek SETIAP field "efek samping" (`publishedAt`, slug, notifikasi) terhadap pertanyaan: apakah efeknya hanya boleh terjadi saat nilai BERUBAH, bukan saat field sekadar hadir di body? Bandingkan `existing` vs `body`. Setelah menemukan satu bug pola `|| undefined`, grep pola itu di SEMUA form edit (bukan hanya modul yang dilaporkan). Nilai filter query yang dikirim frontend (`disbursement_type=...`) harus dicek terhadap union/enum backend — nilai tak dikenal hanya mengembalikan list kosong, bukan error. Saat mengaudit fitur yang memicu WhatsApp di DB lokal, ingat gateway lokal bisa nyata: uji dengan `referenceId` fiktif supaya daftar penerima kosong.

### 2026-09-22 — "Data Terekspos di API Publik" Bisa Jadi Fitur yang Disengaja, Bukan Bug

**Konteks:** Saat audit `activity-reports-public.ts`, field `creatorName` (nama staf pembuat laporan) di respons API publik langsung dicurigai sebagai kebocoran data dan sempat dihapus dari `reportSelectFields`.
**Masalah:** Grep ke `apps/web` menunjukkan tiga halaman publik (`laporan/[slug]`, `qurban/laporan`, `zakat/laporan`) benar-benar merender `{report.creatorName && <p>Dibuat oleh: {report.creatorName}</p>}` — byline editorial yang disengaja, mirip "ditulis oleh" di berita. Menghapusnya di API akan mematikan fitur yang sudah dipakai frontend tanpa ada TypeScript error (field jadi `undefined`, JSX-nya `&&` sehingga baris byline diam-diam hilang).
**Pelajaran:** Sebelum menyimpulkan sebuah field API "seharusnya tidak publik", grep dulu apakah field itu benar-benar dikonsumsi oleh UI publik (`grep -rn "fieldName" apps/web/src`). Field yang terlihat sensitif (nama staf, ID internal) belum tentu bug — bisa jadi keputusan produk (byline, atribusi). Auditor yang terlalu percaya diri pada intuisi "ini pasti kebocoran" bisa menghapus fitur yang berfungsi tanpa terdeteksi test/TS, karena penghilangan field opsional di JSX tidak pernah crash.

### 2026-09-22 — Ownership Guard untuk `program_coordinator`: Pola "404, Bukan 403"

**Konteks:** `PUT /admin/activity-reports/:id` awalnya tanpa cek ownership untuk `program_coordinator`, padahal `GET /:id` sudah punya guard (return 404 kalau `createdBy !== user.id`, bukan 403).
**Pelajaran:** Saat menambahkan ownership guard pada endpoint yang sudah punya pola serupa di endpoint saudaranya (GET/PUT/DELETE pada resource yang sama), pastikan variasi role-check (`isCoordinator = has(program_coordinator) && !has(super_admin/admin_finance/admin_campaign)`) dan response code (404 "not found", bukan 403 "forbidden") **identik** — 404 mencegah coordinator tahu bahwa ID tersebut valid milik orang lain. Verifikasi selalu dengan user sungguhan berrole tersebut (buat user test + assign role via `user_roles`/`roles` table), bukan hanya membaca kode — lihat lesson "Audit Import Donatur" soal generate test data asli.

### 2026-09-22 — WA Opt-Out via LEFT JOIN: Guest Transaksi Tidak Punya Opt-Out

**Konteks:** Notifikasi WA `wa_tpl_report_published` mengambil penerima dari `transactions.donorPhone` tanpa mengecek `donatur.waOptOut` sama sekali — pelanggaran aturan "opt-out wajib dihormati, tanpa pengecualian" di `arsitektur-wa-community-care.md`.
**Masalah:** Transaksi guest (checkout tanpa akun, `transactions.donaturId = null`) tidak punya baris `donatur` untuk dicek. `INNER JOIN donatur` akan mendiamkan guest sepenuhnya (regresi fitur); filter `waOptOut = false` di WHERE juga mengeliminasi guest karena NULL tidak match false secara implisit tergantung driver.
**Pelajaran:** Untuk notifikasi yang menyasar campuran donatur terdaftar dan guest, gunakan `LEFT JOIN donatur` lalu filter eksplisit `waOptOut IS DISTINCT FROM true` (SQL) / `waOptOut !== true` (JS) — bukan `=== false`, karena `null` (guest, tidak match) harus tetap lolos. Verifikasi filter ini dengan query langsung ke DB (insert baris uji: satu opt-out, satu aktif, satu guest) sebelum memercayai bahwa kode "kelihatan benar".

### 2026-09-22 — "Laporan Tidak Muncul di Campaign": Bukan Referensi Salah, Campaign-nya Draft

**Konteks:** User melaporkan laporan kegiatan (published) tidak muncul di tab "Kabar Terbaru" campaign-nya, di situs produksi. Dugaan awal: referensi salah/campaign dihapus (orphan).
**Investigasi:** Audit menyeluruh (bukan cuma satu laporan) — ambil SEMUA laporan published dari API publik, ambil SEMUA campaign di semua status yang bisa ditemukan (`active`, `draft`, `completed`, dan varian lain dicoba sampai kosong), lalu cross-check tiap laporan bertipe `campaign` terhadap endpoint `/activity-reports/campaign/:id` tiap campaign satu per satu. Hasilnya: `referenceId` laporan itu **valid** dan **memang muncul benar** di tab campaign yang tepat — tapi campaign itu (di-rename dari "Sedekah Jum'at Double Keberkahan" jadi "Jumat Berkah: Seporsi Sarapan Pagi untuk Para Pahlawan Keluarga") **statusnya `draft`**, sehingga tidak muncul di `/program` (default filter `status=active`) dan tidak bisa ditemukan lewat pencarian — kelihatan seperti "hilang" padahal sebenarnya reachable via URL lama.
**Temuan sampingan lebih penting:** `GET /campaigns/:idOrSlug` (publik) **tidak pernah memfilter status** — campaign `draft` bisa dibuka siapa saja langsung lewat URL/ID, lengkap dengan tombol donasi aktif, walau tidak terdaftar di listing manapun. Ini gap keamanan/visibilitas tersendiri, ditemukan justru karena mengejar laporan aktivitas yang "hilang". Sudah diperbaiki: endpoint itu sekarang 404 untuk `draft` (status lain tetap terbuka).
**Pelajaran:**
- Kalau user bilang "X tidak muncul di Y", jangan langsung asumsikan referensi salah/data corrupt. **Audit SEMUA data sejenis** (bukan cuma satu contoh), lalu untuk kasus yang gagal, telusuri satu-satu: apakah benar referensinya salah, atau justru target-nya ADA tapi **tidak dalam kondisi yang membuatnya terlihat** (status draft, soft-deleted, dll)? Kedua penyebab punya gejala permukaan yang identik ("tidak muncul") tapi solusinya beda total (validasi referensi vs mengubah status/visibilitas).
- Audit lintas-tabel yang mengandalkan hanya API publik (tanpa akses admin ke lingkungan produksi) tetap bisa dilakukan dengan reasoning "by elimination": kumpulkan semua entity yang ADA dari sisi publik, lalu untuk tiap kandidat panggil endpoint scoped-nya (di sini: `/activity-reports/campaign/:id` untuk tiap campaign) dan kumpulkan ID yang "covered" — apa pun yang tidak masuk himpunan itu genuinely orphan, tanpa perlu tahu `referenceId` mana pun secara langsung (yang memang sengaja tidak diekspos publik).
- Endpoint publik yang mengambil satu row by slug/id (`GET /:idOrSlug`) HARUS memfilter status yang layak dipublikasikan, bukan cuma endpoint LIST-nya. Filter status di list saja gampang dilewatkan orang yang review keamanan, karena "tidak muncul di listing" terasa cukup aman padahal detail page tetap bisa diakses langsung.

### 2026-10-22 — Audit Subagent: Verifikasi Dulu, Termasuk Rekomendasinya

**Konteks:** Subagent `security-auditor` (read-only) mengaudit `routes/wa.ts`, `routes/whatsapp.ts`, `routes/account.ts`. Temuan intinya benar (webhook tanpa signature, SSRF, tool bot tanpa cek kepemilikan, token confusion), tetapi sebagian detailnya keliru atau kurang.
**Masalah:** (1) Rekomendasi "jangan naikkan `paidAmount` saat `processing`" salah untuk repo ini: alur upload bukti di web (`routes/transactions.ts`) memang menaikkan `paidAmount` saat upload dan menurunkannya saat ditolak — mengikuti rekomendasi akan membuat bot menyimpang dari pola itu. (2) `GET /wa/unsubscribe` ditandai rawan prefetch, padahal yang dipanggil adalah halaman `/berhenti` yang memanggil API lewat JS (link preview tidak menjalankan JS), dan link-nya bahkan belum dikirim. (3) `get_payment_link` dan `get_bank_details` punya celah kepemilikan yang sama dengan `check_transaction_status` tetapi tidak disebut. (4) Item "tidak bisa diverifikasi" (`wa_opt_out NOT NULL`) sebenarnya bisa dijawab dari migrasi.
**Pelajaran:** Verifikasi temuan DAN rekomendasi subagent ke kode/pola yang ada sebelum bertindak. Setelah menemukan satu celah, cari semua fungsi sejenis (`grep` pola yang sama), jangan hanya yang disebut laporan.

### 2026-10-22 — Bandingkan Host dengan `origin`, Bukan `includes()`

**Konteks:** Unduhan media bukti transfer dari webhook WA menerima URL absolut dan mengulang request dengan kredensial GOWA bila `msg.imageUrl.includes(gowaHost)`.
**Masalah:** `includes()` hanya mencocokkan substring: `http://evil.example/404?x=<host-gowa>` lolos, kredensial Basic auth terkirim ke host penyerang. Selain itu URL dari payload di-fetch tanpa batas (SSRF ke metadata cloud/localhost).
**Pelajaran:** Input yang menentukan tujuan `fetch()` wajib divalidasi dengan `new URL(u).origin === new URL(allowed).origin` (plus tolak userinfo), kredensial internal hanya boleh menuju origin yang sudah di-allowlist, pakai `redirect: "error"`, batasi ukuran, dan validasi isi (magic bytes). Helper: `apps/api/src/lib/gowa-media.ts`.

### 2026-10-22 — Argumen Tool LLM Tidak Tepercaya: Paksa Identitas dari Konteks

**Konteks:** Tool bot WA (`check_transaction_status`, `send_qris`, `confirm_payment`, dst.) menerima `phone`/`transactionId` dari argumen yang dihasilkan LLM.
**Masalah:** Pengguna sah bisa memakai prompt injection ("cek transaksi TRX-") untuk membaca `id` transaksi orang lain (pencarian `ilike '%…%'` tanpa filter pemilik), lalu meminta bot mengonfirmasi pembayaran atau mengirim QRIS ke nomor sembarang. Tidak ada error TypeScript atau runtime — semuanya "berfungsi".
**Pelajaran:** Identitas pengirim harus selalu berasal dari konteks yang diautentikasi (`context.phone` dari webhook bertandatangan), bukan dari argumen tool. Resource by-id wajib dicek kepemilikannya (`findOwnedTransaction`). Jangan pakai `ilike '%input%'` untuk mencocokkan identitas; normalisasi lalu bandingkan persis (`phoneMatches`). Hapus parameter identitas dari skema tool agar LLM tidak diminta mengisinya.

### 2026-10-22 — Token Berbeda Tujuan Harus Dibedakan Claim-nya

**Konteks:** Access token, refresh token, dan token unsubscribe WA ditandatangani dengan `JWT_SECRET` yang sama.
**Masalah:** `verifyRefreshToken` hanya mengambil `sub` dari token apa pun, jadi access token 15 menit dapat ditukar menjadi sesi refresh 7 hari. Token unsubscribe (30 hari) juga lolos `verifyToken`. Perbaikan yang langsung mewajibkan claim baru akan memutus semua refresh token yang sedang beredar.
**Pelajaran:** Beri tiap jenis token claim pembeda (`typ`/`purpose`) dan cek di fungsi verify-nya. Untuk migrasi tanpa logout massal, terima token lama berdasarkan bentuknya (access lama punya `roles`, refresh lama hanya `sub`), dan jadwalkan penghapusan kelonggaran itu setelah masa berlaku terpanjang lewat. Lihat ADR-0009.

### 2026-10-22 — `sed -i` BSD Menelan Argumen sebagai Ekstensi Backup

**Konteks:** `sed -i 's/a/b/' file` di macOS.
**Masalah:** BSD `sed` memperlakukan argumen setelah `-i` sebagai ekstensi backup, bukan script. Perintah gagal dengan error aneh (`-I or -i may not be used with stdin`), dan pada percobaan lain meninggalkan file kosong 0 byte berbentuk nama sebagian file sumber (`hatsapp-ai.ts`) di folder kode.
**Pelajaran:** Di macOS pakai `sed -i '' '...' file` atau, lebih aman, `perl -i -pe '...' file` / skrip python. Setelah operasi edit massal, cek `git status` untuk file asing.

### 2026-10-22 — Setelah Memperbaiki Satu Pola, Audit Ulang: Perbaikan Tidak Selesai Sampai Semua Jalur Sejenis Tertutup

**Konteks:** Setelah tool bot WA dipaksa memakai `context.phone`, audit ulang menemukan `register_donatur` masih menerima `phone` dari argumen LLM dan mengembalikan nama + email donatur yang sudah ada.
**Masalah:** Di fase perbaikan, daftar tool yang dicek diambil dari laporan auditor pertama (3 tool), lalu diperluas manual ke 2 tool lain — tetapi tidak sistematis terhadap SELURUH tool di `executeTool`. `register_donatur` terlewat, padahal dampaknya lebih besar (penyerobotan identitas: transaksi korban jatuh ke email penyerang, lalu terbaca lewat `/account/donations`).
**Pelajaran:** Saat menutup satu kelas celah, enumerasi SEMUA tempat yang menerima input dari sumber yang sama (di sini: setiap `case` di `executeTool`) dan centang satu per satu, bukan hanya yang disebut laporan. Jalankan audit ulang dengan agent setelah perbaikan; ia menemukan celah yang tersisa di pola yang sama. Fungsi yang mengembalikan data "yang sudah ada" saat duplikat (nama/email) adalah jalur enumerasi — jawab generik.

### 2026-10-22 — Mewajibkan Verifikasi Email: Backfill Akun Lama Dulu, Atau Admin Terkunci

**Konteks:** ADR-0010 mewajibkan `email_verified_at` untuk login. Kolom itu ada sejak awal tetapi tidak pernah diisi, jadi SEMUA akun yang ada bernilai NULL, termasuk super admin.
**Masalah:** Gate login yang di-deploy tanpa backfill mengunci seluruh staf sekaligus (dan admin yang mau memperbaikinya). Selain itu ada 6 jalur `insert(users)` (1 publik, 5 buatan admin) plus seed; jalur yang lupa diberi `emailVerifiedAt` menghasilkan akun yang tidak bisa login tanpa gejala error yang jelas.
**Pelajaran:** Sebelum menambah syarat baru pada login, (1) `grep` SEMUA jalur pembuatan entitas itu, (2) backfill akun lama yang sah dalam migrasi yang SAMA (di sini: peran selain `user`), (3) jalankan migrasi sebelum deploy kode, (4) uji login akun staf nyata setelah gate dipasang. Akun donatur biasa sengaja tidak di-backfill (emailnya tak pernah terbukti) dan diverifikasi sekali saat login berikutnya.

### 2026-10-22 — Prefill dari Endpoint Publik Adalah Kebocoran PII yang Terlihat Seperti Fitur

**Konteks:** `GET /auth/check-registration` dipakai halaman register untuk mengisi otomatis nama dan WA dari data donatur lama, cukup dengan mengetahui email.
**Masalah:** Endpoint tanpa login yang mengembalikan nama, email, telepon, WA dari input sembarang adalah mesin enumerasi data donatur, walau dibuat untuk kenyamanan. Tidak ada error atau gejala; terlihat benar di UI.
**Pelajaran:** Endpoint publik hanya boleh mengembalikan status minimum (`exists/registered`). Kenyamanan prefill harus lewat sesi terautentikasi atau bukti kepemilikan (email terverifikasi), bukan sekadar mengetahui email/telepon.

### 2026-10-22 — Link Verifikasi: Halaman Web + POST, Bukan GET yang Mengubah State

**Konteks:** Pemindai email dan antivirus membuka (prefetch) setiap link di email.
**Masalah:** Link yang langsung menjalankan verifikasi lewat GET akan terkonsumsi oleh pemindai sebelum pengguna mengkliknya, sehingga pengguna melihat "tautan kedaluwarsa". Token sekali pakai membuat ini fatal.
**Pelajaran:** Link email membuka halaman web (`/verifikasi-email?token=…`) yang memanggil `POST /auth/email/verify` lewat JS; pemindai tidak menjalankan JS. Di halaman, jaga dengan `useRef` agar mode strict React tidak memanggil dua kali (panggilan kedua pasti gagal untuk token sekali pakai). Konsumsi token secara atomik (`UPDATE … WHERE consumed_at IS NULL AND expires_at > now() RETURNING`).

### 2026-10-22 — Endpoint "Kirim Email" Publik: Respons Harus Sama Cepat untuk Akun Ada dan Tidak Ada

**Konteks:** `forgot-password/email/request` dan `email/resend` membalas pesan generik yang identik untuk email terdaftar maupun tidak.
**Masalah:** Pesan identik belum cukup: pengiriman email (ratusan ms ke Resend) hanya terjadi untuk akun yang ada, jadi penyerang bisa membedakan keduanya dari waktu respons dan mengenumerasi email donatur. Ditemukan saat security review inline, bukan lewat test fungsional (semua kasus fungsional sudah lolos).
**Pelajaran:** Untuk endpoint publik yang memicu efek samping mahal hanya pada akun yang ada, jalankan efek samping itu di background (`void fn().catch(log)`) dan balas segera. Berlaku untuk reset password, kirim ulang verifikasi, dan jalur serupa. Pada jalur login (setelah password terbukti benar), menunggu pengiriman tidak masalah karena pemanggil sudah terautentikasi sebagian.

### 2026-10-22 — Rate Limit Berbasis `X-Forwarded-For` Mentah Bisa Dilewati

**Konteks:** Menguji endpoint auth baru memicu 429 karena memanggil satu path > 20 kali; membaca `ratelimit.ts` menunjukkan kunci = seluruh nilai header `x-forwarded-for` dari klien.
**Masalah:** Header itu dikontrol penyerang. Setiap nilai berbeda = kunci baru, jadi batas 20 percobaan/15 menit pada `/auth/login`, OTP, dan reset tidak pernah tercapai. Terbukti dengan 30 percobaan login beruntun yang semuanya lolos. Tidak ada error atau gejala pada pemakaian normal; baru terlihat saat membaca kode dan mengujinya dengan header palsu.
**Pelajaran:** Identitas klien untuk rate limit harus berasal dari bagian header yang ditambahkan proxy tepercaya (entri ke-N dari kanan), bukan nilai mentah. Jumlah hop bergantung topologi (Nginx saja vs Cloudflare + Nginx) dan tidak bisa ditebak dari repo, jadi jadikan konfigurasi eksplisit (`TRUSTED_PROXY_HOPS`) dan uji dengan header palsu. Nilai yang salah bisa mengunci pengguna sah secara massal, itu sebabnya perbaikan dibuat opt-in sampai topologi dikonfirmasi.

### 2026-10-22 — Uji OAuth Tanpa Google: Server Tiruan dengan Validasi Nyata

**Konteks:** Login Google tidak bisa diuji otomatis terhadap Google sungguhan (butuh akun, konsol, dan jaringan).
**Pelajaran:** Buat server Google tiruan yang menerapkan aturan yang sama dengan aslinya (token endpoint memeriksa PKCE S256 + client secret + kode sekali pakai; JWKS dengan kunci uji; ID token RS256) dan jadikan URL endpoint dapat di-override lewat env khusus uji. Dengan begitu serangan (state salah, nonce salah, `aud`/`iss` salah, tanda tangan kunci lain, `alg` HS256, token kedaluwarsa, replay kode) benar-benar menjalankan jalur kode produksi. Skrip disimpan di `apps/api/scripts/e2e-google-oauth.ts`. Jangan set override itu di produksi.

### 2026-10-22 — Link Verifikasi Email Bukan Bukti Bahwa Pengklik Adalah Pendaftar

**Konteks:** ADR-0010 mewajibkan verifikasi email via link agar pendaftar tidak bisa mengambil alih data orang lain. Audit atas implementasinya menemukan lubang pada desain itu sendiri.
**Masalah:** Penyerang mendaftar dengan email korban + password penyerang. Akun tetap belum terverifikasi, tetapi link verifikasi dikirim ke korban (saat register, saat login, bahkan saat korban mencoba Google). Bila korban mengkliknya, akun menjadi terverifikasi dengan password penyerang masih berlaku, data donatur korban tertaut, dan penyerang masuk. Link membuktikan akses ke MAILBOX, bukan bahwa pengklik adalah orang yang membuat akun.
**Pelajaran:** Verifikasi email harus mengikat dua pihak yang sama: bukti mailbox (token) DAN bukti pembuat akun (password yang hanya diketahui pendaftar), atau password dibuat saat verifikasi. Jalur lain yang sudah membuktikan kepemilikan email (Google, reset via email) harus MENGGANTI kredensial lama, bukan sekadar menandai terverifikasi. Periksa ulang desain keamanan dengan memikirkan siapa yang menerima email, bukan hanya siapa yang mengirim formulir. Lihat ADR-0011.

### 2026-10-22 — Uji Otomatis Bisa Mengirim Pesan ke Dunia Nyata: Cek Setting Gateway Sebelum Menjalankan

**Konteks:** Fitur register mengirim WA selamat datang. DB dev menyimpan `whatsapp_enabled=true` dengan URL gateway GOWA yang nyata.
**Masalah:** Uji-uji saya mendaftarkan puluhan akun dengan nomor karangan (`08120000xxxx`) dan memicu 13 percobaan kirim WA lewat gateway organisasi. Semua `send result: false` di log (tidak terkirim), tetapi percobaannya nyata dan nomor karangan bisa saja milik orang sungguhan. Ketahuan hanya karena membaca setting DB saat menyelidiki hal lain; tidak ada error. Saya sudah waspada untuk `send_qris` tetapi tidak memeriksa jalur lain yang memicu WA.
**Pelajaran:** Sebelum menjalankan uji yang membuat entitas, telusuri efek sampingnya ke luar (WA, email, payment gateway) dengan `grep` pada jalur yang dipanggil, dan periksa setting yang mengaktifkannya (`whatsapp_enabled`, `RESEND_API_KEY`). Skrip uji wajib: menolak jalan bila `DATABASE_URL` bukan localhost, mematikan integrasi eksternal selama uji dan mengembalikannya sesudahnya (di `scripts/e2e-*.ts`). Pindahkan pemicu notifikasi ke setelah bukti kepemilikan (WA selamat datang kini dikirim setelah email terverifikasi).

### 2026-10-22 — Regresi Uji: Simpan Skrip, Bukan Hanya Hasilnya

**Konteks:** Skrip uji Fase 1 dan 2 saya hapus setelah lolos. Ketika desain berubah (ADR-0011), seluruh skenario harus ditulis ulang dari nol.
**Pelajaran:** Skenario uji keamanan (pre-hijack, token silang, replay, kedaluwarsa) adalah aset. Simpan sebagai skrip di `apps/api/scripts/e2e-*.ts` dengan pengaman (DB lokal, integrasi eksternal dimatikan) agar bisa dijalankan ulang setiap kali auth disentuh: `e2e-auth-email.ts` (54 kasus) dan `e2e-google-oauth.ts` (53 kasus).

### 2026-10-23 — Endpoint Pencarian Identitas Publik: Samarkan, Jangan Autofill
**Konteks:** `GET /v1/donatur/search` dipakai checkout tamu untuk autofill form dan membuka nama/email/HP/WA lengkap siapa pun yang emailnya atau nomornya diketahui.
**Masalah:** Kemudahan autofill menjadi kebocoran data pribadi (UU PDP) dan alat enumerasi donatur. Rate limit saja tidak menutupnya.
**Pelajaran:** Endpoint publik yang mencari berdasarkan identitas harus mengembalikan data tersamar (cukup agar pemilik mengenali dirinya) dan klien tidak boleh memakainya untuk mengisi form. Kalau perlu data lengkap, minta bukti kepemilikan (login/OTP). Waspadai juga jalur lain yang membocorkan `id` yang sama (`POST /donatur` untuk email yang ada) dan server yang mempercayai `donatur_id` dari klien.

### 2026-10-23 — Paginasi Client-Side di Atas Endpoint Ber-Limit Default Menyembunyikan Data
**Konteks:** Klien melaporkan beberapa campaign tidak terlihat di `/dashboard/campaigns` produksi.
**Masalah:** Halaman memanggil `GET /admin/campaigns` tanpa parameter; API memberi `limit` default 10, lalu halaman memfilter dan memaginasi sendiri atas 10 baris itu. Tidak ada error TypeScript atau runtime, UI tampak punya paginasi dan pencarian yang berfungsi, dan di dev (kurang dari 10 campaign) bug tidak muncul. Pemanggil lain memakai `limit: 100` atau tanpa limit sehingga terpotong diam-diam pada data yang lebih besar.
**Pelajaran:** (1) Halaman list admin harus memaginasi dan memfilter di server dan memakai `pagination` dari respons; jangan pernah memaginasi di browser atas respons yang dibatasi API. (2) Setiap pemanggil endpoint list wajib diaudit terhadap limit default-nya; dropdown yang butuh "semua" harus memakai limit eksplisit atau pencarian server-side. (3) Uji paginasi dengan data lebih banyak dari satu halaman (atau `limit` kecil) — data dev yang sedikit menyembunyikan bug ini.

### 2026-10-23 — Kolom Denormalisasi yang Tidak Pernah Diperbarui + Export CSV
**Konteks:** Menambah kolom riwayat donasi di export CSV donatur (`/dashboard/statistics/donatur`). Kolom "Total Donasi"/"Total Nominal" yang sudah ada dibaca dari `donatur.total_donations/total_amount`.
**Masalah:** Tidak ada kode yang memperbarui kedua kolom itu, jadi isinya selalu 0 (di dev: donatur dengan 8 donasi lunas senilai Rp 4,2 juta tampil 0). Tidak ada error TypeScript atau runtime, dan CSV tampak wajar. Review keamanan sekaligus menemukan handler export yang sama menerima `startDate/endDate` mentah (`500` pada input aneh, nilai ikut ke nama file) dan `generateCSV` belum menetralkan sel berawalan `=`, `+`, `-`, `@` (formula injection) padahal nama donatur/alamat/judul campaign berasal dari input pengguna.
**Pelajaran:** (1) Sebelum memakai kolom denormalisasi sebagai sumber angka, cari siapa yang menulisnya (`grep` penulisnya); kalau tidak ada, hitung dari tabel sumber (`transactions`, `payment_status='paid'`, `total_amount`). (2) Setiap export CSV yang memuat teks bebas wajib lewat `generateCSV` yang menetralkan rumus. (3) Parameter tanggal export harus divalidasi regex `YYYY-MM-DD` dan memakai `startOfDayWIB/endOfDayWIB`, sama seperti `export.ts` dan `reports.ts`.

### 2026-10-23 — Token Refresh Sudah Ada di API Tapi Frontend Membuangnya (Logout Mendadak)
**Konteks:** Klien melaporkan admin logout sendiri dalam hitungan menit saat menulis berita dan tulisan hilang.
**Masalah:** Access token 15 menit; API menerbitkan `refreshToken` dan punya `/auth/refresh`, tetapi `login()` di admin dan web hanya menyimpan `accessToken` dan interceptor axios mengalihkan ke `/login` pada setiap `401`. Tidak ada error di kode atau log; fiturnya "ada" di backend dan tidak pernah tersambung. Sudah tercatat sebagai satu kalimat di `arsitektur-auth.md` tetapi tidak pernah dijadikan tugas.
**Pelajaran:** (1) Kalau backend punya mekanisme (refresh, revocation) tetapi UI belum memakainya, catat sebagai Gap berjudul sendiri, bukan catatan sampingan. (2) Keluhan "logout sendiri" = cek umur token dan interceptor 401 lebih dulu. (3) Memperpanjang umur access token hanya menunda masalahnya dan memperlebar jendela token yang tak bisa dicabut; solusi tuntas adalah refresh otomatis atau autosave. Lihat ADR-0012.

### 2026-10-23 — Cadangan Otomatis Form: Komponen Anak "Merapikan" Nilai Setelah Dimuat
**Konteks:** Menambah cadangan otomatis (`useFormDraft`, ADR-0013) agar logout karena sesi habis tidak menghapus tulisan admin.
**Masalah:** Form yang belum disentuh menulis cadangan palsu, sehingga banner "ditemukan cadangan" muncul untuk data yang sama dengan server. Penyebab berlapis: `SEOPanel` mengirim nilai awal lengkap (termasuk `seoScore` hasil hitung) saat dipasang, `AddressForm` mengirim nilai kosong, dan di halaman edit alamat baru terisi beberapa render setelah data tiba. Tidak ada error; hanya terlihat saat diuji di browser dengan form yang belum disentuh. Satu kali saya juga menghapus sesi lewat urutan perintah uji yang tidak memeriksa langkah sebelumnya.
**Pelajaran:** (1) Fitur "deteksi perubahan" selalu uji dengan form yang belum disentuh (create dan edit) sebelum menyatakan selesai. (2) Normalkan nilai dari komponen anak (hilangkan field turunan seperti skor, samakan kosong `undefined`/`""`/`null`) dan tentukan `ready` dari kecocokan dengan data server, bukan dari "data sudah ada". (3) Pembanding awal perlu jendela penyesuaian pendek setelah form siap. (4) Hapus cadangan di `onSuccess` mutasi, bukan saat tombol ditekan, dan jangan biarkan penulisan tertunda (debounce/`pagehide`) menghidupkannya lagi. (5) Saat menguji lewat browser otomatis, periksa hasil tiap langkah sebelum menjalankan langkah yang merusak (hapus sesi), karena perintah yang gagal tidak menghentikan perintah sesudahnya.

### 2026-10-23 — Sitemap Memuat Data Basi dan URL Laporan yang 404
**Konteks:** Klien/pemilik menanyakan apakah laporan kegiatan sudah masuk sitemap. Dicek langsung ke produksi (`/sitemap.xml` dan API publik).
**Masalah:** (1) Sitemap hanya memuat 3 dari 13 laporan, 2 campaign yang sudah tidak ada, dan melewatkan 7 campaign aktif, padahal API publik benar; `sitemap.ts` memakai `force-dynamic` tetapi `fetch` di dalamnya tetap di-cache oleh Next 14. (2) `sitemap.ts` menurunkan URL laporan dari JUDUL (`/laporan/<slug-judul>`), sedangkan halaman memakai SLUG; fungsi kanonik diduplikasi di dua file dan sudah menyimpang. Laporan yang judulnya berbeda dari slug (slug sengaja tidak berubah saat judul diedit) masuk sitemap dengan URL 404 (terbukti: `…zakat-fitrah-…` vs `…zakat-fitrah-…` dengan "3-404" vs "3404"), dan URL aslinya hilang. Dev DB tidak menunjukkan keduanya (semua slug sama dengan judul, data sedikit).
**Pelajaran:** (1) Untuk pertanyaan "apakah X masuk sitemap/indeks", bandingkan sitemap produksi dengan API produksi dan cek status HTTP tiap URL (`HEAD`, tanpa mengikuti redirect), bukan membaca kode. (2) Rute yang harus selalu segar tidak boleh bergantung pada `force-dynamic` untuk fetch: beri `cache: 'no-store'` eksplisit. (3) Logika URL kanonik satu sumber (`lib/report-url.ts`), dipakai halaman dan sitemap; jangan salin fungsinya. (4) Slug dan judul bisa berbeda secara sah; jangan menurunkan URL dari judul.

### 2026-10-23 — Menyejajarkan Teks Hero dengan Container: Ukur, Jangan Asumsikan
**Konteks:** Redesign hero beranda (kartu tidak full width, radius, lebih tinggi) dengan teks sejajar header dan section.
**Masalah:** Asumsi "container header = container section" salah: `.header__container` memakai padding 24px, `.container` section 32px (lg+), jadi tepi kiri keduanya berbeda 8px; teks hero lama berada di x=630 karena kotak teksnya dipusatkan. Selain itu margin kartu tetap 40px tidak bisa sejajar dengan container di layar sedang (container di x=32 berada di luar kartu yang mulai di x=40).
**Pelajaran:** (1) Ukur `getBoundingClientRect().left` elemen header, hero, dan section di beberapa lebar (iframe same-origin bila jendela tidak bisa diubah ukurannya) sebelum dan sesudah. (2) Taruh teks di lapisan yang menutupi lebar penuh pembungkus dan pakai `.container` standar, bukan menghitung ulang padding. (3) Gutter kartu berbasis `clamp()` dengan persen (bukan `100vw`) agar teks selalu berada di dalam kartu dan tidak terpengaruh scrollbar. (4) Saat mengukur layout, bandingkan juga dengan kondisi lama (override CSS di iframe) supaya masalah lama (overflow header di <1340px) tidak salah dituduhkan ke perubahan baru.

### 2026-10-23 — Section Beranda Hardcode untuk SEO Muncul Sebagai Elemen Desain
**Konteks:** Saat redesign hero, pemilik produk bertanya dari mana section "Jelajahi Halaman Penting" datang karena tidak ada di desain.
**Masalah:** Section itu hardcode di `apps/web/src/app/page.tsx` (ditambahkan 2026-04-01 sebagai tautan internal untuk crawler), tanpa pengaturan di admin dan tanpa i18n, tetapi tampil sebagai elemen desain di beranda. Daftar tautannya juga dipakai Footer, sehingga menghapus tampilannya tidak menghapus tautan SEO.
**Pelajaran:** Elemen yang ditambahkan hanya demi SEO jangan menjadi section tampil di beranda; cukup tautan di Footer/menu. Sebelum menghapus elemen hardcode, cari semua pemakai datanya (di sini `crawlPriorityLinks` → Footer) dan buktikan lewat HTML hasil render bahwa tautan penting tetap ada.

### [2026-10-23] Bar bawah mobile: spacer harus elemen terakhir halaman, collapsed sheet harus setinggi bar
**Konteks:** halaman single (program, qurban) diubah ke pola mobile shell (top bar + bottom sheet naik-turun) meniru jalajogja.
**Masalah:** (1) Collapsed sheet `max-h-24` lebih tinggi dari bar sebenarnya (64px), sehingga awal isi sheet "mengintip" di bawah bar. (2) Footer dirender setelah `<main>`, jadi spacer atau `pb-*` di dalam main menaruh jarak kosong di tengah dan footer tetap tertutup bar. (3) Beberapa halaman zakat dirender oleh komponen kalkulator yang membawa `<Header />` sendiri, sehingga mengubah `zakat/[slug]/page.tsx` saja tidak cukup.
**Pelajaran:** tinggi collapsed = tinggi bar (h-16 + safe-area), spacer `h-20 lg:hidden` diletakkan SETELAH `<Footer />`; setelah mengubah header satu halaman, cek juga komponen yang di-render halaman itu. Sheet wajib collapse (`collapseSignal`) sebelum modal lain dibuka. Qurban detail tidak bisa diuji visual di DB lokal (tabel `qurban_discounts` belum ada) — uji di staging/produksi.

### [2026-10-23] Font dev jadi serif karena cache .next basi
**Konteks:** setelah banyak edit komponen web, font di dev tiba-tiba serif.
**Masalah:** HTML memakai kelas `__variable_d8ebd1` sedangkan CSS mendefinisikan `__variable_f367f3`; `--font-inter` tidak terdefinisi sehingga aturan `font-family` dibuang browser. Penyebab: `apps/web/.next` basi, bukan kode.
**Pelajaran:** gejala "font berubah" → bandingkan kelas variabel di HTML vs CSS yang disajikan; perbaiki dengan `rm -rf apps/web/.next` lalu restart dev. Jangan menyalahkan perubahan kode tanpa membuktikan lewat `git diff`.

### [2026-10-23] iPaymu `unauthorized signature`: secret di tabel settings tersimpan terenkripsi
**Konteks:** checkout iPaymu lokal (mode sandbox) gagal; konfigurasi di admin terlihat benar (VA, API key, environment).
**Masalah:** `payment_ipaymu_api_key` disimpan AES-256-CBC (`iv:ciphertext`) oleh `PUT /admin/settings/batch`, sedangkan `routes/payments.ts` membaca nilai mentah dan memakainya sebagai API key untuk HMAC, sehingga iPaymu menolak signature. Admin menampilkan nilai terdekripsi, jadi kelihatan benar. Berlaku juga untuk secret Xendit/Flip. Dokumen lama menyebut gap ini hanya sebagai "ciphertext bisa terbaca", belum pernah dibuktikan menimpa gateway. Tambahan: adapter tanpa timeout membuat checkout menggantung saat iPaymu sandbox tidak merespons (VA BCA).
**Pelajaran:** setiap kode yang membaca `settings` berkategori secret (`*_api_key`, `*_secret*`, `*_access_token`) wajib `decrypt()`. Saat debugging error auth gateway, bandingkan bentuk nilai di DB (`hex:hex` = ciphertext) sebelum menyalahkan kredensial. Uji adapter langsung ke sandbox dengan key hasil dekripsi untuk memisahkan masalah konfigurasi dari masalah kode. Semua panggilan keluar ke gateway harus punya timeout.

### [2026-10-23] Alur bayar iPaymu: satu klik, instruksi di halaman sendiri, webhook sesuai dokumen
**Konteks:** setelah dekripsi secret diperbaiki, checkout iPaymu masih gagal ("Payment URL tidak tersedia") karena halaman metode memanggil create tanpa channel dan menunggu `paymentUrl`, padahal Direct Payment iPaymu tidak memberi URL halaman bayar (hanya nomor VA/QR/kode).
**Masalah:** (1) Gateway berbasis redirect (Xendit/Flip) dan gateway berbasis instruksi (iPaymu Direct) tidak bisa memakai alur UI yang sama; langkah "pilih gateway" lalu "pilih channel" membuat donatur klik dua kali. (2) `c.req.parseBody()` (Hono) mengembalikan objek tanpa prototype; menyimpannya ke kolom jsonb lewat Drizzle gagal dengan `Cannot read properties of null (reading 'constructor')` dan hanya terlihat sebagai 500 "Failed to process payment". (3) Webhook lama memakai HMAC base64 atas JSON + API key; iPaymu sebenarnya mengirim form-urlencoded dengan `X-Signature` = HMAC-SHA256 hex dengan **nomor VA** sebagai kunci. (4) Endpoint cek status yang dipakai webane-admin (`/payment/check-status`) bukan yang dijelaskan dokumen resmi (`POST /transaction`). (5) iPaymu mengirim waktu kedaluwarsa sebagai string WIB tanpa zona; tanpa parse eksplisit +07:00 hasilnya bergantung timezone server. (6) DB lokal belum menerapkan migrasi 111 (kolom `timestamp` tanpa zona), sehingga waktu tulis/baca meleset 7 jam di dev; produksi memakai `timestamptz`.
**Pelajaran:** rancang halaman bayar dari bentuk respons gateway (URL vs instruksi), bukan dari satu pola. Salin `parseBody()` (`{ ...body }`) sebelum disimpan. Untuk webhook, baca dokumen resmi halaman callback (bukan implementasi proyek lain), uji end-to-end ke API lokal dengan callback bertanda tangan buatan sendiri dan kembalikan data dev setelahnya, dan verifikasi cadangan ke provider harus mewajibkan `ReferenceId` sama (jangan lolos saat kosong). Jangan memakai `pkill -f` pada proses server karena ikut mematikan dev server pengguna.

### [2026-10-23] Checkout mobile overflow: `grid` tanpa `grid-cols-1` melebar ke min-content
**Konteks:** `/checkout` di mobile terlihat berantakan: form terpotong di kanan.
**Masalah:** `<div className="grid lg:grid-cols-3 gap-8">` tanpa kolom dasar membuat satu kolom implisit `auto` yang ukurannya mengikuti min-content anak terlebar; kartu menjadi 394px di container 348px dan seluruh halaman scroll horizontal. Tidak terlihat dari kode, hanya dari pengukuran (`scrollWidth > clientWidth`).
**Pelajaran:** grid responsif selalu tulis kolom dasar (`grid-cols-1` = `minmax(0,1fr)`) sebelum varian `lg:`. Saat halaman mobile "terpotong", ukur `documentElement.scrollWidth` vs `clientWidth` dan telusuri elemen dengan `getBoundingClientRect().right` > lebar viewport. Pola mobile yang sama dengan halaman lain: kartu menembus padding container (`-mx-4 sm:-mx-6 md:mx-0`) dengan teks 15px, tanpa border.

### [2026-10-24] Checkout "sudah terdaftar": mengisi data dari server membuka jalur pembocoran lain
**Konteks:** checkout dirancang ulang jadi satu isian (email/HP) — terdaftar → form tidak perlu diisi, server memakai data profil donatur.
**Masalah:** (1) `GET /transactions/:id` publik mengembalikan nama/email/HP lengkap; kalau server mengisi data profil ke transaksi, orang yang hanya mengetik email orang lain bisa membaca datanya dari invoice. (2) Nama donor juga keluar di endpoint publik lain (daftar donatur campaign, laporan zakat/qurban, referral fundraiser) setelah transaksi lunas — celah kedua yang baru ketahuan saat review, bukan saat desain. (3) `donatur_id` dan `user_id` dari body publik dipercaya begitu saja (cukup tahu id donatur dari `/donatur/search`). (4) `donatur_id` ternyata juga dipakai kode server (bot WhatsApp), jadi tidak bisa dihapus dari DTO, hanya dibuang di rute publik.
**Pelajaran:** sebelum memindahkan pengisian data pribadi ke server, petakan SEMUA keluaran publik yang menampilkan field itu (`grep donorName` di routes non-admin), bukan hanya endpoint yang terlihat. Tandai asal data di transaksi (`donor_from_profile`) dan samarkan di semua pembaca non-pemilik. Jangan percaya id/identitas dari klien; tentukan di server. Uji dengan token bertiga (tamu, orang lain, pemilik, admin) dan hapus data uji sesudahnya (DB dev punya WhatsApp aktif tetapi gateway dev gagal, jadi tidak ada pesan nyata terkirim).

### [2026-10-24] Checkout memantul ke keranjang: state keranjang kosong sebelum localStorage terbaca
**Konteks:** modal donasi disederhanakan (Donasi Sekarang langsung ke `/checkout`); pemilik produk melaporkan tombol itu "masih masuk ke keranjang".
**Masalah:** `CartProvider` memulai `items = []` lalu mengisinya dari localStorage di `useEffect`. Efek redirect di `/checkout` (`items.length === 0` → `/keranjang-bantuan`) berjalan di render pertama, sebelum keranjang terbaca, sehingga setiap muat ulang penuh (refresh, atau dev yang melakukan full reload saat kompilasi rute) memantul ke keranjang. Navigasi client-side biasa tidak terkena, jadi sulit direproduksi.
**Pelajaran:** state yang dimuat asinkron dari storage harus mengekspos penanda `isLoaded`; guard "kosong → redirect" wajib menunggunya. Uji redirect dengan muat ulang penuh halaman tujuan, bukan hanya klik navigasi.

### [2026-10-24] Checkout user login tidak mengisi HP/WhatsApp: salinan profil di store tidak pernah disegarkan
**Konteks:** user melengkapi nomor HP dan WhatsApp di profil, tetapi kolom itu kosong di checkout saat login.
**Masalah:** checkout mengisi form dari `useAuth().user` (store zustand persisted, diisi dari respons login), sedangkan `PATCH /auth/me` hanya menulis ke database; `setUser` tidak pernah dipanggil di mana pun. Jadi nomor yang dilengkapi sesudah login tidak pernah sampai ke store sampai login ulang. Tidak terlihat sebagai error, hanya kolom kosong.
**Pelajaran:** data profil yang dipakai halaman lain harus diperbarui saat profil disimpan (`mergeUser`) dan disegarkan dari API di halaman yang membutuhkannya. Jangan menyegarkan lewat axios `api` di tempat umum karena interceptor 401-nya menghapus sesi; pakai `fetch` yang gagal diam-diam. Uji dengan menyuntikkan sesi basi (HP null) ke localStorage lalu membuka checkout.

### [2026-10-24] Menghapus `user_id` dari body tanpa mengirim token membuat transaksi user login kehilangan `user_id`
**Konteks:** saat donatur ditentukan server (Fase 1), `user_id` dari body publik dibuang dan diganti dari token (`optionalAuthMiddleware`). Checkout memakai `fetch` polos ke `/transactions`.
**Masalah:** `fetch` tidak membawa `Authorization` (header hanya otomatis pada axios `api`), sehingga transaksi user login tersimpan dengan `user_id` kosong. Tidak ada error dan riwayat tetap muncul (dicari lewat email donatur), jadi baru ketahuan saat memeriksa baris DB setelah uji lain.
**Pelajaran:** memindahkan sumber identitas dari body ke token berarti SEMUA pemanggil harus mengirim token. Setelah perubahan semacam itu, periksa kolom hasilnya di DB (bukan hanya respons 200). Untuk alur dengan `next`, tujuan harus dibawa di setiap lompatan (login, Google, profil) dan divalidasi dengan satu helper bersama.

### [2026-10-24] Daftar kartu menjorok: aturan global `ul { padding-left }`
**Konteks:** redesign halaman akun; kartu transaksi di dalam `<ul>` terlihat bergeser ke kanan dibanding judul di atasnya.
**Masalah:** `globals.scss` mendefinisikan padding kiri untuk `ul`/`ol` (untuk konten rich text), sehingga `<ul className="space-y-3">` mendapat padding kiri ±26px; kartu menjadi tidak sejajar tanpa error apa pun.
**Pelajaran:** daftar kartu memakai `m-0 list-none p-0` (atau `div` + `role="list"`). Ukur `getBoundingClientRect().left` kartu dibanding judul saat memeriksa kerapian mobile. Untuk menguji halaman yang bergantung API yang rusak di DB dev (mis. tabungan qurban butuh kolom `discount_id`), tiru respons XHR di browser (patch `XMLHttpRequest.prototype.send` setelah halaman awal dimuat lalu navigasi client-side) alih-alih mengubah skema DB.

### [2026-10-24] Beranda 234 kB JS: section di bawah layar membawa Swiper + axios + react-query ke semua halaman
**Konteks:** analisis kecepatan; TTFB produksi 0,6 dtk dan JS beranda jauh di atas dasar Next (88 kB).
**Masalah:** `TestimonialSection` (client component) memakai Swiper, `api` (axios) dan `useQuery` hanya untuk satu section di bawah layar, dan mengambil datanya dari browser setelah hydrate. `UniversalInvoice` meng-import `jspdf` + `html2canvas` (180 kB) secara statis padahal dipakai hanya saat tombol unduh diklik. Bundel yang dimuat halaman ditentukan oleh import statis, bukan oleh kapan kodenya dipakai.
**Pelajaran:** (1) Ukur dengan `next build` (kolom First Load JS) di SALINAN folder agar `.next` dev server tidak tertimpa. (2) Library besar yang hanya dipakai pada aksi (PDF, canvas) selalu `await import()` di dalam handler. (3) Section murni baca-data dibuat server component; carousel sederhana cukup scroll-snap CSS.

### [2026-10-24] Waterfall fetch di server component: `await` berurutan dalam blok `try` terpisah
**Konteks:** TTFB beranda produksi 0,6 dtk; `HomePage` memanggil ±8 endpoint satu per satu (dan campaign dua kali).
**Masalah:** tiap blok `try { await fetchX() }` menunggu blok sebelumnya, sehingga waktu render = jumlah semua latensi, bukan yang terlama. `MetaPixel` dan `GoogleTagManager` juga memanggil `/settings` dari browser padahal layout server sudah memegang settings itu.
**Pelajaran:** mulai SEMUA fetch independen di awal komponen (promise tanpa await), lalu tiap blok `try` menunggu promise miliknya. Bungkus promise yang belum ditunggu dengan `.catch(() => {})` (helper `started`) agar penolakan awal tidak menjadi unhandled rejection. Data yang sudah ada di layout server dioper lewat props, bukan diambil ulang oleh komponen klien.

