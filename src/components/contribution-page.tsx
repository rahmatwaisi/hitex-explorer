import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  CheckIcon,
  ClipboardListIcon,
  CopyIcon,
  FileCodeIcon,
  GitPullRequestIcon,
  HandshakeIcon,
  InfoIcon,
  MegaphoneIcon,
  PencilIcon,
  QrCodeIcon,
  RocketIcon,
} from "lucide-react"

import { HitexText } from "@/components/highlight"
import { Loading, Profile, useCommunity } from "@/components/profile-page"
import { SponsorProfile } from "@/components/sponsor-profile"
import { SponsorSearch, StartupSearch, type HitexRecord } from "@/components/startup-search"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { pageHref, type CommunityData } from "@/lib/community"
import { pick, textDir, type Lang, type Organization, type Startup } from "@/lib/data"
import { loadDataset } from "@/lib/datasets"
import { CONTRIBUTING_URL, SPONSOR_TEMPLATE_URL, TEMPLATE_URL } from "@/lib/links"
import { fileStamp, snakeCase } from "@/lib/profile-names"
import { cn } from "@/lib/utils"

type Kind = "startup" | "sponsor"

/** The two audiences of the Contribution pages: HITEX red for startups, deep navy for sponsors. */
const AUDIENCES: Record<
  Kind,
  {
    title: string
    page: string
    form: string
    /** the form's query parameter that starts it with a HITEX record */
    param: string
    dir: string
    template: string
    icon: ComponentType<{ className?: string }>
    /** tinted panel, accent bar, filled button, readable accent text */
    tone: { panel: string; bar: string; button: string; ink: string }
  }
> = {
  startup: {
    title: "Contribute as Startup",
    page: "/contribution/startup/",
    form: "/contribution/form",
    param: "startup",
    dir: "public/startups",
    template: TEMPLATE_URL,
    icon: RocketIcon,
    tone: {
      panel: "border-startup/35 bg-startup/5",
      bar: "bg-startup",
      button: "bg-startup text-white hover:bg-startup/85 focus-visible:ring-startup/40",
      ink: "text-startup-ink",
    },
  },
  sponsor: {
    title: "Contribute as Sponsor",
    page: "/contribution/sponsor/",
    form: "/contribution/sponsor/form",
    param: "sponsor",
    dir: "public/sponsors",
    template: SPONSOR_TEMPLATE_URL,
    icon: HandshakeIcon,
    tone: {
      panel: "border-sponsor/40 bg-sponsor/5 dark:bg-sponsor/15",
      bar: "bg-sponsor",
      button: "bg-sponsor text-white hover:bg-sponsor/85 focus-visible:ring-sponsor/40",
      ink: "text-sponsor-ink",
    },
  },
}

/** /contribution/: who is contributing? Two big cards lead to the startup and the sponsor page. */
export function ContributionHub() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Contribution</h1>
        <p className="max-w-3xl text-muted-foreground">
          <HitexText>
            Took part in HITEX? Give your organization a full page on HITEX Explorer, in English, Arabic, Kurdish and
            Persian. Choose who you are to see what your page shows and how to send it.
          </HitexText>
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <AudienceCard
          kind="startup"
          lead="Your startup deserves more than a line in a list."
          points={[
            [RocketIcon, "Your story, products and team"],
            [BriefcaseIcon, "Open roles on the Jobs page"],
            [QrCodeIcon, "A QR code for your booth"],
          ]}
          foot="Free for every startup HITEX lists."
        />
        <AudienceCard
          kind="sponsor"
          lead="Turn four days at your booth into lasting partnerships."
          points={[
            [HandshakeIcon, "What you offer startups: pilots, APIs, programs"],
            [BriefcaseIcon, "Open roles on the Jobs page"],
            [MegaphoneIcon, "Your leadership, booth activities and partner contact"],
          ]}
          foot="For every sponsor HITEX lists."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StepCard n={1} title="Find yourself" text="Search HITEX's list of startups or sponsors. Only listed organizations can have a profile." />
        <StepCard n={2} title="Fill in the form" text="A few steps, with what HITEX publishes already filled in. Your answers are saved in your browser." />
        <StepCard n={3} title="Send it" text="Submit on GitHub, where a bot checks your file within a minute, or send it to us without GitHub." />
      </div>
    </div>
  )
}

