import Image from "next/image";

export default function Values() {
  return (
    <section className="bg-brand py-16 text-white">
      <div className="mx-auto grid max-w-[1140px] items-center gap-10 px-4 lg:grid-cols-[300px_1fr]">
        <Image src="/images/guarantee-icon-1.png" alt="" width={299} height={298} className="mx-auto h-auto w-[220px]" />
        <div>
          <h2 className="text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
            Our Values &amp; Guarantee
          </h2>
          <p className="mt-6 leading-relaxed">
            To be brief, Ivy cleans offers the highest quality cleaning services in Minneapolis. We take the time to do our work properly, effectively, and as conveniently as possible for the homeowner. We pride ourselves in our work and the results that we have for our customers. Our drive is in executing our knowledge of cleaning to best suit the needs of all of our clients. That&rsquo;s what differentiates us from the competition. We truly care about the services we provide, making sure that they are the best they can be.
          </p>
          <p className="mt-4 leading-relaxed">
            We continually change our techniques, tools, and products to find what works best for us and our customers. Always learning more and more about the industry with each passing day, is what makes Ivy cleans the only company in Minneapolis the company you should choose for deep cleaning.
          </p>
        </div>
      </div>
    </section>
  );
}
