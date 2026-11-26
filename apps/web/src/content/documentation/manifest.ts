import type { DocumentationManifest } from "./types";

export const documentationManifest: DocumentationManifest = {
  version: 2,
  categories: [
    {
      id: "memulai",
      label: "Memulai",
      items: [
        {
          slug: "pengenalan",
          title: "Pengenalan Jaladana",
        },
        {
          slug: "login-dan-akses",
          title: "Login & Hak Akses",
        },
        {
          slug: "navigasi-dashboard",
          title: "Navigasi Dashboard",
        },
      ],
    },
    {
      id: "campaign",
      label: "Campaign & Donasi",
      items: [
        {
          slug: "cara-membuat-campaign",
          title: "Cara Membuat Campaign",
        },
        {
          slug: "mengelola-transaksi",
          title: "Mengelola Transaksi",
        },
        {
          slug: "wakaf",
          title: "Wakaf",
        },
        {
          slug: "laporan-kegiatan",
          title: "Laporan Kegiatan",
        },
        {
          slug: "alur-donatur",
          title: "Alur Donasi dari Sisi Donatur",
        },
      ],
    },
    {
      id: "keuangan",
      label: "Keuangan",
      items: [
        {
          slug: "kategori-keuangan",
          title: "Sistem Kategori Keuangan (COA)",
        },
        {
          slug: "kode-unik",
          title: "Sistem Kode Unik Transaksi",
        },
        {
          slug: "flip-payment",
          title: "Gateway Pembayaran: Flip",
        },
        {
          slug: "bagi-hasil-amil",
          title: "Sistem Bagi Hasil Amil",
        },
        {
          slug: "alur-pencairan",
          title: "Alur Pencairan Dana",
        },
        {
          slug: "laporan-keuangan",
          title: "Laporan Keuangan",
        },
        {
          slug: "buku-kas",
          title: "Buku Kas (Menu Keuangan)",
        },
        {
          slug: "pengaturan-pembayaran",
          title: "Pengaturan Metode Pembayaran",
        },
      ],
    },
    {
      id: "operasional",
      label: "Operasional",
      items: [
        {
          slug: "konsep-mitra",
          title: "Konsep Mitra",
        },
        {
          slug: "zakat",
          title: "Modul Zakat",
        },
        {
          slug: "qurban",
          title: "Modul Qurban",
        },
        {
          slug: "fundraiser",
          title: "Sistem Influencer",
        },
        {
          slug: "seo",
          title: "Tutorial SEO Lengkap",
        },
        {
          slug: "panduan-upload-gambar",
          title: "Panduan Upload Gambar Utama",
        },
        {
          slug: "donatur",
          title: "Donatur & Import Data",
        },
        {
          slug: "pages-cms",
          title: "Halaman Statis (Pages)",
        },
        {
          slug: "master-data",
          title: "Data Master",
        },
        {
          slug: "program-coordinator",
          title: "Program Coordinator",
        },
      ],
    },
    {
      id: "fitur",
      label: "Fitur",
      items: [
        {
          slug: "whatsapp-notifikasi",
          title: "Notifikasi Otomatis WhatsApp",
        },
        {
          slug: "whatsapp-ai",
          title: "Robot AI WhatsApp (Chatbot)",
        },
      ],
    },
    {
      id: "pengaturan",
      label: "Pengaturan",
      items: [
        {
          slug: "pengaturan-umum",
          title: "Pengaturan Umum & Tampilan",
        },
      ],
    },
    {
      id: "developer",
      label: "Developer",
      items: [
        {
          slug: "arsitektur-sistem",
          title: "Arsitektur Sistem",
        },
      ],
    },
  ],
};
