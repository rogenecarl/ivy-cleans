import type { ReactNode } from "react";
import { listLiveCityKeys } from "@/content/store";

// The [city] segment owns the multi-tenant tree and is the only place that can enumerate cities for the build;
// child segments inherit its params. Renders children untouched — it must not add a byte to any page.
export async function generateStaticParams() {
  const keys = await listLiveCityKeys();
  return keys.map((city) => ({ city }));
}

// drafts are not prebuilt but must render on demand at /<cityKey>: that URL is the preview
export const dynamicParams = true;

export default function CityLayout({ children }: { children: ReactNode }) {
  return children;
}
