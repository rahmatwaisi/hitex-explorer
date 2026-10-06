import { HIGHLIGHT_COLORS, type HighlightColor } from "@/lib/highlight-colors"

export interface Keyword {
  id: number
  text: string
  /** a Radix Colors scale (src/lib/highlight-colors.ts) */
  color: HighlightColor
}

/** The first colour no keyword uses yet, in the palette's order (there are as many colours as keywords allowed). */
export function nextColor(keywords: Keyword[]): HighlightColor {
  const used = new Set(keywords.map((k) => k.color))
  return HIGHLIGHT_COLORS.find((c) => !used.has(c)) ?? HIGHLIGHT_COLORS[keywords.length % HIGHLIGHT_COLORS.length]
}

export interface Matcher {
  regex: RegExp
  /** keyword for each capture group, in group order */
  groups: Keyword[]
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Letters written differently across Arabic, Kurdish and Persian (and on different keyboards),
 * digits in three scripts, and dash styles: any of a group matches any other.
 */
const VARIANTS = [
  "يیىێ", // yeh: Arabic, Persian, alef maksura, Kurdish ê
  "كکڪ", // kaf: Arabic, Persian / Kurdish
  "هةۀھە", // heh, teh marbuta, heh with yeh, heh doachashmee, Kurdish ae
  "اأإآٱ", // alef and its hamza / madda forms
  "وؤۆ", // waw, waw with hamza, Kurdish o
  "-‐‑–—", // hyphen and dashes ("2-10" finds "2–10")
  ...Array.from({ length: 10 }, (_, d) => `${d}${String.fromCharCode(0x660 + d)}${String.fromCharCode(0x6f0 + d)}`),
]
const VARIANT_OF = new Map<string, string>()
for (const group of VARIANTS) for (const ch of group) VARIANT_OF.set(ch, `[${group.replace(/[\]\\^-]/g, "\\$&")}]`)

/** Marks that don't change a word: harakat, superscript alef, tatweel, zero-width (non-)joiners, direction isolates. */
const IGNORABLE = "\\u064B-\\u065F\\u0670\\u0640\\u200C\\u200D\\u2066-\\u2069"
const IGNORABLE_RE = new RegExp(`[${IGNORABLE}]`, "gu")
const SKIP = `[${IGNORABLE}]*`

/** Regex source matching the keyword in any of its spellings, case-insensitively. */
function pattern(text: string): string {
  const chars = [...text.normalize("NFC").toLowerCase().replace(IGNORABLE_RE, "").trim()]
  return chars
    .map((ch) => (/\s/.test(ch) ? "[\\s\\u200C]*" : (VARIANT_OF.get(ch) ?? escapeRegExp(ch))))
    .join(SKIP)
}

/** Matches keywords as substrings, tolerant of spelling variants; longer keywords win where they overlap. */
export function buildMatcher(keywords: Keyword[]): Matcher | null {
  if (keywords.length === 0) return null
  // a keyword made only of marks (e.g. a lone tatweel) would match everywhere
  const groups = [...keywords].filter((k) => pattern(k.text)).sort((a, b) => b.text.length - a.text.length)
  if (groups.length === 0) return null
  const regex = new RegExp(groups.map((k) => `(${pattern(k.text)})`).join("|"), "giu")
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

// each colour's card ring for the current theme (src/highlight-colors.css)
const strong = (c: HighlightColor) => `box-shadow: var(--rx-${c}-ring)`
const soft = (c: HighlightColor) => `box-shadow: var(--rx-${c}-ring-soft)`

/** "33.33" for keyframe offsets */
const pct = (x: number) => (x * 100).toFixed(2)

/**
 * Keyframes that pulse each keyword's colour in turn: soft, strong in the middle, soft again, then a
 * jump to the next keyword's colour. Never fading from one colour into another, so the card never
 * shows a mix (blue into amber passes through grey-green) that matches none of its keywords.
 */
export function glowKeyframes(keywords: Keyword[]): string {
  const n = keywords.length
  const stops: string[] = []
  keywords.forEach((k, i) => {
    stops.push(`${pct(i / n)}% { ${soft(k.color)} }`)
    stops.push(`${pct((i + 0.5) / n)}% { ${strong(k.color)} }`)
    stops.push(`${(((i + 1) / n) * 100 - 0.01).toFixed(2)}% { ${soft(k.color)} }`)
  })
  stops.push(`100% { ${soft(keywords[0].color)} }`)
  return `@keyframes ${glowName(keywords)} { ${stops.join(" ")} }`
}

export const GLOW_SECONDS_PER_COLOR = 2.4

// the card's bulbs, one per matching keyword, light up like a stadium wave: each bulb a moment after
// the one before, fading while the next one rises, then a short pause before the next wave
const WAVE_STEP = 0.16
const WAVE_RISE = 0.25
const WAVE_FALL = 0.5
const WAVE_PAUSE = 0.9

/** A wave over `n` bulbs: its keyframes (timed for n), how long it takes, and each bulb's delay. */
export function wave(n: number) {
  const seconds = (n - 1) * WAVE_STEP + WAVE_RISE + WAVE_FALL + WAVE_PAUSE
  const at = (s: number) => ((s / seconds) * 100).toFixed(2)
  const name = `kw-wave-${n}`
  return {
    name,
    seconds,
    delay: (i: number) => i * WAVE_STEP,
    keyframes:
      `@keyframes ${name} { 0% { background-color: var(--hl-5); box-shadow: inset 0 0 0 1px var(--hl-7) } ` +
      `${at(WAVE_RISE)}% { background-color: var(--hl-9); box-shadow: inset 0 0 0 1px var(--hl-9), 0 0 8px 1px var(--hl-9); transform: scale(1.15) } ` +
      `${at(WAVE_RISE + WAVE_FALL)}%, 100% { background-color: var(--hl-5); box-shadow: inset 0 0 0 1px var(--hl-7); transform: scale(1) } }`,
  }
}

/** Animation name for a card whose keywords are found only in its hidden text (full profile, other languages). */
export function deepGlowName(keywords: Keyword[]): string {
  return `neon-deep-${keywords.map((k) => k.id).join("-")}`
}

/** Dashed outline showing the keyword colours in turn (see [data-deep-match] in index.css). */
export function deepGlowKeyframes(keywords: Keyword[]): string {
  const n = keywords.length
  // each colour holds for its share of the cycle, then the next one takes over (no blended colours)
  const stops = keywords.flatMap((k, i) => [
    `${pct(i / n)}% { outline-color: var(--rx-${k.color}-9) }`,
    `${(((i + 1) / n) * 100 - 0.01).toFixed(2)}% { outline-color: var(--rx-${k.color}-9) }`,
  ])
  stops.push(`100% { outline-color: var(--rx-${keywords[0].color}-9) }`)
  return `@keyframes ${deepGlowName(keywords)} { ${stops.join(" ")} }`
}
