import "dotenv/config";
import { activityReports, asc, desc, eq } from "../src/index.js";
import { closeDb, createDb } from "../src/client.js";

type ReportRow = typeof activityReports.$inferSelect;

function slugifyTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function resolveFrontendUrl(): string {
  return (
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://bantuanku.org"
  ).replace(/\/+$/, "");
}

function groupKey(report: ReportRow): string {
  return [
    report.referenceType || "",
    report.referenceId || "",
    slugifyTitle(report.title || ""),
  ].join("::");
}

function choosePreferredReport(reports: ReportRow[]): ReportRow {
  const normalized = slugifyTitle(reports[0]?.title || "");
  const exactSlug = reports.find((report) => report.slug === normalized);
  if (exactSlug) return exactSlug;

  return [...reports].sort((a, b) => {
    const aPublished = a.publishedAt ? new Date(a.publishedAt).getTime() : Number.POSITIVE_INFINITY;
    const bPublished = b.publishedAt ? new Date(b.publishedAt).getTime() : Number.POSITIVE_INFINITY;
    if (aPublished !== bPublished) return aPublished - bPublished;

    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : Number.POSITIVE_INFINITY;
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : Number.POSITIVE_INFINITY;
    return aCreated - bCreated;
  })[0];
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const apply = process.argv.includes("--apply");

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const frontendUrl = resolveFrontendUrl();

  const reports = await db.query.activityReports.findMany({
    where: eq(activityReports.status, "published"),
    orderBy: [asc(activityReports.referenceType), asc(activityReports.referenceId), desc(activityReports.publishedAt), desc(activityReports.createdAt)],
  });

  const grouped = new Map<string, ReportRow[]>();
  for (const report of reports) {
    const key = groupKey(report);
    const bucket = grouped.get(key) || [];
    bucket.push(report);
    grouped.set(key, bucket);
  }

  const duplicateGroups = Array.from(grouped.values()).filter((group) => group.length > 1);

  console.log(`Published reports scanned: ${reports.length}`);
  console.log(`Duplicate groups found: ${duplicateGroups.length}`);

  for (const group of duplicateGroups) {
    const preferred = choosePreferredReport(group);
    const canonicalUrl = `${frontendUrl}/laporan/${preferred.slug}`;
    const duplicates = group.filter((report) => report.id !== preferred.id);

    console.log("");
    console.log(`Canonical: ${preferred.slug} (${preferred.title})`);

    for (const duplicate of duplicates) {
      console.log(`  duplicate -> ${duplicate.slug}`);

      if (!apply) continue;

      await db
        .update(activityReports)
        .set({
          canonicalUrl,
          noIndex: true,
          updatedAt: new Date(),
        })
        .where(eq(activityReports.id, duplicate.id));
    }
  }

  if (!apply) {
    console.log("");
    console.log("Dry run only. Re-run with --apply to mark duplicates as noindex and set canonicalUrl.");
  }

  closeDb();
}

main().catch((error) => {
  console.error(error);
  closeDb();
  process.exit(1);
});
