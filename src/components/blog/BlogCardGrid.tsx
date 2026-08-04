import Image from "next/image";
import Link from "next/link";
import type { BlogCard } from "@/data/blog";

/*
 * blog.html's `.elementor-posts--skin-cards` grid: cards_columns 3/2/1
 * (post-32.css elementor-element-552a44b) with a 30px column-gap / 35px
 * row-gap. Each `<article class="elementor-post__card">` is: thumbnail
 * link (only `has-post-thumbnail` posts render one) -> badge (top-right,
 * 20px margin) -> avatar -> text block (title, excerpt, "Read More »")
 * -> meta-data footer (date, then comment count separated by "•", per
 * `.elementor-post__meta-data span + span:before{content:"•"}`). Cards
 * without a thumb skip the thumbnail/badge/avatar entirely, matching the
 * live markup (post-1088 "How to Clean Cabinets Before Painting" etc.).
 */
export default function BlogCardGrid({ cards }: { cards: BlogCard[] }) {
  return (
    <div
      className="grid grid-cols-1 gap-x-[30px] gap-y-[35px] md:grid-cols-2 lg:grid-cols-3"
      role="list"
    >
      {cards.map((card) => (
        <Card key={card.href} card={card} />
      ))}
    </div>
  );
}

function Card({ card }: { card: BlogCard }) {
  return (
    <article
      role="listitem"
      className="flex h-full flex-col rounded-[4px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]"
    >
      {card.thumb && (
        <div className="relative">
          <Link
            href={card.href}
            tabIndex={-1}
            className="relative block w-full overflow-hidden rounded-t-[4px] pb-[50%] md:pb-[66%]"
          >
            <Image
              src={card.thumb.src}
              alt={card.thumb.alt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          </Link>
          {card.category && (
            <div className="text-herogreen absolute top-0 right-0 m-[20px] rounded-[3px] bg-white px-[1.2rem] py-[0.6rem] text-[1.2rem] leading-[1.2em] font-medium">
              {card.category}
            </div>
          )}
          {card.author && (
            <div className="bg-herogreen absolute -bottom-[1.8rem] left-[2rem] flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-full border-[0.3rem] border-white text-[1.2rem] leading-[1.2em] font-semibold text-white uppercase">
              {card.author}
            </div>
          )}
        </div>
      )}
      <div className={`flex flex-1 flex-col p-[2rem] ${card.thumb ? "pt-[3rem]" : ""}`}>
        <h3 className="mb-[1rem] text-[1.8rem] leading-[1.3em] font-semibold">
          <Link href={card.href}>{card.title}</Link>
        </h3>
        <div className="mb-[1rem] flex-1 text-[1.4rem] leading-[1.6em] font-light text-[#666]">
          <p>{card.excerpt}</p>
        </div>
        <Link
          href={card.href}
          tabIndex={-1}
          className="text-link mb-[1rem] inline-block text-[1.6rem] leading-[1.4em] font-medium"
        >
          Read More &raquo;
        </Link>
        <div className="flex items-center gap-[0.6rem] text-[1.3rem] leading-[1.4em] text-[#777]">
          <span>{card.date}</span>
          <span aria-hidden="true">&bull;</span>
          <span>{card.comments}</span>
        </div>
      </div>
    </article>
  );
}
