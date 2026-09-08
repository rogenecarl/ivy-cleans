"use client"

// Radix portals render into document.body, outside [data-admin-root] where admin.css's resets are scoped —
// without this an open Select/Dropdown/Tooltip/AlertDialog draws text-coloured borders. Falls back to body outside the admin.
export function getAdminPortalContainer(): HTMLElement | undefined {
  if (typeof document === "undefined") return undefined
  return document.querySelector<HTMLElement>("[data-admin-root]") ?? undefined
}
