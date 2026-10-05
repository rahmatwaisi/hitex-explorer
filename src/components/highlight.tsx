import type { CSSProperties, ReactNode } from "react"

import { keywordOf, type Matcher } from "@/lib/keywords"

/** Renders text with every keyword occurrence wrapped in a neon <mark>. */
export function Highlight({ text, matcher }: { text: string; matcher: Matcher | null }) {
  if (!matcher || !text) return text

  const parts: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(matcher.regex)) {
    const start = m.index
    if (start > last) parts.push(text.slice(last, start))
    const keyword = keywordOf(m, matcher)
    parts.push(
      <mark key={start} className="neon-mark" style={{ "--neon": keyword.color } as CSSProperties}>
        {m[0]}
      </mark>
    )
    last = start + m[0].length
  }
  if (last === 0) return text
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
