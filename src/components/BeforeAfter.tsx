import Image from "next/image";

export default function BeforeAfter() {
  return (
    <section className="bg-peach py-16">
      <div className="mx-auto max-w-[1140px] px-4 text-center">
        <h2 className="text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
          Our Cleaning Work In Action
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <figure>
            <Image src="/images/before.jpg" alt="" width={555} height={417} className="h-auto w-full" />
            <figcaption className="mt-3 text-[1.8rem] font-bold uppercase text-white [text-shadow:0_1px_2px_rgba(0,0,0,.4)]">
              <h3 className="bg-rust inline-block px-6 py-1 uppercase">before</h3>
            </figcaption>
          </figure>
          <figure>
            <Image src="/images/after.jpg" alt="" width={555} height={417} className="h-auto w-full" />
            <figcaption className="mt-3">
              <h3 className="bg-brand inline-block px-6 py-1 text-[1.8rem] font-bold uppercase text-white">after</h3>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
