import { useMemo, useState } from "react"
import { SearchIcon } from "lucide-react"

import { HitexText } from "@/components/highlight"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { pick, textDir, type Lang, type Startup } from "@/lib/data"

/** Search box over the startups HITEX lists; only these can have a profile. */
export function StartupSearch({
  startups,
  profiles,
  lang,
  onPick,
  onType,
  showResults = true,
}: {
  startups: Startup[]
  /** HITEX startup id -> slug of its profile */
  profiles: Map<string, string>
  lang: Lang
  onPick: (s: Startup) => void
  onType?: () => void
  showResults?: boolean
}) {
  const [query, setQuery] = useState("")
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return startups
      .filter((s) =>
        [s.name?.en, s.name?.ar, s.name?.ku, s.name?.fa, s.category?.en].some((v) => v?.toLowerCase().includes(q))
      )
      .slice(0, 8)
  }, [query, startups])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onType?.()
          }}
          placeholder="Startup or founder name, in any language…"
          className="h-10 ps-9 text-base"
          aria-label="Search HITEX startups"
        />
      </div>

      {showResults && query.trim() && (
        <ul className="flex flex-col divide-y rounded-lg border">
          {matches.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">
              <HitexText>No startup with that name in HITEX's list. Only listed startups can have a profile.</HitexText>
            </li>
          )}
          {matches.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onPick(s)}
                className="flex w-full items-center justify-between gap-3 p-3 text-start hover:bg-muted"
              >
                <span lang={lang} dir={textDir(lang)} className="font-medium">
                  {pick(s.name, lang)}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                  {profiles.has(s.id) && <Badge variant="secondary">Has a profile</Badge>}
                  {(s.years ?? []).join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
