import Image from "next/image";

export default function FeaturedIn() {
  return (
    <section className="bg-white py-10">
      <div className="mx-auto max-w-[1140px] px-4 text-center">
        <h3 className="mb-6 text-[1.4rem] font-bold tracking-wide">FEATURED IN:</h3>
        <Image src="/images/Group-5.png" alt="" width={1824} height={51} className="hidden h-auto w-full md:block" />
        <div className="space-y-4 md:hidden">
          <Image src="/images/logo-mbl1.png" alt="" width={800} height={51} className="h-auto w-full" />
          <Image src="/images/logo-mbl2.png" alt="" width={800} height={42} className="h-auto w-full" />
        </div>
      </div>
    </section>
  );
}
