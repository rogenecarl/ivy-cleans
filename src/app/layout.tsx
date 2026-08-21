import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

/*
 * No title/description here: Next.js shallow-merges metadata per key across
 * layout -> page, so a page that omits `description` INHERITS whatever the
 * nearest ancestor layout set (docs: generate-metadata.md "Following the
 * evaluation order, Metadata objects exported from multiple segments in the
 * same route are shallowly merged... Duplicate keys are replaced"). The
 * root layout previously carried the homepage's own title+description,
 * which every other page silently inherited unless it set its own — that's
 * exactly how /book-now ended up rendering the homepage's <meta
 * name="description">, since /book-now deliberately sets no description
 * (live has none). The homepage's title+description now live on
 * src/app/(sites)/[city]/(front)/page.tsx instead, so the root layout is
 * left with none:
 * every route must set its own metadata (all 11 page.tsx files do).
 */
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
