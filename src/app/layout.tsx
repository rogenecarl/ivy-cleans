import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

// no title/description here: metadata shallow-merges per key, so a page without its own would inherit these
// (/book-now deliberately has no description). Every page.tsx sets its own.
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
