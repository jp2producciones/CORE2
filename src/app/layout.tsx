import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/pwa-register";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CORE 2 — Sistema de Producción Audiovisual",
  description: "Sistema nervioso central de producción audiovisual",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1A1A1A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="h-full bg-[#F9FAFB] font-[family-name:var(--font-geist)] text-[#111] antialiased">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
