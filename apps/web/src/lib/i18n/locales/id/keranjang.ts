import type { Messages } from "../../types";

export const keranjang: Messages = {
  title: "Keranjang Bantuan",
  itemCount: "{count} Program dalam keranjang",
  clearCart: "Kosongkan Keranjang",
  empty: {
    title: "Keranjang Bantuan Kosong",
    description: "Anda belum menambahkan program bantuan ke keranjang. Yuk, mulai berbagi kebaikan!",
    browseCta: "Telusuri Program",
  },
  item: {
    removeAriaLabel: "Hapus dari keranjang",
    nominal: "Nominal:",
    periode: "Periode:",
    jenis: "Jenis:",
    jumlah: "Jumlah:",
    harga: "Harga ({quantity}x)",
    biayaAdmin: "Biaya Admin ({quantity}x)",
    total: "Total",
  },
  summary: {
    title: "Ringkasan Bantuan",
    totalLabel: "Total Bantuan",
    checkout: "Verifikasi Donatur",
    addMore: "Tambah Program Lain",
    infoText: "Anda dapat mendonasikan ke berbagai program sekaligus dalam satu transaksi. Donasi Anda akan disalurkan sesuai pilihan program.",
  },
};
