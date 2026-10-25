import type { Messages } from "../../types";

export const zakatPage: Messages = {
  breadcrumb: {
    home: "Beranda",
    zakat: "Zakat",
  },
  defaults: {
    title: "Zakat",
    description: "Tunaikan zakat Anda dengan mudah dan amanah",
    organizationName: "",
    infoTitle: "Tentang Zakat",
    infoItems: {
      item1: "Zakat adalah rukun Islam yang ke-3 dan wajib ditunaikan oleh setiap Muslim yang mampu",
      item2: "Zakat Fitrah dibayarkan menjelang Idul Fitri, sedangkan Zakat Mal dibayarkan saat harta mencapai nisab",
      item3: "Zakat akan disalurkan kepada 8 golongan yang berhak (asnaf)",
      item4: "Tunaikan zakat melalui lembaga resmi dan terpercaya",
    },
    keywords: {
      zakat: "zakat",
      fitrah: "zakat fitrah",
      maal: "zakat maal",
      payOnline: "bayar zakat online",
      calculator: "kalkulator zakat",
      pay: "bayar zakat",
    },
    fallbackTypes: {
      fitrah: "Zakat Fitrah",
      maal: "Zakat Maal",
      penghasilan: "Zakat Penghasilan",
      bisnis: "Zakat Bisnis",
    },
  },
  archive: {
    filterLabel: "Filter jenis zakat",
    filters: {
      all: "Semua Jenis",
      fitrah: "Fitrah",
      maal: "Maal / Harta",
      profesi: "Profesi / Penghasilan",
      pertanian: "Pertanian",
      peternakan: "Peternakan",
      bisnis: "Bisnis",
      lainnya: "Lainnya",
    },
    emptyFiltered: "Belum ada data untuk filter ini.",
  },
};
