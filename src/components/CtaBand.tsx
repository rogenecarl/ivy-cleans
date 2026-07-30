import { site } from "@/data/site";
import CtaButton from "./CtaButton";

export default function CtaBand({ heading = true }: { heading?: boolean }) {
  return (
    <section
      className="bg-rust bg-cover bg-center py-16 text-center text-white"
      style={{ backgroundImage: "url(/images/bg.jpg)" }}
    >
      <div className="mx-auto max-w-[1140px] px-4">
        {heading && (
          <h2 className="mb-8 text-[2.8rem] leading-tight md:text-[4rem] lg:text-[4.5rem]">
            Ready For a Sparkling Clean House? Book Your Cleaning Service Minneapolis
          </h2>
        )}
        <CtaButton size="lg" />
        <p className="mt-6 text-[1.8rem]">Prefer to call? We&rsquo;re available now.</p>
        <h3 className="mt-2 text-[2.6rem] font-bold md:text-[3rem] lg:text-[3.6rem]">
          <a href={site.phoneHref}>{site.phone}</a>
        </h3>
      </div>
    </section>
  );
}
