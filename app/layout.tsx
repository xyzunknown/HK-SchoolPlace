import type { Metadata, Viewport } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ToastContainer } from "@/components/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "學位通 — 香港學校學位查詢",
    template: "%s | 學位通",
  },
  description: "幫助家長快速搵到有學位嘅幼稚園、小學同中學。每日自動更新學位空缺資料。",
  keywords: ["香港學校", "學位空缺", "幼稚園學位", "K1學位", "插班", "轉校"],
  openGraph: {
    title: "學位通 — 香港學校學位查詢",
    description: "幫助家長快速搵到有學位嘅學校",
    locale: "zh_HK",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-HK">
      <body>
        <Navbar />
        <div className="app-content">
          {children}
        </div>
        <Footer />
        <ToastContainer />
      </body>
    </html>
  );
}
