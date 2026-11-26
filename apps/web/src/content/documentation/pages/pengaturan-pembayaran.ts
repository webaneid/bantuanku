import type { DocumentationPage } from "../types";

export const pengaturanPembayaranDoc: DocumentationPage = {
  slug: "pengaturan-pembayaran",
  title: "Pengaturan Metode Pembayaran",
  category: "Keuangan",
  summary: "Mengatur rekening bank, QRIS, dan gateway (Flip, iPaymu, Xendit) di Settings → Payments.",
  updatedAt: "2026-11-26",
  sections: [
    {
      id: "gambaran",
      heading: "Gambaran Umum",
      bodyHtml: `<p>Semua metode pembayaran diatur di <strong>Settings → Payments</strong>. Metode yang aktif muncul sebagai pilihan bagi donatur di checkout.</p>
<table>
<thead><tr><th>Metode</th><th>Cara kerja</th><th>Konfirmasi</th></tr></thead>
<tbody>
<tr><td>Bank Transfer</td><td>Donatur transfer ke rekening lembaga lalu mengunggah bukti.</td><td>Manual oleh admin</td></tr>
<tr><td>QRIS</td><td>Donatur memindai QRIS lembaga.</td><td>Manual oleh admin</td></tr>
<tr><td>Flip, iPaymu, Xendit</td><td>Donatur membayar lewat gateway (VA, e-wallet, dll).</td><td>Otomatis lewat webhook</td></tr>
</tbody>
</table>`,
    },
    {
      id: "rekening-qris",
      heading: "Rekening Bank dan QRIS",
      bodyHtml: `<ul>
<li>Anda dapat menambahkan lebih dari satu rekening bank dan lebih dari satu QRIS.</li>
<li>Setiap rekening/QRIS dapat diberi <strong>peruntukan</strong>: Umum, Infaq/Shodaqoh, Zakat, Qurban, atau Wakaf. Peruntukan ini membantu buku kas memberi peringatan bila dana tercampur, misalnya dana zakat masuk ke rekening non-zakat.</li>
<li>Untuk QRIS Anda dapat mengunggah gambar QR; sistem membaca kodenya otomatis.</li>
</ul>
<p>Setiap rekening/QRIS otomatis muncul sebagai akun kas di menu <strong>Keuangan → Sirkulasi Rekening</strong>.</p>`,
    },
    {
      id: "gateway",
      heading: "Mengaktifkan Gateway",
      bodyHtml: `<p>Untuk tiap gateway, isi kredensial dari dashboard penyedia, pilih <strong>Environment</strong> (Production untuk uang asli, Sandbox untuk uji), lalu aktifkan dan simpan.</p>
<table>
<thead><tr><th>Gateway</th><th>Yang diisi</th></tr></thead>
<tbody>
<tr><td>Flip</td><td>API Key (Secret Key), Webhook Token (Validation Token), Environment. Lihat <a href="/documentation/flip-payment">panduan Flip</a>.</td></tr>
<tr><td>iPaymu</td><td>API Key, VA, Environment.</td></tr>
<tr><td>Xendit</td><td>API Key, Webhook Token, Environment.</td></tr>
</tbody>
</table>
<p>Kredensial disimpan terenkripsi. Kunci Sandbox dan Production berbeda; jangan tertukar.</p>`,
    },
    {
      id: "webhook",
      heading: "Webhook (Wajib)",
      bodyHtml: `<p>Gateway memberi tahu Jaladana bahwa pembayaran berhasil lewat webhook. Daftarkan URL berikut di dashboard gateway:</p>
<p><code>https://api.domain-anda.com/v1/payments/&lt;gateway&gt;/webhook</code> dengan <code>&lt;gateway&gt;</code> berisi <code>flip</code>, <code>ipaymu</code>, atau <code>xendit</code>.</p>
<p>Tanpa webhook, transaksi gateway akan tetap <code>pending</code>. Setelah mengatur, lakukan satu pembayaran uji dengan nominal kecil dan pastikan statusnya berubah menjadi <code>paid</code> serta muncul di <strong>Keuangan → Arus Kas</strong>.</p>`,
    },
  ],
};
