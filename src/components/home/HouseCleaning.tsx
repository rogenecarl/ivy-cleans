import Link from "next/link";
import { houseCleaning } from "@/data/home";

export default function HouseCleaning() {
  return (
    <section className="bg-[#fafafa] py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          House Cleaning Services Minneapolis
        </h2>
        <div className="text-[1.6rem] leading-[1.5em] font-light md:text-[1.8rem] lg:text-[1.9rem]">
          {houseCleaning.map((p) => (
            <p key={p.slice(0, 40)} className="mb-[2rem]">
              {p}
            </p>
          ))}
          <p className="mb-[2rem]">
            In addition to our main services, We also offer{" "}
            <Link href="/deep-cleaning-minneapolis" className="text-rust underline">
              Deep Cleaning in Minneapolis
            </Link>{" "}
            and{" "}
            <Link href="/minneapolis-move-out-cleaning-services" className="text-rust underline">
              Move-out cleaning Minneapolis
            </Link>
            , if you’re interested.
          </p>
        </div>
      </div>
    </section>
  );
}
