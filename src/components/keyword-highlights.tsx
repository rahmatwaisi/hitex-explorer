import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { ArrowDownIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { highlightVars } from "@/lib/highlight-colors"
import { buildMatcher, keywordOf, type Keyword } from "@/lib/keywords"

const supported = typeof CSS !== "undefined" && "highlights" in CSS

/**
 * Highlights the search keywords in the page it wraps (a startup profile), with "next match"
 * navigation. Uses the CSS Custom Highlight API, so the page's DOM is never changed and React
 * keeps full control of it; it rescans whenever the page's content changes.
 */
export function KeywordHighlights({ keywords, onClear, children }: { keywords: Keyword[]; onClear: () => void; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const matcher = useMemo(() => buildMatcher(keywords), [keywords])
  const ranges = useRef<Range[]>([])
  const [count, setCount] = useState(0)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const el = root.current
    if (!el || !matcher || !supported) return
    const names = new Set<string>()
    let frame = 0
    const scan = () => {
      const byKeyword = new Map<number, Range[]>()
      const all: Range[] = []
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement?.closest("style, script")) continue
        for (const m of (node.nodeValue ?? "").matchAll(matcher.regex)) {
          const range = new Range()
          range.setStart(node, m.index)
          range.setEnd(node, m.index + m[0].length)
          const id = keywordOf(m, matcher).id
          byKeyword.set(id, [...(byKeyword.get(id) ?? []), range])
          all.push(range)
        }
      }
      for (const name of names) CSS.highlights.delete(name)
      names.clear()
      for (const [id, list] of byKeyword) {
        CSS.highlights.set(`kw-${id}`, new Highlight(...list))
        names.add(`kw-${id}`)
      }
      CSS.highlights.delete("kw-current")
      ranges.current = all
      setCount(all.length)
      setCurrent(0)
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(scan)
    }
    schedule()
    // the profile loads after this mounts, and changes with the language
    const observer = new MutationObserver(schedule)
    observer.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      for (const name of names) CSS.highlights.delete(name)
      CSS.highlights.delete("kw-current")
    }
  }, [matcher])

  const next = () => {
    const all = ranges.current
    if (!all.length) return
    const i = current % all.length
    const range = all[i]
    const mark = new Highlight(range)
    mark.priority = 1
    CSS.highlights.set("kw-current", mark)
    const rect = range.getBoundingClientRect()
    window.scrollTo({ top: window.scrollY + rect.top - window.innerHeight / 3, behavior: "smooth" })
    setCurrent(i + 1)
  }

  const shown = matcher && supported ? count : 0
  return (
    <>
      {matcher && (
        <>
          <style>
            {keywords
              .map(
                (k) =>
                  `::highlight(kw-${k.id}) { background-color: var(--rx-${k.color}-4); color: var(--rx-${k.color}-12); text-decoration: underline 2px var(--rx-${k.color}-9); }\n` +
                  `.dark ::highlight(kw-${k.id}) { background-color: var(--rx-${k.color}-5); }`
              )
              .join("\n")}
            {"::highlight(kw-current) { text-decoration: underline 3px solid currentColor; text-underline-offset: 4px; }"}
          </style>
          <div className="sticky top-(--header-h) z-10 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-2.5 text-sm sm:px-6">
              <span className="text-muted-foreground">Highlighting</span>
              {keywords.map((k) => (
                <Badge key={k.id} variant="outline" className="kw-chip gap-1.5" style={highlightVars(k.color) as CSSProperties}>
                  <span className="kw-dot size-2 rounded-full" />
                  {k.text}
                </Badge>
              ))}
              <span className="text-muted-foreground tabular-nums">
                {!supported
                  ? "· not supported by this browser"
                  : current > 0
                    ? `· ${((current - 1) % Math.max(shown, 1)) + 1} of ${shown}`
                    : `· ${shown} ${shown === 1 ? "match" : "matches"}`}
              </span>
              <div className="ms-auto flex gap-1">
                <Button size="sm" variant="outline" onClick={next} disabled={shown === 0}>
                  <ArrowDownIcon data-icon="inline-start" /> Next match
                </Button>
                <Button size="sm" variant="ghost" onClick={onClear}>
                  <XIcon data-icon="inline-start" /> Clear
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
      <div ref={root}>{children}</div>
    </>
  )
}
