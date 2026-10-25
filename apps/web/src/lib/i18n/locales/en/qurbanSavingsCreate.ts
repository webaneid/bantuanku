import type { Messages } from "../../types";

export const qurbanSavingsCreate: Messages = {
  title: "Create Qurban Savings",
  subtitle: "Set up your installment plan",
  periodFallback: "Qurban Period",
  alerts: {
    loadFailed: "Failed to load qurban package data",
    phoneRequired: "Your account phone number is empty. Complete your profile before creating savings.",
    createFailed: "Failed to create savings. Please try again.",
  },
  packageInfo: {
    title: "Selected Package",
    packagePrice: "Package Price:",
    adminFee: "Admin Fee:",
    sharedInfo: "Split across {maxSlots} slots (shared package)",
    totalTarget: "Total Target:",
  },
  form: {
    onBehalfOf: "On Behalf Of",
    period: "Qurban Period",
    periodHint: "Choose when your qurban should be slaughtered",
    frequency: "Installment Frequency",
    frequencyMonthly: "Monthly",
    frequencyWeekly: "Weekly",
    installmentCount: "Installment Count",
    installmentCountOption: "{count} times",
    installmentCountHint: "Choose how many installments you want",
    installmentAmount: "Amount per Installment",
    installmentAmountHelp: "{total} ÷ {count} times = {amount}/installment",
    installmentDate: "Installment Date",
    installmentDateOption: "Date {day}",
    installmentDateHelp: "Installment notifications will be sent every date {day}",
    weeklyInfoTitle: "Weekly Installment:",
    weeklyInfoText: "Notifications will be sent every",
    weeklyInfoDay: "Monday",
    noteTitle: "Note:",
    noteText:
      "The installment amount above is only a guideline. You can pay off anytime without being bound to the schedule.",
  },
  actions: {
    cancel: "Cancel",
    create: "Create Savings",
    creating: "Creating...",
  },
};
