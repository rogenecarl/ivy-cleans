import Image from "next/image";
import { posts } from "@/data/posts";

export default function BlogPreview() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1140px] px-4 text-center">
        <h3 className="text-[1.4rem] font-semibold tracking-wide">NEWS AND CLEANING TIPS</h3>
        <h2 className="mt-2 text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
          Latest From The Ivy Cleans Blog
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {posts.map((p) => (
            <article key={p.href} className="text-left">
              <a href={p.href}>
                <Image src={p.image} alt={p.alt} width={300} height={200} className="h-auto w-full object-cover" />
                <h3 className="mt-4 text-[1.3rem] font-bold leading-snug">{p.title}</h3>
              </a>
              <a href={p.href} className="text-rust mt-2 inline-block font-semibold">Read More »</a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
