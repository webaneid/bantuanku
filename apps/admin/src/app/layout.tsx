import type { Metadata } from "next";
import "../styles/main.scss";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Bantuanku Admin Dashboard",
  description: "Admin dashboard for managing campaigns, donations, and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