function AudienceCard({ kind, lead, points, foot }: { kind: Kind; lead: string; points: [ComponentType<{ className?: string }>, string][]; foot: string }) {
  const a = AUDIENCES[kind]
  const Icon = a.icon
  return (
    <div className={cn("relative flex flex-col gap-5 border p-6 transition-colors focus-within:ring-3 hover:bg-muted/40", a.tone.panel)}>
      <span className={cn("absolute inset-x-0 top-0 h-1", a.tone.bar)} aria-hidden />
      <span className={cn("flex size-12 items-center justify-center text-white", a.tone.bar)}>
        <Icon className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">{a.title}</h2>
        <p className="text-muted-foreground">{lead}</p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {points.map(([PointIcon, text]) => (
          <li key={text} className="flex items-start gap-2.5">
            <PointIcon className={cn("mt-0.5 size-4 shrink-0", a.tone.ink)} />
            {text}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-sm text-muted-foreground">
          <HitexText>{foot}</HitexText>
        </p>
        {/* the button's link stretches over the whole card */}
        <Button asChild size="lg" className={cn("px-4 after:absolute after:inset-0", a.tone.button)}>
          <a href={a.page}>
            {a.title} <ArrowRightIcon data-icon="inline-end" />
          </a>
        </Button>
      </div>
    </div>
  )
}

/** Switch between the startup and the sponsor Contribution page. */
function AudienceSwitch({ kind }: { kind: Kind }) {
  return (
    <nav aria-label="Contribute as" className="flex flex-wrap gap-2">
      {(["startup", "sponsor"] as const).map((k) => {
        const a = AUDIENCES[k]
        const Icon = a.icon
        return (
          <Button key={k} asChild variant={k === kind ? "default" : "outline"} className={cn(k === kind && a.tone.button)}>
            <a href={a.page} aria-current={k === kind ? "page" : undefined}>
              <Icon data-icon="inline-start" /> {a.title}
            </a>
          </Button>
        )
      })}
    </nav>
  )
}

/** /contribution/startup/: how a HITEX startup completes its profile, with the example startup. */
export function ContributionPage({ lang }: { lang: Lang }) {
  const community = useCommunity()
  const startups = useHitexList<Startup>("startups")
  return (
    <AudiencePage
      kind="startup"
      intro="Took part in HITEX? Complete your startup's profile with your team, open positions, how to apply and what you're looking for. You get a full page like the example below."
      rule="Only startups already listed by HITEX can contribute, and only to complete their own profile. New startups that are not in HITEX's list are not accepted. One profile per startup."
      findText="Search below. Only startups listed by HITEX can have a profile."
      finder={
        startups && community ? (
          <Finder
            kind="startup"
            title="Find your startup"
            profiles={profilesOf(community, "startup")}
            lang={lang}
            search={(props) => <StartupSearch startups={startups} {...props} />}
          />
        ) : (
          <Loading what="startups" />
        )
      }
      exampleTitle="Example startup"
      example={community?.example ? <Profile p={community.example} vocab={community.vocab} lang={lang} embedded /> : <Loading what="example" />}
    />
  )
}

/** /contribution/sponsor/: how a HITEX sponsor completes its profile, with the example sponsor. */
export function SponsorContributionPage({ lang }: { lang: Lang }) {
  const community = useCommunity()
  const sponsors = useHitexList<Organization>("sponsors")
  return (
    <AudiencePage
      kind="sponsor"
      intro="Sponsored HITEX? Your booth lasted four days; your page here stays. Show startups what you offer, meet the partners you're looking for, introduce your leadership and list the roles you're hiring for. You get a full page like the example below."
      rule="Only sponsors already listed by HITEX can contribute, and only to complete their own profile. One profile per sponsor. Your tier and HITEX years come from HITEX's list."
      findText="Search below. Only sponsors listed by HITEX can have a profile."
      benefits={[
        [HandshakeIcon, "Reach startups", "List your pilots, APIs, credits and programs, and the partners you want. Startups see who to talk to."],
        [BriefcaseIcon, "Hire from the community", "Your open roles appear on the Jobs page next to the startups', with salary and how to apply."],
        [QrCodeIcon, "Bring people to your booth", "A QR code, your booth activities and a link to book meetings, in four languages."],
      ]}
      finder={
        sponsors && community ? (
          <Finder
            kind="sponsor"
            title="Find your organization"
            profiles={profilesOf(community, "sponsor")}
            lang={lang}
            search={(props) => <SponsorSearch sponsors={sponsors} {...props} />}
          />
        ) : (
          <Loading what="sponsors" />
        )
      }
      exampleTitle="Example sponsor"
      example={
        community?.sponsor_example ? (
          <SponsorProfile p={community.sponsor_example} vocab={community.vocab} lang={lang} embedded />
        ) : (
          <Loading what="example" />
        )
      }
    />
  )
}

/** HITEX's own list (startups or sponsors), loaded once per visit. */
function useHitexList<T>(key: "startups" | "sponsors") {
  const [list, setList] = useState<T[] | null>(null)
  useEffect(() => {
    let cancelled = false
    loadDataset(key).then((d) => !cancelled && setList((d as { hitex: T[] }).hitex))
    return () => {
      cancelled = true
    }
  }, [key])
  return list
}

/** HITEX id -> slug of its profile */
const profilesOf = (community: CommunityData, kind: Kind) =>
  new Map((kind === "sponsor" ? community.sponsors : community.profiles).map((p) => [p.hitex?.existing_profile ?? "", p.slug]))

function AudiencePage({
  kind,
  intro,
  rule,
  findText,
  benefits,
  finder,
  exampleTitle,
  example,
}: {
  kind: Kind
  intro: string
  rule: string
  findText: string
  benefits?: [ComponentType<{ className?: string }>, string, string][]
  finder: ReactNode
  exampleTitle: string
  example: ReactNode
}) {
  const a = AUDIENCES[kind]
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4">
        <a href="/contribution/" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" /> Contribution
        </a>
        <AudienceSwitch kind={kind} />
        <div className="flex flex-col gap-2 border-s-4 ps-4" style={{ borderColor: `var(--${kind})` }}>
          <h1 className="text-3xl font-semibold">{a.title}</h1>
          <p className="max-w-3xl text-muted-foreground">
            <HitexText>{intro}</HitexText>
          </p>
        </div>
      </div>

      {benefits && (
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map(([Icon, title, text]) => (
            <div key={title} className={cn("flex flex-col gap-2 border p-4", a.tone.panel)}>
              <Icon className={cn("size-5", a.tone.ink)} />
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      )}

      <Card className="ring-2 ring-sky-500/60">
        <CardContent className="flex items-start gap-2">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-sky-500" />
          <p>
            <HitexText>{rule}</HitexText>
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StepCard n={1} kind={kind} title={kind === "sponsor" ? "Find your organization" : "Find your startup"} text={findText} />
        <StepCard n={2} kind={kind} title="Fill in the form" text="A few steps, with what HITEX publishes already filled in. Or write the file by hand from the template.">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild className={a.tone.button}>
              <a href={a.form}>
                <ClipboardListIcon data-icon="inline-start" /> Open the form
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={a.template} target="_blank" rel="noreferrer">
                <FileCodeIcon data-icon="inline-start" /> Template
              </a>
            </Button>
          </div>
        </StepCard>
        <StepCard n={3} kind={kind} title="Send it" text="Submit on GitHub, where a bot checks your file within a minute, or send it to us without GitHub.">
          <Button size="sm" variant="outline" asChild>
            <a href={CONTRIBUTING_URL} target="_blank" rel="noreferrer">
              <GitPullRequestIcon data-icon="inline-start" /> Guide
            </a>
          </Button>
        </StepCard>
      </div>

      {finder}

      <div className="flex items-center gap-3 pt-4">
        <h2 className="text-2xl font-semibold">{exampleTitle}</h2>
        <Badge variant="secondary">Example</Badge>
      </div>
      <p className="-mt-3 text-muted-foreground">Built from the profile template, so it shows every section a completed profile can have.</p>
      {example}
    </div>
  )
}

function StepCard({ n, kind, title, text, children }: { n: number; kind?: Kind; title: string; text: string; children?: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-2">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full text-sm font-semibold",
            kind ? cn(AUDIENCES[kind].tone.bar, "text-white") : "bg-primary text-primary-foreground"
          )}
        >
          {n}
        </span>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
        {children && <div className="mt-auto pt-1">{children}</div>}
      </CardContent>
    </Card>
  )
}

type SearchSlot = (props: { profiles: Map<string, string>; lang: Lang; onPick: (r: HitexRecord) => void; onType: () => void; showResults: boolean }) => ReactNode

function Finder({ kind, title, profiles, lang, search }: { kind: Kind; title: string; profiles: Map<string, string>; lang: Lang; search: SearchSlot }) {
  const a = AUDIENCES[kind]
  const [selected, setSelected] = useState<HitexRecord | null>(null)

  const name = selected ? pick(selected.name, "en") : ""
  const slug = snakeCase(name) || kind
  const file = `${fileStamp()}_${slug}.yml`
  const snippet = selected ? `slug: "${slug}"\nhitex:\n  existing_profile: "${selected.id}"` : ""
  const existing = selected ? profiles.get(selected.id) : undefined

  return (
    <Card id="find">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {search({ profiles, lang, onPick: setSelected, onType: () => setSelected(null), showResults: !selected })}

        {selected && (
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p lang={lang} dir={textDir(lang)} className="text-lg font-semibold">
                {pick(selected.name, lang)}
              </p>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                Choose another
              </Button>
            </div>
            {existing ? (
              <>
                <p>This {kind} already has a profile. Its maintainers can update it.</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild className={a.tone.button}>
                    <a href={`${a.form}/${existing}`}>
                      <PencilIcon data-icon="inline-start" /> Edit it
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={pageHref({ kind, slug: existing })}>Open the profile</a>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button asChild className={cn("w-fit", a.tone.button)}>
                  <a href={`${a.form}?${a.param}=${selected.id}`}>
                    <ClipboardListIcon data-icon="inline-start" /> Start the form
                  </a>
                </Button>
                <details className="flex flex-col gap-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Writing the file by hand instead?
                  </summary>
                  <div className="mt-3 flex flex-col gap-4">
                    <CopyRow label={kind === "sponsor" ? "Sponsor id" : "Startup id"} value={selected.id} />
                    <CopyRow label="File name" value={`${a.dir}/${file}`} hint="uses the current UTC time" />
                    <CopyRow label="Start of your file" value={snippet} multiline />
                  </div>
                </details>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CopyRow({ label, value, hint, multiline }: { label: string; value: string; hint?: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked: the value is still selectable
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-muted-foreground">
        {label}
        {hint && <span className="ms-1.5 text-xs">({hint})</span>}
      </p>
      <div className="flex items-start gap-2">
        <pre className={`flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-sm ${multiline ? "" : "whitespace-nowrap"}`}>{value}</pre>
        <Button size="icon" variant="outline" onClick={copy} aria-label={`Copy ${label}`} title="Copy">
          {copied ? <CheckIcon className="text-emerald-500" /> : <CopyIcon />}
        </Button>
      </div>
    </div>
  )
}
