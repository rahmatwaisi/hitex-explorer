import type { ReactNode } from "react"
import { BriefcaseIcon, HandshakeIcon } from "lucide-react"

import { CommunityLinks, LinkCard } from "@/components/community-links"
import { HitexText } from "@/components/highlight"
import { Logo } from "@/components/logo"
import { datasetKeys, datasets } from "@/lib/datasets"
import { cn } from "@/lib/utils"

export function HomePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-16 text-center sm:px-6">
      <div className="flex flex-col items-center gap-5">
        <h1 className="flex w-full justify-center">
          <Logo className="h-auto w-80 max-w-full sm:w-[30rem] lg:w-[44rem]" />
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          <HitexText>
            Search the public data of HITEX 2026. Open a dataset, then type keywords and press Enter to highlight
            them across every card.
          </HitexText>
        </p>
      </div>
      <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {datasetKeys.map((key) => {
          const { title, blurb, file, icon: Icon } = datasets[key]
          return (
            // the title link stretches over the whole card; HITEX links in the blurb sit above it
            <div
              key={key}
              className="relative flex flex-col items-start gap-3 rounded-xl border border-border bg-background p-6 text-start transition-colors focus-within:ring-3 focus-within:ring-ring/50 hover:bg-muted dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
            >
              <Icon className="size-7 text-primary" />
              <a href={`/${key}/`} className="text-xl font-semibold outline-none after:absolute after:inset-0 after:rounded-xl">
                {title}
              </a>
              <span className="text-sm text-muted-foreground [&_a]:relative [&_a]:z-10">
                <HitexText>{blurb}</HitexText>
              </span>
              <span className="font-mono text-xs text-muted-foreground">data/{file}</span>
            </div>
          )
        })}
      </div>
      <section className="flex flex-col items-center gap-4">
        <h2 className="text-lg font-medium">
          <HitexText>Looking for work? See the open positions at HITEX startups and sponsors</HitexText>
        </h2>
        <LinkCard
          href="/jobs/"
          name="Jobs"
          subtitle="Salaries in USD and IQD, and how to apply"
          color="var(--startup)"
          icon={BriefcaseIcon}
          internal
        />
      </section>

      <section className="flex flex-col items-center gap-4">
        <h2 className="text-lg font-medium">Looking for work or hiring? Join the community on</h2>
        <CommunityLinks />
      </section>

      {/* contribution: HITEX red for startups, deep navy for sponsors */}
      <section aria-label="Contribute" className="grid w-full max-w-5xl gap-5 md:grid-cols-2">
        <ContributePanel
          tone="startup"
          title="Do you own a startup that took part in HITEX?"
          text="Your startup deserves more than a line in a list. Give it a page of its own: your story, your team and the roles you're hiring for, in four languages, so the right people can find you and remember you."
        >
          <LinkCard
            href="/contribution/startup/"
            name="Contribute to HITEX Explorer"
            subtitle="Make your startup stand out"
            color="var(--startup)"
            image={`${import.meta.env.BASE_URL}brand/apple-touch-icon.png`}
            internal
          />
        </ContributePanel>
        <ContributePanel
          tone="sponsor"
          title="Did your company sponsor HITEX?"
          text="Your booth lasted four days; your page here stays. Show startups what you offer, from pilots to APIs and programs, introduce your leadership and list the roles you're hiring for, in four languages, so the right partners and people find you."
        >
          <LinkCard
            href="/contribution/sponsor/"
            name="Contribute as Sponsor"
            subtitle="Put your brand in front of startups and talent"
            color="var(--sponsor)"
            icon={HandshakeIcon}
            internal
          />
        </ContributePanel>
      </section>
    </div>
  )
}

/** One audience of the Contribution pages: its color as a bar on top and a tint; the link card (children) at the bottom. */
function ContributePanel({ tone, title, text, children }: { tone: "startup" | "sponsor"; title: string; text: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 border p-6 text-start",
        tone === "startup" ? "border-startup/35 bg-startup/5" : "border-sponsor/40 bg-sponsor/5 dark:bg-sponsor/15"
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-1", tone === "startup" ? "bg-startup" : "bg-sponsor")} aria-hidden />
      <h2 className="text-lg font-medium">
        <HitexText>{title}</HitexText>
      </h2>
      <p className="text-muted-foreground">{text}</p>
      {/* level with the other panel's link card */}
      <div className="mt-auto grid">{children}</div>
    </div>
  )
}
