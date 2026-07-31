import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "House Cleaning Service in Minneapolis Minnesota - Ivy Cleans",
  description:
    "As a local and insured business, Ivy Cleans is thrilled to be providing cleaning and janitorial services across various areas of Minneapolis. Our experienced",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-US" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
