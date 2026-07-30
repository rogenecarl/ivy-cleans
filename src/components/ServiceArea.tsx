import Link from "next/link";
import { areas } from "@/data/areas";

export default function ServiceArea() {
  return (
    <section className="bg-cover bg-center py-16" style={{ backgroundImage: "url(/images/cleaning-bg2.jpg)" }}>
      <div className="mx-auto max-w-[1140px] px-4 text-center">
        <h3 className="text-[1.6rem] font-semibold">House Cleaning Services Near Me in Minneapolis, MN</h3>
        <h2 className="mt-2 text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">Areas We Serve</h2>
        <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 text-left sm:grid-cols-3 lg:grid-cols-4">
          {areas.map((a) => (
            <li key={a.name}>
              <Link href={a.href} className="hover:text-rust font-medium underline-offset-2 hover:underline">
                {a.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
