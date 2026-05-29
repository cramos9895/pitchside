import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";
import "@/styles/calendar.css";
import { Navbar } from "@/components/Navbar";

export const dynamic = 'force-dynamic';

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
import { Footer } from "@/components/layout/Footer";
import { headers } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read pathname from middleware to conditionally hide components server-side
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isProjector = pathname.endsWith('/live') || pathname.includes('/display');

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${oswald.variable} antialiased bg-pitch-black text-white`}
      >
        <ToastProvider>
          {!isProjector && <Navbar />}
          {children}
          {!isProjector && <Footer />}
        </ToastProvider>
      </body>
    </html>
  );
}
