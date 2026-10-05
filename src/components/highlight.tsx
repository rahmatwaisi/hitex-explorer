import type { CSSProperties, ReactNode } from "react"

import { keywordOf, type Matcher } from "@/lib/keywords"
import { HITEX_URL } from "@/lib/links"

/** "HITEX" in Latin script (also HITEX26) and its Arabic / Kurdish spellings, even with a prefix like لـ */
const HITEX_WORD = /(?<![A-Za-z])HITEX(?![A-Za-z])|هايتكس|هایتێکس|هایتکس/giu

interface Range {
  start: number
  end: number
}

interface HighlightProps {
  text: string
  matcher: Matcher | null
  /** link every HITEX mention to the official site; off inside text that is already a link */
  linkHitex?: boolean
}

/** Renders text with keyword occurrences as neon <mark>s and HITEX mentions as links. */
export function Highlight({ text, matcher, linkHitex = true }: HighlightProps) {
  if (!text) return text
  const marks = matcher
    ? [...text.matchAll(matcher.regex)].map((m) => ({
        start: m.index,
        end: m.index + m[0].length,
        keyword: keywordOf(m, matcher),
      }))
    : []
  const links: Range[] = linkHitex
    ? [...text.matchAll(HITEX_WORD)].map((m) => ({ start: m.index, end: m.index + m[0].length }))
    : []
  if (marks.length === 0 && links.length === 0) return text

  // marks clipped to [start, end), so a keyword can span into or out of a link
  const withMarks = (start: number, end: number) => {
    const parts: ReactNode[] = []
    let pos = start
    for (const m of marks) {
      if (m.end <= start || m.start >= end) continue
      const s = Math.max(m.start, start)
      const e = Math.min(m.end, end)
      if (s > pos) parts.push(text.slice(pos, s))
      parts.push(
        <mark key={s} className="neon-mark" style={{ "--neon": m.keyword.color } as CSSProperties}>
          {text.slice(s, e)}
        </mark>
      )
      pos = e
    }
    if (pos < end) parts.push(text.slice(pos, end))
    return parts
  }

  const out: ReactNode[] = []
  let pos = 0
  for (const l of links) {
    if (l.start > pos) out.push(...withMarks(pos, l.start))
    out.push(
      <a key={`hitex-${l.start}`} href={HITEX_URL} target="_blank" rel="noreferrer" className="hitex-link">
        {withMarks(l.start, l.end)}
      </a>
    )
    pos = l.end
  }
  if (pos < text.length) out.push(...withMarks(pos, text.length))
  return out
}

/** Plain UI text with HITEX mentions linked. */
export function HitexText({ children }: { children: string }) {
  return <Highlight text={children} matcher={null} />
}
