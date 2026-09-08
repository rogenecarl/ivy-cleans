// two live sections: 2fad378 heading (padding 4rem 0 0) and b092bd1 body, kept separate for the 10+10px gutters
export default function Principles({ principles }: { principles: string[] }) {
  return (
    <>
      <section className="bg-white pt-[4rem]">
        <div className="ec flex flex-col">
          <h2 className="text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[1rem] md:text-[4rem] lg:text-[4.5rem]">
            Our Principles And Assurance
          </h2>
        </div>
      </section>
      <section className="bg-white">
        <div className="ec flex flex-col">
          <div className="text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
            {principles.map((p) => (
              <p key={p.slice(0, 40)} className="mb-[2rem]">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
