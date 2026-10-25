import type { Messages } from "../../types";

export const keranjang: Messages = {
  title: "Donation Cart",
  itemCount: "{count} Programs in cart",
  clearCart: "Clear Cart",
  empty: {
    title: "Cart is Empty",
    description: "You haven't added any programs to your cart yet. Let's start sharing kindness!",
    browseCta: "Browse Programs",
  },
  item: {
    removeAriaLabel: "Remove from cart",
    nominal: "Amount:",
    periode: "Period:",
    jenis: "Type:",
    jumlah: "Quantity:",
    harga: "Price ({quantity}x)",
    biayaAdmin: "Admin Fee ({quantity}x)",
    total: "Total",
  },
  summary: {
    title: "Donation Summary",
    totalLabel: "Total Donation",
    checkout: "Verify Donor",
    addMore: "Add Another Program",
    infoText: "You can donate to multiple programs in one transaction. Your donation will be distributed according to your chosen programs.",
  },
};
