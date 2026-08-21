// src/leads/client-ip.ts
/*
 * Extracts the request's IP address from trusted proxy headers.
 *
 * Prefer `x-real-ip`: the platform's edge layer sets it itself, and a client
 * cannot inject its own value through it.
 *
 * `x-forwarded-for` is different, and easy to get backwards. Vercel (and most
 * reverse proxies) APPEND to this header on each hop rather than overwriting
 * it, so a client that sends `X-Forwarded-For: 1.2.3.4` produces
 * `"1.2.3.4, <real ip>"` by the time it reaches the app -- the FIRST entry is
 * attacker-controlled, and the LAST is the one the trusted proxy appended.
 * Taking `[0]` (the "simplification" someone will reach for later) trusts
 * whatever the client wrote, which lets a bot rotate a fresh fake IP on every
 * request and silently defeats the per-IP rate limit. Only the last entry is
 * safe to treat as the request's real origin.
 */
export function clientIp(headers: Pick<Headers, 'get'>): string | null {
  const realIp = headers.get('x-real-ip')
  if (realIp && realIp.trim() !== '') return realIp.trim()

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part !== '')
    if (parts.length > 0) return parts[parts.length - 1]
  }

  return null
}
