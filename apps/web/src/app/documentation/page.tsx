import { notFound } from "next/navigation";
import DocumentationView from "./DocumentationView";
import { getDefaultDocumentationSlug } from "@/lib/documentation";

export default function DocumentationIndexPage() {
  const defaultSlug = getDefaultDocumentationSlug();

  if (!defaultSlug) {
    notFound();
  }

  return <DocumentationView slug={defaultSlug} />;
}
