// Leads per week for the dashboard chart; pure so both the store and the page logic use the same buckets.
const WEEK_MS = 7 * 86_400_000

/** Counts per week for the last `weeks` weeks, oldest first; the newest bucket ends at `now`. */
export function bucketByWeek(dates: readonly Date[], now: Date, weeks: number): number[] {
  const out = new Array<number>(weeks).fill(0)
  for (const d of dates) {
    const age = now.getTime() - d.getTime()
    if (age < 0) continue
    const index = weeks - 1 - Math.floor(age / WEEK_MS)
    if (index >= 0) out[index] += 1
  }
  return out
}
