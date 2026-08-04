/*
 * Display-only reproduction of blog-post.html's #respond comment form
 * (WordPress's default comment-form markup, not covered by post-952.css —
 * that stylesheet only carries the post-template layout). Field set/labels
 * verbatim: "Leave a Reply" heading, comment-notes line, Comment textarea,
 * Name/Email/Website inputs, the "Save my name..." consent checkbox, and
 * the "Post Comment" submit. No `action`, no submit handler — this is a
 * static clone with no backend to post to.
 */
export default function CommentFormDisplay() {
  return (
    <section className="mt-0 mb-[2rem] bg-white md:mb-[3.5rem] lg:mb-[5rem]">
      <div className="ec">
        <div className="mx-auto max-w-[978px] p-0 lg:px-[6rem]">
          <h2 className="mb-[2rem] text-[2.4rem] leading-[1.3em] font-semibold text-black">
            Leave a Reply
          </h2>
          <form className="flex flex-col gap-[1.5rem]">
            <p className="text-[1.4rem] leading-[1.5em] font-light text-[#54595f]">
              Your email address will not be published. Required fields are marked{" "}
              <span className="text-[#cc3366]">*</span>
            </p>
            <p className="flex flex-col gap-[0.6rem]">
              <label htmlFor="comment" className="text-[1.4rem] font-medium text-black">
                Comment <span className="text-[#cc3366]">*</span>
              </label>
              <textarea
                id="comment"
                name="comment"
                cols={45}
                rows={8}
                maxLength={65525}
                className="rounded-[4px] border border-[#afafaf] p-[1rem] text-[1.4rem] leading-[1.5em]"
              />
            </p>
            <p className="flex flex-col gap-[0.6rem]">
              <label htmlFor="author" className="text-[1.4rem] font-medium text-black">
                Name <span className="text-[#cc3366]">*</span>
              </label>
              <input
                id="author"
                name="author"
                type="text"
                size={30}
                maxLength={245}
                autoComplete="name"
                className="rounded-[4px] border border-[#afafaf] p-[1rem] text-[1.4rem] leading-[1.5em]"
              />
            </p>
            <p className="flex flex-col gap-[0.6rem]">
              <label htmlFor="email" className="text-[1.4rem] font-medium text-black">
                Email <span className="text-[#cc3366]">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                size={30}
                maxLength={100}
                autoComplete="email"
                className="rounded-[4px] border border-[#afafaf] p-[1rem] text-[1.4rem] leading-[1.5em]"
              />
            </p>
            <p className="flex flex-col gap-[0.6rem]">
              <label htmlFor="url" className="text-[1.4rem] font-medium text-black">
                Website
              </label>
              <input
                id="url"
                name="url"
                type="url"
                size={30}
                maxLength={200}
                autoComplete="url"
                className="rounded-[4px] border border-[#afafaf] p-[1rem] text-[1.4rem] leading-[1.5em]"
              />
            </p>
            <p className="flex items-center gap-[0.8rem]">
              <input
                id="wp-comment-cookies-consent"
                name="wp-comment-cookies-consent"
                type="checkbox"
                value="yes"
                className="h-[1.6rem] w-[1.6rem]"
              />
              <label htmlFor="wp-comment-cookies-consent" className="text-[1.4rem] leading-[1.4em] text-black">
                Save my name, email, and website in this browser for the next time I comment.
              </label>
            </p>
            <p>
              <input
                name="submit"
                type="submit"
                id="submit"
                value="Post Comment"
                className="bg-herogreen cursor-pointer rounded-[4px] px-[2.4rem] py-[1.2rem] text-[1.4rem] font-medium text-white"
              />
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
