import { memo, useState, type CSSProperties } from "react"
import { CircleQuestionMarkIcon, ExternalLinkIcon } from "lucide-react"

import { Highlight } from "@/components/highlight"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { linkText, type CardModel } from "@/lib/cards"
import { cn } from "@/lib/utils"
import { textDir, type Lang } from "@/lib/data"
import type { Matcher } from "@/lib/keywords"

interface DataCardProps {
  card: CardModel
  /** language of the card text; picks the script font via :lang() */
  lang: Lang
  matcher: Matcher | null
  /** CSS animation for the neon border, or undefined when nothing matches */
  glow?: string
}

export const DataCard = memo(function DataCard({ card, lang, matcher, glow }: DataCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const dir = textDir(lang)
  const style: CSSProperties | undefined = glow ? { animation: glow } : undefined
  const circle = card.imageShape === "circle"
  const showImage = card.image && !imageFailed

  return (
    <Card className="h-full transition-shadow duration-500" style={style} data-match={glow ? "" : undefined}>
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

      <CardHeader>
        <CardTitle lang={lang} dir={dir} className={cn("text-lg", card.centered && "text-center")}>
          {card.titleHref ? (
            <a
              href={card.titleHref}
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
        {card.badges.length > 0 && (
          <div dir={dir} className={cn("flex flex-wrap gap-1.5 pt-1", card.centered && "justify-center")}>
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

        {card.links.length > 0 && (
          <div className="mt-auto flex flex-col gap-1 pt-1">
            {card.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 break-all text-sky-600 hover:underline dark:text-sky-400"
                title={l.label}
              >
                <ExternalLinkIcon className="size-3.5 shrink-0" />
                <Highlight text={linkText(l)} matcher={matcher} linkHitex={false} />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
