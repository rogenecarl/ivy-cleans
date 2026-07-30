import Image from "next/image";

export default function FeaturedIn() {
  return (
    <section className="bg-brand py-[1rem] md:py-[3rem]">
      {/* full-bleed on the live site — the logo strip spans the viewport */}
      <div className="p-[10px] text-center">
        <h3 className="mb-[2rem] text-[1.8rem] leading-[1.2em] font-bold text-white">FEATURED IN:</h3>
        <Image
          src="/images/Group-5.png"
          alt=""
          width={1824}
          height={51}
          className="mb-[2rem] hidden h-auto w-full md:block"
        />
        <div className="space-y-[2rem] md:hidden">
          <Image src="/images/logo-mbl1.png" alt="" width={800} height={51} className="h-auto w-full" />
          <Image src="/images/logo-mbl2.png" alt="" width={800} height={42} className="h-auto w-full" />
        </div>
      </div>
    </section>
  );
}
