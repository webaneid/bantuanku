import type { Metadata } from "next";
import "../styles/main.scss";
import { Providers } from "./providers";
import { fetchBrandCss } from "@/lib/brand-server";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin dashboard for managing campaigns, donations, and more",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brandStyle = await fetchBrandCss();

  return (
    <html lang="id" data-scroll-behavior="smooth">
      <head>
        <style id="brand-colors" dangerouslySetInnerHTML={{ __html: brandStyle }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
