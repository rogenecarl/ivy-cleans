import Image from "next/image";
import Link from "next/link";
import { site, innerSite } from "@/data/site";
import { EnvelopeIcon, MapMarkerIcon, PhoneIcon } from "@/components/Icons";

const headingClass = "text-[2rem] leading-[1.2em] font-medium lg:text-[2.4rem]";
const dividerClass = "my-[2rem] border-t border-white/20";
const itemClass = "flex items-start gap-[0.6rem] pb-[0.75rem] text-[1.6rem] leading-[1.2em] font-medium";
const iconClass = "mt-[0.2rem] h-[1.6rem] w-[1.6rem] shrink-0";
const linkListClass = "block pb-[0.75rem] text-[1.6rem] leading-[1.2em] font-medium hover:opacity-80";

export default function InnerFooter() {
  return (
    <footer className="bg-[#1a1a1a] py-[3rem] text-white lg:py-[5rem]">
      {/* top block: logo / Services / Company / copyright */}
      <div className="ec mb-[3rem] flex flex-wrap gap-y-[2rem] border-b border-white/10 pb-[3rem]">
        <div className="w-full px-[10px] md:w-[25%]">
          <Image
            src="/images/Logo.png"
            alt="Ivy Cleans"
            width={309}
            height={149}
            className="h-auto w-[13.3rem]"
          />
        </div>
        <div className="w-full px-[10px] md:w-[25%]">
          <h3 className={headingClass}>Services</h3>
          <div className={dividerClass} />
          <ul>
            {innerSite.servicesLinks.map((l) => (
              <li key={l.label} className="pb-[0.75rem]">
                <Link href={l.href} className={linkListClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full px-[10px] md:w-[25%]">
          <h3 className={headingClass}>Company</h3>
          <div className={dividerClass} />
          <ul>
            {innerSite.companyLinks.map((l) => (
              <li key={l.label} className="pb-[0.75rem]">
                <Link href={l.href} className={linkListClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full px-[10px] md:w-[25%]">
          <p className="text-[1.6rem] leading-[1.2em] font-medium">{innerSite.copyright}</p>
        </div>
      </div>

      {/* second block: logo / contact / links / get in touch */}
      <div className="ec mb-[3rem] flex flex-wrap gap-y-[2rem] border-b border-white/10 pb-[3rem]">
        <div className="w-full px-[10px] md:w-[33%]">
          <Image
            src="/images/Logo.png"
            alt="Ivy Cleans"
            width={309}
            height={149}
            className="mb-[2rem] h-auto w-[13.3rem]"
          />
          <ul>
            <li className={itemClass}>
              <PhoneIcon className={iconClass} />
              <a href={innerSite.phoneHref}>{innerSite.phone}</a>
            </li>
            <li className={itemClass}>
              <EnvelopeIcon className={iconClass} />
              <a href={`mailto:${innerSite.email}`}>{innerSite.email}</a>
            </li>
            <li className={itemClass}>
              <MapMarkerIcon className={iconClass} />
              <span>{innerSite.address}</span>
            </li>
          </ul>
        </div>
        <div className="w-full px-[10px] md:w-[33%]">
          <h3 className={headingClass}>Links</h3>
          <div className={dividerClass} />
          <ul>
            {innerSite.footerLinks.map((l) => (
              <li key={l.label} className="pb-[0.75rem]">
                <Link href={l.href} className={linkListClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full px-[10px] md:w-[33%]">
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

      {/* bottom line */}
      <div className="ec">
        <p className="text-[1.6rem] leading-[1.2em] font-medium">Ivy Cleans</p>
      </div>
    </footer>
  );
}
