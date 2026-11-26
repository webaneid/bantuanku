import { NextResponse } from "next/server";
import { getAllDocumentationSlugs, getDocumentationPageBySlug } from "@/lib/documentation";

// Indeks pencarian dokumentasi: dibangun dari konten statis saat build, di-fetch klien saat kotak cari dipakai.
export const dynamic = "force-static";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function GET() {
  const entries = getAllDocumentationSlugs().flatMap((slug) => {
    const page = getDocumentationPageBySlug(slug);
    if (!page) return [];
    return [
      {
        slug,
        title: page.title,
        summary: page.summary || "",
        sections: page.sections.map((s) => ({
          id: s.id,
          heading: s.heading,
          text: stripHtml(s.bodyHtml),
        })),
      },
    ];
  });
  return NextResponse.json(entries);
}
