// Blank and absent env both mean "not configured": env templates ship blank lines, and `??` only fires on undefined.
export function readEnv(name: string): string | null {
  const trimmed = process.env[name]?.trim()
  return trimmed ? trimmed : null
}
