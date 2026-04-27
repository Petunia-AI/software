import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PWARegister } from "@/components/pwa-register";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#6B8BFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Petunia AI — Agente de Ventas",
  description: "Plataforma de IA conversacional para automatizar ventas en LATAM",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Petunia AI",
  },
  icons: {
    icon: [
      { url: "/favicon petunia.png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <PWARegister />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
