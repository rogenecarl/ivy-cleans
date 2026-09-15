import { wrapTables } from "@/blog/html";

// Sanitized blog-tool HTML in the post body's type sizes; the file-based posts used the same values.
const BODY_CLASS = [
  "break-words",
  "[&_h2]:mt-[0.5rem] [&_h2]:mb-[1rem] [&_h2]:text-[22px] [&_h2]:leading-[1.2em] [&_h2]:font-bold [&_h2]:text-[#374151]",
  "[&_h3]:mt-[0.5rem] [&_h3]:mb-[1rem] [&_h3]:text-[20px] [&_h3]:leading-[1.2em] [&_h3]:font-semibold [&_h3]:text-[#374151]",
  "[&_h4]:mt-[0.5rem] [&_h4]:mb-[1rem] [&_h4]:text-[18px] [&_h4]:leading-[1.2em] [&_h4]:font-semibold [&_h4]:text-[#374151]",
  "[&_p]:mb-[2rem] [&_p]:leading-[1.5]",
  "[&_hr]:my-[2rem] [&_hr]:border-t [&_hr]:border-[#eaeaea]",
  "[&_ul]:mb-[2rem] [&_ul]:list-outside [&_ul]:list-disc [&_ul]:pl-[2.4rem] md:[&_ul]:pl-[40px]",
  "[&_ol]:mb-[2rem] [&_ol]:list-outside [&_ol]:list-decimal [&_ol]:pl-[2.4rem] md:[&_ol]:pl-[40px]",
  "[&_li]:mb-[0.6rem] [&_li]:leading-[1.5]",
  "[&_li:has(>input)]:list-none [&_li:has(>input)]:-ml-[2.4rem] md:[&_li:has(>input)]:-ml-[40px]",
  "[&_input]:mr-[0.8rem] [&_input]:size-[1.6rem] [&_input]:align-[-0.2rem] [&_input]:accent-herogreen",
  "[&_a]:text-[#cc3366] [&_a]:no-underline",
  "[&_strong]:[font-weight:bolder]",
  "[&_img]:mb-[18px] [&_img]:block [&_img]:h-auto [&_img]:max-w-full",
  "[&_blockquote]:mb-[2rem] [&_blockquote]:leading-[1.5] [&_blockquote]:border-l-4 [&_blockquote]:border-[#eaeaea] [&_blockquote]:pl-[1.5rem] [&_blockquote]:italic",
  "[&_.table-wrap]:mb-[2rem] [&_.table-wrap]:overflow-x-auto",
  "[&_table]:w-full [&_table]:min-w-[48rem] [&_table]:border-collapse [&_table]:text-[16px] [&_table]:leading-[1.5]",
  "[&_td]:border [&_td]:border-[#eaeaea] [&_td]:p-[0.8rem] [&_td]:align-top",
  "[&_th]:border [&_th]:border-[#eaeaea] [&_th]:bg-[#f7f7f7] [&_th]:p-[0.8rem] [&_th]:text-left [&_th]:align-top",
].join(" ");

export default function HtmlBody({ html }: { html: string }) {
  return <div className={BODY_CLASS} dangerouslySetInnerHTML={{ __html: wrapTables(html) }} />;
}
