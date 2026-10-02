import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IVEVAR Books",
  description: "Orders, payments, purchases, expenses and cash for IVEVAR",
  appleWebApp: { capable: true, title: "IVEVAR", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
