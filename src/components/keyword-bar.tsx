import { useState, type CSSProperties, type KeyboardEvent } from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && draft.trim()) {
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
          placeholder="Type a keyword and press Enter to highlight it…"
          className="h-10 ps-9 text-base"
          aria-label="Add highlight keyword"
          autoFocus
        />
      </div>

      {keywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {keywords.map((k) => (
            <Badge
              key={k.id}
              variant="outline"
              className="neon-chip h-7 gap-1.5 ps-2.5 pe-1 text-sm"
              style={{ "--neon": k.color } as CSSProperties}
            >
              <span className="size-2 rounded-full" style={{ background: k.color }} />
              {k.text}
              <span className="text-xs text-muted-foreground tabular-nums">{counts.get(k.id) ?? 0}</span>
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
