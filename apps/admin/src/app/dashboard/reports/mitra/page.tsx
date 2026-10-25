import { redirect } from "next/navigation";

/** Dipindah ke grup Keuangan (ADR-0016); URL lama diteruskan agar tautan/bookmark tetap jalan. */
export default function LegacyMitraReportRedirect() {
  redirect("/dashboard/cashbook/mitra");
}
