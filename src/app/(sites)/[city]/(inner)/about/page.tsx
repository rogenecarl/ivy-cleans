import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/inner/Breadcrumbs";
import JsonLd from "@/components/JsonLd";
import { reviewDate } from "@/components/Reviews";
import { breadcrumbs } from "@/data/breadcrumbs";
import { aboutData, aboutReady } from "@/data/about";
import { localBusinessJsonLd } from "@/data/structured-data";
import { cityFromParams, type CityParams } from "@/content/city-param";

// Who Ivy Cleans is in this city. Rendered from the operator's facts; 404 until the gate facts exist (see aboutReady).
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: CityParams }): Promise<Metadata> {
  const c = await cityFromParams(params);
  if (!aboutReady(c.ops)) return {};
  return aboutData(c).meta;
}

const SECTION = "mb-[5rem] last:mb-0";
const H2 = "text-herogreen mb-[2.4rem] text-center text-[2.2rem] leading-[1.2em] font-semibold md:text-[2.6rem]";
// cards wrap and center, so a row of two sits in the middle instead of leaving a hole on the right
const CARD = "w-full sm:w-[calc(50%-0.8rem)] lg:w-[calc(33.333%-1.1rem)]";
// photo tiles by how many there are: one photo fills the column, two or four sit in pairs, anything else in threes
function photoTile(count: number): string {
  if (count === 1) return "w-full max-w-[76rem]";
  if (count === 2 || count === 4) return "w-full sm:w-[calc(50%-0.8rem)] lg:max-w-[46rem]";
  return CARD;
}

