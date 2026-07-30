import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/site";

export default function Footer() {
  return (
    <footer className="bg-black py-14 text-white">
      <div className="mx-auto grid max-w-[1140px] gap-10 px-4 md:grid-cols-4">
        <div>
          <Image src="/images/Logo-footer.png" alt="Ivy Cleans" width={165} height={84} className="h-auto w-[165px]" />
        </div>
        <div>
          <h3 className="mb-4 text-[1.4rem] font-bold">Contact</h3>
          <ul className="space-y-2">
            <li><a href={site.phoneHref}>{site.phone}</a></li>
            <li><a href={`mailto:${site.email}`}>{site.email.toLowerCase()}</a></li>
            <li>{site.address}</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-[1.4rem] font-bold">Quick Links</h3>
          <ul className="space-y-2">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-[1.4rem] font-bold">Get In Touch</h3>
          <div className="flex flex-wrap gap-3">
            {site.socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener" aria-label={s.label} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/25">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.icon} alt="" width={18} height={18} className="invert" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
