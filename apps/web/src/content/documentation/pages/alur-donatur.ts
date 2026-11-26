import type { DocumentationPage } from "../types";

export const alurDonaturDoc: DocumentationPage = {
  slug: "alur-donatur",
  title: "Alur Donasi dari Sisi Donatur",
  category: "Campaign & Donasi",
  summary: "Apa yang dialami donatur dari memilih program sampai membayar, agar tim bisa membantu saat ada pertanyaan.",
  updatedAt: "2026-11-26",
  sections: [
    {
      id: "checkout",
      heading: "Checkout",
      bodyHtml: `<ol class="doc-steps">
<li>Donatur memilih program lalu menekan donasi, atau menambahkannya ke <strong>Keranjang Bantuan</strong> untuk beberapa program sekaligus.</li>
<li>Di checkout donatur mengisi satu isian <strong>email atau nomor HP</strong> lalu menekan <strong>Lanjutkan</strong>. Sistem mengenali donatur yang sudah terdaftar dan menentukan identitasnya di server; donatur baru mengisi nama dan data lain.</li>
<li>Donatur memilih metode bayar yang diaktifkan di <a href="/documentation/pengaturan-pembayaran">Settings → Payments</a>.</li>
</ol>
<p>Donatur dapat masuk dari checkout memakai email atau akun Google. Alamat email diverifikasi lewat tautan yang dikirim ke email.</p>`,
    },
    {
      id: "bayar",
      heading: "Pembayaran",
      bodyHtml: `<ul>
<li><strong>Transfer manual/QRIS</strong> — donatur melihat halaman instruksi dengan total yang harus dibayar (termasuk <a href="/documentation/kode-unik">kode unik</a>), lalu mengunggah bukti. Admin memverifikasi di Transactions.</li>
<li><strong>Gateway</strong> — donatur diarahkan ke halaman pembayaran gateway; status berubah otomatis setelah bayar.</li>
</ul>
<p>Tagihan dan konfirmasi dikirim lewat WhatsApp bila nomor HP diisi.</p>`,
    },
    {
      id: "akun",
      heading: "Akun Donatur",
      bodyHtml: `<p>Di halaman akun (<code>/account</code>) donatur dapat melihat riwayat transaksi, mengubah profil, mengatur berhenti pesan WhatsApp, melihat tabungan qurban, dan (bila disetujui) menjadi influencer.</p>
<p>Akun donatur terpisah dari akun dashboard admin.</p>`,
    },
  ],
};