export default async function AboutPage({ params }: { params: CityParams }) {
  const c = await cityFromParams(params);
  if (!aboutReady(c.ops)) notFound();
  const about = aboutData(c);

  return (
    <>
      <Breadcrumbs trail={breadcrumbs(c, { kind: "page", label: "About Us", path: "/about" })} />
      <section className="bg-[#EEF7F4] pt-[2rem] pb-[1rem] md:pt-[3rem] md:pb-[2rem] lg:pt-[8.6rem] lg:pb-[3.8rem]">
        <div className="ec">
          <h3 className="text-rust mb-[1.5rem] text-[1.6rem] leading-[1.2em] font-semibold uppercase">About Us</h3>
          <h1 className="text-herogreen text-[2.5rem] leading-[1.2em] font-semibold md:text-[2.8rem] lg:text-[3.6rem]">
            {about.h1}
          </h1>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#EEF7F4_20%,#FFFFFF_20%)] px-[1rem] pb-[3rem] md:pb-[4rem] lg:px-0 lg:pb-[9.6rem]">
        <div className="mx-auto max-w-[119rem]">
          <div className="rounded-[4px] border border-[#86C6B0] bg-white pt-[2rem] pr-[2rem] pb-[2rem] pl-[2rem] md:pt-[3rem] md:pr-[3rem] md:pb-[3rem] md:pl-[3rem] lg:pt-[4.8rem] lg:pr-[4.8rem] lg:pb-[4.8rem] lg:pl-[4.8rem]">
            {about.facts.length > 0 && (
              <dl className={`${SECTION} grid gap-[1.6rem] sm:grid-cols-3`}>
                {about.facts.map((fact) => (
                  <div key={fact.label} className="rounded-[4px] bg-[#EEF7F4] px-[2rem] py-[2.4rem] text-center">
                    <dd className="m-0 text-[3.2rem] leading-[1.1em] font-semibold text-herogreen">{fact.value}</dd>
                    <dt className="mt-[0.8rem] text-[1.3rem] leading-[1.4em] font-semibold tracking-wide text-[#555] uppercase">{fact.label}</dt>
                  </div>
                ))}
              </dl>
            )}

            {about.story && (
              <div className={`${SECTION} mx-auto max-w-[76rem]`}>
                {about.story.map((paragraph, i) => (
                  <p key={i} className="mb-[2rem] text-center text-[1.8rem] leading-[1.7em] text-[#374151] last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            <div className={`${SECTION} mx-auto flex max-w-[84rem] flex-col items-center gap-[2.4rem] md:flex-row md:justify-center`}>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[4px] md:w-[36rem] md:shrink-0">
                <Image
                  src={about.crew.photo.path}
                  alt={about.crew.photo.alt}
                  fill
                  unoptimized={about.crew.placeholder}
                  sizes="(max-width: 768px) 100vw, 360px"
                  className="object-cover"
                />
              </div>
              <div className="text-center md:text-left">
                <h2 className={`${H2} md:text-left`}>The {c.city} crew</h2>
                <p className="m-0 text-[1.8rem] leading-[1.6em] text-[#374151]">
                  {about.crew.lead ? (
                    <>
                      <span className="font-semibold">{about.crew.lead}</span> leads the {c.city} crew
                      {c.ops?.crewSize !== undefined ? ` of ${c.ops.crewSize}` : ''}.
                    </>
                  ) : (
                    <>The people who clean your home are our own crew, not contractors.</>
                  )}
                </p>
              </div>
            </div>

            {about.reviews.length > 0 && (
              <div className={SECTION}>
                <h2 className={H2}>What people in {c.city} say</h2>
                <ul className="m-0 flex list-none flex-wrap justify-center gap-[1.6rem] p-0">
                  {about.reviews.map((r, i) => (
                    <li key={i} className={`${CARD} flex flex-col gap-[1.2rem] rounded-[4px] bg-[#f4f4f4] p-[2.4rem]`}>
                      <blockquote className="m-0 flex-1 text-[1.6rem] leading-[1.6em] text-[#222]">&ldquo;{r.quote}&rdquo;</blockquote>
                      <p className="m-0 text-[1.4rem] leading-[1.5em] text-[#555]">
                        <span className="font-bold text-[#374151]">{r.firstName}</span>, {r.area}
                        {r.date ? ` · ${reviewDate(r.date)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {about.photos.length > 0 && (
              <div className={SECTION}>
                <h2 className={H2}>Our work in {c.city}</h2>
                <ul className="m-0 flex list-none flex-wrap justify-center gap-[1.6rem] p-0">
                  {about.photos.map((photo) => (
                    <li key={photo.path} className={photoTile(about.photos.length)}>
                      <figure className="m-0">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-[4px]">
                          <Image src={photo.path} alt={photo.alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                        </div>
                        <figcaption className="mt-[0.8rem] text-[1.4rem] leading-[1.5em] text-[#555]">{photo.alt}</figcaption>
                      </figure>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className={`${SECTION} text-center`}>
              <h2 className={H2}>Get in touch</h2>
              <p className="m-0 text-[1.6rem] leading-[1.7em] text-[#374151]">
                <a href={about.contact.phoneHref} className="text-link">
                  {about.contact.phone}
                </a>
                {about.contact.address && (
                  <>
                    <br />
                    {about.contact.address}
                  </>
                )}
              </p>
              <div className="mt-[2.4rem] flex flex-wrap justify-center gap-[1.2rem]">
                <Link
                  href={about.contact.bookHref}
                  className="inline-block rounded-[5px] border border-[#397963] bg-[#397963] px-[2.4rem] py-[1.1rem] text-[1.6rem] leading-[1.2em] font-bold text-white uppercase transition-colors hover:bg-white hover:text-[#397963]"
                >
                  Book Now
                </Link>
                <Link
                  href={about.contact.contactHref}
                  className="inline-block rounded-[5px] border border-[#397963] px-[2.4rem] py-[1.1rem] text-[1.6rem] leading-[1.2em] font-bold text-[#397963] uppercase transition-colors hover:bg-[#397963] hover:text-white"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <JsonLd data={localBusinessJsonLd(c)} />
    </>
  );
}
