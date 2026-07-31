import { tiers, type Room } from "@/data/cleaning-services";

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="mx-auto h-[2.4rem] w-[2.4rem] text-[#10b981]"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="mx-auto h-[2.4rem] w-[2.4rem] text-gray-300"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
      />
    </svg>
  );
}

export default function RoomChecklist({ room }: { room: Room }) {
  return (
    <section className="px-[1rem]">
      <div className="ec">
        {/* header row */}
        <div className="flex flex-wrap">
          <div className="bg-herogreen w-full p-[1.2rem_1.6rem] lg:w-[40%]">
            <h2 className="text-[1.6rem] leading-[1.2em] font-semibold text-white">{room.name}</h2>
          </div>
          {tiers.map((tier) => (
            <div key={tier} className="bg-herogreen w-1/3 p-[1.2rem_1.6rem] text-center lg:w-[20%]">
              <h3 className="text-[1.4rem] leading-[1.2em] font-medium text-white">{tier}</h3>
            </div>
          ))}
        </div>

        {/* item rows */}
        {room.items.map((item) => (
          <div key={item.label} className="flex flex-wrap">
            <div className="w-full p-[1.2rem_1.6rem] lg:w-[40%]">
              <p className="text-herogreen text-[1.6rem] leading-[1.5em] font-normal">{item.label}</p>
            </div>
            <div
              className="flex w-1/3 items-center justify-center bg-white p-[1.2rem_1.6rem] lg:w-[20%]"
              aria-label={item.basic ? "Included" : "Not included"}
            >
              {item.basic ? <CheckIcon /> : <XIcon />}
            </div>
            <div
              className="flex w-1/3 items-center justify-center bg-[#ECF9F9] p-[1.2rem_1.6rem] lg:w-[20%]"
              aria-label={item.deep ? "Included" : "Not included"}
            >
              {item.deep ? <CheckIcon /> : <XIcon />}
            </div>
            <div
              className="flex w-1/3 items-center justify-center bg-white p-[1.2rem_1.6rem] lg:w-[20%]"
              aria-label={item.moving ? "Included" : "Not included"}
            >
              {item.moving ? <CheckIcon /> : <XIcon />}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
