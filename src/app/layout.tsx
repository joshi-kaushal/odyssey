import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/common/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Odyssey",
  description: "The dream application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} container`}>
        <Navbar />
        {children}
      </body>
      <Toaster richColors />
    </html>
  );
}
