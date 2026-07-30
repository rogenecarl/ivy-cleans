import Image from "next/image";
import { posts } from "@/data/posts";

export default function BlogPreview() {
  return (
    <section className="bg-white py-[1rem] md:py-[2rem] lg:py-[5rem]">
      <div className="ec">
        <h3 className="mb-[2rem] text-center text-[1.8rem] leading-[1.2em] lg:text-[2.2rem]">
          NEWS AND CLEANING TIPS
        </h3>
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          Latest From The Ivy Cleans Blog
        </h2>
        <div className="grid gap-[3rem] lg:grid-cols-3 lg:gap-x-[6rem]">
          {/* live: .elementor-post{border-radius:5px;box-shadow:0 0 14px 0 rgba(0,0,0,.1)} */}
          {posts.map((p) => (
            <article
              key={p.href}
              className="overflow-hidden rounded-[5px] text-left shadow-[0_0_14px_0_rgba(0,0,0,0.1)]"
            >
              <a href={p.href} className="block">
                <Image
                  src={p.image}
                  alt={p.alt}
                  width={300}
                  height={200}
                  className="h-auto w-full object-cover"
                />
              </a>
              <div className="p-[2rem]">
                <h3 className="mb-[1.5rem] text-[1.8rem] leading-[1.2em] font-medium lg:text-[2.4rem]">
                  <a href={p.href}>{p.title}</a>
                </h3>
                <a href={p.href} className="text-link inline-block text-[1.6rem] leading-[1.4em] font-medium">
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
