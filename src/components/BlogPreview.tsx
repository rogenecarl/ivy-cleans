import Image from "next/image";
import { posts } from "@/data/posts";

export default function BlogPreview() {
  return (
    <section className="bg-white py-[1rem] md:py-[2rem] lg:py-[5rem]">
      <div className="ec">
        {/* 8588c5c: widget-container margin-bottom -1.5rem below 768px */}
        <h3 className="mb-[0.5rem] text-center text-[1.8rem] leading-[1.2em] md:mb-[2rem] lg:text-[2.2rem]">
          NEWS AND CLEANING TIPS
        </h3>
        {/* e68f311: widget-container margin-bottom 2rem, -1rem below 768px, on top of
            the kit's 2rem widget spacing (live probe gap 33.2px @1440 / 10px @390) */}
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[4rem] md:text-[4rem] lg:text-[4.5rem]">
          Latest From The Ivy Cleans Blog
        </h2>
        <div className="grid gap-[3rem] lg:grid-cols-3 lg:gap-x-[6rem]">
          {/* live: .elementor-post{border-radius:5px;box-shadow:0 0 14px 0 rgba(0,0,0,.1)} */}
          {posts.map((p) => (
            <article
              key={p.href}
              className="overflow-hidden rounded-[5px] text-left shadow-[0_0_14px_0_rgba(0,0,0,0.1)]"
            >
              {/* 597443d: `.elementor-post__thumbnail{padding-bottom:calc(0.66*100%)}`,
                  0.5 below 768px — a fixed-ratio box the image covers */}
              <a href={p.href} className="relative block aspect-[100/50] md:aspect-[100/66]">
                <Image src={p.image} alt={p.alt} fill sizes="(max-width: 767px) 100vw, 33vw" className="object-cover" />
              </a>
              <div className="p-[2rem]">
                <h3 className="mb-[1.5rem] text-[1.8rem] leading-[1.2em] font-medium lg:text-[2.4rem]">
                  <a href={p.href}>{p.title}</a>
                </h3>
                <a href={p.href} className="text-link inline-block text-[1.6rem] leading-[1.2em] font-medium">
                  Read More &raquo;
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
