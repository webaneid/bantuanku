import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
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

  const ensureSeedUser = async (payload: {
    email: string;
    name: string;
    passwordHash: string;
    isDeveloper?: boolean;
  }) => {
    await db
      .insert(schema.users)
      .values({
        id: createId(),
        email: payload.email,
        passwordHash: payload.passwordHash,
        name: payload.name,
        isActive: true,
        isDeveloper: Boolean(payload.isDeveloper),
      })
      .onConflictDoNothing();

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, payload.email),
      columns: { id: true },
    });

    if (!user) {
      throw new Error(`Failed to ensure seed user: ${payload.email}`);
    }

    return user.id;
  };

  // Seed Super Admin User
  const adminPasswordHash = await bcrypt.hash("admin123", 12);
  console.log("Seeding admin user...");
  const adminId = await ensureSeedUser({
    email: "admin@bantuanku.org",
    name: "Super Admin",
    passwordHash: adminPasswordHash,
    isDeveloper: false,
  });

  // Seed Developer User (hidden account with developer flag)
  const developerEmail = process.env.SEED_DEVELOPER_EMAIL || "webane.com@gmail.com";
  const developerName = process.env.SEED_DEVELOPER_NAME || "Webane Developer";
  const developerPassword = process.env.SEED_DEVELOPER_PASSWORD || "Bismillah2026)@DN!maju";
  const developerPasswordHash = await bcrypt.hash(developerPassword, 12);

  console.log("Seeding developer user...");
  const developerId = await ensureSeedUser({
    email: developerEmail,
    name: developerName,
    passwordHash: developerPasswordHash,
    isDeveloper: true,
  });

  // Assign super_admin role (query from DB since onConflictDoNothing may keep old IDs)
  const superAdminRole = await db.query.roles.findFirst({
    where: eq(schema.roles.slug, "super_admin"),
    columns: { id: true },
  });
  if (superAdminRole) {
    await db.insert(schema.userRoles).values({
      id: createId(),
      userId: adminId,
      roleId: superAdminRole.id,
    }).onConflictDoNothing();

    await db.insert(schema.userRoles).values({
      id: createId(),
      userId: developerId,
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

  // Seed Chart of Accounts (COA) - Minimal Setup
  const coaData = [
    // BANK ACCOUNTS (6xxx) - Asset type, Debit normal
    { code: "6201", name: "Bank BSI", type: "asset", category: "bank", normalBalance: "debit", level: 1, isSystem: true, description: "Rekening Bank Syariah Indonesia" },
    { code: "6202", name: "Bank Muamalat", type: "asset", category: "bank", normalBalance: "debit", level: 1, isSystem: true, description: "Rekening Bank Muamalat" },
    { code: "6203", name: "Bank BCA", type: "asset", category: "bank", normalBalance: "debit", level: 1, isSystem: true, description: "Rekening Bank BCA" },
    { code: "6204", name: "Bank Mandiri", type: "asset", category: "bank", normalBalance: "debit", level: 1, isSystem: true, description: "Rekening Bank Mandiri" },
    { code: "6205", name: "Bank BRI", type: "asset", category: "bank", normalBalance: "debit", level: 1, isSystem: true, description: "Rekening Bank BRI" },
    { code: "6206", name: "Payment Gateway", type: "asset", category: "bank", normalBalance: "debit", level: 1, isSystem: true, description: "Rekening virtual untuk tracking pembayaran via payment gateway (Xendit, iPaymu, Flip, dll)" },
    { code: "6210", name: "Cash", type: "asset", category: "cash", normalBalance: "debit", level: 1, isSystem: true, description: "Kas tunai untuk pembayaran langsung" },

    // INCOME ACCOUNTS (43xx) - Income type, Credit normal
    { code: "4300", name: "Pendapatan Qurban", type: "income", category: "qurban", normalBalance: "credit", level: 1, isSystem: true, description: "Pendapatan dari penjualan paket qurban (tidak termasuk biaya admin)" },
    { code: "4310", name: "Biaya Admin Qurban", type: "income", category: "qurban_admin", normalBalance: "credit", level: 1, isSystem: true, description: "Pendapatan dari biaya administrasi penyembelihan qurban" },
    { code: "4311", name: "Wakaf", type: "income", category: "wakaf", normalBalance: "credit", level: 1, isSystem: true, description: "Pendapatan dari wakaf" },
    { code: "4312", name: "Fidyah", type: "income", category: "fidyah", normalBalance: "credit", level: 1, isSystem: true, description: "Pendapatan dari fidyah" },
  ];

  console.log("Seeding chart of accounts...");
  for (const acc of coaData) {
    await db.insert(schema.chartOfAccounts).values({ id: createId(), ...acc }).onConflictDoNothing();
  }

  // Ledger Accounts removed - using simplified COA structure instead
  console.log("Ledger accounts not seeded - using minimal COA structure...");

  // Bank Accounts akan di-input oleh admin via UI
  // Tidak perlu seed default bank accounts
  console.log("Bank accounts will be managed by admin via UI...");

  console.log("Seeding complete!");

  await pool.end();
}

export { seed };

seed().catch(console.error);
