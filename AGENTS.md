<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Styling conventions (ivycleans clone)

- `src/app/globals.css` defines a viewport-stepped `html { font-size }` ladder copied from the live site's Elementor kit. Tailwind's rem-based utilities scale with it — DO NOT use default utilities like `text-sm`/`p-4` for sizes that must match the live site. Use explicit arbitrary values (`text-[1.8rem]`, `py-[6rem]`) traced to the reference CSS.
- Source of truth for every size/color: `docs/superpowers/reference/ivycleans-live/post-<id>.css` (front page 2035, /home 8, /cleaning-services 30, kit 6). Find a section's `elementor-element-XXXXXXX` id in the matching reference HTML, then grep that id in the CSS.
- Site font is Poppins (via `next/font`); the kit's Raleway appears only where the reference CSS says so.
- Apostrophes in JSX copy must render U+2019: use `&rsquo;` or a literal ’ (straight `'` fails lint and mismatches the live copy).
- All user-visible copy lives in `src/data/*.ts`, byte-verbatim from `docs/superpowers/reference/ivycleans-live/*content-dump*.txt` (typos included). Never paraphrase.
- The operator console lives at `/admin` (`src/app/admin/`) and requires a
  session. `src/lib/access.ts` is the ONLY place the role matrix lives — add a
  console section there, not in the nav and not in the proxy. Every server
  action under `(console)/` must start with `requireAdmin()` or
  `requireSession()`: a layout guard does not run for an action POST.
- Operator accounts come from `scripts/seed-user.mjs`. There is no signup
  route and adding one is a decision, not a convenience.
