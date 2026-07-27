import type { Metadata } from "next";
import { Inter, Geist_Mono, Fraunces, Poppins } from "next/font/google";
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

/* The chart draws its own text on a canvas, so it cannot inherit a CSS font —
   it has to be handed a family name that is already loaded. Declared here so
   the browser has it before the first frame is painted. */
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  // A template, so every route can name itself. The whole app previously
  // shared one title, which made browser tabs and shared links indistinguishable.
  title: {
    default: "AITrader — AI market analysis and paper trading for NSE & BSE",
    template: "%s · AITrader",
  },
  // Describes what the product does, not what it might earn. It analyses and
  // paper trades; it does not connect to a broker, and its measured accuracy is
  // published rather than claimed.
  description:
    "AI analysis of Indian equities with live technical indicators and news sentiment, plus paper trading with a measured, published track record. Analysis, not investment advice.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${geistMono.variable} ${fraunces.variable} ${poppins.variable}`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
