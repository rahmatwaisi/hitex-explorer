import { HitexText } from "@/components/highlight"
import { Logo } from "@/components/logo"
import { Card, CardContent } from "@/components/ui/card"
import {
  AUTHOR_LINKEDIN_URL,
  AUTHOR_NAME,
  BUY_ME_A_COFFEE_URL,
  GITHUB_URL,
  HITEX_URL,
  TELEGRAM_URL,
  WHATSAPP_URL,
} from "@/lib/links"

const external = "underline underline-offset-3 hover:text-foreground"

export function AboutPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo className="h-auto w-72 max-w-full sm:w-[28rem]" />
        <h1 className="text-2xl font-semibold">About</h1>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-5 text-base leading-relaxed text-muted-foreground">
          <p>
            <HitexText>
              HITEX Explorer makes the public data of HITEX, the technology exhibition and conference in Erbil,
              easy to search. Type a few keywords and every matching startup, exhibitor, sponsor, media outlet,
              speaker and agenda session lights up, so you can find companies and people to connect with.
            </HitexText>
          </p>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">Where the data comes from</h2>
            <p>
              <HitexText>
                All data was collected from the public HITEX website in October 2026: startups (2022–2026),
                exhibitors, sponsors, media, conference speakers and the 2026 agenda. Names, descriptions and
                images belong to HITEX and the listed organizations. English, Arabic and Kurdish texts come from
                HITEX; the Persian (Farsi) translations were added for this project.
              </HitexText>{" "}
              For official and up-to-date information, visit{" "}
              <a href={HITEX_URL} target="_blank" rel="noreferrer" className={external}>
                hitex.tech
              </a>
              .
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">Not affiliated</h2>
            <p>
              <HitexText>
                This is an independent side project. It is not affiliated with, endorsed by or run by HITEX.
              </HitexText>
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">Join the community</h2>
            <p>
              Looking for work, hiring, or have an idea for this project? Join the community on{" "}
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className={external}>
                WhatsApp
              </a>{" "}
              or{" "}
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className={external}>
                Telegram
              </a>{" "}
              to share opportunities and feedback.
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">Code and data</h2>
            <p>
              The source code and the prepared JSON files are on{" "}
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={external}>
                GitHub
              </a>
              . Built by{" "}
              <a href={AUTHOR_LINKEDIN_URL} target="_blank" rel="noreferrer" className={external}>
                {AUTHOR_NAME}
              </a>
              .
            </p>
            <p>
              If this helped you, sharing it or starring it on{" "}
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={external}>
                GitHub
              </a>{" "}
              helps most. You can also{" "}
              <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noreferrer" className={external}>
                buy me a coffee
              </a>
              .
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
