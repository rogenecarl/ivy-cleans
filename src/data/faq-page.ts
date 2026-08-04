/*
 * /faq page data — independent of src/data/faqs.ts (the front page's
 * 10-item set). Do not import from or reuse that file: these are
 * different questions, scraped from a different live page.
 *
 * Source: docs/superpowers/reference/ivycleans-live/faq.html, the single
 * `elementor-widget-accordion` (data-id="664764d") in section #0a61e2d.
 * Extracted with a script pairing each `elementor-tab-title`'s
 * `<a class="elementor-accordion-title">` text with its matching
 * `elementor-tab-content`'s `<p>` text (regex over the raw HTML,
 * ordered by data-tab):
 *
 *   import re
 *   html = open("faq.html", encoding="utf-8").read()
 *   pairs = re.findall(
 *       r'<a class="elementor-accordion-title" tabindex="0">([^<]*)</a>'
 *       r'.*?elementor-tab-content-\d+" class="elementor-tab-content '
 *       r'elementor-clearfix" data-tab="\d+" role="region" '
 *       r'aria-labelledby="elementor-tab-title-\d+"><p>([^<]*)</p></div>',
 *       html, re.S,
 *   )
 *
 * That script found exactly 5 pairs (ids elementor-tab-title-1071..1075).
 * Cross-checked against faq-content-dump.txt lines 32-36, which pairs the
 * same 5 questions with the same 5 answers (rendered-text concatenation
 * of each tab-title + tab-content). NOTE: the task brief/plan describe
 * "15 pairs" — that count does not match either source file committed at
 * docs/superpowers/reference/ivycleans-live/faq.html (667 lines, ends at
 * </html>, not truncated) or the content dump. faqPageItems below holds
 * the 5 pairs actually present in both sources; see task-2-report.md for
 * the full discrepancy note. No apostrophes appear in this set (verified
 * by grep), so no U+2019 substitution was needed here.
 */

export const faqPageMeta = {
  title: "FAQ - Ivy Cleans",
  description: "Do you accept online bookings?", // faq.html line 24 <meta name="description">
};

export const faqPageHeader = {
  overline: "QUESTIONS", // faq dump line 30
  h2: "Frequently Asked Questions", // faq dump line 31
};

export type FaqPageItem = { q: string; a: string };

export const faqPageItems: FaqPageItem[] = [
  {
    q: "Do you accept online bookings?",
    a: "Yes, we do accept online bookings, we are a fully automated and frictionless customer service cleaning provider. Feel free to book online using the Book Now button.",
  },
  {
    q: "Do you take cash?",
    a: "Unfortunately, we do not accept any cash or check payments. We do however accept online payment via debit card or credit card.",
  },
  {
    q: "Do you provide your own equipment?",
    a: "Our cleaners provide all equipment needed to complete services. If you have a specific request, for example, stainless steel fridge shining, we ask that you provide our cleaners with those solutions to help complete the service.",
  },
  {
    q: "How do we pay for the service?",
    a: "Once the cleaning service is completed, payment will be made with the payment details that were collected upon booking. The final invoice will be sent to you directly and payment will be processed afterward.",
  },
  {
    q: "Do you offer carpet cleaning or window cleaning?",
    a: "Unfortunately, we only offer house cleaning services and no niche type services such as carpet cleaning and window cleaning.",
  },
];
