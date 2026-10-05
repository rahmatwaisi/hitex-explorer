export interface Keyword {
  id: number
  text: string
  color: string
}

export const NEON_COLORS = [
  "#39ff14", // green
  "#ff2bd6", // magenta
  "#00e5ff", // cyan
  "#ffea00", // yellow
  "#ff6d00", // orange
  "#b026ff", // purple
  "#ff1744", // red
  "#00ffa3", // mint
  "#2979ff", // blue
  "#c6ff00", // lime
]

/** Least-used palette color, so a new keyword never repeats a live color while others are free. */
export function nextColor(keywords: Keyword[]): string {
  const used = new Map(NEON_COLORS.map((c) => [c, 0]))
  for (const k of keywords) used.set(k.color, (used.get(k.color) ?? 0) + 1)
  return NEON_COLORS.reduce((best, c) => (used.get(c)! < used.get(best)! ? c : best))
}

export interface Matcher {
  regex: RegExp
  /** keyword for each capture group, in group order */
  groups: Keyword[]
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Case-insensitive substring matcher; longer keywords win where they overlap. */
export function buildMatcher(keywords: Keyword[]): Matcher | null {
  if (keywords.length === 0) return null
  const groups = [...keywords].sort((a, b) => b.text.length - a.text.length)
  const regex = new RegExp(groups.map((k) => `(${escapeRegExp(k.text)})`).join("|"), "giu")
  return { regex, groups }
}

export function keywordOf(match: RegExpMatchArray, matcher: Matcher): Keyword {
  const i = match.findIndex((g, idx) => idx > 0 && g !== undefined)
  return matcher.groups[i - 1]
}

/** Ids of keywords found anywhere in the given texts. */
export function matchedIds(texts: string[], matcher: Matcher | null): Set<number> {
  const ids = new Set<number>()
  if (!matcher) return ids
  for (const text of texts) {
    for (const m of text.matchAll(matcher.regex)) ids.add(keywordOf(m, matcher).id)
  }
  return ids
}

/** Animation name for a card matching this set of keywords (in keyword-list order). */
export function glowName(keywords: Keyword[]): string {
  return `neon-glow-${keywords.map((k) => k.id).join("-")}`
}

const strong = (c: string) => `box-shadow: 0 0 0 1.5px ${c}, 0 0 14px ${c}cc, 0 0 36px ${c}66`
const soft = (c: string) => `box-shadow: 0 0 0 1px ${c}aa, 0 0 6px ${c}66, 0 0 14px ${c}22`

/**
 * Keyframes that pulse each color in turn: strong at i/n, soft at the midpoint,
 * so a single keyword breathes and several keywords cycle through their colors.
 */
export function glowKeyframes(keywords: Keyword[]): string {
  const n = keywords.length
  const stops: string[] = []
  keywords.forEach((k, i) => {
    stops.push(`${((i / n) * 100).toFixed(2)}% { ${strong(k.color)} }`)
    stops.push(`${(((i + 0.5) / n) * 100).toFixed(2)}% { ${soft(k.color)} }`)
  })
  stops.push(`100% { ${strong(keywords[0].color)} }`)
  return `@keyframes ${glowName(keywords)} { ${stops.join(" ")} }`
}

export const GLOW_SECONDS_PER_COLOR = 2.4
