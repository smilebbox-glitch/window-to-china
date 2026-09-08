import type { Metadata, Viewport } from "next";
import { SiteShell } from "@/components/site-shell";
import { UsageBeacon } from "@/components/usage-beacon";
import { PwaInstallButton } from "@/components/pwa-install-button";
import "./globals.css";

export const metadata: Metadata = {
  title: "Окно в Китай — автопром России и Китая",
  description:
    "Новости SHACMAN и Great Wall Motor, автомобильные выставки, поставщики и карта отрасли России и Китая.",
  applicationName: "Окно в Китай",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Окно в Китай",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "codex-preview": "development",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1d54",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <UsageBeacon />
        <PwaInstallButton />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
