import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

// Use Inter for clean, readable body text
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap", // Optimize correct font loading
});

// Use Oswald for bold, condensed headings (like jersey numbers)
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PitchSide - Premier Soccer Booking",
  description: "Find and book pickup soccer games in Northwest Chicago.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon2-192x192.png",
    apple: "/icon2-512x512.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PitchSide"
  }
};

import { ToastProvider } from "@/components/ui/Toast";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${oswald.variable} antialiased bg-pitch-black text-white`}
      >
        <ToastProvider>
          <Navbar />
          {children}

        </ToastProvider>
      </body>
    </html>
  );
}
