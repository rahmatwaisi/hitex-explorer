import { useState, type CSSProperties, type KeyboardEvent } from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MAX_KEYWORDS, highlightVars } from "@/lib/highlight-colors"
import type { Keyword } from "@/lib/keywords"

interface KeywordBarProps {
  keywords: Keyword[]
  /** cards matching each keyword id */
  counts: Map<number, number>
  onAdd: (text: string) => void
  onRemove: (id: number) => void
  onClear: () => void
}

export function KeywordBar({ keywords, counts, onAdd, onRemove, onClear }: KeywordBarProps) {
  const [draft, setDraft] = useState("")
  // one colour per keyword: at the limit, a keyword has to go before another can be added
  const full = keywords.length >= MAX_KEYWORDS

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && draft.trim()) {
      if (full) return
      onAdd(draft.trim())
      setDraft("")
    } else if (e.key === "Backspace" && !draft && keywords.length > 0) {
      onRemove(keywords[keywords.length - 1].id)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={full ? `${MAX_KEYWORDS} keywords is the maximum: remove one to add another` : "Type a keyword and press Enter to highlight it…"}
          className="h-10 ps-9 text-base"
          aria-label="Add highlight keyword"
          aria-describedby={full ? "keyword-limit" : undefined}
          autoFocus
        />
      </div>
      {full && (
        <p id="keyword-limit" role="status" className="-mt-1 text-sm text-muted-foreground">
          {MAX_KEYWORDS} keywords is the maximum. Remove one to add another.
        </p>
      )}

      {keywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {keywords.map((k) => (
            <Badge
              key={k.id}
              variant="outline"
              className="kw-chip h-7 gap-1.5 ps-2.5 pe-1 text-sm"
              style={highlightVars(k.color) as CSSProperties}
            >
              <span className="kw-dot size-2 rounded-full" />
              {k.text}
              <span className="text-xs tabular-nums opacity-70">{counts.get(k.id) ?? 0}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-full"
                onClick={() => onRemove(k.id)}
                aria-label={`Remove ${k.text}`}
              >
                <XIcon />
              </Button>
            </Badge>
          ))}
          {keywords.length > 1 && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
