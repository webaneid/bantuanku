import type { Messages } from "../../types";

export const zakatPage: Messages = {
  breadcrumb: {
    home: "Home",
    zakat: "Zakat",
  },
  defaults: {
    title: "Zakat",
    description: "Pay your zakat easily and trustfully",
    organizationName: "",
    infoTitle: "About Zakat",
    infoItems: {
      item1: "Zakat is the third pillar of Islam and is mandatory for every capable Muslim",
      item2: "Zakat Fitrah is paid before Eid al-Fitr, while Zakat Maal is paid when wealth reaches nisab",
      item3: "Zakat is distributed to the 8 eligible groups (asnaf)",
      item4: "Pay zakat through official and trusted institutions",
    },
    keywords: {
      zakat: "zakat",
      fitrah: "zakat fitrah",
      maal: "zakat maal",
      payOnline: "pay zakat online",
      calculator: "zakat calculator",
      pay: "pay zakat",
    },
    fallbackTypes: {
      fitrah: "Zakat Fitrah",
      maal: "Zakat Maal",
      penghasilan: "Income Zakat",
      bisnis: "Business Zakat",
    },
  },
  archive: {
    filterLabel: "Filter zakat type",
    filters: {
      all: "All Types",
      fitrah: "Fitrah",
      maal: "Maal / Wealth",
      profesi: "Profession / Income",
      pertanian: "Agriculture",
      peternakan: "Livestock",
      bisnis: "Business",
      lainnya: "Others",
    },
    emptyFiltered: "No data available for this filter.",
  },
};
