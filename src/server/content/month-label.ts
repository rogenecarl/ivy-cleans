/** "2024-03" -> "March 2024"; a bare year or anything else is the operator's text, passed through. */
export function monthYearLabel(value: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(value)
  if (!m) return value
  const month = Number(m[2])
  if (month < 1 || month > 12) return value
  const name = new Date(Date.UTC(2000, month - 1, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
  return `${name} ${m[1]}`
}
