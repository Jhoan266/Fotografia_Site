import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import "./editorial-refresh.css";
import "./photography-workspaces.css";
import "./typography.css";

// Keep the existing CSS tokens so saved editorial preferences remain compatible.
const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const headingFont = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vera Solís — Fotografía",
  description: "Fotografía de bodas, sesiones y book profesional en Barcelona.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
