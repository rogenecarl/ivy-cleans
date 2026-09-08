// blog-post.html #respond, display-only. Same container and padding as PostArticle; sizes measured live at 1440/390.
// #comments renders only when the post has a response — always a single pingback in this set
type Responses = { heading: string; items: { prefix: string; text: string; href: string }[] };

const FIELD_CLASS =
  "w-full rounded-[3px] border border-[#666] px-[1rem] py-[0.5rem] text-[1rem] leading-[1.5] text-black";

export default function CommentFormDisplay({ responses }: { responses?: Responses }) {
  // 2rem widget gap + the heading's 0.5rem, as one value
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
          {/* top margin is folded into the section only when this heading comes first */}
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
