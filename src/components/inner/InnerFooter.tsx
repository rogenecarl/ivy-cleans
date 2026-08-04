import Image from "next/image";
import Link from "next/link";
import { site, innerSite } from "@/data/site";
import { EnvelopeIcon, MapMarkerIcon, PhoneIcon } from "@/components/Icons";

/*
 * Inner-template footer. The live footer template ships four sections but the
 * first two (f18b62f "Services"/"Book Now" + ae38e06 copyright) carry
 * elementor-hidden-desktop/laptop/tablet_extra/tablet/mobile — i.e. they never
 * render at any breakpoint. What is visible is d439f43 (logo + contact /
 * Links / Get In Touch) followed by 6466cfa (copyright + "Ivy Cleans"), on the
 * template's #FDECE7 background with #37745F type throughout.
 */
/* live: the footer H4s measure font-weight 600 (not the kit's h4 default of 700). */
const headingClass = "text-[1.8rem] leading-[1.2em] font-semibold lg:text-[3rem]";
const itemClass =
  "flex items-start gap-[0.7rem] text-[1.6rem] leading-[1.2em] lg:text-[1.8rem]";
const iconClass = "mt-[0.2rem] h-[1.5rem] w-[1.5rem] shrink-0";

export default function InnerFooter() {
  return (
    <footer className="text-herogreen bg-[#FDECE7] pt-[1rem] pb-[1rem] lg:pt-[4rem] lg:pb-[0.4rem]">
      <div className="ec flex flex-wrap">
        {/* logo + contact */}
        <div className="w-full text-center md:w-1/3 md:px-[10px] md:text-start">
          <Image
            src="/images/Logo.png"
            alt="Ivy Cleans"
            width={309}
            height={149}
            className="mx-auto mb-[2rem] h-auto w-[13.3rem] md:mx-0"
          />
          <ul className="space-y-[1.3rem]">
            <li className={`${itemClass} justify-center md:justify-start`}>
              <PhoneIcon className={iconClass} />
              <span>{innerSite.footerPhone}</span>
            </li>
            <li className={`${itemClass} justify-center md:justify-start`}>
              <EnvelopeIcon className={iconClass} />
              <a href={`mailto:${innerSite.email}`}>{innerSite.email}</a>
            </li>
            <li className={`${itemClass} justify-center md:justify-start`}>
              <MapMarkerIcon className={iconClass} />
              <span>{innerSite.address}</span>
            </li>
          </ul>
        </div>
        {/* Links */}
        <div className="mt-[3.4rem] w-full text-center md:mt-0 md:w-1/3 md:px-[10px]">
          <h4 className={headingClass}>Links</h4>
          <ul className="mt-[1.4rem] inline-block text-start">
            {innerSite.footerLinks.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="hover:text-rust block py-[5px] text-[1.6rem] leading-[1.2em]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {/* Get In Touch */}
        <div className="mt-[3.4rem] w-full text-center md:mt-0 md:w-1/3 md:px-[10px]">
          <h4 className={headingClass}>Get In Touch</h4>
          {/* two social-icon widgets of three => a fixed 3-column grid */}
          <div className="mx-auto mt-[2.5rem] grid w-fit grid-cols-3 gap-x-[2.4rem] gap-y-[2rem]">
            {site.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener"
                aria-label={s.label}
              >
                <span
                  className="bg-herogreen mx-auto block h-[2.7rem] w-[2.7rem] lg:h-[3rem] lg:w-[3rem]"
                  style={{
                    maskImage: `url(${s.icon})`,
                    WebkitMaskImage: `url(${s.icon})`,
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                  }}
                />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* copyright */}
      <div className="ec mt-[2.3rem] text-center lg:mt-[6rem]">
        <p className="text-[1.4rem] leading-[1.2em]">{innerSite.copyright}</p>
        <p className="mt-[1.9rem] text-[1.6rem] leading-[1.2em] font-semibold">Ivy Cleans</p>
      </div>
    </footer>
  );
}
