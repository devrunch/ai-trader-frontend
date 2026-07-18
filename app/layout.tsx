import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AITrader — AI-Powered Trading Signals for NSE & BSE",
  description:
    "Real-time buy/sell signals powered by Claude AI, FinBERT news sentiment, and 8+ technical indicators. Connect your broker and trade smarter.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full`}>
      <body
        className="min-h-full flex flex-col bg-[#f8f9fa] text-[#1a1a1a]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
