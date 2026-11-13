import type { CityContent } from "@/server/content/types";
import { t } from "@/server/content/interpolate";

// our SEO copy, not the live page's: live had a city-less title and a description scraped from the page text
export const csMeta = (c: CityContent) => ({
  title: t("House Cleaning Packages in {city}, {state} | Ivy Cleans", c),
  description: t(
    "Compare the Basic, Deep and Moving cleaning packages from Ivy Cleans in {city}, {state}, with a room-by-room list of what each one covers.",
    c,
  ),
});

export const tiers = ["Basic", "Deep", "Moving"] as const;

export type ChecklistItem = { label: string; basic: boolean; deep: boolean; moving: boolean };
export type Room = { name: string; items: ChecklistItem[] };

// Extracted from cleaning-services.html: check-circle = included, x-circle = excluded, per Basic/Deep/Moving cell
export const rooms: Room[] = [
  {
    name: "Living Rooms / Bedrooms / Hallways",
    items: [
      { label: "Sweep & Mop All Hard Wood / Tile Flooring", basic: true, deep: true, moving: true },
      { label: "Vacuum Carpets & Around Furniture", basic: true, deep: true, moving: true },
      { label: "Change Linens / Make Beds **", basic: true, deep: true, moving: true },
      { label: "Clean / Wipe Mirrors & Glass Items", basic: true, deep: true, moving: true },
      { label: "Dust Doors & Door Frames", basic: false, deep: true, moving: true },
      { label: "Clean Baseboards", basic: false, deep: true, moving: true },
      { label: "Vacuum / Clean Inside furniture", basic: false, deep: false, moving: true },
      { label: "Set / Stage Living Room Items *", basic: false, deep: false, moving: true },
      { label: "Dust Ceiling Fans & Remove Cobwebs *", basic: false, deep: false, moving: true },
    ],
  },
  {
    name: "Bathrooms",
    items: [
      { label: "Sweep & Mop All Flooring", basic: true, deep: true, moving: true },
      { label: "Dust Reachable Vents", basic: true, deep: true, moving: true },
      { label: "Cleaning Of Inside, Outside, and Around Toilet", basic: true, deep: true, moving: true },
      { label: "Wipe, Clean & Dry sink / Faucets", basic: true, deep: true, moving: true },
      { label: "Cleaning Of Shower & Or Tub", basic: false, deep: true, moving: true },
      { label: "Tile & Grout Cleaning", basic: false, deep: true, moving: true },
      { label: "Clean Exteriors Of Cabinets & Drawers", basic: false, deep: false, moving: true },
      { label: "Wipe Mirrors & Glass Items", basic: false, deep: false, moving: true },
      { label: "Clean Baseboards", basic: false, deep: false, moving: true },
    ],
  },
  {
    name: "Kitchens",
    items: [
      { label: "Sweep & Mop All Flooring", basic: true, deep: true, moving: true },
      { label: "Dust Reachable Vents", basic: true, deep: true, moving: true },
      { label: "Wipe, Clean & Dry Sink / Faucets", basic: true, deep: true, moving: true },
      { label: "Dust & Wipe All Kitchen Items Left On Counter Tops", basic: true, deep: true, moving: true },
      {
        label: "Clean Exterior Surfaces Of Fridge, Stove, Microwave, and Dishwasher",
        basic: false,
        deep: true,
        moving: true,
      },
      {
        label: "Clean the Inside Of the Fridge, Stove, Microwave, and Dishwasher",
        basic: false,
        deep: true,
        moving: true,
      },
      { label: "Clean Hood Vents & Light Switches", basic: false, deep: false, moving: true },
      { label: "Clean Exteriors Of Cabinets & Drawers", basic: false, deep: false, moving: true },
      { label: "Clean & Sanitizing Of Counter Tops & Ledges", basic: false, deep: false, moving: true },
    ],
  },
];
