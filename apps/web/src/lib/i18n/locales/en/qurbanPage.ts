import type { Messages } from "../../types";

export const qurbanPage: Messages = {
  defaults: {
    organizationName: "",
    title: "Qurban Packages",
    description:
      "Fulfill your qurban worship with quality livestock and trustworthy distribution",
    infoTitle: "Important Information",
    infoItems: {
      item1: "Price includes livestock, slaughtering, and packaging",
      item2: "Meat will be distributed to eligible recipients",
      item3: "You can choose to receive your meat portion or distribute all of it",
      item4: "Slaughtering is carried out on Eid al-Adha according to sharia",
    },
  },
  badges: {
    popular: "Popular",
  },
  filters: {
    selectPeriod: "Select Period",
    allPackages: "All Packages",
    cow: "Cow",
    goat: "Goat",
    sheep: "Sheep",
    individual: "Individual",
    shared: "Shared",
  },
  empty: {
    title: "No Qurban Packages Yet",
    description: "Qurban packages for this period will be available soon.",
  },
  error: {
    title: "Failed to Load Qurban Packages",
    description: "We could not load the qurban packages right now. Please try again in a moment.",
    retry: "Try Again",
  },
  noPeriod: {
    title: "No Active Qurban Period",
    description: "There is no qurban period open at the moment. Please check back later.",
  },
};
