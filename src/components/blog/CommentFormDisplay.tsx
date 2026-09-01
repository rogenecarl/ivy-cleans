/*
 * Display-only reproduction of blog-post.html's #respond comment form
 * (WordPress's default comment-form markup, not covered by post-952.css —
 * that stylesheet only carries the post-template layout). Field set/labels
 * verbatim: "Leave a Reply" heading, comment-notes line (email-notes span
 * wired to the email input's aria-describedby, matching the live markup),
 * Comment textarea, Name/Email/Website inputs, the "Save my name..."
 * consent checkbox, and the "Post Comment" submit — including the live
 * `required` attributes on Comment/Name/Email (Website is optional on the
 * live form too). No `action`, no submit handler — this is a static clone
 * with no backend to post to.
 *
 * The form sits at the foot of the same Elementor column as the article, so
 * it repeats PostArticle's 119rem container and 60px column padding (0 at
 * <=767) and carries the column's 50px bottom margin. Everything else is
 * theme/browser default and was measured off the live page with a Playwright
 * computed-style probe at 1440x900 and 390x844 (round-4 fidelity pass):
 * the whole form inherits the 1rem root size (labels, inputs, notes and the
 * submit are all 1rem, not a scaled-up size), #reply-title matches the post
 * body's h2 (22px/700 #374151), fields are 1px #666 / 3px radius with
 * 0.5rem 1rem padding, and the submit is an outline button — transparent
 * fill, 1px #cc3366 border, 5px radius, 1rem/700 uppercase #cc3366 text with
 * 1.1rem 2.4rem padding. Sibling paragraphs are spaced 2rem apart.
 */
/*
 * Elementor renders #comments' list only when the post actually has a
 * response. In this set that is always a single WordPress pingback — an
 * `<li class="pingback">` holding the literal "Pingback:" prefix and a link
 * to the post that referenced this one — under an h2.title-comments reading
 * "One Response".
 *
 * Measured off live at 1440 and 390 (guide-to-basement-cleaning-services-near-you):
 * h2.title-comments is the post body's h2 (22px/1.2em/700 #374151, 0.5rem top
 * / 1rem bottom margin); ul.comment-list has no marker, margin or padding and
 * drops to 0.9rem/1.5rem — markedly smaller than the 18px body copy, which is
 * why it is set here rather than inherited; .comment-body carries a flat
 * `30px 0 30px 60px` padding at every width; and the link is the site link
 * colour at 1.2em with no underline. The list adds no bottom margin — the
 * 4.1px gap live shows before #respond is the reply title's own 0.5rem.
 */
type Responses = { heading: string; items: { prefix: string; text: string; href: string }[] };

const FIELD_CLASS =
  "w-full rounded-[3px] border border-[#666] px-[1rem] py-[0.5rem] text-[1rem] leading-[1.5] text-black";

export default function CommentFormDisplay({ responses }: { responses?: Responses }) {
  /*
   * mt is 2rem (Elementor's widget gap) plus the heading's own 0.5rem top
   * margin, folded into one value so the two don't collapse across the
   * section boundary — live has 20.8px between the divider and #reply-title
   * at 1440.
   */
  return (
    <section className="mt-[2.5rem] mb-[50px] bg-white">
      <div className="mx-auto max-w-[119rem]">
        <div className="p-0 md:px-[60px] md:pb-[60px]">
          {responses && (
            <>
              <h2 className="mt-0 mb-[1rem] text-[22px] leading-[1.2em] font-bold text-[#374151]">
                {responses.heading}
              </h2>
              <ol className="m-0 list-none p-0 text-[0.9rem] leading-[1.5rem] text-[#374151]">
                {responses.items.map((item) => (
                  <li key={item.href}>
                    <div className="py-[30px] pl-[60px]">
                      {item.prefix}{" "}
                      {/* live's comment stylesheet makes the pingback link a block, so it
                          drops onto its own line under the "Pingback:" prefix */}
                      <a
                        href={item.href}
                        className="block text-[#cc3366] leading-[1.2em] no-underline"
                      >
                        {item.text}
                      </a>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
          {/* The 0.5rem top margin is folded into the section's mt only when
              this heading is the section's first element; behind a response
              list it is an ordinary sibling and keeps its own margin. */}
          <h2
            className={`${responses ? "mt-[0.5rem]" : "mt-0"} mb-[1rem] text-[22px] leading-[1.2em] font-bold text-[#374151]`}
          >
            Leave a Reply
          </h2>
          <form className="flex flex-col gap-[2rem]">
            <p className="text-[1rem] text-[#374151]">
              <span id="email-notes">Your email address will not be published.</span>{" "}
              <span>
                Required fields are marked <span>*</span>
              </span>
            </p>
            <p className="flex flex-col items-start gap-0">
              <label htmlFor="comment" className="text-[1rem] text-[#374151]">
                Comment <span>*</span>
              </label>
              <textarea
                id="comment"
                name="comment"
                cols={45}
                rows={8}
                maxLength={65525}
                required
                className={FIELD_CLASS}
              />
            </p>
            <p className="flex flex-col items-start gap-0">
              <label htmlFor="author" className="text-[1rem] text-[#374151]">
                Name <span>*</span>
              </label>
              <input
                id="author"
                name="author"
                type="text"
                size={30}
                maxLength={245}
                autoComplete="name"
                required
                className={FIELD_CLASS}
              />
            </p>
            <p className="flex flex-col items-start gap-0">
              <label htmlFor="email" className="text-[1rem] text-[#374151]">
                Email <span>*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                size={30}
                maxLength={100}
                autoComplete="email"
                aria-describedby="email-notes"
                required
                className={FIELD_CLASS}
              />
            </p>
            <p className="flex flex-col items-start gap-0">
              <label htmlFor="url" className="text-[1rem] text-[#374151]">
                Website
              </label>
              <input
                id="url"
                name="url"
                type="url"
                size={30}
                maxLength={200}
                autoComplete="url"
                className={FIELD_CLASS}
              />
            </p>
            <p className="flex items-center gap-[2px]">
              <input
                id="wp-comment-cookies-consent"
                name="wp-comment-cookies-consent"
                type="checkbox"
                value="yes"
                className="h-[13px] w-[13px]"
              />
              <label
                htmlFor="wp-comment-cookies-consent"
                className="text-[1rem] text-[#374151]"
              >
                Save my name, email, and website in this browser for the next time I comment.
              </label>
            </p>
            <p>
              <input
                name="submit"
                type="submit"
                id="submit"
                value="Post Comment"
                className="cursor-pointer rounded-[5px] border border-[#cc3366] bg-transparent px-[2.4rem] py-[1.1rem] text-[1rem] font-bold text-[#cc3366] uppercase"
              />
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
