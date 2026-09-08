// src/leads/client-ip.ts
// Client IP from proxy headers. x-real-ip is set by the edge. x-forwarded-for is APPENDED per hop, so the LAST entry
// is the trusted one — taking [0] would let a bot rotate fake IPs past the rate limit.
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
