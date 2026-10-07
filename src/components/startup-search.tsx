import { useMemo, useState } from "react"
import { SearchIcon } from "lucide-react"

import { HitexText } from "@/components/highlight"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { pick, textDir, type Lang, type Localized, type Organization, type Startup } from "@/lib/data"

/** What the search needs from a HITEX record (a startup or a sponsor). */
export interface HitexRecord {
  id: string
  name: Localized
  years: number[] | null
}

interface SearchProps<T extends HitexRecord> {
  /** HITEX id -> slug of its profile */
  profiles: Map<string, string>
  lang: Lang
  onPick: (record: T) => void
  onType?: () => void
  showResults?: boolean
}

/** Search box over a HITEX list; only the records in it can have a profile. */
function HitexSearch<T extends HitexRecord>({
  records,
  profiles,
  lang,
  onPick,
  onType,
  showResults = true,
  also,
  placeholder,
  label,
  none,
}: SearchProps<T> & {
  records: T[]
  /** more searchable text besides the name in every language (a startup's founders) */
  also?: (record: T) => (string | null | undefined)[]
  placeholder: string
  label: string
  none: string
}) {
  const [query, setQuery] = useState("")
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return records
      .filter((r) => [r.name?.en, r.name?.ar, r.name?.ku, r.name?.fa, ...(also?.(r) ?? [])].some((v) => v?.toLowerCase().includes(q)))
      .slice(0, 8)
  }, [query, records, also])

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
          placeholder={placeholder}
          className="h-10 ps-9 text-base"
          aria-label={label}
        />
      </div>

      {showResults && query.trim() && (
        <ul className="flex flex-col divide-y rounded-lg border">
          {matches.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">
              <HitexText>{none}</HitexText>
            </li>
          )}
          {matches.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onPick(r)}
                className="flex w-full items-center justify-between gap-3 p-3 text-start hover:bg-muted"
              >
                <span lang={lang} dir={textDir(lang)} className="font-medium">
                  {pick(r.name, lang)}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                  {profiles.has(r.id) && <Badge variant="secondary">Has a profile</Badge>}
                  {(r.years ?? []).join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const founders = (s: Startup) => [s.category?.en]

/** Search box over the startups HITEX lists; only these can have a profile. */
export function StartupSearch({ startups, ...props }: SearchProps<Startup> & { startups: Startup[] }) {
  return (
    <HitexSearch
      {...props}
      records={startups}
      also={founders}
      placeholder="Startup or founder name, in any language…"
      label="Search HITEX startups"
      none="No startup with that name in HITEX's list. Only listed startups can have a profile."
    />
  )
}

/** Search box over the sponsors HITEX lists; only these can have a sponsor profile. */
export function SponsorSearch({ sponsors, ...props }: SearchProps<Organization> & { sponsors: Organization[] }) {
  return (
    <HitexSearch
      {...props}
      records={sponsors}
      placeholder="Company or organization name, in any language…"
      label="Search HITEX sponsors"
      none="No sponsor with that name in HITEX's list. Only listed sponsors can have a sponsor profile."
    />
  )
}
