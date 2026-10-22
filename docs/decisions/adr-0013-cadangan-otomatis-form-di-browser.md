# ADR-0013: Cadangan Otomatis Form Panjang di localStorage Browser

**Status:** Accepted
**Tanggal:** 2026-10-23

## Context
Klien melaporkan admin yang sedang menulis (laman, laporan kegiatan, campaign, zakat, qurban) tiba-tiba logout dan kehilangan seluruh tulisan. ADR-0012 hanya memperpanjang access token menjadi 2 jam dan menunda refresh otomatis, sehingga logout karena sesi habis, tab tertutup, atau halaman ter-refresh masih menghapus pekerjaan yang belum disimpan.

## Decision
Form panjang dicadangkan otomatis ke `localStorage` browser lewat hook `useFormDraft` (`apps/admin/src/lib/hooks/use-form-draft.ts`) dan banner `DraftRestoreBanner`:
- Kunci `form-draft:<userId>:<formKey>` (satu cadangan per pengguna per form/record); versi, `savedAt`, dan `values` disimpan sebagai JSON; kedaluwarsa 7 hari; batas ukuran 1,5 juta karakter.
- Tulis 800 ms setelah perubahan terakhir, dan segera saat `pagehide`/tab disembunyikan (mencakup pengalihan ke `/login` saat sesi habis). Form yang belum disentuh tidak menulis apa pun (dibanding kondisi awal; jendela penyesuaian 1,5 dtk setelah form siap menyerap "perapian" nilai oleh komponen anak).
- Tidak dipulihkan otomatis: banner menawarkan "Pulihkan" atau "Buang" agar tidak menimpa data server tanpa sepengetahuan pengguna.
- Dihapus saat penyimpanan ke server BERHASIL (`clearFormDraft(formKey)` di `onSuccess` mutasi, bukan saat tombol ditekan) dan saat logout yang disengaja. Logout otomatis karena sesi habis (interceptor 401) tidak menghapusnya.
- Cakupan: `PageForm`, laporan kegiatan (create/edit), `CampaignForm`, `ZakatTypeForm`, `QurbanPackageForm`.

## Alternatif yang Dipertimbangkan
- Draf di server (autosave ke API) — lintas perangkat, tetapi butuh tabel/endpoint baru, migrasi, dan tidak berjalan saat sesi sudah habis (justru saat dibutuhkan).
- Refresh token otomatis (ADR-0012) — menghilangkan penyebab, tetapi tidak menolong saat tab tertutup/refresh dan pekerjaannya lebih besar.
- Peringatan `beforeunload` — tidak memulihkan apa pun.

## Konsekuensi
- Tulisan bertahan dari logout sesi habis, refresh, dan tab tertutup, di browser dan akun yang sama; tidak lintas perangkat/browser.
- Isi cadangan (konten editorial) terbaca JavaScript satu origin; tidak memuat password, token, atau data pribadi donatur. Form baru yang memuat data sensitif tidak boleh memakai hook ini tanpa menyaring field-nya.
- Form baru dengan editor teks wajib ikut memasang hook (pola ada di `arsitektur-komponen-admin.md`).
