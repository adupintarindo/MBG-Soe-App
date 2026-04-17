import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MBG Soe · Supply Chain",
  description:
    "Dashboard Rantai Pasok MBG · SPPG Nunumeu, Soe · WFP × IFSR × FFI",
  applicationName: "MBG Soe Supply Chain",
  authors: [
    { name: "Alfatehan Septianta", url: "https://ifsr.or.id" },
    { name: "IFSR × FFI × WFP" }
  ],
  keywords: [
    "MBG",
    "Soe",
    "SPPG Nunumeu",
    "WFP",
    "IFSR",
    "FFI",
    "Supply Chain",
    "NTT"
  ]
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b2e4f"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
