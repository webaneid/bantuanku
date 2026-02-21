import { Hono } from "hono";
import { authMiddleware, requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

import dashboardRoute from "./dashboard";
import campaignsRoute from "./campaigns";
import categoriesRoute from "./categories";
import pillarsRoute from "./pillars";
import donaturRoute from "./donatur";
import usersRoute from "./users";
import rolesRoute from "./roles";
import financeRoute from "./finance";
import ledgerRoute from "./ledger";
import coaRoute from "./coa";
import evidencesRoute from "./evidences";
import exportRoute from "./export";
import reportsRoute from "./reports";
import analyticsRoute from "./analytics";
import settingsRoute from "./settings";
import auditRoute from "./audit";
import mediaRoute from "./media";
import vendorsRoute from "./vendors";
import employeesRoute from "./employees";
import mustahiqsRoute from "./mustahiqs";
import activityReportsRoute from "./activity-reports";
import donationsRoute from "./donations";
import zakatTypesRoute from "./zakat-types";
import zakatPeriodsRoute from "./zakat-periods";
import zakatDonationsRoute from "./zakat-donations";
import zakatDistributionsRoute from "./zakat-distributions";
import zakatStatsRoute from "./zakat-stats";
import qurbanRoute from "./qurban";
import qurbanSavingsRoute from "./qurban-savings";
import addressRoute from "./address";
import disbursementsRoute from "./disbursements";
import ledgerCategoriesRoute from "./ledger-categories";
import bankAccountsRoute from "./bank-accounts";
import fundraisersRoute from "./fundraisers";
import mitraRoute from "./mitra";
import revenueSharesRoute from "./revenue-shares";
import whatsappRoute from "./whatsapp";
import pagesRoute from "./pages";
import transactionsRoute from "../transactions";

const admin = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global auth: semua role termasuk mitra boleh masuk admin panel
admin.use("*", authMiddleware);
admin.use("*", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator", "employee", "mitra"));

// Staff-only guard: blokir role mitra dari route yang tidak boleh diakses
const staffOnly = requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator", "employee");
admin.use("/dashboard/*", staffOnly);
admin.use("/donatur/*", staffOnly);
admin.use("/users/*", staffOnly);
admin.use("/roles/*", staffOnly);
admin.use("/finance/*", staffOnly);
admin.use("/ledger/*", staffOnly);
admin.use("/coa/*", staffOnly);
admin.use("/evidences/*", staffOnly);
admin.use("/export/*", staffOnly);
admin.use("/reports/*", staffOnly);
admin.use("/analytics/*", staffOnly);
admin.use("/settings/*", staffOnly);
admin.use("/audit/*", staffOnly);
admin.use("/vendors/*", staffOnly);
admin.use("/employees/*", staffOnly);
admin.use("/mustahiqs/*", staffOnly);
admin.use("/donations/*", staffOnly);
admin.use("/zakat/types/*", requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator", "employee", "mitra"));
admin.use("/zakat/donations/*", staffOnly);
admin.use("/zakat/distributions/*", staffOnly);
admin.use("/zakat/stats/*", staffOnly);
admin.use("/bank-accounts/*", staffOnly);
admin.use("/fundraisers/*", staffOnly);
admin.use("/transactions/*", staffOnly);
admin.use("/revenue-shares/*", staffOnly);
admin.use("/whatsapp/*", staffOnly);
admin.use("/pages/*", requireRole("super_admin", "admin_campaign"));

// === Routes yang BISA diakses mitra (tanpa staffOnly guard) ===
// /campaigns    — mitra lihat & kelola campaign miliknya
// /categories   — mitra lihat kategori campaign
// /pillars      — mitra lihat pilar campaign
// /mitra        — mitra lihat data sendiri
// /activity-reports — mitra lihat laporan kegiatan miliknya
// /media        — mitra upload gambar
// /address      — mitra lookup alamat
// /zakat/periods — mitra kelola periode zakat miliknya
// /qurban       — mitra kelola periode & paket qurban miliknya (guard di handler)
// /disbursements — mitra ajukan pencairan dana campaign/zakat/qurban/revenue-share miliknya (guard di handler)

admin.route("/dashboard", dashboardRoute);
admin.route("/campaigns", campaignsRoute);
admin.route("/categories", categoriesRoute);
admin.route("/pillars", pillarsRoute);
admin.route("/donatur", donaturRoute);
admin.route("/users", usersRoute);
admin.route("/roles", rolesRoute);
admin.route("/finance", financeRoute);
admin.route("/ledger/categories", ledgerCategoriesRoute);
admin.route("/ledger", ledgerRoute);
admin.route("/coa", coaRoute);
admin.route("/evidences", evidencesRoute);
admin.route("/export", exportRoute);
admin.route("/reports", reportsRoute);
admin.route("/analytics", analyticsRoute);
admin.route("/settings", settingsRoute);
admin.route("/audit", auditRoute);
admin.route("/media", mediaRoute);
admin.route("/vendors", vendorsRoute);
admin.route("/employees", employeesRoute);
admin.route("/mustahiqs", mustahiqsRoute);
admin.route("/activity-reports", activityReportsRoute);
admin.route("/donations", donationsRoute);
admin.route("/zakat/types", zakatTypesRoute);
admin.route("/zakat/periods", zakatPeriodsRoute);
admin.route("/zakat/donations", zakatDonationsRoute);
admin.route("/zakat/distributions", zakatDistributionsRoute);
admin.route("/zakat/stats", zakatStatsRoute);
admin.route("/qurban", qurbanRoute);
admin.route("/qurban/savings", qurbanSavingsRoute);
admin.route("/address", addressRoute);
admin.route("/disbursements", disbursementsRoute);
admin.route("/bank-accounts", bankAccountsRoute);
admin.route("/fundraisers", fundraisersRoute);
admin.route("/mitra", mitraRoute);
admin.route("/transactions", transactionsRoute);
admin.route("/revenue-shares", revenueSharesRoute);
admin.route("/whatsapp", whatsappRoute);
admin.route("/pages", pagesRoute);

export default admin;
