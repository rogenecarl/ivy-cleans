// Web sources behind the research findings. A research pass numbers its own sources [1], [2]…; mergeSources gives
// every distinct URL one id (S1, S2…) across all passes, so structuring can tag each fact with where it came from.

export type ResearchSource = { id: string; url: string; title: string; quotes: string[] }

/** One research pass: findings text with [n] markers, n = 1-based index into `sources`. */
export type ResearchResult = { text: string; sources: ResearchSource[] }

export function mergeSources(parts: Record<string, ResearchResult>): {
  texts: Record<string, string>
  sources: ResearchSource[]
} {
  const byUrl = new Map<string, ResearchSource>()
  const texts: Record<string, string> = {}
  for (const [key, part] of Object.entries(parts)) {
    const localToGlobal = new Map<string, string>()
    part.sources.forEach((source, i) => {
      let merged = byUrl.get(source.url)
      if (!merged) {
        merged = { id: `S${byUrl.size + 1}`, url: source.url, title: source.title, quotes: [] }
        byUrl.set(source.url, merged)
      }
      for (const quote of source.quotes) if (!merged.quotes.includes(quote)) merged.quotes.push(quote)
      localToGlobal.set(String(i + 1), merged.id)
    })
    texts[key] =
      part.sources.length === 0
        ? part.text
        : part.text.replace(/\[(\d+)\]/g, (marker, n: string) => {
            const id = localToGlobal.get(n)
            return id ? `[${id}]` : marker
          })
  }
  return { texts, sources: [...byUrl.values()] }
}

/** A stored pass: plain text from before sources were kept, or a full result. */
export function asResearchResult(part: string | ResearchResult): ResearchResult {
  return typeof part === 'string' ? { text: part, sources: [] } : part
}
