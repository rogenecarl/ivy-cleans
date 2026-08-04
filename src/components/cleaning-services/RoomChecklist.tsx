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

/* post-30.css custom CSS: `.package2` (the room header rows) and `.package3`
   (the item rows) carry left/right 1px rgb(134,198,176) borders, `.package3`
   also a 1px #e5e7eb rule underneath, and the single `.last-package` row
   closes the table with a green bottom border, 4px radius and a shadow.
   Columns stay 40/20/20/20 down to 390px — the table never stacks. */
const SIDE_BORDER = "border-r border-l border-[rgb(134,198,176)]";

export default function RoomChecklist({ room, last = false }: { room: Room; last?: boolean }) {
  return (
    <section className={`px-[1rem] ${last ? "pb-[3rem]" : ""}`}>
      <div className="mx-auto max-w-[119rem]">
        {/* header row (.package2) */}
        <div className={`bg-herogreen flex ${SIDE_BORDER}`}>
          <div className="w-[40%] p-[1.2rem_1.6rem]">
            <h2 className="text-[1.6rem] leading-[1.2em] font-semibold text-white">{room.name}</h2>
          </div>
          {tiers.map((tier) => (
            <div key={tier} className="w-[20%] p-[1.2rem_1.6rem] text-center">
              <h3 className="text-[1.4rem] leading-[1.2em] font-medium text-white">{tier}</h3>
            </div>
          ))}
        </div>

        {/* item rows (.package3, the final one also .last-package) */}
        {room.items.map((item, i) => {
          const isLastRow = last && i === room.items.length - 1;
          return (
            <div
              key={item.label}
              className={`flex ${SIDE_BORDER} ${
                isLastRow
                  ? "rounded-b-[4px] border-b border-b-[rgb(134,198,176)] shadow-[0_4px_6px_-1px_rgba(0,0,0,.1),0_2px_4px_-2px_rgba(0,0,0,.1)]"
                  : "border-b border-b-[#e5e7eb]"
              }`}
            >
              <div className="w-[40%] p-[1.2rem_1.6rem]">
                {/* globals.css' unlayered `p { line-height: 1.5 }` outranks
                    Tailwind's leading-* utilities, so the live 1.2em (label
                    measures h=58 for 3 lines @390) has to be set inline. */}
                <p
                  className="text-herogreen text-[1.6rem] font-normal"
                  style={{ lineHeight: "1.2em" }}
                >
                  {item.label}
                </p>
              </div>
              <div
                className="flex w-[20%] items-center justify-center bg-white p-[1.2rem_1.6rem]"
                aria-label={item.basic ? "Included" : "Not included"}
              >
                {item.basic ? <CheckIcon /> : <XIcon />}
              </div>
              <div
                className="flex w-[20%] items-center justify-center bg-[#ECF9F9] p-[1.2rem_1.6rem]"
                aria-label={item.deep ? "Included" : "Not included"}
              >
                {item.deep ? <CheckIcon /> : <XIcon />}
              </div>
              <div
                className="flex w-[20%] items-center justify-center bg-white p-[1.2rem_1.6rem]"
                aria-label={item.moving ? "Included" : "Not included"}
              >
                {item.moving ? <CheckIcon /> : <XIcon />}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
