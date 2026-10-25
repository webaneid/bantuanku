import type { Messages } from "../../types";

export const qurbanSavingsCreate: Messages = {
  title: "Buat Tabungan Qurban",
  subtitle: "Atur rencana cicilan Anda",
  periodFallback: "Periode Qurban",
  alerts: {
    loadFailed: "Gagal memuat data paket qurban",
    phoneRequired: "Nomor HP akun belum terisi. Lengkapi profil dulu sebelum membuat tabungan.",
    createFailed: "Gagal membuat tabungan. Silakan coba lagi.",
  },
  packageInfo: {
    title: "Paket yang Dipilih",
    packagePrice: "Harga Paket:",
    adminFee: "Biaya Admin:",
    sharedInfo: "Dibagi {maxSlots} slot (paket patungan)",
    totalTarget: "Total Target:",
  },
  form: {
    onBehalfOf: "Atas Nama",
    period: "Periode Qurban",
    periodHint: "Pilih kapan Anda ingin qurban disembelih",
    frequency: "Frekuensi Cicilan",
    frequencyMonthly: "Bulanan",
    frequencyWeekly: "Mingguan",
    installmentCount: "Jumlah Cicilan",
    installmentCountOption: "{count} kali",
    installmentCountHint: "Tentukan berapa kali Anda ingin mencicil",
    installmentAmount: "Nominal per Cicilan",
    installmentAmountHelp: "{total} ÷ {count} kali = {amount}/cicilan",
    installmentDate: "Tanggal Cicilan",
    installmentDateOption: "Tanggal {day}",
    installmentDateHelp: "Notifikasi cicilan akan dikirim setiap tanggal {day}",
    weeklyInfoTitle: "Cicilan Mingguan:",
    weeklyInfoText: "Notifikasi akan dikirim setiap hari",
    weeklyInfoDay: "Senin",
    noteTitle: "Catatan:",
    noteText:
      "Nominal cicilan di atas hanya sebagai panduan. Anda dapat melunasi kapan saja tanpa terikat jadwal cicilan.",
  },
  actions: {
    cancel: "Batal",
    create: "Buat Tabungan",
    creating: "Membuat...",
  },
};
