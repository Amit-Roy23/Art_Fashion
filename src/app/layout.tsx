import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/Providers";
import "./globals.css";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"], variable: "--font-cormorant" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Aurum BMS — Jewellery Manufacturing Suite",
  description: "Orders, karigar work orders, production stages, outside job work, weights, photos and deliveries for jewellery manufacturers.",
};

export const viewport: Viewport = {
  themeColor: "#0c080a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved theme before first paint to avoid a flash.
const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem("aurum-theme")||"noir"}catch(e){document.documentElement.dataset.theme="noir"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="noir" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <div className="atelier-bg" aria-hidden />
        <Providers>{children}</Providers>
        <Toaster position="top-center" theme="system" richColors closeButton toastOptions={{ className: "!rounded-2xl" }} />
      </body>
    </html>
  );
}
