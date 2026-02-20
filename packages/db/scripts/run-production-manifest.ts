import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

type Mode = "existing" | "fresh";

type MigrationEntry = {
  file: string;
  optional?: boolean;
  conditional?: "donatur-contact-rename";
};

type ManifestStats = {
  total: number;
  executed: number;
  skippedOptional: number;
  skippedConditional: number;
  skippedRange: number;
  failed: number;
};

const BASELINE_FRESH: MigrationEntry[] = [
  { file: "packages/db/drizzle/0000_fluffy_moira_mactaggert.sql" },
  { file: "packages/db/drizzle/0001_update_disbursements.sql" },
  { file: "packages/db/drizzle/0002_add_media_category.sql" },
  { file: "packages/db/drizzle/0003_broad_slipstream.sql" },
  { file: "packages/db/drizzle/0004_rename_disbursements_to_ledger.sql" },
  { file: "packages/db/drizzle/0005_create_accounting_tables.sql" },
  { file: "packages/db/drizzle/0006_remove_payment_methods_fk.sql" },
  { file: "packages/db/drizzle/0007_create_donation_evidences.sql" },
  { file: "packages/db/drizzle/0008_create_activity_reports.sql" },
  { file: "packages/db/drizzle/0010_create_mustahiqs.sql" },
];

const CORE_EXISTING: MigrationEntry[] = [
  { file: "packages/db/migrations/002-indonesia-address.sql" },
  { file: "packages/db/migrations/016_update_donatur_address.sql" },
  { file: "packages/db/migrations/017_update_employees_address.sql" },
  { file: "packages/db/migrations/020_update_mustahiq_address.sql" },
  { file: "packages/db/migrations/022_update_vendors_address.sql" },
  {
    file: "packages/db/migrations/022_update_donatur_contact.sql",
    conditional: "donatur-contact-rename",
  },
  { file: "packages/db/migrations/023_update_vendors_contact.sql" },
  { file: "packages/db/migrations/024_update_employees_contact.sql" },
  { file: "packages/db/migrations/025_update_mustahiq_contact.sql" },
  { file: "packages/db/migrations/024_create_bank_accounts.sql" },
  {
    file: "packages/db/migrations/024b_migrate_vendors_bank_data.sql",
    optional: true,
  },
  {
    file: "packages/db/migrations/026a_migrate_mustahiqs_bank_data.sql",
    optional: true,
  },
  {
    file: "packages/db/migrations/027a_migrate_employees_bank_data.sql",
    optional: true,
  },
  { file: "packages/db/migrations/029_add_whatsapp_to_users.sql" },
  { file: "packages/db/migrations/035_add_default_pillars.sql" },
  { file: "packages/db/migrations/037_create_qurban_tables_new_schema.sql" },
  {
    file: "packages/db/migrations/038_seed_qurban_data_new_schema.sql",
    optional: true,
  },
  { file: "packages/db/migrations/041_add_package_period_id_to_shared_groups.sql" },
  { file: "packages/db/migrations/042_fix_shared_groups_unique_constraint.sql" },
  { file: "packages/db/migrations/050_create_transactions_table.sql" },
  { file: "packages/db/migrations/051_create_transaction_payments_table.sql" },
  { file: "packages/db/migrations/052_create_transaction_indexes.sql" },
  {
    file: "packages/db/migrations/053_add_rejected_fields_to_transaction_payments.sql",
  },
  { file: "packages/db/migrations/054_add_user_id_to_transactions.sql" },
  { file: "packages/db/migrations/055_add_donatur_id_to_transactions.sql" },
  { file: "packages/db/migrations/057_add_category_to_transactions.sql" },
  { file: "packages/db/migrations/058_deactivate_unused_coa.sql" },
  { file: "packages/db/migrations/059_create_unified_disbursements.sql" },
  { file: "packages/db/migrations/060_update_disbursements_schema.sql" },
  {
    file: "packages/db/migrations/061_migrate_legacy_disbursements.sql",
    optional: true,
  },
  {
    file: "packages/db/migrations/062_add_payment_details_to_disbursements.sql",
  },
  { file: "packages/db/migrations/063_add_coa_account_id_to_bank_accounts.sql" },
  { file: "packages/db/migrations/064_add_balance_to_bank_accounts.sql" },
  { file: "packages/db/migrations/065_add_bank_account_to_transactions.sql" },
  { file: "packages/db/migrations/066_create_zakat_periods.sql" },
  {
    file: "packages/db/migrations/067_update_zakat_periods_consistency.sql",
  },
  { file: "packages/db/migrations/068_drop_disbursement_bank_fk.sql" },
  { file: "packages/db/migrations/069_add_qurban_admin_fee_coa.sql" },
  { file: "packages/db/migrations/070_migrate_coa_to_category_names.sql" },
  { file: "packages/db/migrations/071_universal_activity_reports.sql" },
  { file: "packages/db/migrations/072_add_unique_code_to_transactions.sql" },
  { file: "packages/db/migrations/073_create_fundraisers.sql" },
  { file: "packages/db/migrations/074_create_fundraiser_referrals.sql" },
  { file: "packages/db/migrations/075_add_employee_role.sql" },
  { file: "packages/db/migrations/076_drop_fundraiser_bank_columns.sql" },
  { file: "packages/db/migrations/077_create_mitra.sql" },
  { file: "packages/db/migrations/078_add_mitra_to_programs.sql" },
  { file: "packages/db/migrations/079_add_mitra_role.sql" },
  { file: "packages/db/migrations/080_add_user_id_to_donatur.sql" },
  { file: "packages/db/migrations/081_create_revenue_shares.sql" },
  { file: "packages/db/migrations/082_add_created_by_to_zakat_types.sql" },
  { file: "packages/db/migrations/083_add_fitrah_amount_to_zakat_types.sql" },
  { file: "packages/db/migrations/084_add_calculator_type_to_zakat_types.sql" },
  { file: "packages/db/migrations/084_add_revenue_share_disbursements.sql" },
  {
    file: "packages/db/migrations/085_add_gateway_fields_to_transaction_payments.sql",
  },
  {
    file: "packages/db/migrations/086_qurban_global_period_and_execution_overrides.sql",
  },
  {
    file: "packages/db/migrations/087_create_whatsapp_notification_settings.sql",
  },
  { file: "packages/db/migrations/088_create_whatsapp_bot_settings.sql" },
  { file: "packages/db/migrations/089_update_register_templates.sql" },
  {
    file: "packages/db/migrations/090_create_qurban_savings_conversions.sql",
  },
  {
    file: "packages/db/migrations/090_remove_bank_info_from_wa_templates.sql",
  },
  {
    file: "packages/db/migrations/091_add_mitra_fundraiser_wa_templates.sql",
  },
  { file: "packages/db/migrations/091_fix_template_frontend_url.sql" },
  {
    file: "packages/db/migrations/092_add_media_variants_and_local_retention.sql",
  },
  {
    file: "packages/db/migrations/093_add_rejection_reason_to_wa_template.sql",
  },
  { file: "packages/db/migrations/094_add_feature_image_to_pages.sql" },
  { file: "packages/db/migrations/095_remove_pages_seo_columns.sql" },
  { file: "packages/db/migrations/096_add_feature_image_to_pages.sql" },
  { file: "packages/db/migrations/097_add_seo_fields_to_pages.sql" },
  { file: "packages/db/migrations/098_add_seo_fields_to_campaigns.sql" },
  { file: "packages/db/migrations/099_add_seo_fields_to_zakat_types.sql" },
  {
    file: "packages/db/migrations/100_add_seo_fields_to_qurban_packages.sql",
  },
  { file: "packages/db/migrations/101_add_seo_fields_to_categories.sql" },
  { file: "packages/db/migrations/102_add_seo_fields_to_pillars.sql" },
  { file: "packages/db/migrations/103_add_is_developer_to_users.sql" },
];

