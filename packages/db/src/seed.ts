import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "./schema/index.ts";
import { createId, generateSlug } from "./utils.ts";
import bcrypt from "bcryptjs";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  console.log("Seeding database...");

  // Seed Roles
  const rolesData = [
    { id: createId(), slug: "super_admin", name: "Super Admin", description: "Full access to all features", isSystem: true },
    { id: createId(), slug: "admin_finance", name: "Admin Finance", description: "Manage finance, reports, disbursements", isSystem: true },
    { id: createId(), slug: "admin_campaign", name: "Admin Campaign", description: "Manage campaigns and content", isSystem: true },
    { id: createId(), slug: "user", name: "User", description: "Regular donor user", isSystem: true },
  ];

  console.log("Seeding roles...");
  for (const role of rolesData) {
    await db.insert(schema.roles).values(role).onConflictDoNothing();
  }

  // Seed Permissions
  const permissionsData = [
    { key: "dashboard.view", name: "View Dashboard", module: "dashboard" },
    { key: "campaign.view", name: "View Campaigns", module: "campaign" },
    { key: "campaign.create", name: "Create Campaign", module: "campaign" },
    { key: "campaign.update", name: "Update Campaign", module: "campaign" },
    { key: "campaign.delete", name: "Delete Campaign", module: "campaign" },
    { key: "donation.view", name: "View Donations", module: "donation" },
    { key: "donation.create_manual", name: "Create Manual Donation", module: "donation" },
    { key: "donation.export", name: "Export Donations", module: "donation" },
    { key: "finance.ledger", name: "View Ledger", module: "finance" },
    { key: "finance.disbursement", name: "Manage Disbursements", module: "finance" },
    { key: "finance.approve", name: "Approve Financial Actions", module: "finance" },
    { key: "report.view", name: "View Reports", module: "report" },
    { key: "report.generate", name: "Generate Reports", module: "report" },
    { key: "user.view", name: "View Users", module: "user" },
    { key: "user.create", name: "Create User", module: "user" },
    { key: "user.update", name: "Update User", module: "user" },
    { key: "user.delete", name: "Delete User", module: "user" },
    { key: "role.manage", name: "Manage Roles", module: "role" },
    { key: "page.manage", name: "Manage Pages", module: "page" },
    { key: "setting.view", name: "View Settings", module: "setting" },
    { key: "setting.update", name: "Update Settings", module: "setting" },
    { key: "audit.view", name: "View Audit Logs", module: "audit" },
  ];

  console.log("Seeding permissions...");
  for (const perm of permissionsData) {
    await db.insert(schema.permissions).values({ id: createId(), ...perm }).onConflictDoNothing();
  }

  // Seed Categories (Campaign categories, not pillars)
  const categoriesData = [
    { slug: "pendidikan", name: "Pendidikan", description: "Program pendidikan dan beasiswa", icon: "academic-cap", color: "#3b82f6", sortOrder: 1 },
    { slug: "kesehatan", name: "Kesehatan", description: "Bantuan kesehatan dan pengobatan", icon: "heart", color: "#ef4444", sortOrder: 2 },
    { slug: "bencana", name: "Bencana Alam", description: "Tanggap bencana dan pemulihan", icon: "exclamation-triangle", color: "#f97316", sortOrder: 3 },
    { slug: "sosial", name: "Sosial", description: "Program sosial kemasyarakatan", icon: "users", color: "#22c55e", sortOrder: 4 },
    { slug: "kemanusiaan", name: "Kemanusiaan", description: "Bantuan kemanusiaan", icon: "hand-heart", color: "#8b5cf6", sortOrder: 5 },
    { slug: "lingkungan", name: "Lingkungan", description: "Pelestarian lingkungan", icon: "globe", color: "#10b981", sortOrder: 6 },
  ];

  console.log("Seeding categories...");
  for (const cat of categoriesData) {
    await db.insert(schema.categories).values({ id: createId(), ...cat }).onConflictDoNothing();
  }

  // Seed Super Admin User
  const passwordHash = await bcrypt.hash("admin123", 12);
  const adminId = createId();

  console.log("Seeding admin user...");
  await db.insert(schema.users).values({
    id: adminId,
    email: "admin@bantuanku.org",
    passwordHash,
    name: "Super Admin",
    isActive: true,
  }).onConflictDoNothing();

  // Assign super_admin role
  const superAdminRole = rolesData.find(r => r.slug === "super_admin");
  if (superAdminRole) {
    await db.insert(schema.userRoles).values({
      id: createId(),
      userId: adminId,
      roleId: superAdminRole.id,
    }).onConflictDoNothing();
  }

  // Seed Sample Campaigns
  const campaignsData = [
    {
      title: "Bantu Korban Bencana Alam",
      description: "Mari bantu saudara-saudara kita yang terkena bencana alam. Donasi Anda sangat berarti.",
      imageUrl: "https://placehold.co/800x600/ef4444/white?text=Bencana+Alam",
      goal: 500000000,
      category: "donasi",
      pillar: "Kemanusiaan",
      isFeatured: true,
      isUrgent: true,
      status: "active",
    },
    {
      title: "Wakaf Sumur untuk Desa Tertinggal",
      description: "Bangun sumur wakaf untuk masyarakat di daerah kekeringan yang membutuhkan air bersih.",
      imageUrl: "https://placehold.co/800x600/3b82f6/white?text=Wakaf+Sumur",
      goal: 300000000,
      category: "wakaf",
      pillar: "Kemanusiaan",
      isFeatured: true,
      status: "active",
    },
    {
      title: "Sedekah Makan Santri Penghafal Quran",
      description: "Bantu kebutuhan makan para santri penghafal Al-Quran di pelosok negeri.",
      imageUrl: "https://placehold.co/800x600/22c55e/white?text=Sedekah+Santri",
      goal: 150000000,
      category: "sedekah",
      pillar: "Pendidikan",
      isFeatured: true,
      status: "active",
    },
    {
      id: "zakat-campaign-default",
      title: "Zakat",
      description: "Tunaikan zakat Anda melalui platform kami. Zakat akan disalurkan kepada yang berhak menerimanya.",
      imageUrl: "https://placehold.co/800x600/10b981/white?text=Zakat",
      goal: 999999999999,
      category: "zakat",
      pillar: "Keagamaan",
      isFeatured: false,
      isUrgent: false,
      status: "active",
    },
  ];

  console.log("Seeding campaigns...");
  for (const camp of campaignsData) {
    await db.insert(schema.campaigns).values({
      id: (camp as any).id || createId(), // Use custom ID if provided, otherwise generate
      slug: generateSlug(camp.title),
      ...camp,
      publishedAt: new Date(),
      createdBy: adminId,
    }).onConflictDoNothing();
  }

  // Seed Zakat Calculator Configs
  const zakatConfigs = [
    { type: "income", name: "Zakat Penghasilan", description: "Zakat atas penghasilan/gaji", nisabGoldGram: "85", rateBps: 250 },
    { type: "maal", name: "Zakat Maal", description: "Zakat atas harta simpanan", nisabGoldGram: "85", rateBps: 250 },
    { type: "gold", name: "Zakat Emas", description: "Zakat atas kepemilikan emas", nisabGoldGram: "85", rateBps: 250 },
    { type: "trade", name: "Zakat Perdagangan", description: "Zakat atas keuntungan usaha", nisabGoldGram: "85", rateBps: 250 },
    { type: "fitrah", name: "Zakat Fitrah", description: "Zakat fitrah per jiwa", nisabValue: 45000, nisabUnit: "rupiah" },
    { type: "fidyah", name: "Fidyah", description: "Fidyah per hari puasa", nisabValue: 45000, nisabUnit: "rupiah" },
  ];

  console.log("Seeding zakat configs...");
  for (const zc of zakatConfigs) {
    await db.insert(schema.zakatCalculatorConfigs).values({
      id: createId(),
      ...zc,
    }).onConflictDoNothing();
  }

  // Seed Settings
  const settingsData = [
    { key: "site_name", value: "Bantuanku", label: "Nama Situs", category: "general", type: "string", isPublic: true },
    { key: "site_tagline", value: "Platform Donasi Terpercaya", label: "Tagline", category: "general", type: "string", isPublic: true },
    { key: "contact_email", value: "info@bantuanku.org", label: "Email Kontak", category: "general", type: "string", isPublic: true },
    { key: "contact_phone", value: "+62 21 1234567", label: "Telepon", category: "general", type: "string", isPublic: true },
    { key: "gold_price_per_gram", value: "1140000", label: "Harga Emas per Gram (IDR)", category: "zakat", type: "number", isPublic: true },
    { key: "zakat_fitrah_amount", value: "45000", label: "Zakat Fitrah per Jiwa (IDR)", category: "zakat", type: "number", isPublic: true },
    { key: "rice_price_per_kg", value: "20000", label: "Harga Beras per KG (IDR)", category: "zakat", type: "number", isPublic: true },
    { key: "fidyah_amount_per_day", value: "45000", label: "Fidyah per Hari (IDR)", category: "zakat", type: "number", isPublic: true },
    { key: "minimum_donation", value: "10000", label: "Donasi Minimum (IDR)", category: "payment", type: "number", isPublic: true },
  ];

  console.log("Seeding settings...");
  for (const setting of settingsData) {
    await db.insert(schema.settings).values({
      id: createId(),
      ...setting,
    }).onConflictDoNothing();
  }

  // Seed Payment Gateways
  const gatewaysData = [
    { code: "midtrans", name: "Midtrans", type: "auto", sortOrder: 1 },
    { code: "xendit", name: "Xendit", type: "auto", sortOrder: 2 },
    { code: "ipaymu", name: "iPaymu", type: "auto", sortOrder: 3 },
    { code: "flip", name: "Flip", type: "auto", sortOrder: 4 },
    { code: "manual", name: "Transfer Manual", type: "manual", sortOrder: 10 },
  ];

  console.log("Seeding payment gateways...");
  const gatewayIds: Record<string, string> = {};
  for (const gw of gatewaysData) {
    const id = createId();
    gatewayIds[gw.code] = id;
    await db.insert(schema.paymentGateways).values({ id, ...gw }).onConflictDoNothing();
  }

  // Payment methods sekarang diambil dari settings, tidak perlu seed hardcode lagi
  console.log("Payment methods will be loaded from settings dynamically...");

  // Seed Chart of Accounts (COA)
  const coaData = [
    // ASSETS (1xxx) - Debit normal
    { code: "1000", name: "Aset", type: "asset", category: "header", normalBalance: "debit", level: 1, isSystem: true },
    { code: "1100", name: "Aset Lancar", type: "asset", category: "header", normalBalance: "debit", level: 2, isSystem: true },
    { code: "1110", name: "Kas", type: "asset", category: "cash", normalBalance: "debit", level: 3, isSystem: true, description: "Uang tunai di tangan" },
    { code: "1120", name: "Bank BCA", type: "asset", category: "bank", normalBalance: "debit", level: 3, isSystem: true, description: "Rekening Bank BCA" },
    { code: "1121", name: "Bank Mandiri", type: "asset", category: "bank", normalBalance: "debit", level: 3, isSystem: true, description: "Rekening Bank Mandiri" },
    { code: "1122", name: "Bank BSI", type: "asset", category: "bank", normalBalance: "debit", level: 3, isSystem: true, description: "Rekening Bank Syariah Indonesia" },
    { code: "1130", name: "Piutang", type: "asset", category: "receivable", normalBalance: "debit", level: 3, isSystem: false, description: "Piutang lain-lain" },

    // LIABILITIES (2xxx) - Credit normal
    { code: "2000", name: "Liabilitas", type: "liability", category: "header", normalBalance: "credit", level: 1, isSystem: true },
    { code: "2100", name: "Liabilitas Jangka Pendek", type: "liability", category: "header", normalBalance: "credit", level: 2, isSystem: true },
    { code: "2110", name: "Hutang Usaha", type: "liability", category: "payable", normalBalance: "credit", level: 3, isSystem: false, description: "Hutang kepada vendor/supplier" },
    { code: "2200", name: "Titipan Dana Donasi", type: "liability", category: "donation_liability", normalBalance: "credit", level: 2, isSystem: true, description: "Dana donasi yang belum disalurkan" },
    { code: "2210", name: "Titipan Dana Campaign", type: "liability", category: "donation_liability", normalBalance: "credit", level: 3, isSystem: true, description: "Dana per campaign yang masuk" },

    // EQUITY (3xxx) - Credit normal
    { code: "3000", name: "Ekuitas", type: "equity", category: "header", normalBalance: "credit", level: 1, isSystem: true },
    { code: "3100", name: "Modal Yayasan", type: "equity", category: "capital", normalBalance: "credit", level: 2, isSystem: true, description: "Modal awal yayasan" },
    { code: "3200", name: "Laba Ditahan", type: "equity", category: "retained_earnings", normalBalance: "credit", level: 2, isSystem: true, description: "Akumulasi surplus/defisit" },

    // INCOME (4xxx) - Credit normal
    { code: "4000", name: "Pendapatan", type: "income", category: "header", normalBalance: "credit", level: 1, isSystem: true },
    { code: "4100", name: "Pendapatan Donasi", type: "income", category: "donation", normalBalance: "credit", level: 2, isSystem: true, description: "Pendapatan dari donasi umum" },
    { code: "4200", name: "Pendapatan Zakat", type: "income", category: "zakat", normalBalance: "credit", level: 2, isSystem: true, description: "Pendapatan dari zakat" },
    { code: "4300", name: "Pendapatan Infaq/Sedekah", type: "income", category: "infaq", normalBalance: "credit", level: 2, isSystem: true, description: "Pendapatan infaq dan sedekah" },
    { code: "4400", name: "Pendapatan Wakaf", type: "income", category: "wakaf", normalBalance: "credit", level: 2, isSystem: true, description: "Pendapatan wakaf" },
    { code: "4900", name: "Pendapatan Lain-lain", type: "income", category: "other", normalBalance: "credit", level: 2, isSystem: false, description: "Pendapatan di luar operasional utama" },

    // EXPENSE (5xxx) - Debit normal
    { code: "5000", name: "Beban", type: "expense", category: "header", normalBalance: "debit", level: 1, isSystem: true },
    { code: "5100", name: "Beban Program", type: "expense", category: "program", normalBalance: "debit", level: 2, isSystem: true, description: "Beban untuk program/campaign" },
    { code: "5110", name: "Beban Pendidikan", type: "expense", category: "program", normalBalance: "debit", level: 3, isSystem: false, description: "Beban program pendidikan" },
    { code: "5120", name: "Beban Kesehatan", type: "expense", category: "program", normalBalance: "debit", level: 3, isSystem: false, description: "Beban program kesehatan" },
    { code: "5130", name: "Beban Bencana Alam", type: "expense", category: "program", normalBalance: "debit", level: 3, isSystem: false, description: "Beban tanggap bencana" },
    { code: "5140", name: "Beban Sosial", type: "expense", category: "program", normalBalance: "debit", level: 3, isSystem: false, description: "Beban program sosial" },
    { code: "5200", name: "Beban Operasional", type: "expense", category: "operational", normalBalance: "debit", level: 2, isSystem: true, description: "Beban operasional organisasi" },
    { code: "5210", name: "Beban Gaji", type: "expense", category: "operational", normalBalance: "debit", level: 3, isSystem: false, description: "Gaji karyawan" },
    { code: "5220", name: "Beban Sewa", type: "expense", category: "operational", normalBalance: "debit", level: 3, isSystem: false, description: "Sewa kantor/tempat" },
    { code: "5230", name: "Beban Utilitas", type: "expense", category: "operational", normalBalance: "debit", level: 3, isSystem: false, description: "Listrik, air, internet" },
    { code: "5240", name: "Beban Administrasi", type: "expense", category: "operational", normalBalance: "debit", level: 3, isSystem: false, description: "ATK, materai, dll" },
    { code: "5250", name: "Beban Marketing", type: "expense", category: "operational", normalBalance: "debit", level: 3, isSystem: false, description: "Promosi dan marketing" },
    { code: "5260", name: "Beban Payment Gateway", type: "expense", category: "operational", normalBalance: "debit", level: 3, isSystem: true, description: "Fee payment gateway" },
    { code: "5900", name: "Beban Lain-lain", type: "expense", category: "other", normalBalance: "debit", level: 2, isSystem: false, description: "Beban lain-lain" },
  ];

  console.log("Seeding chart of accounts...");
  for (const acc of coaData) {
    await db.insert(schema.chartOfAccounts).values({ id: createId(), ...acc }).onConflictDoNothing();
  }

  // Seed Ledger Accounts (minimal for compatibility with ledger service)
  // Using blueprint COA codes: 1010 (Kas), 1020 (Bank), 2010 (Liability)
  // Generic names to support multiple banks configured via admin UI
  const ledgerAccountsData = [
    { code: "1010", name: "Kas", type: "asset", normalSide: "debit" },
    { code: "1020", name: "Bank - Operasional", type: "asset", normalSide: "debit" },
    { code: "2010", name: "Titipan Dana Campaign", type: "liability", normalSide: "credit" },
  ];

  console.log("Seeding ledger accounts (for ledger service compatibility)...");
  for (const acc of ledgerAccountsData) {
    await db.insert(schema.ledgerAccounts).values({ id: createId(), ...acc }).onConflictDoNothing();
  }

  // Bank Accounts akan di-input oleh admin via UI
  // Tidak perlu seed default bank accounts
  console.log("Bank accounts will be managed by admin via UI...");

  console.log("Seeding complete!");

  await pool.end();
}

export { seed };

seed().catch(console.error);
