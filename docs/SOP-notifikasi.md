SOP Notifikasi (Admin Web)
==========================

Tujuan
------
- Menghapus penggunaan `window.alert()` dan menggantinya dengan notifikasi in-app yang konsisten.
- Memastikan pengalaman pengguna seragam di seluruh laman admin.

Komponen yang dipakai
---------------------
- Gunakan `react-hot-toast` (sudah terpasang).
- Import: `import { toast } from "react-hot-toast";`
- Variasi:
  - `toast.success("...")` untuk keberhasilan.
  - `toast.error("...")` untuk kegagalan/validasi.
  - `toast.loading("...")` bila perlu menunggu.
  - `toast("...", { icon: "ℹ️" })` untuk info ringan.

Gaya & Branding
---------------
- Warna mengikuti tema:
  - Success: hijau primary (`text-primary-700`, background hijau muda).
  - Error: merah (`text-danger-700`), background merah muda.
  - Info: biru lembut.
- Durasi default: 3000 ms untuk success/info, 4500 ms untuk error.
- Maksimal 1–2 baris teks; gunakan kalimat aktif, ringkas.

Aturan Penggunaan
-----------------
1) Jangan gunakan `window.alert`, `window.confirm`, `window.prompt`.
2) Validasi form: tampilkan `toast.error` dengan pesan spesifik field.
3) Aksi berhasil (create/update/delete/verify): `toast.success("<aksi> berhasil ...")`.
4) Aksi gagal (HTTP error): tampilkan pesan API jika ada, fallback pesan umum.
5) Aksi batch: sertakan jumlah item: `toast.success(\`\${count} data berhasil ...\`)`.
6) Tindakan butuh bukti/unggah: jika wajib, beri `toast.error` sebelum submit.
7) Di flow berantai, hindari spam; cukup satu toast akhir yang merangkum.

Pola Kode
---------
```ts
import { toast } from "react-hot-toast";

try {
  await api.post(...);
  toast.success("Vendor berhasil ditambahkan");
} catch (err: any) {
  const msg = err.response?.data?.message || err.response?.data?.error || "Gagal menambahkan vendor";
  toast.error(msg);
}
```

Migrasi dari `alert`
--------------------
- Cari `alert(` lalu ganti:
  - Success -> `toast.success(...)`
  - Error / validation -> `toast.error(...)`
- Hapus teks “OK”; cukup pesan ringkas.
- Jangan blokir UI; toast sudah non-blocking.

Pengujian
---------
- Uji tiap aksi (tambah, ubah, hapus, verifikasi) memastikan toast muncul sekali.
- Cek di mobile & desktop.
- Pastikan tidak ada lagi dialog native.

Catatan Aksesibilitas
---------------------
- `react-hot-toast` sudah ARIA live region; tidak perlu alert tambahan.
- Hindari huruf kapital penuh; gunakan kalimat normal.

Checklist Implementasi
----------------------
- [ ] Hilangkan semua `window.alert` di repo admin.
- [ ] Gunakan toast di setiap titik yang sebelumnya alert.
- [ ] Konsisten pesan sesuai konteks.
- [ ] Uji manual per halaman yang dimigrasi.
