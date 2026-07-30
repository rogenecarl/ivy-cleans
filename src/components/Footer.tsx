import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/site";
import { ChevronRightIcon, EnvelopeIcon, MapMarkerIcon, PhoneIcon } from "./Icons";

/* live footer headings: 2rem/500 on mobile, 2.4rem/500 from the desktop breakpoint up */
const headingClass = "text-[2rem] leading-[1.2em] font-medium lg:text-[2.4rem]";
const dividerClass = "my-[2rem] border-t border-white";
const itemClass = "flex items-start gap-[0.6rem] pb-[0.75rem] text-[1.6rem] leading-[1.2em] font-medium";
const iconClass = "mt-[0.2rem] h-[1.6rem] w-[1.6rem] shrink-0";

export default function Footer() {
  return (
    <footer className="bg-brand py-[1rem] text-white md:py-[2rem] lg:py-[5rem]">
      <div className="ec">
        {/*
          live footer row (post-2342.css, >=768px): four columns at
          17.769% / 23.462% / 29.768% / 29.001%, each with elementor's 10px widget-wrap padding.
        */}
        <div className="mb-[4rem] flex flex-wrap gap-y-[2rem]">
          <div className="w-full px-[10px] md:w-[17.769%]">
            <Image
              src="/images/Logo-footer.png"
              alt="Ivy Cleans"
              width={165}
              height={84}
              className="h-auto w-[133px]"
            />
          </div>
          <div className="w-full px-[10px] md:w-[23.462%]">
            <h3 className={headingClass}>Contact</h3>
            <div className={dividerClass} />
            <ul>
              <li className={itemClass}>
                <PhoneIcon className={iconClass} />
                <a href={site.phoneHref}>{site.phone}</a>
              </li>
              <li className={itemClass}>
                <EnvelopeIcon className={iconClass} />
                <a href={`mailto:${site.email}`}>{site.email.toLowerCase()}</a>
              </li>
              <li className={itemClass}>
                <MapMarkerIcon className={iconClass} />
                <span className="font-bold">{site.address}</span>
              </li>
            </ul>
          </div>
          <div className="w-full px-[10px] md:w-[29.768%]">
            {/* live: this heading + rule are inset a further 25px inside their column; the list is not */}
            <h3 className={`${headingClass} md:mx-[25px]`}>Quick Links</h3>
            <div className={`${dividerClass} md:mx-[25px]`} />
            <ul>
              {[
                { label: "Home", href: "/" },
                { label: "Blog", href: "/blog" },
                { label: "Contact", href: "/contact" },
                { label: "FAQ", href: "/faq" },
              ].map((l) => (
                <li key={l.href} className={itemClass}>
                  <ChevronRightIcon className={iconClass} />
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full px-[10px] md:w-[29.001%]">
            <h3 className={headingClass}>Get In Touch</h3>
            <div className={dividerClass} />
            <div className="grid max-w-[24rem] grid-cols-3 gap-y-[2rem]">
              {site.socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener"
                  aria-label={s.label}
                  className="flex items-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.icon} alt="" width={28} height={28} className="h-[2.8rem] w-[2.8rem] invert" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
