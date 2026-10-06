import { Fragment, useEffect, useMemo, useState } from "react"
import { FileJsonIcon, Loader2Icon } from "lucide-react"

import { DataCard } from "@/components/data-card"
import { Highlight } from "@/components/highlight"
import { KeywordBar } from "@/components/keyword-bar"
import { Button } from "@/components/ui/button"
import { hiddenTexts, searchableTexts, type CardModel } from "@/lib/cards"
import type { Lang } from "@/lib/data"
import { datasets, loadDataset, type DatasetKey } from "@/lib/datasets"
import {
  buildMatcher,
  deepGlowKeyframes,
  deepGlowName,
  glowKeyframes,
  glowName,
  GLOW_SECONDS_PER_COLOR,
  matchedIds,
  type Keyword,
} from "@/lib/keywords"

interface DatasetPageProps {
  dataset: DatasetKey
  lang: Lang
  keywords: Keyword[]
  onAddKeyword: (text: string) => void
  onRemoveKeyword: (id: number) => void
  onClearKeywords: () => void
}

/** Render with `key={dataset}` so switching datasets starts from fresh state. */
export function DatasetPage({ dataset, lang, keywords, ...handlers }: DatasetPageProps) {
  const [data, setData] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadDataset(dataset)
      .then((json) => !cancelled && setData(json))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [dataset])

  const cards = useMemo<CardModel[]>(
    () => (data ? datasets[dataset].toCards(data, lang) : []),
    [data, dataset, lang]
  )

  const matcher = useMemo(() => buildMatcher(keywords), [keywords])

  // keywords each card matches, in keyword-list order (drives glow color order): `shown` in the
  // card's text, `deep` only in its hidden text (the rest of a full profile, other languages)
  const cardMatches = useMemo(
    () =>
      cards.map((c) => {
        const shownIds = matchedIds(searchableTexts(c), matcher)
        const deepIds = matchedIds(hiddenTexts(c), matcher)
        return {
          shown: keywords.filter((k) => shownIds.has(k.id)),
          deep: keywords.filter((k) => deepIds.has(k.id) && !shownIds.has(k.id)),
        }
      }),
    [cards, matcher, keywords]
  )

  const counts = useMemo(() => {
    const m = new Map<number, number>()
    for (const { shown, deep } of cardMatches) for (const k of [...shown, ...deep]) m.set(k.id, (m.get(k.id) ?? 0) + 1)
    return m
  }, [cardMatches])

  const keyframes = useMemo(() => {
    const seen = new Map<string, string>()
    for (const { shown, deep } of cardMatches) {
      if (shown.length) seen.set(glowName(shown), glowKeyframes(shown))
      else if (deep.length) seen.set(deepGlowName(deep), deepGlowKeyframes(deep))
    }
    return [...seen.values()].join("\n")
  }, [cardMatches])

  const matchingCards = cardMatches.filter((m) => m.shown.length + m.deep.length > 0).length
  const deepOnlyCards = cardMatches.filter((m) => m.shown.length === 0 && m.deep.length > 0).length
  const meta = datasets[dataset]

  return (
    <div className="flex flex-col">
      <style>{keyframes}</style>

      <div className="sticky top-(--header-h) z-10 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-semibold">
              {meta.title}{" "}
              <span className="text-base font-normal text-muted-foreground">
                {data ? `${cards.length} cards` : ""}
                {data && keywords.length > 0 ? ` · ${matchingCards} matching` : ""}
              </span>
              {!!data && deepOnlyCards > 0 && (
                <span className="ms-2 inline-flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                  <span aria-hidden className="inline-block w-5 border-t-2 border-dashed border-current" />
                  {deepOnlyCards} found in a full profile or another language
                </span>
              )}
            </h1>
            <Button variant="outline" size="sm" asChild>
              <a href={meta.url} target="_blank" rel="noreferrer">
                <FileJsonIcon data-icon="inline-start" />
                {meta.file}
              </a>
            </Button>
          </div>
          <KeywordBar
            keywords={keywords}
            counts={counts}
            onAdd={handlers.onAddKeyword}
            onRemove={handlers.onRemoveKeyword}
            onClear={handlers.onClearKeywords}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6">
        {error && <p className="text-destructive">Could not load {meta.file}: {error}</p>}
        {!data && !error && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" /> Loading {meta.file}…
          </p>
        )}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {cards.map((card, i) => {
            const { shown, deep } = cardMatches[i]
            const glow = shown.length
              ? `${glowName(shown)} ${(shown.length * GLOW_SECONDS_PER_COLOR).toFixed(1)}s ease-in-out infinite`
              : deep.length
                ? `${deepGlowName(deep)} ${(deep.length * GLOW_SECONDS_PER_COLOR).toFixed(1)}s linear infinite`
                : undefined
            const newGroup = card.group && card.group !== cards[i - 1]?.group
            return (
              <Fragment key={card.id}>
                {newGroup && (
                  <h2 lang={lang} className="col-span-full pt-4 text-lg font-semibold first:pt-0">
                    {/* isolate each part so a date next to RTL text keeps its order */}
                    {card.group!.split(" · ").map((part, j) => (
                      <Fragment key={j}>
                        {j > 0 && " · "}
                        <bdi>
                          <Highlight text={part} matcher={matcher} />
                        </bdi>
                      </Fragment>
                    ))}
                  </h2>
                )}
                <DataCard card={card} lang={lang} matcher={matcher} glow={glow} deepOnly={!shown.length && deep.length > 0} deep={deep} />
              </Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
