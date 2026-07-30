type IconProps = { className?: string };

/* solid handset, matches the live site's fa-phone-alt glyph */
export function PhoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.32.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1c-9.39 0-17-7.61-17-17a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

export function EnvelopeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}

export function MapMarkerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M8.6 4.6 7.2 6l6 6-6 6 1.4 1.4L16 12z" />
    </svg>
  );
}

export function CaretDownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M6 9h12l-6 7z" />
    </svg>
  );
}

/* rounded grey tile with a green glyph, as used in the live top bar */
export function TileIcon({ kind }: { kind: "phone" | "email" }) {
  return (
    <span className="flex h-[5rem] w-[5rem] shrink-0 items-center justify-center rounded-[1rem] bg-[#f2f2f2]">
      {kind === "phone" ? (
        <PhoneIcon className="text-brand h-[2.6rem] w-[2.6rem]" />
      ) : (
        <EnvelopeIcon className="text-brand h-[2.6rem] w-[2.6rem]" />
      )}
    </span>
  );
}
