// Sanitized blog-tool HTML in the post body's type sizes (see Block in PostArticle for the file-based equivalents).
const BODY_CLASS = [
  '[&_h2]:mt-[0.5rem] [&_h2]:mb-[1rem] [&_h2]:text-[22px] [&_h2]:leading-[1.2em] [&_h2]:font-bold [&_h2]:text-[#374151]',
  '[&_h3]:mt-[0.5rem] [&_h3]:mb-[1rem] [&_h3]:text-[20px] [&_h3]:leading-[1.2em] [&_h3]:font-semibold [&_h3]:text-[#374151]',
  '[&_h4]:mt-[0.5rem] [&_h4]:mb-[1rem] [&_h4]:text-[18px] [&_h4]:leading-[1.2em] [&_h4]:font-semibold [&_h4]:text-[#374151]',
  '[&_p]:mb-[2rem] [&_p]:leading-[1.5]',
  '[&_ul]:m-0 [&_ul]:mb-[2rem] [&_ul]:list-outside [&_ul]:list-disc [&_ul]:pl-[40px]',
  '[&_ol]:m-0 [&_ol]:mb-[2rem] [&_ol]:list-outside [&_ol]:list-decimal [&_ol]:pl-[40px]',
  '[&_a]:text-[#cc3366] [&_a]:no-underline',
  '[&_strong]:[font-weight:bolder]',
  '[&_img]:mb-[18px] [&_img]:block [&_img]:h-auto [&_img]:max-w-full',
  '[&_blockquote]:mb-[2rem] [&_blockquote]:border-l-4 [&_blockquote]:border-[#eaeaea] [&_blockquote]:pl-[1.5rem] [&_blockquote]:italic',
  '[&_table]:mb-[2rem] [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#eaeaea] [&_td]:p-[0.5rem] [&_th]:border [&_th]:border-[#eaeaea] [&_th]:p-[0.5rem] [&_th]:text-left',
].join(' ')

export default function HtmlBody({ html }: { html: string }) {
  return <div className={BODY_CLASS} dangerouslySetInnerHTML={{ __html: html }} />
}
