import type { Messages } from "../../types";

export const qurbanPage: Messages = {
  defaults: {
    organizationName: "",
    title: "Paket Qurban",
    description:
      "Wujudkan ibadah qurban Anda bersama kami dengan hewan berkualitas dan penyaluran yang amanah",
    infoTitle: "Informasi Penting",
    infoItems: {
      item1: "Harga sudah termasuk hewan, pemotongan, dan pengemasan",
      item2: "Daging akan didistribusikan kepada yang berhak",
      item3: "Anda dapat memilih untuk menerima bagian daging atau disalurkan sepenuhnya",
      item4: "Penyembelihan dilakukan pada hari raya Idul Adha sesuai syariat",
    },
  },
  badges: {
    popular: "Populer",
  },
  filters: {
    selectPeriod: "Pilih Periode",
    allPackages: "Semua Paket",
    cow: "Sapi",
    goat: "Kambing",
    sheep: "Domba",
    individual: "Individu",
    shared: "Patungan",
  },
  empty: {
    title: "Belum Ada Paket Qurban",
    description: "Paket qurban untuk periode ini akan segera tersedia.",
  },
  error: {
    title: "Gagal Memuat Paket Qurban",
    description: "Terjadi kendala saat mengambil data paket qurban. Silakan coba lagi beberapa saat lagi.",
    retry: "Coba Lagi",
  },
  noPeriod: {
    title: "Belum Ada Periode Qurban Berjalan",
    description: "Saat ini belum ada periode qurban yang dibuka. Silakan kembali lagi nanti.",
  },
};
