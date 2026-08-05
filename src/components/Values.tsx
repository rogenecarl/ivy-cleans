import Image from "next/image";

export default function Values() {
  return (
    <section
      className="bg-cover bg-top pt-[1rem] md:py-[2rem] lg:py-[6rem] xl:py-[5rem]"
      style={{ backgroundImage: "url(/images/Rectangle-12.jpg)" }}
    >
      {/* post-2035.css `.sec08 > .elementor-container{max-width:128rem!important}` —
          a rem cap riding the ladder: 1280 @1920, 1064.96 @1440 (the 1065px this
          used to hard-code) */}
      <div className="ec mx-auto max-w-[128rem]! text-center">
        {/* 7e03a53: widget-container margin-bottom -1rem below 768px */}
        <h2 className="mb-[1rem] text-[2.8rem] leading-[1.2em] font-bold md:mb-[2rem] md:text-[4rem] lg:text-[4.5rem]">
          Our Values &amp; Guarantee
        </h2>
        <Image
          src="/images/guarantee-icon-1.png"
          alt=""
          width={299}
          height={298}
          className="mx-auto mb-[2rem] h-auto w-[185px] md:w-[299px]"
        />
        <div className="text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
          <p className="mb-[2rem]">
            To be brief, <strong className="font-bold">Ivy cleans offers the highest quality cleaning services in Minneapolis</strong>. We take the time to do our work properly, effectively, and as conveniently as possible for the homeowner. We pride ourselves in our work and the results that we have for our customers. Our drive is in executing our knowledge of cleaning to best suit the needs of all of our clients. That&rsquo;s what differentiates us from the competition. We truly care about the services we provide, making sure that they are the best they can be.
          </p>
          <p className="mb-[2rem]">
            We continually change our techniques, tools, and products to find what works best for us and our customers. Always learning more and more about the industry with each passing day, is what makes Ivy cleans the only company in Minneapolis the company you should choose for deep cleaning.
          </p>
        </div>
      </div>
    </section>
  );
}
