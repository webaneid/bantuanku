export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN_FINANCE: "admin_finance",
  ADMIN_CAMPAIGN: "admin_campaign",
  USER: "user",
} as const;

export const DONATION_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SUCCESS: "success",
  FAILED: "failed",
  EXPIRED: "expired",
  REFUNDED: "refunded",
} as const;

export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const DISBURSEMENT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  PROCESSED: "processed",
  COMPLETED: "completed",
  REJECTED: "rejected",
} as const;

export const PAYMENT_GATEWAY_TYPE = {
  AUTO: "auto",
  MANUAL: "manual",
} as const;

export const PAYMENT_METHOD_TYPE = {
  VA: "va",
  EWALLET: "ewallet",
  QRIS: "qris",
  BANK_TRANSFER: "bank_transfer",
  RETAIL: "retail",
  CREDIT_CARD: "credit_card",
} as const;

export const CATEGORIES = {
  DONASI: "donasi",
  WAKAF: "wakaf",
  SEDEKAH: "sedekah",
  ZAKAT: "zakat",
  KURBAN: "kurban",
} as const;

export const ZAKAT_TYPES = {
  INCOME: "income",
  MAAL: "maal",
  GOLD: "gold",
  TRADE: "trade",
  FITRAH: "fitrah",
  FIDYAH: "fidyah",
} as const;

export const SETTING_CATEGORIES = {
  GENERAL: "general",
  BRANDING: "branding",
  PAYMENT: "payment",
  ZAKAT: "zakat",
  EMAIL: "email",
  SEO: "seo",
} as const;

export const LEDGER_ACCOUNT_TYPES = {
  ASSET: "asset",
  LIABILITY: "liability",
  EQUITY: "equity",
  REVENUE: "revenue",
  EXPENSE: "expense",
} as const;

export const LEDGER_ENTRY_TYPES = {
  DONATION: "donation",
  DISBURSEMENT: "disbursement",
  ADJUSTMENT: "adjustment",
  OPENING: "opening",
} as const;

export const INVOICE_STATUS = {
  ISSUED: "issued",
  PAID: "paid",
  VOID: "void",
  CANCELLED: "cancelled",
} as const;
