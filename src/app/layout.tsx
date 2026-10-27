import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BMS — Jewellery Order & Production Manager",
  description:
    "Production-grade jewellery order tracking, artisan work orders, outside job work, and delivery management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full flex flex-col`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
