import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Sustains Energy", // ✅ Updated title
  description: "Energy insights and tools for a sustainable future", // ✅ Updated description
};

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" suppressHydrationWarning>
      <body
          className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col antialiased bg-white dark:bg-gray-900 text-black dark:text-white`}
      >
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 w-full">
          <div className="w-full">
            <h1 className="text-2xl font-bold mb-4 px-4 py-2">
              <Link href="/">Sustains Energy</Link> {/* ✅ Updated header */}
            </h1>
            {children} {/* ✅ Children without MotherDuck */}
          </div>
        </main>
        <footer className="justify-center border-t text-center text-xs gap-8 py-4 bg-white dark:bg-gray-900">
          <p>
            Powered by{" "}
            <a href="https://sustains.in" className="font-bold hover:underline" rel="noreferrer">
              Sustains.in
            </a> {/* ✅ Updated footer */}
          </p>
        </footer>
      </div>
      </body>
      </html>
  );
}