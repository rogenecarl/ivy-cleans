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
 *
 * Sizes/colors below that are NOT in post-32.css come from Elementor's own
 * posts-cards skin stylesheet, which isn't in the captured reference set;
 * they were measured off the live page with a Playwright computed-style
 * probe at 1440x900 and 390x844 (round-4 fidelity pass) and are fixed px,
 * not rem — they do not track the root font-size ladder:
 *   card             3px radius, #fff, shadow from post-32.css custom CSS
 *   thumbnail link   margin-bottom 25px; `.elementor-post__text` margin-top 20px
 *   badge            #69727d bg, #fff, 12px/400 uppercase, 7.2px 14.4px, pill
 *   avatar           60x60 circle, 30px from the card's left edge, centred
 *                    on the thumbnail's bottom edge (no border on live)
 *   title            21px/600, 1.2 line-height, 25px bottom margin; its <a>
 *                    renders in the link colour #cc3366 (verified by pixel
 *                    sampling the live screenshot, not just computed style)
 *   excerpt          14px/400, 21px line-height, #777, 25px bottom margin
 *   read more        1.6rem/700 uppercase #cc3366, 20px bottom margin
 *   meta-data        12px/400 #adadad, 1px #eaeaea top rule, 15px 30px padding
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
      {/*
        `.elementor-post__text` takes the card's leftover height (top-aligned
        content) so the meta-data rule always sits flush with the card's
        bottom edge and every card in a row ends level, as on live.
      */}
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
