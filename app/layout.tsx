import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fisheries Quota Exchange",
  description: "FQX development environment is operational.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
