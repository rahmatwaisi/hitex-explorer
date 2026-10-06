import { useMemo, useState } from "react"
import { BriefcaseIcon, InfoIcon, XIcon } from "lucide-react"

import { CardGrid, DeepCount, useCardMatches } from "@/components/card-grid"
import type { KeywordProps } from "@/components/dataset-page"
import { HitexText } from "@/components/highlight"
import { KeywordBar } from "@/components/keyword-bar"
import { Loading, useCommunity } from "@/components/profile-page"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Lang } from "@/lib/data"
import { JOB_FILTERS, JOB_SORTS, jobCard, openJobs, paysAtLeast } from "@/lib/jobs"
import { CURRENCIES, IQD_PER_USD, type Currency } from "@/lib/salary"
import { cn } from "@/lib/utils"

/** Every open position from the startup profiles (/jobs), with filters on top of the keyword search. */
export function JobsPage({ lang, keywords, ...handlers }: KeywordProps & { lang: Lang }) {
  const community = useCommunity()
  const [filters, setFilters] = useState<Set<string>>(() => new Set())
  const [minSalary, setMinSalary] = useState("")
  const [currency, setCurrency] = useState<Currency>("USD")
  const [sort, setSort] = useState(JOB_SORTS[0].key)

  const all = useMemo(() => (community ? openJobs(community) : []), [community])
  const empty = !!community && all.length === 0
  const jobs = useMemo(() => {
    const min = Number(minSalary)
    const list = all.filter(
      (j) => JOB_FILTERS.every((f) => !filters.has(f.key) || f.test(j)) && (!min || paysAtLeast(j, min, currency))
    )
    return [...list].sort(JOB_SORTS.find((s) => s.key === sort)!.compare)
  }, [all, filters, minSalary, currency, sort])

  const cards = useMemo(() => (community ? jobs.map((j) => jobCard(j, community.vocab, lang)) : []), [jobs, community, lang])
  const { matcher, matches, counts, keyframes, matching, deepOnly } = useCardMatches(cards, keywords)

  const companies = new Set(all.map((j) => j.profile.slug)).size
  const filtered = filters.size > 0 || !!Number(minSalary)
  const toggle = (key: string) =>
    setFilters((f) => {
      const next = new Set(f)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const clearFilters = () => {
    setFilters(new Set())
    setMinSalary("")
  }

  if (!community) return <Loading what="jobs" />

  return (
    <div className="flex flex-col">
      <div className="sticky top-(--header-h) z-10 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-4 sm:px-6">
          <h1 className="text-xl font-semibold">
            Jobs{" "}
            <span className="text-base font-normal text-muted-foreground">
              {empty
                ? "· no openings yet"
                : `${all.length} open ${all.length === 1 ? "position" : "positions"} at ${companies} ${companies === 1 ? "startup" : "startups"}`}
              {filtered ? ` · ${jobs.length} after filters` : ""}
              {keywords.length > 0 ? ` · ${matching} matching` : ""}
            </span>
            <DeepCount count={deepOnly} where="the job details" />
          </h1>
          <KeywordBar
            keywords={keywords}
            counts={counts}
            onAdd={handlers.onAddKeyword}
            onRemove={handlers.onRemoveKeyword}
            onClear={handlers.onClearKeywords}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 px-4 py-6 sm:px-6">
        {/* not in the sticky bar: on phones it would cover half the screen */}
        {!empty && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
            <div
              className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
              role="group"
              aria-label="Filters"
            >
              {JOB_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filters.has(f.key)}
                  onClick={() => toggle(f.key)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
                    filters.has(f.key) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">At least</span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                step={currency === "USD" ? 100 : 100000}
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                placeholder={currency === "USD" ? "800" : "1000000"}
                className="h-8 w-28"
                aria-label="Minimum monthly salary"
              />
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={currency}
                onValueChange={(v) => v && setCurrency(v as Currency)}
                aria-label="Currency"
              >
                {CURRENCIES.map((c) => (
                  <ToggleGroupItem key={c} value={c} className="px-2.5">
                    {c}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <span className="text-muted-foreground">a month</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sort</span>
              <NativeSelect size="sm" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort jobs">
                {JOB_SORTS.map((s) => (
                  <NativeSelectOption key={s.key} value={s.key}>
                    {s.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <XIcon data-icon="inline-start" /> Clear filters
              </Button>
            )}
          </div>
        )}
        {empty && (
          <Card className="ring-2 ring-sky-500/60">
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <BriefcaseIcon className="mt-0.5 size-5 shrink-0 text-sky-500" />
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">No open positions yet</p>
                  <p className="text-sm text-muted-foreground">
                    <HitexText>
                      Startups that took part in HITEX list their openings in their profile, and they appear here.
                    </HitexText>
                  </p>
                </div>
              </div>
              <Button asChild className="shrink-0">
                <a href="/contribution/">Add your openings</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {cards.length === 0 && filtered ? (
          <div className="flex flex-col items-start gap-3 py-8">
            <p className="text-lg">No jobs match these filters.</p>
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <CardGrid cards={cards} matches={matches} matcher={matcher} keyframes={keyframes} lang={lang} />
        )}

        {!empty && (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <InfoIcon className="mt-px size-3.5 shrink-0" />
            Salaries are shown as each startup gives them, then about the same amount in the other currency (≈), at the
            Central Bank of Iraq rate of {IQD_PER_USD.toLocaleString("en-US")} IQD per USD. “At least” compares monthly pay:
            yearly pay is divided by 12 and hourly pay counts the company's working hours.
          </p>
        )}
      </div>
    </div>
  )
}
