import type { Metadata } from "next";
import { Inter, Playfair_Display, Luckiest_Guy, Noto_Sans_Thai, Mitr } from "next/font/google";
import localFont from "next/font/local";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700"] });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", weight: ["400", "500", "600", "700"] });
const luckiestGuy = Luckiest_Guy({ subsets: ["latin"], variable: "--font-luckiest-guy", weight: ["400"] });
// Thai text: Noto Sans Thai for reading, Mitr for headings (Inter and Luckiest Guy have no Thai letters).
const notoThai = Noto_Sans_Thai({ subsets: ["thai"], variable: "--font-thai", weight: ["400", "500", "600", "700"] });
const mitr = Mitr({ subsets: ["thai", "latin"], variable: "--font-mitr", weight: ["400", "500", "600"] });
const avermont = localFont({ src: "../public/fonts/AvermontHouse_PERSONAL_USE_ONLY.otf", variable: "--font-avermont" });
const roasted = localFont({ src: "../public/fonts/RoastedKetchup.ttf", variable: "--font-roasted" });

export const metadata: Metadata = {
  title: "RESTAURANT - English Game",
  description: "Learn English conversation through restaurant scenarios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${avermont.variable} ${roasted.variable} ${luckiestGuy.variable} ${notoThai.variable} ${mitr.variable} font-sans antialiased bg-stone-50 text-stone-900 min-h-screen overflow-x-hidden selection:bg-amber-200`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
