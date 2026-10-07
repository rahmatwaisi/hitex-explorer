import { memo, useMemo, useState, type CSSProperties } from "react"
import { ArrowRightIcon, BadgeCheckIcon, CircleQuestionMarkIcon, ExternalLinkIcon, ScanSearchIcon } from "lucide-react"

import { Highlight } from "@/components/highlight"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { linkText, type CardModel, type HiddenText } from "@/lib/cards"
import { cn } from "@/lib/utils"
import { textDir, type Lang } from "@/lib/data"
import { highlightVars } from "@/lib/highlight-colors"
import { keywordOf, wave, type Keyword, type Matcher } from "@/lib/keywords"

interface DataCardProps {
  card: CardModel
  /** language of the card text; picks the script font via :lang() */
  lang: Lang
  matcher: Matcher | null
  /** CSS animation for the neon border, or undefined when nothing matches */
  glow?: string
  /** the keywords match only the card's hidden text: dashed outline instead of the glow */
  deepOnly?: boolean
  /** keywords found only in the hidden text; the card shows where */
  deep?: Keyword[]
  /** every keyword the card matches: a bulb each, lighting up in a wave */
  bulbs?: Keyword[]
}

export const DataCard = memo(function DataCard({ card, lang, matcher, glow, deepOnly = false, deep = [], bulbs }: DataCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const dir = textDir(lang)
  const style: CSSProperties | undefined = glow ? { animation: glow } : undefined
  const circle = card.imageShape === "circle"
  const showImage = card.image && !imageFailed
  // a sponsor that completed its profile: navy ring, bar and tint, and a "View profile" button
  const sponsor = !!card.profile?.sponsor

  return (
    <Card
      className={cn(
        "relative h-full transition-shadow duration-500",
        card.profile && (sponsor ? "bg-sponsor/[0.04] ring-2 ring-sponsor/70 dark:bg-sponsor/15 dark:ring-sponsor" : "ring-[#EB2637]/45 dark:ring-[#EB2637]/55")
      )}
      style={style}
      data-match={glow ? "" : undefined}
      data-deep-match={deepOnly ? "" : undefined}
    >
      {showImage && !circle && (
        <img
          src={card.image!}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-40 w-full bg-foreground/[0.03] object-contain p-3"
        />
      )}
      {showImage && circle && (
        <div className="flex h-36 items-center justify-center">
          <img
            src={card.image!}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="size-28 rounded-full bg-muted object-cover object-top ring-2 ring-foreground/10"
          />
        </div>
      )}
      {!showImage && card.monogram && (
        <div className="flex h-36 items-center justify-center">
          <div
            lang={lang}
            aria-hidden
            className={cn(
              "monogram flex items-center justify-center text-5xl font-semibold",
              circle ? "size-28 rounded-full" : "size-24 rounded-2xl"
            )}
            style={{ "--hue": card.monogram.hue } as CSSProperties}
          >
            {card.monogram.letter}
          </div>
        </div>
      )}

      {/* after the image: the card styles its first child image */}
      {sponsor && <span className="absolute inset-x-0 top-0 z-[1] h-1 bg-sponsor" aria-hidden />}
      {card.profile && <ProfileButton href={card.profile.href} name={card.title} sponsor={card.profile.sponsor} />}
      {bulbs && <Bulbs keywords={bulbs} />}

      <CardHeader>
        <CardTitle lang={lang} dir={dir} className={cn("text-lg", card.centered && "text-center")}>
          {card.titleLink?.kind === "page" ? (
            <a href={card.titleLink.href} className="underline-offset-4 hover:underline">
              <Highlight text={card.title} matcher={matcher} linkHitex={false} />
            </a>
          ) : card.titleLink ? (
            <a
              href={card.titleLink.href}
              target="_blank"
              rel="noreferrer"
              title="Search Google for this person"
              className="group/title underline-offset-4 hover:underline"
            >
              <Highlight text={card.title} matcher={matcher} linkHitex={false} />
              <CircleQuestionMarkIcon className="ms-1.5 inline size-4 align-[-2px] text-muted-foreground group-hover/title:text-foreground" />
            </a>
          ) : (
            <Highlight text={card.title} matcher={matcher} />
          )}
        </CardTitle>
        {(card.badges.length > 0 || card.profile) && (
          <div dir={dir} className={cn("flex flex-wrap gap-1.5 pt-1", card.centered && "justify-center")}>
            {card.profile && (
              <Badge className={cn("border-transparent text-white", card.profile.sponsor ? "bg-sponsor" : "bg-[#EB2637]")}>
                <BadgeCheckIcon data-icon="inline-start" /> Full profile
              </Badge>
            )}
            {card.badges.map((b) => (
              <Badge key={b} lang={lang} dir="auto" variant="secondary">
                <Highlight text={b} matcher={matcher} />
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {card.fields.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {card.fields.map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd lang={lang} dir={dir} className="text-start whitespace-pre-line">
                  <Highlight text={f.value} matcher={matcher} />
                </dd>
              </div>
            ))}
          </dl>
        )}

        {card.description && (
          <p lang={lang} dir={dir} className="leading-relaxed whitespace-pre-line text-muted-foreground">
            <Highlight text={card.description} matcher={matcher} />
          </p>
        )}

        <FoundIn card={card} lang={lang} matcher={matcher} deep={deep} />

        {card.links.length > 0 && (
          <div className="mt-auto flex flex-col gap-1 pt-1">
            {card.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                {...(l.internal ? {} : { target: "_blank", rel: "noreferrer" })}
                className={cn(
                  "inline-flex items-center gap-1.5 break-all hover:underline",
                  l.internal ? "font-medium text-foreground" : "text-sky-600 dark:text-sky-400"
                )}
                title={l.label}
              >
                {l.internal ? (
                  <ArrowRightIcon className="size-3.5 shrink-0" />
                ) : (
                  <ExternalLinkIcon className="size-3.5 shrink-0" />
                )}
                <Highlight text={linkText(l)} matcher={matcher} linkHitex={false} />
              </a>
            ))}
          </div>
        )}

        {sponsor && card.profile && (
          <Button asChild className={cn("w-full bg-sponsor text-white hover:bg-sponsor/85", card.links.length === 0 && "mt-auto")}>
            <a href={card.profile.href}>
              View profile <ArrowRightIcon data-icon="inline-end" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
})

/** HITEX icon on a white disc in the card's corner; opens the startup's (red) or sponsor's (navy) own page. */
function ProfileButton({ href, name, sponsor }: { href: string; name: string; sponsor?: boolean }) {
  return (
    <a
      href={href}
      aria-label={`Open the full profile of ${name}`}
      title="Full profile"
      className={cn(
        "absolute end-3 top-3 z-[1] flex size-11 items-center justify-center rounded-full bg-white transition-transform hover:scale-110 focus-visible:ring-3 focus-visible:outline-none",
        sponsor
          ? "shadow-[0_0_0_2px_var(--sponsor),0_6px_18px_-4px_color-mix(in_oklab,var(--sponsor)_60%,transparent)] focus-visible:ring-sponsor/50"
          : "shadow-[0_0_0_2px_#EB2637,0_6px_18px_-4px_rgb(235_38_55/0.6)] focus-visible:ring-[#EB2637]/50"
      )}
    >
      <img src={`${import.meta.env.BASE_URL}brand/apple-touch-icon.png`} alt="" className="size-7 object-contain" />
    </a>
  )
}

const SHOW_FOUND = 3

/** "…text around the match…" on one line */
function excerpt(text: string, start: number, end: number, radius = 45) {
  const flat = text.replace(/\s+/g, " ")
  const from = Math.max(0, start - radius)
  const to = Math.min(flat.length, end + radius)
  return `${from > 0 ? "…" : ""}${flat.slice(from, to).trim()}${to < flat.length ? "…" : ""}`
}

/** Where keywords found only in the card's hidden text are: a full profile, or another language. */
function FoundIn({ card, lang, matcher, deep }: { card: CardModel; lang: Lang; matcher: Matcher | null; deep: Keyword[] }) {
  const found = useMemo(() => {
    if (!matcher || deep.length === 0) return []
    const ids = new Set(deep.map((k) => k.id))
    const out: (HiddenText & { snippet: string; color: string })[] = []
    for (const h of card.hidden ?? []) {
      for (const m of h.text.replace(/\s+/g, " ").matchAll(matcher.regex)) {
        const k = keywordOf(m, matcher)
        if (!ids.has(k.id)) continue
        out.push({ ...h, snippet: excerpt(h.text, m.index, m.index + m[0].length), color: k.color })
        break
      }
    }
    return out
  }, [card.hidden, matcher, deep])

  if (found.length === 0) return null
  const more = found.length - SHOW_FOUND
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/40 p-3"
      style={{ borderColor: `var(--rx-${found[0].color}-8)` }}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <ScanSearchIcon className="size-3.5" />
        {card.foundIn?.label ?? "Found in another language"}
      </p>
      <ul className="flex flex-col gap-1.5">
        {found.slice(0, SHOW_FOUND).map((f, i) => (
          <li key={i} className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">{f.section}</span>
            <span lang={f.lang ?? lang} dir="auto" className="line-clamp-2">
              <Highlight text={f.snippet} matcher={matcher} linkHitex={false} />
            </span>
          </li>
        ))}
      </ul>
      {(more > 0 || card.foundIn?.href) && (
        <p className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{more > 0 ? `+${more} more` : ""}</span>
          {card.foundIn?.href && (
            <a href={card.foundIn.href} className="inline-flex items-center gap-1 font-medium hover:underline">
              {card.foundIn.linkText ?? "See more"} <ArrowRightIcon className="size-3.5" />
            </a>
          )}
        </p>
      )}
    </div>
  )
}

/** A small bulb per matching keyword in its colour, lighting up one after another like a stadium wave. */
function Bulbs({ keywords }: { keywords: Keyword[] }) {
  const w = wave(keywords.length)
  return (
    <div
      aria-label={`Matches ${keywords.map((k) => k.text).join(", ")}`}
      className="absolute start-3 top-3 z-[1] flex max-w-[calc(100%-5rem)] flex-wrap gap-1.5 rounded-full bg-background/85 px-2 py-1.5 shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm"
    >
      {keywords.map((k, i) => (
        <span
          key={k.id}
          title={k.text}
          className="kw-bulb"
          style={{ ...highlightVars(k.color), animation: `${w.name} ${w.seconds.toFixed(2)}s ease-in-out ${w.delay(i).toFixed(2)}s infinite` } as CSSProperties}
        />
      ))}
    </div>
  )
}
