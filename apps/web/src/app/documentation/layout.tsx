import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dokumentasi",
  description: "Dokumentasi dan tutorial operasional aplikasi Bantuanku.",
};

export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
