import { useEffect, useMemo, useState } from "react"
import { FileJsonIcon, Loader2Icon } from "lucide-react"

import { CardGrid, DeepCount, useCardMatches } from "@/components/card-grid"
import { KeywordBar } from "@/components/keyword-bar"
import { Button } from "@/components/ui/button"
import type { CardModel } from "@/lib/cards"
import type { Lang } from "@/lib/data"
import { datasets, loadDataset, type DatasetKey } from "@/lib/datasets"
import type { Keyword } from "@/lib/keywords"

export interface KeywordProps {
  keywords: Keyword[]
  onAddKeyword: (text: string) => void
  onRemoveKeyword: (id: number) => void
  onClearKeywords: () => void
}

interface DatasetPageProps extends KeywordProps {
  dataset: DatasetKey
  lang: Lang
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
  const { matcher, matches, counts, keyframes, matching, deepOnly } = useCardMatches(cards, keywords)
  const meta = datasets[dataset]

  return (
    <div className="flex flex-col">
      <div className="sticky top-(--header-h) z-10 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-semibold">
              {meta.title}{" "}
              <span className="text-base font-normal text-muted-foreground">
                {data ? `${cards.length} cards` : ""}
                {data && keywords.length > 0 ? ` · ${matching} matching` : ""}
              </span>
              {!!data && <DeepCount count={deepOnly} />}
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
        <CardGrid cards={cards} matches={matches} matcher={matcher} keyframes={keyframes} lang={lang} />
      </div>
    </div>
  )
}
