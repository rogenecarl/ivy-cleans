export const packagesIntro =
  "Under this section, we provide different types of cleaning services in Minneapolis. Our services include residential cleaning, commercial cleaning, office cleaning, and more. Our team of professional cleaners is experienced in handling any type of cleaning job, no matter how big or small. We use high-quality cleaning products and equipment to ensure the best possible results for our clients. Our team is also flexible, and we work around our client’s schedules to provide cleaning services at a time that is convenient for them.";

export type Pkg = { title: string; text: string; icon: string };
export const packages: Pkg[] = [
  { title: "Standard Cleaning", text: "Maintaining frequently used sections of your household ensures a worry-free living experience. Choose between scheduling one-time, bi-weekly, or monthly services!", icon: "/images/icon1.png" },
  { title: "Deep Cleaning", text: "A comprehensive sanitation of your residence, encompassing inaccessible regions such as beneath furniture and appliances, as well as baseboards and window sills.", icon: "/images/icon6.png" },
  { title: "Move In/Move Out Cleaning", text: "A comprehensive cleaning service that covers all areas of the home, from top to bottom, including activities such as dusting, vacuuming, and disinfecting surfaces in order to ready the residence for its new occupants.", icon: "/images/icon2.png" },
  { title: "Condo Cleaning", text: "Efficient and comprehensive cleaning service designed specifically for condominiums, ensuring every room is meticulously cleaned, from living areas to bedrooms and kitchens.", icon: "/images/icon7.png" },
  { title: "AirBnB Cleaning", text: "A specialized cleaning service designed specifically for the maintenance of temporary accommodations, which includes tasks such as handling laundry, restocking supplies, and guaranteeing excellent guest reviews.", icon: "/images/icon3.png" },
  { title: "Rental Cleaning", text: "A specialized cleaning service tailored for extended rental properties, guaranteeing that the property is immaculate and in a hospitable state for future tenants.", icon: "/images/icon8.png" },
  { title: "Renovation & Post Construction Cleaning", text: "A cleaning process that entails the elimination of dust, debris, and other construction materials following a renovation or construction endeavor.", icon: "/images/icon4.png" },
  { title: "Eco Friendly Green Cleaning", text: "Upon your preference, we are able to employ organic cleaning substances in order to guarantee a chemical-free environment in your residence.", icon: "/images/icon9.png" },
  { title: "Commercial & Office Cleaning", text: "A cleaning service that entails the preservation of cleanliness and maintenance of office spaces and clinics.", icon: "/images/icon5.png" },
  { title: "Maid Service", text: "Consistent and thorough cleaning of your entire residence, customized to fit your individual lifestyle and timetable.", icon: "/images/icon10.png" },
];
