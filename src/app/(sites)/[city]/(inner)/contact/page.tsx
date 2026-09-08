import type { Metadata } from "next";
import Breadcrumbs from "@/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/data/breadcrumbs";
import { cityFromParams, type CityParams } from "@/content/city-param";
import { citySlug } from "@/content/interpolate";
import { contactData } from "@/data/contact";
import ContactHeader from "@/components/contact/ContactHeader";
import ContactFormDisplay from "@/components/contact/ContactFormDisplay";
import ContactMap from "@/components/contact/ContactMap";
import ContactInfo from "@/components/contact/ContactInfo";

// the city is resolved per request, never at module scope
export async function generateMetadata({
  params,
}: {
  params: CityParams;
}): Promise<Metadata> {
  const { contactMeta } = contactData(await cityFromParams(params));
  return {
    title: contactMeta.title,
    description: contactMeta.description,
  };
}

// post-34.css c5d4ce7: gradient #EEF7F4 15% / white, padding 0 0 9.6rem / 0 1rem 4rem / 0 1rem 3rem; the row is one rounded
// card spanning the full 119rem (no .ec gutter; it lives inside the column paddings). Columns stack at 767, not 1024.
// left 2e9a1fb: white, border-y border-l #E5E7EB, padding 4.8rem / 2rem. right 15f9315: #ECF9F9, border-y border-r, padding 2.4rem / 2rem.
export default async function ContactPage({ params }: { params: CityParams }) {
  const c = await cityFromParams(params);
  const {
    contactHeader,
    contactFields,
    contactSubmitLabel,
    contactMap,
    contactInfo,
    contactResult,
  } = contactData(c);
  return (
    <>
      <Breadcrumbs trail={breadcrumbs(c, { kind: "page", label: "Contact", path: "/contact" })} />
      <ContactHeader variant="banner" contactHeader={contactHeader} />
      <section className="bg-[linear-gradient(180deg,#EEF7F4_15%,#FFFFFF_15%)] px-[1rem] pb-[3rem] md:pb-[4rem] lg:px-0 lg:pb-[9.6rem]">
        <div className="mx-auto max-w-[119rem]">
          <div className="flex flex-col overflow-hidden rounded-[4px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] md:flex-row">
            <div className="w-full border-y border-l border-[#E5E7EB] bg-white p-[2rem] md:w-1/2 lg:p-[4.8rem]">
              <ContactHeader variant="form" contactHeader={contactHeader} />
              <ContactFormDisplay
                cityKey={citySlug(c.city)}
                contactFields={contactFields}
                contactSubmitLabel={contactSubmitLabel}
                contactResult={contactResult}
              />
            </div>
            <div className="w-full border-y border-r border-[#E5E7EB] bg-[#ECF9F9] p-[2rem] md:w-1/2 lg:p-[2.4rem]">
              <ContactMap contactMap={contactMap} />
              <ContactInfo contactInfo={contactInfo} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
