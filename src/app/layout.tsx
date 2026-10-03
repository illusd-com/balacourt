import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BalaCourt | 巴拉國線上AI法廳",
  description: "巴拉國線上AI法廳 — 公正、透明、智慧審判。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body className={`${publicSans.className} antialiased`}>
        <a href="#main" className="skip-link">跳至主要內容</a>
        <Header />
        <main id="main" style={{ minHeight: "calc(100vh - 180px)" }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
