// One structured-data block. `<` is escaped so no field can close the script tag.
export default function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (data === null) return null;
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
