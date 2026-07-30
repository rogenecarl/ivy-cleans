"use client";

import { useState } from "react";
import { faqs } from "@/data/faqs";

export default function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <section className="bg-cover bg-center py-16" style={{ backgroundImage: "url(/images/faq-bg.jpg)" }}>
      <div className="mx-auto max-w-[1140px] px-4">
        <h2 className="text-center text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
          Frequently Asked Questions
        </h2>
        <p className="mt-4 text-center">If you need further assistance, please do not hesitate to contact us.</p>
        <div className="mx-auto mt-10 max-w-4xl">
          {faqs.map((f, i) => (
            <div key={f.q} className="mb-3 bg-white shadow-sm">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                aria-expanded={openIdx === i}
                className="flex w-full items-center justify-between px-6 py-4 text-left text-[1.15rem] font-semibold"
              >
                {f.q}
                <span className="text-rust ml-4 text-2xl">{openIdx === i ? "−" : "+"}</span>
              </button>
              {openIdx === i && <p className="px-6 pb-5 leading-relaxed">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
