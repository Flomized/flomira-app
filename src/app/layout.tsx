import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BusinessSettingsProvider from "@/components/BusinessSettingsProvider";
import NavigationTransition from "@/components/NavigationTransition";
import WhatsAppButton from "@/components/WhatsAppButton";
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
  title: "FLOMIRA",
  description: "A rose-gold cake experience with thoughtful plans for beautiful celebrations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BusinessSettingsProvider>
          {children}
          <NavigationTransition />
          <WhatsAppButton />
        </BusinessSettingsProvider>
      </body>
    </html>
  );
}
