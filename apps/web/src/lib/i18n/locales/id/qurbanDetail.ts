import type { Messages } from "../../types";

export const qurbanDetail: Messages = {
  breadcrumb: {
    home: "Beranda",
    qurban: "Qurban",
  },
  related: {
    title: "Qurban Lain",
  },
  metadata: {
    descriptionFallback: "Paket qurban {name}",
    keywords: {
      qurban: "qurban",
      eidAdha: "idul adha",
    },
  },
  sidebar: {
    mobile: {
      toggle: "Naik/turunkan panel pemesanan",
      cta: "Pesan",
    },
    validation: {
      unavailable: "Paket ini sudah tidak tersedia",
    },
    owner: {
      mitra: "Mitra",
      organization: "Lembaga",
    },
    unit: {
      animal: "ekor",
      slot: "slot",
    },
    pricePer: "Harga per {unit}",
    stock: {
      available: "Stok tersedia:",
      value: "{remaining} dari {total} ekor",
    },
    slot: {
      available: "Slot tersedia:",
      value: "{count} slot",
      maxPerAnimal: "Max per hewan:",
      maxValue: "{count} orang",
    },
    selectPeriod: "Pilih Periode",
    quantity: "Jumlah",
    summary: {
      subtotal: "Subtotal",
      adminFee: "Biaya Admin ({quantity}x)",
      sharedInfo: "Dibagi {maxSlots} slot (paket patungan)",
      total: "Total",
    },
    actions: {
      orderNow: "Order Qurban",
      saveForPackage: "Nabung untuk Paket Ini",
      share: "Bagikan",
      favorite: "Favorit",
    },
    unavailable: {
      title: "Stok Habis",
      description: "Paket qurban ini sudah tidak tersedia",
    },
    help: {
      title: "Butuh Bantuan?",
      description: "Jika melihat program ini mencurigakan atau butuh bantuan, hubungi kami.",
      whatsapp: "Chat WhatsApp",
    },
    share: {
      title: "Bagikan",
      whatsapp: "WhatsApp",
      facebook: "Facebook",
      twitter: "Twitter",
      threads: "Threads",
      linkedin: "LinkedIn",
    },
  },
  confirmModal: {
    periodFallback: "Periode Qurban",
    title: "Konfirmasi Order Qurban",
    packageLabel: "Paket Qurban",
    periodLabel: "Periode:",
    typeLabel: "Jenis:",
    quantityLabel: "Jumlah:",
    quantityValue: "{quantity} ekor",
    paymentSummary: "Rincian Pembayaran",
    summary: {
      discount: "Diskon",
      subtotal: "Subtotal",
      adminFee: "Biaya Admin",
      sharedInfo: "Dibagi {maxSlots} slot (paket patungan)",
      total: "Total",
    },
    chooseAction: "Pilih salah satu opsi di bawah untuk melanjutkan:",
    actions: {
      orderNow: "Order Qurban Sekarang",
      addToCartAndView: "Tambah ke Keranjang & Lihat",
      addToCart: "Tambah ke Keranjang",
    },
    toasts: {
      addedToCart: "Paket qurban berhasil ditambahkan ke keranjang!",
      redirectCheckout: "Mengarahkan ke checkout...",
    },
    animalType: {
      cow: "Sapi",
      goat: "Kambing",
    },
    packageType: {
      individual: "Individu",
      shared: "Patungan",
    },
  },
  tabs: {
    description: "Deskripsi",
    packageInfo: "Informasi Paket",
    noDescription: "Belum ada deskripsi untuk paket qurban ini.",
    labels: {
      period: "Periode",
      animalType: "Jenis Hewan",
      packageType: "Tipe Paket",
    },
    values: {
      packageIndividual: "Individu",
      packageShared: "Patungan (Shared)",
    },
    terms: {
      title: "Ketentuan",
      items: {
        quality: "Hewan qurban berkualitas dan sehat",
        sharia: "Disembelih sesuai syariat Islam",
        distribution: "Daging disalurkan kepada yang berhak",
        documentation: "Dokumentasi lengkap penyembelihan",
        certificate: "Sertifikat digital untuk peserta qurban",
      },
    },
  },
};
