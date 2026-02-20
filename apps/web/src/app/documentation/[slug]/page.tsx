import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DocumentationView from "../DocumentationView";
import { getAllDocumentationSlugs, getDocumentationPageBySlug } from "@/lib/documentation";

interface DocumentationSlugPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return getAllDocumentationSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: DocumentationSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getDocumentationPageBySlug(slug);

  if (!page) {
    return {
      title: "Dokumentasi",
    };
  }

  return {
    title: `${page.title} | Dokumentasi`,
    description: page.summary || "Dokumentasi operasional aplikasi Bantuanku.",
  };
}

export default async function DocumentationSlugPage({
  params,
}: DocumentationSlugPageProps) {
  const { slug } = await params;
  const page = getDocumentationPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return <DocumentationView slug={slug} />;
}
