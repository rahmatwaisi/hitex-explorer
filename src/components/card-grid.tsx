import { Fragment, useMemo } from "react"

import { DataCard } from "@/components/data-card"
import { Highlight } from "@/components/highlight"
import { hiddenTexts, searchableTexts, type CardModel } from "@/lib/cards"
import type { Lang } from "@/lib/data"
import {
  buildMatcher,
  deepGlowKeyframes,
  deepGlowName,
  glowKeyframes,
  glowName,
  GLOW_SECONDS_PER_COLOR,
  matchedIds,
  wave,
  type Keyword,
  type Matcher,
} from "@/lib/keywords"

export interface CardMatch {
  /** keywords found in the card's text, in keyword-list order (drives the glow colors) */
  shown: Keyword[]
  /** keywords found only in its hidden text (the rest of a full profile, other languages) */
  deep: Keyword[]
}

/** Which keywords each card matches, the per-keyword card counts and the glow keyframes. */
export function useCardMatches(cards: CardModel[], keywords: Keyword[]) {
  const matcher = useMemo(() => buildMatcher(keywords), [keywords])

  const matches = useMemo<CardMatch[]>(
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
    for (const { shown, deep } of matches) for (const k of [...shown, ...deep]) m.set(k.id, (m.get(k.id) ?? 0) + 1)
    return m
  }, [matches])

  const keyframes = useMemo(() => {
    const seen = new Map<string, string>()
    for (const { shown, deep } of matches) {
      if (shown.length) seen.set(glowName(shown), glowKeyframes(shown))
      else if (deep.length) seen.set(deepGlowName(deep), deepGlowKeyframes(deep))
      // the bulbs' wave, timed for how many keywords the card matches
      const bulbs = shown.length + deep.length
      if (bulbs) {
        const w = wave(bulbs)
        seen.set(w.name, w.keyframes)
      }
    }
    return [...seen.values()].join("\n")
  }, [matches])

  return {
    matcher,
    matches,
    counts,
    keyframes,
    matching: matches.filter((m) => m.shown.length + m.deep.length > 0).length,
    deepOnly: matches.filter((m) => m.shown.length === 0 && m.deep.length > 0).length,
  }
}

/** "— N found in a full profile or another language" next to a page title */
export function DeepCount({ count, where = "a full profile or another language" }: { count: number; where?: string }) {
  if (count === 0) return null
  return (
    <span className="ms-2 inline-flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
      <span aria-hidden className="inline-block w-5 border-t-2 border-dashed border-current" />
      {count} found in {where}
    </span>
  )
}

/** Cards with their keyword glow; cards with a `group` get a heading when the group changes. */
export function CardGrid({
  cards,
  matches,
  matcher,
  keyframes,
  lang,
}: {
  cards: CardModel[]
  matches: CardMatch[]
  matcher: Matcher | null
  keyframes: string
  lang: Lang
}) {
  return (
    <>
      <style>{keyframes}</style>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {cards.map((card, i) => {
          const { shown, deep } = matches[i] ?? { shown: [], deep: [] }
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
              <DataCard
                card={card}
                lang={lang}
                matcher={matcher}
                glow={glow}
                deepOnly={!shown.length && deep.length > 0}
                deep={deep}
                bulbs={shown.length || deep.length ? [...shown, ...deep] : undefined}
              />
            </Fragment>
          )
        })}
      </div>
    </>
  )
}
