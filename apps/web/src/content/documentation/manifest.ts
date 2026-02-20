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
          title: "Pengenalan Bantuanku",
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
          title: "Sistem Fundraiser",
        },
        {
          slug: "seo",
          title: "Tutorial SEO Lengkap",
        },
        {
          slug: "panduan-upload-gambar",
          title: "Panduan Upload Gambar Utama",
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
  ],
};