const args = process.argv.slice(2);
const mode: Mode = args.includes("--fresh") ? "fresh" : "existing";
const includeOptional = args.includes("--include-optional");
const dryRun = args.includes("--dry-run");
const continueOnError = args.includes("--continue-on-error");
const fromArg = getArgValue("--from");
const toArg = getArgValue("--to");
const customLogFile = getArgValue("--log-file");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const dbRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(dbRoot, "..", "..");
const logsDir = path.resolve(dbRoot, "logs");
fs.mkdirSync(logsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFile = customLogFile
  ? path.resolve(repoRoot, customLogFile)
  : path.join(logsDir, `production-manifest-${timestamp}.log`);

const stats: ManifestStats = {
  total: 0,
  executed: 0,
  skippedOptional: 0,
  skippedConditional: 0,
  skippedRange: 0,
  failed: 0,
};

function getArgValue(flag: string): string | undefined {
  const exactIdx = args.findIndex((arg) => arg === flag);
  if (exactIdx >= 0 && args[exactIdx + 1]) {
    return args[exactIdx + 1];
  }

  const prefixed = args.find((arg) => arg.startsWith(`${flag}=`));
  if (!prefixed) {
    return undefined;
  }
  return prefixed.slice(flag.length + 1);
}

function log(message: string) {
  const line = `${new Date().toISOString()} ${message}`;
  console.log(line);
  fs.appendFileSync(logFile, `${line}\n`, "utf8");
}

function resolvePath(relativePath: string): string {
  return path.resolve(repoRoot, relativePath);
}

function findIndexByName(list: MigrationEntry[], needle: string): number {
  return list.findIndex((entry) => {
    return entry.file === needle || path.basename(entry.file) === needle;
  });
}

async function shouldRunConditional(
  sql: postgres.Sql,
  entry: MigrationEntry
): Promise<{ run: boolean; reason?: string }> {
  if (entry.conditional !== "donatur-contact-rename") {
    return { run: true };
  }

  const rows = await sql<{
    column_name: string;
  }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'donatur'
      AND column_name IN ('whatsapp', 'whatsapp_number')
  `;

  const names = new Set(rows.map((row) => row.column_name));

  if (names.has("whatsapp") && !names.has("whatsapp_number")) {
    return { run: true };
  }

  if (!names.has("whatsapp") && names.has("whatsapp_number")) {
    return {
      run: false,
      reason: "kolom whatsapp sudah di-rename sebelumnya",
    };
  }

  if (names.has("whatsapp") && names.has("whatsapp_number")) {
    return {
      run: false,
      reason: "kolom whatsapp + whatsapp_number keduanya ada (butuh cek manual)",
    };
  }

  return {
    run: false,
    reason: "tabel/kolom donatur tidak sesuai pre-check",
  };
}

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL belum di-set.");
  }

  const list = mode === "fresh" ? [...BASELINE_FRESH, ...CORE_EXISTING] : [...CORE_EXISTING];
  stats.total = list.length;

  const fromIndex = fromArg ? findIndexByName(list, fromArg) : -1;
  const toIndex = toArg ? findIndexByName(list, toArg) : -1;

  if (fromArg && fromIndex < 0) {
    throw new Error(`--from tidak ditemukan di manifest: ${fromArg}`);
  }
  if (toArg && toIndex < 0) {
    throw new Error(`--to tidak ditemukan di manifest: ${toArg}`);
  }
  if (fromArg && toArg && fromIndex > toIndex) {
    throw new Error("--from berada setelah --to.");
  }

  log("=== Production Manifest Runner ===");
  log(`Mode: ${mode}`);
  log(`Include optional: ${includeOptional ? "yes" : "no"}`);
  log(`Dry run: ${dryRun ? "yes" : "no"}`);
  log(`Continue on error: ${continueOnError ? "yes" : "no"}`);
  log(`Log file: ${logFile}`);

  const sql = postgres(dbUrl, { max: 1 });
  let orderNo = 0;

  try {
    for (const entry of list) {
      orderNo += 1;

      const inFromRange = fromIndex < 0 || orderNo - 1 >= fromIndex;
      const inToRange = toIndex < 0 || orderNo - 1 <= toIndex;
      if (!inFromRange || !inToRange) {
        stats.skippedRange += 1;
        log(`[SKIP:RANGE] #${orderNo} ${entry.file}`);
        continue;
      }

      if (entry.optional && !includeOptional) {
        stats.skippedOptional += 1;
        log(`[SKIP:OPTIONAL] #${orderNo} ${entry.file}`);
        continue;
      }

      if (entry.conditional) {
        const conditional = await shouldRunConditional(sql, entry);
        if (!conditional.run) {
          stats.skippedConditional += 1;
          log(
            `[SKIP:CONDITIONAL] #${orderNo} ${entry.file} (${conditional.reason ?? "condition false"})`
          );
          continue;
        }
      }

      const absolutePath = resolvePath(entry.file);
      if (!fs.existsSync(absolutePath)) {
        const message = `[ERROR:MISSING] #${orderNo} ${entry.file} (file tidak ditemukan)`;
        log(message);
        stats.failed += 1;
        if (!continueOnError) {
          throw new Error(message);
        }
        continue;
      }

      const migrationSql = fs.readFileSync(absolutePath, "utf8");
      if (dryRun) {
        log(`[DRY-RUN] #${orderNo} ${entry.file}`);
        continue;
      }

      const start = Date.now();
      log(`[RUN] #${orderNo} ${entry.file}`);
      try {
        await sql.unsafe(migrationSql);
        const ms = Date.now() - start;
        stats.executed += 1;
        log(`[OK] #${orderNo} ${entry.file} (${ms} ms)`);
      } catch (error) {
        stats.failed += 1;
        const message =
          error instanceof Error ? error.message : "unknown migration error";
        log(`[FAIL] #${orderNo} ${entry.file} (${message})`);
        if (!continueOnError) {
          throw error;
        }
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  log("=== Summary ===");
  log(`Total manifest entries: ${stats.total}`);
  log(`Executed: ${stats.executed}`);
  log(`Skipped optional: ${stats.skippedOptional}`);
  log(`Skipped conditional: ${stats.skippedConditional}`);
  log(`Skipped by range: ${stats.skippedRange}`);
  log(`Failed: ${stats.failed}`);

  if (stats.failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  log(`[FATAL] ${message}`);
  process.exit(1);
});
