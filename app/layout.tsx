import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PrefsProvider } from "@/lib/prefs-context";

const PREFS_INIT_SCRIPT = `(() => {
  try {
    var t = localStorage.getItem('mbg-theme');
    var l = localStorage.getItem('mbg-lang');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var r = document.documentElement;
    if (t === 'dark') r.classList.add('dark'); else r.classList.remove('dark');
    r.style.colorScheme = t;
    r.setAttribute('lang', l === 'EN' ? 'en' : 'id');
  } catch (e) {}
})();`;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

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
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: PREFS_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-screen bg-paper text-ink antialiased dark:bg-d-bg dark:text-d-text">
        <PrefsProvider>{children}</PrefsProvider>
      </body>
    </html>
  );
}
