import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// ⚡ Κλειδώνει το Zoom και δίνει χρώμα στην top bar του κινητού
export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
};

// ⚡ Συνδέει το Manifest και ορίζει την συμπεριφορά ως Native Apple App
export const metadata: Metadata = {
  title: "AQUA OS",
  description: "Interactive Order System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AQUA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el">
      <body className={inter.className}>{children}</body>
    </html>
  );
}