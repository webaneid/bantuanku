# Arsitektur Media Library

## Skema

Tabel `media` (`packages/db/src/schema/media.ts`):

- `id` — text (nanoid via `createId()`)
- `url`, `path` — **nilai yang sama** saat upload: full GCS URL (`https://storage.googleapis.com/<bucket>/<object>`) kalau CDN aktif, atau path lokal `/uploads/<filename>` kalau tidak
- `variants` — jsonb `Record<string, MediaVariant>`, tiap variant punya `path`/`url` sendiri (mis. `thumbnail`, `medium`, `large`, `square`, `original`)
- `originalLocalPath` — file asli disimpan sementara di lokal (`uploads/original-temp/YYYY/MM/DD/...`) selama `ORIGINAL_RETENTION_DAYS` (7 hari) sebagai rollback/debug source, terlepas dari mode CDN
- Tidak ada FK dari tabel lain ke `media.id` — modul lain (campaign, mitra, donatur, dll.) menyimpan URL/path sebagai string bebas, bukan relasi database.

Route: `apps/api/src/routes/admin/media.ts`.

## Upload (`POST /v1/admin/media/upload`)

1. Validasi kategori (`general`, `financial`, `activity`, `document`) dan tipe/ukuran file.
2. Kalau CDN aktif (`fetchCDNSettings`, tabel `settings` kategori `cdn`) → upload ke GCS via `uploadToGCS` (`apps/api/src/lib/gcs.ts`), hasilnya full public URL. Kalau gagal atau CDN nonaktif → fallback ke disk lokal (`uploads/<filename>`, juga disimpan di `global.uploadedFiles` map untuk serving cepat).
3. Kategori `general` menghasilkan banyak variant (lewat `processGeneralImage`); kategori lain menghasilkan satu file webp (`processSingleWebp`).
4. Insert satu baris ke `media` dengan `path`/`url` dari variant utama (`large` kalau ada) dan seluruh `variants` di jsonb.

## Delete (`DELETE /v1/admin/media/:id`)

Sebelumnya endpoint ini adalah stub: langsung `return { success: true }` tanpa menyentuh DB atau storage sama sekali. Sekarang alurnya:

1. Ambil baris `media` by `id` — 404 kalau tidak ketemu.
2. **Guard referensi**: cek apakah `campaigns.imageUrl` masih sama persis dengan `media.path`. Ini valid karena `admin/campaigns.ts` menyimpan `imageUrl` dengan normalisasi yang sama persis dengan yang dipakai media library (`extractPath()` untuk path lokal, URL GCS apa adanya untuk CDN) — jadi exact-match aman dipakai sebagai sinyal "masih dipakai". Kalau dipakai, delete ditolak (400) dengan pesan campaign mana yang memakainya.
3. Hapus file fisik:
   - Kalau `path` adalah full GCS URL → ekstrak object key (`path` setelah `https://storage.googleapis.com/<bucket>/`) dan panggil `deleteFromGCS` (`apps/api/src/lib/gcs.ts`, sudah ada sebelumnya tapi belum pernah dipanggil dari mana pun).
   - Kalau path lokal (`/uploads/...`) → hapus file di disk dan bersihkan entry di `global.uploadedFiles`.
   - Ulangi untuk setiap `variants[*].path` yang berbeda dari `path` utama.
   - Hapus juga `originalLocalPath` (file asli sementara) kalau masih ada di disk.
4. Hapus baris dari tabel `media`.

### Keterbatasan guard referensi (disengaja, bukan bug)

Karena tidak ada FK ke `media.id`, satu-satunya cara mengecek "masih dipakai" adalah exact-match string terhadap kolom URL di tabel lain. Ini hanya reliable untuk kolom yang dinormalisasi dengan cara yang sama seperti media library (saat ini: `campaigns.imageUrl`, lihat di atas). Kolom lain seperti `mitra.logoUrl`, `donatur.avatar`, `users.avatar`, atau kolom JSON foto (`disbursements.photos`, `qurban_executions.photos`, `zakat_distributions.report_photos`) **tidak** dicek karena tidak terbukti memakai normalisasi path yang sama — exact-match di situ berisiko false negative (gagal mendeteksi) atau false positive (blokir delete yang sebenarnya aman). Menghapus media yang masih dipakai di kolom-kolom ini akan membuat gambar tersebut broken di UI, sama seperti risiko yang sudah ada sebelum perbaikan ini — bukan regresi baru.

Kalau nanti perlu proteksi yang lebih luas, opsi yang lebih benar adalah migrasi kolom-kolom itu ke FK sungguhan ke `media.id` (dengan `ON DELETE SET NULL`, konsisten dengan pola FK ke master data di project ini), bukan menambah lebih banyak string-matching.
