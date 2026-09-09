import Link from "next/link";
import type { SlotLink } from "@/content/types";
import { linkify } from "@/content/links";

// A generated paragraph with its accepted prose links rendered as anchors.
export default function Linked({ text, links }: { text: string; links?: readonly SlotLink[] }) {
  if (!links || links.length === 0) return <>{text}</>;
  return (
    <>
      {linkify(text, links).map((segment, i) =>
        typeof segment === "string" ? (
          segment
        ) : (
          <Link key={i} href={segment.href} className="hover:text-rust underline decoration-1 underline-offset-4">
            {segment.text}
          </Link>
        ),
      )}
    </>
  );
}
