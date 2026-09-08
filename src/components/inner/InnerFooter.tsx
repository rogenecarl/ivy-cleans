import Image from "next/image";
import Link from "next/link";
import type { SiteData } from "@/data/site";
import { EnvelopeIcon, PhoneIcon } from "@/components/Icons";

// Inner footer: d439f43 (logo/contact, links, get in touch) + 6466cfa (copyright), #FDECE7 / #37745F.
// d439f43 padding 4rem/3rem, 3rem/1rem at 768-1024, 1rem/0 mobile; 6466cfa 0/1rem.
/* live: the footer H4s measure font-weight 600 (not the kit's h4 default of 700).
   The 2rem bottom margin is the heading widget's own, at every width. */
const headingClass =
  "mb-[2rem] text-[1.8rem] leading-[1.2em] font-semibold md:text-[2rem] lg:text-[3rem]";
const itemClass =
  "flex items-start text-[1.6rem] leading-[1.2em] md:text-[1.8rem]";
// icon box 1.25em x 1em, 5px before the label, nudged 0.1em down
const iconClass =
  "mt-[0.1em] ml-[0.125em] mr-[calc(0.125em+5px)] h-[1em] w-[1em] shrink-0";

export default function InnerFooter({
  site,
  innerSite,
}: {
  site: SiteData["site"];
  innerSite: SiteData["innerSite"];
}) {
  return (
    <footer className="text-herogreen bg-[#FDECE7] pt-[1rem] pb-[1rem] md:pt-[3rem] lg:pt-[4rem]">
      {/* columns carry their own 10px gutter from 768 up, so drop .ec's; `!` beats the unlayered .ec rule */}
      <div className="ec flex flex-wrap md:px-0!">
        {/* logo + contact */}
        <div className="w-full text-center md:w-1/3 md:px-[10px] md:text-start">
          {/* live image widget: 13rem wide, 2rem of widget margin plus a further
              1rem on its container from 768 up */}
          <Image
            src="/images/Logo.png"
            alt="Ivy Cleans"
            width={309}
            height={149}
            className="mx-auto mb-[2rem] h-auto w-[13rem] md:mx-0 md:mb-[3rem]"
          />
          <ul className="space-y-[1rem] md:space-y-[1.5rem]">
            <li className={`${itemClass} justify-center md:justify-start`}>
              <PhoneIcon className={iconClass} />
              <span>{innerSite.footerPhone}</span>
            </li>
            {/* client instruction 2026-08-22: no office address in the footer */}
            <li className={`${itemClass} justify-center md:justify-start`}>
              <EnvelopeIcon className={iconClass} />
              {/* live renders the email as plain text — no mailto anchor */}
              <span>{innerSite.email}</span>
            </li>
          </ul>
        </div>
        {/* Links — stacked at mobile, where live's 3rem gap is the two columns'
            10px gutters plus the heading container's mobile-only 1rem */}
        <div className="mt-[3rem] w-full text-center md:mt-0 md:w-1/3 md:px-[10px]">
          <h4 className={headingClass}>Links</h4>
          <ul className="inline-block space-y-[1rem] text-start">
            {innerSite.footerLinks.map((l) => (
              <li key={l.label}>
                {/* live a.elementor-item: no padding, flat 20px line-height */}
                <Link
                  href={l.href}
                  className="hover:text-rust block text-[1.6rem] leading-[20px]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {/* Get In Touch */}
        <div className="mt-[3rem] w-full text-center md:mt-0 md:w-1/3 md:px-[10px]">
          <h4 className={headingClass}>Get In Touch</h4>
          {/* two social-icon widgets of three => a fixed 3-column grid; live's
              column gap is a flat 20px, the row gap the second widget's 2rem */}
          <div className="mx-auto grid w-fit grid-cols-3 gap-x-[20px] gap-y-[2rem]">
            {site.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener"
                aria-label={s.label}
              >
                <span
                  className="bg-herogreen mx-auto block h-[2.8rem] w-[2.8rem] md:h-[3rem] md:w-[3rem]"
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

      {/* both lines are headings on live (1.2em); `!` beats globals.css's unlayered p rule */}
      <div className="ec text-center md:mt-[1rem] lg:mt-[3rem]">
        <p className="mb-[2rem] text-[1.4rem] leading-[1.2em]!">
          {innerSite.copyright}
        </p>
        <p className="text-[1.6rem] leading-[1.2em]! font-semibold">Ivy Cleans</p>
      </div>
    </footer>
  );
}
