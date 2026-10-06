import { useEffect, useState, type ReactNode } from "react"
import { CheckIcon, ClipboardListIcon, CopyIcon, FileCodeIcon, GitPullRequestIcon, InfoIcon, PencilIcon } from "lucide-react"

import { HitexText } from "@/components/highlight"
import { Loading, Profile, useCommunity } from "@/components/profile-page"
import { StartupSearch } from "@/components/startup-search"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { profileHref } from "@/lib/cards"
import { pick, textDir, type Lang, type Startup } from "@/lib/data"
import { loadDataset } from "@/lib/datasets"
import { CONTRIBUTING_URL, TEMPLATE_URL } from "@/lib/links"
import { fileStamp, snakeCase } from "@/lib/profile-names"

export function ContributionPage({ lang }: { lang: Lang }) {
  const community = useCommunity()
  const [startups, setStartups] = useState<Startup[] | null>(null)
  useEffect(() => {
    let cancelled = false
    loadDataset("startups").then((d) => !cancelled && setStartups((d as { hitex: Startup[] }).hitex))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Contribution</h1>
        <p className="max-w-3xl text-muted-foreground">
          <HitexText>
            Took part in HITEX? Complete your startup's profile with your team, open positions, how to apply and what
            you're looking for. You get a full page like the example below.
          </HitexText>
        </p>
      </div>

      <Card className="ring-2 ring-sky-500/60">
        <CardContent className="flex items-start gap-2">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-sky-500" />
          <p>
            <HitexText>
              Only startups already listed by HITEX can contribute, and only to complete their own profile. New startups
              that are not in HITEX's list are not accepted. One profile per startup.
            </HitexText>
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StepCard n={1} title="Find your startup" text="Search below. Only startups listed by HITEX can have a profile." />
        <StepCard n={2} title="Fill in the form" text="A few steps, with what HITEX publishes already filled in. Or write the file by hand from the template.">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <a href="#/contribution/form">
                <ClipboardListIcon data-icon="inline-start" /> Open the form
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={TEMPLATE_URL} target="_blank" rel="noreferrer">
                <FileCodeIcon data-icon="inline-start" /> Template
              </a>
            </Button>
          </div>
        </StepCard>
        <StepCard n={3} title="Send it" text="Submit on GitHub, where a bot checks your file within a minute, or send it to us without GitHub.">
          <Button size="sm" variant="outline" asChild>
            <a href={CONTRIBUTING_URL} target="_blank" rel="noreferrer">
              <GitPullRequestIcon data-icon="inline-start" /> Guide
            </a>
          </Button>
        </StepCard>
      </div>

      {startups && community ? (
        <Finder
          startups={startups}
          profiles={new Map(community.profiles.map((p) => [p.hitex?.existing_profile ?? "", p.slug]))}
          lang={lang}
        />
      ) : (
        <Loading what="startups" />
      )}

      <div className="flex items-center gap-3 pt-4">
        <h2 className="text-2xl font-semibold">Example startup</h2>
        <Badge variant="secondary">Example</Badge>
      </div>
      <p className="-mt-3 text-muted-foreground">
        Built from the profile template, so it shows every section a completed profile can have.
      </p>
      {community?.example ? <Profile p={community.example} vocab={community.vocab} lang={lang} embedded /> : <Loading what="example" />}
    </div>
  )
}

function StepCard({ n, title, text, children }: { n: number; title: string; text: string; children?: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {n}
        </span>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
        {children && <div className="mt-auto pt-1">{children}</div>}
      </CardContent>
    </Card>
  )
}

function Finder({ startups, profiles, lang }: { startups: Startup[]; profiles: Map<string, string>; lang: Lang }) {
  const [selected, setSelected] = useState<Startup | null>(null)

  const name = selected ? pick(selected.name, "en") : ""
  const slug = snakeCase(name) || "startup"
  const file = `${fileStamp()}_${slug}.yml`
  const snippet = selected ? `slug: "${slug}"\nhitex:\n  existing_profile: "${selected.id}"` : ""
  const existing = selected ? profiles.get(selected.id) : undefined

  return (
    <Card id="find">
      <CardHeader>
        <CardTitle className="text-xl">Find your startup</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <StartupSearch startups={startups} profiles={profiles} lang={lang} onPick={setSelected} onType={() => setSelected(null)} showResults={!selected} />

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
                <p>This startup already has a profile. Its maintainers can update it.</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <a href={`#/contribution/form/${existing}`}>
                      <PencilIcon data-icon="inline-start" /> Edit it
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={profileHref(existing)}>Open the profile</a>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button asChild className="w-fit">
                  <a href={`#/contribution/form?startup=${selected.id}`}>
                    <ClipboardListIcon data-icon="inline-start" /> Start the form
                  </a>
                </Button>
                <details className="flex flex-col gap-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Writing the file by hand instead?
                  </summary>
                  <div className="mt-3 flex flex-col gap-4">
                    <CopyRow label="Startup id" value={selected.id} />
                    <CopyRow label="File name" value={`public/startups/${file}`} hint="uses the current UTC time" />
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
