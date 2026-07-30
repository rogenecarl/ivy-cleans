import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import "./globals.css";

const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway" });

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
    <html lang="en-US" className={raleway.variable}>
      <body>
        <TopBar />
        <Header />
        {children}
      </body>
    </html>
  );
}
