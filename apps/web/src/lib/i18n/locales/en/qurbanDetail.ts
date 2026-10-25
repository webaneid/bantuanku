import type { Messages } from "../../types";

export const qurbanDetail: Messages = {
  breadcrumb: {
    home: "Home",
    qurban: "Qurban",
  },
  related: {
    title: "Other Qurban Packages",
  },
  metadata: {
    descriptionFallback: "Qurban package {name}",
    keywords: {
      qurban: "qurban",
      eidAdha: "eid al adha",
    },
  },
  sidebar: {
    mobile: {
      toggle: "Toggle order panel",
      cta: "Order",
    },
    validation: {
      unavailable: "This package is no longer available",
    },
    owner: {
      mitra: "Partner",
      organization: "Organization",
    },
    unit: {
      animal: "head",
      slot: "slot",
    },
    pricePer: "Price per {unit}",
    stock: {
      available: "Available stock:",
      value: "{remaining} of {total} head",
    },
    slot: {
      available: "Available slots:",
      value: "{count} slots",
      maxPerAnimal: "Max per animal:",
      maxValue: "{count} people",
    },
    selectPeriod: "Select Period",
    quantity: "Quantity",
    summary: {
      subtotal: "Subtotal",
      adminFee: "Admin Fee ({quantity}x)",
      sharedInfo: "Split across {maxSlots} slots (shared package)",
      total: "Total",
    },
    actions: {
      orderNow: "Order Qurban",
      saveForPackage: "Save for This Package",
      share: "Share",
      favorite: "Favorite",
    },
    unavailable: {
      title: "Out of Stock",
      description: "This qurban package is no longer available",
    },
    help: {
      title: "Need Help?",
      description: "If you find this program suspicious or need help, contact us.",
      whatsapp: "Chat WhatsApp",
    },
    share: {
      title: "Share",
      whatsapp: "WhatsApp",
      facebook: "Facebook",
      twitter: "Twitter",
      threads: "Threads",
      linkedin: "LinkedIn",
    },
  },
  confirmModal: {
    periodFallback: "Qurban Period",
    title: "Confirm Qurban Order",
    packageLabel: "Qurban Package",
    periodLabel: "Period:",
    typeLabel: "Type:",
    quantityLabel: "Quantity:",
    quantityValue: "{quantity} head",
    paymentSummary: "Payment Summary",
    summary: {
      subtotal: "Subtotal",
      adminFee: "Admin Fee",
      sharedInfo: "Split across {maxSlots} slots (shared package)",
      total: "Total",
    },
    chooseAction: "Choose one of the options below to continue:",
    actions: {
      orderNow: "Order Qurban Now",
      addToCartAndView: "Add to Cart & View",
      addToCart: "Add to Cart",
      browseOther: "Browse Other Qurban Packages",
    },
    toasts: {
      addedToCart: "Qurban package added to cart successfully!",
      redirectCheckout: "Redirecting to checkout...",
    },
    animalType: {
      cow: "Cow",
      goat: "Goat",
    },
    packageType: {
      individual: "Individual",
      shared: "Shared",
    },
  },
  tabs: {
    description: "Description",
    packageInfo: "Package Information",
    noDescription: "No description available for this qurban package.",
    labels: {
      period: "Period",
      animalType: "Animal Type",
      packageType: "Package Type",
    },
    values: {
      packageIndividual: "Individual",
      packageShared: "Shared Package",
    },
    terms: {
      title: "Terms",
      items: {
        quality: "Healthy and quality qurban livestock",
        sharia: "Slaughtered according to Islamic sharia",
        distribution: "Meat distributed to rightful recipients",
        documentation: "Complete slaughter documentation",
        certificate: "Digital certificate for qurban participants",
      },
    },
  },
};
