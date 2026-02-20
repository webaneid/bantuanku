import { documentationManifest } from "@/content/documentation/manifest";
import { documentationPages } from "@/content/documentation/pages";
import type { DocumentationPage } from "@/content/documentation/types";

export function getDocumentationManifest() {
  return documentationManifest;
}

export function getDocumentationPageBySlug(slug: string): DocumentationPage | null {
  return documentationPages[slug] || null;
}

export function getDefaultDocumentationSlug(): string | null {
  const firstCategory = documentationManifest.categories[0];
  if (!firstCategory || firstCategory.items.length === 0) return null;
  return firstCategory.items[0].slug;
}

export function getAllDocumentationSlugs(): string[] {
  return documentationManifest.categories.flatMap((category) =>
    category.items.map((item) => item.slug)
  );
}
