// /faq data from faq.html (accordion 664764d in section 0a61e2d): 5 pairs, cross-checked with faq-content-dump.txt lines 32-36.
// Separate from src/data/faqs.ts (the front page's 10).

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
