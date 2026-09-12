import Image from "next/image";
import Link from "next/link";
import type { BlogCard } from "@/data/blog";

// blog.html posts-cards grid, post-32.css 552a44b: 3/2/1 columns, 30px/35px gaps. Cards without a thumb skip thumbnail, badge and avatar.
// Skin sizes are fixed px measured live: badge 12px pill, avatar 60px, title 21px/600 #cc3366, excerpt 14px #777, meta 12px #adadad.
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
      className="flex h-full flex-col overflow-hidden rounded-[4px] bg-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]"
    >
      {card.thumb && (
        <div className="relative">
          <Link
            href={card.href}
            tabIndex={-1}
            className="relative block w-full overflow-hidden pb-[50%] md:pb-[66%]"
          >
            <Image
              src={card.thumb.src}
              alt={card.thumb.alt}
              fill
              unoptimized={card.thumb.external}
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          </Link>
          {card.category && (
            <div className="absolute top-0 right-0 m-[20px] rounded-full bg-[#69727d] px-[14.4px] py-[7.2px] text-[12px] leading-[12px] font-normal text-white uppercase">
              {card.category}
            </div>
          )}
          {card.author && (
            <Image
              src="/images/avatar-aj.jpg"
              alt={card.author}
              width={128}
              height={128}
              className="absolute -bottom-[30px] left-[30px] h-[60px] w-[60px] rounded-full object-cover"
            />
          )}
        </div>
      )}
      {/* text block takes the leftover height so the meta rule sits flush at the bottom */}
      <div
        className={`flex-1 px-[30px] ${card.thumb ? "mt-[45px]" : "mt-[20px]"}`}
      >
        <h3 className="mb-[25px] text-[21px] leading-[1.2em] font-semibold">
          <Link href={card.href} className="text-link">
            {card.title}
          </Link>
        </h3>
        <p className="mb-[25px] text-[14px] leading-[21px] text-[#777]">{card.excerpt}</p>
        <Link
          href={card.href}
          tabIndex={-1}
          className="text-link mb-[20px] inline-block text-[1.6rem] leading-[1.2em] font-bold uppercase"
        >
          Read More &raquo;
        </Link>
      </div>
      <div className="flex items-center gap-[8px] border-t border-[#eaeaea] px-[30px] py-[15px] text-[12px] leading-[15.6px] text-[#adadad]">
        <span>{card.date}</span>
        <span aria-hidden="true">&bull;</span>
        <span>{card.comments}</span>
      </div>
    </article>
  );
}
