"use client"

/*
 * Radix's *.Portal primitives render into document.body by default, which
 * places Select/DropdownMenu/Tooltip/AlertDialog content OUTSIDE the admin's
 * [data-admin-root] wrapper -- the element every admin-only base-layer reset
 * in admin.css is scoped to (see the comment there, and the `border-color`
 * reset in particular). Tailwind v4 resolves an unset border colour to
 * currentColor, so without this, an open Select/DropdownMenu/Tooltip/
 * AlertDialog would draw a text-coloured border instead of the theme one.
 *
 * Rather than widen those resets to the document root -- which would repaint
 * the public site, the one thing globals.css must never do -- this points
 * the portal itself back at [data-admin-root], so the existing scoped
 * selectors reach the portalled content for free, with no new global CSS.
 *
 * Falls back to Radix's own default (document.body, via passing `undefined`
 * through to the `container` prop) outside the admin, so these primitives
 * stay drop-in usable anywhere components/ui is imported from in the future.
 */
export function getAdminPortalContainer(): HTMLElement | undefined {
  if (typeof document === "undefined") return undefined
  return document.querySelector<HTMLElement>("[data-admin-root]") ?? undefined
}
