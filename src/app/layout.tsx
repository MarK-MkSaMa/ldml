import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LDML 大模型排行榜",
  description: "由 Linux DO 社区用户投票产生的大模型排行榜",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Script
          defer
          src="https://umami.zhouyihub.com/script.js"
          data-website-id="dcf38d5b-4356-4b8e-9f57-f68a9b2989bf"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
