import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const body = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trame, des QR codes qui te ressemblent",
  description:
    "Compose ton QR code aux couleurs de ton commerce, paie 2 000 F par Mobile Money et repars avec tes fichiers PNG et SVG.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBFBFA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
