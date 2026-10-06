// Profile form (#/contribution/form, #/contribution/form/<slug> to edit). Builds the same YAML file a
// contributor would write by hand, checks it with the rules the pull-request bot uses, and helps send it.
// Loaded lazily: it brings Ajv, the schema and the YAML writer.
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react"
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, EyeIcon, InfoIcon, PencilIcon, RotateCcwIcon } from "lucide-react"

import { Loading, Profile as ProfileView, useCommunity } from "@/components/profile-page"
import {
  draftFromHitex,
  draftFromProfile,
  draftToProfile,
  fileNameOf,
  getIn,
  loadDraft,
  saveDraft,
  setIn,
  type Draft,
} from "@/components/profile-form/draft"
import { Chips, FormProvider, Group, TextInput, TextList, YesNo, type FormApi } from "@/components/profile-form/fields"
import { ReviewStep, type Checked, type Issue } from "@/components/profile-form/review"
import { CompanyStep, HiringStep, MoreStep, PeopleStep, PositionsStep, ProductStep, WorkingStep } from "@/components/profile-form/steps"
import { TranslationsStep } from "@/components/profile-form/translations"
import { StartupSearch } from "@/components/startup-search"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { profileHref } from "@/lib/cards"
import type { CommunityData, CommunityProfile } from "@/lib/community"
import { pick, textDir, type Lang, type Startup } from "@/lib/data"
import { loadDataset } from "@/lib/datasets"
import { CONTRIBUTING_URL, PROJECT_MAINTAINER, SITE_URL } from "@/lib/links"
import { validateProfileText, type Profile } from "@/lib/profile-rules"
import { profileToYaml, schemaValidator } from "@/lib/profile-schema"
import { cn } from "@/lib/utils"

interface Step {
  title: string
  blurb: string
  /** form paths whose errors belong to this step (longest match wins) */
  owns: string[]
}

const STEPS: Step[] = [
  { title: "Startup", blurb: "Who can edit the profile, and where to find you at HITEX.", owns: ["slug", "maintainers", "hitex"] },
  {
    title: "Company",
    blurb: "What you do, in English. Fields with * are required.",
    owns: ["i18n.en.name", "i18n.en.tagline", "i18n.en.description", "i18n.en.area_of_work", "i18n.en.aim", "website", "logo_url", "founded", "location", "industry", "industry_other", "business_model", "stage", "team_size", "engineering_team_size", "work_mode", "work_week"],
  },
  { title: "Product", blurb: "What you ship, how you build it and what it has achieved.", owns: ["products", "tech_stack", "tools", "traction", "recognition", "impact", "i18n.en.impact"] },
  { title: "People", blurb: "Founders, key people and what else you're looking for.", owns: ["founders", "core_team", "seeking", "co_founder_role", "i18n.en.seeking_note"] },
  { title: "Hiring", blurb: "How candidates reach you and who can apply.", owns: ["hiring", "i18n.en.looking_for"] },
  { title: "Working here", blurb: "Culture, contract, growth and benefits.", owns: ["hiring.contract", "hiring.growth", "hiring.internship", "hiring.benefits", "i18n.en.culture", "i18n.en.why_join"] },
  { title: "Positions", blurb: "The roles you're hiring for.", owns: ["hiring.positions"] },
  { title: "Links & more", blurb: "Social links, media, clients, partners and funding.", owns: ["links", "media", "clients", "partners", "funding"] },
  { title: "Translations", blurb: "Arabic, Kurdish and Persian versions of your texts.", owns: ["i18n.ar", "i18n.ku", "i18n.fa"] },
  { title: "Review & send", blurb: "Confirm, check and send your profile.", owns: ["consent"] },
]
const REVIEW = STEPS.length - 1

const covers = (prefix: string, path: string) => path === prefix || path.startsWith(`${prefix}.`)

function stepOf(path: string): number {
  if (/\._texts\.(ar|ku|fa)(\.|$)/.test(path)) return 8
  let best = REVIEW
  let length = -1
  STEPS.forEach((s, i) =>
    s.owns.forEach((prefix) => {
      if (covers(prefix, path) && prefix.length > length) {
        best = i
        length = prefix.length
      }
    })
  )
  return best
}

/** HITEX 2026 days (data/agenda.json) */
const HITEX_DAYS: [string, string][] = ["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"].map((d) => [
  d,
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`)),
])

const today = () => new Date().toISOString().slice(0, 10)

function check(draft: Draft, community: CommunityData, hitexIds: Set<string>): Checked {
  const { profile, formPath } = draftToProfile(draft, { today: today(), fallbackMaintainer: PROJECT_MAINTAINER })
  const name = (profile.i18n?.en?.name as string | undefined) ?? ""
  const yaml = profileToYaml(
    profile,
    ` HITEX Explorer startup profile${name ? `: ${name}` : ""}\n Made with the form at ${SITE_URL}/#/contribution/form`
  )
  const fileName = fileNameOf(draft)
  const res = validateProfileText(yaml, { fileName, vocab: community.vocab, validateSchema: schemaValidator(), hitexIds })
  const errors = [...res.errors]
  if (draft.mode === "new") {
    if (community.profiles.some((p) => p.slug === profile.slug)) {
      errors.push(`slug: "${profile.slug}" is already used by another profile; choose another.`)
    }
    const owner = community.profiles.find((p) => p.hitex?.existing_profile === profile.hitex?.existing_profile)
    if (owner) errors.push(`hitex.existing_profile: this startup already has a profile (${owner.slug}); edit it instead.`)
  }
  const issue = (message: string): Issue => {
    const m = /^([\w.[\]-]+): /.exec(message)
    const path = m && m[1] !== "YAML" ? formPath(m[1]) : ""
    return { message, path, step: path ? stepOf(path) : REVIEW }
  }
  return {
    yaml,
    fileName,
    slug: profile.slug ?? "",
    hitexId: profile.hitex?.existing_profile ?? "",
    name,
    issues: errors.map(issue),
    warnings: res.warnings.map(issue),
  }
}

/** Fills the fields the profile page always reads, so an unfinished draft can be previewed. */
function previewOf(draft: Draft): CommunityProfile {
  const { profile } = draftToProfile(draft, { today: today() })
  return {
    file: draft.file ?? "",
    slug: "",
    maintainers: [],
    website: "",
    logo_url: "",
    founded: "",
    industry: "",
    stage: "",
    team_size: "",
    work_mode: "",
    founders: [],
    ...(profile as Partial<CommunityProfile>),
    location: { city: "", country: "", ...profile.location },
    i18n: { ...profile.i18n, en: { ...profile.i18n?.en } },
  }
}

export default function ProfileFormPage({ slug, startId, lang }: { slug?: string; startId?: string; lang: Lang }) {
  const community = useCommunity()
  const [startups, setStartups] = useState<Startup[] | null>(null)
  useEffect(() => {
    let cancelled = false
    loadDataset("startups").then((d) => !cancelled && setStartups((d as { hitex: Startup[] }).hitex))
    return () => {
      cancelled = true
    }
  }, [])

  if (!community || !startups) return <Loading what="the form" />
  if (slug) {
    const profile = community.profiles.find((p) => p.slug === slug)
    if (!profile) {
      return (
        <Page>
          <p className="text-lg">No startup profile called “{slug}”.</p>
        </Page>
      )
    }
    return <Editor storageKey={`edit:${slug}`} initial={() => draftFromProfile(profile)} community={community} startups={startups} lang={lang} />
  }
  return <NewProfile startId={startId} community={community} startups={startups} lang={lang} />
}

function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">{children}</div>
}

/** New profile: pick the HITEX startup first (strict rule), then edit a draft filled in from HITEX. */
function NewProfile({ startId, community, startups, lang }: { startId?: string; community: CommunityData; startups: Startup[]; lang: Lang }) {
  const profiles = useMemo(() => new Map(community.profiles.map((p) => [p.hitex?.existing_profile ?? "", p.slug])), [community])
  // arrived from the Contribution page with a startup chosen
  const requested = startId ? startups.find((s) => s.id === startId) : undefined
  const [draft, setDraft] = useState<Draft | null>(
    () => loadDraft("new") ?? (requested && !profiles.has(requested.id) ? draftFromHitex(requested) : null)
  )
  const [taken, setTaken] = useState<Startup | null>(() => (requested && profiles.has(requested.id) ? requested : null))
  const draftId = draft?.profile.hitex?.existing_profile
  const [askSwitch, setAskSwitch] = useState(() => !!requested && !!draftId && draftId !== requested.id)

  const start = (s: Startup) => {
    if (profiles.has(s.id)) {
      setTaken(s)
      return
    }
    const d = draftFromHitex(s)
    saveDraft("new", d)
    setDraft(d)
  }

  if (askSwitch && requested && draft) {
    const current = startups.find((s) => s.id === draftId)
    return (
      <Page>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p>
              You have an unfinished profile for <bdi className="font-semibold">{current ? pick(current.name, "en") : draftId}</bdi> in
              this browser.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setAskSwitch(false)}>Continue it</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAskSwitch(false)
                  start(requested)
                }}
              >
                Start {pick(requested.name, "en")} instead
              </Button>
            </div>
          </CardContent>
        </Card>
      </Page>
    )
  }

  if (!draft) {
    return (
      <Page>
        <Header />
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Find your startup</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Only startups listed by HITEX can have a profile. We fill in what HITEX publishes about yours: name and
              description in four languages, founders and years.
            </p>
            <StartupSearch startups={startups} profiles={profiles} lang={lang} onPick={start} onType={() => setTaken(null)} showResults={!taken} />
            {taken && (
              <div className="flex flex-col gap-3 rounded-lg border p-4">
                <p>
                  <bdi lang={lang} dir={textDir(lang)} className="font-semibold">
                    {pick(taken.name, lang)}
                  </bdi>{" "}
                  already has a profile. Its maintainers can update it.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <a href={`#/contribution/form/${profiles.get(taken.id)}`}>
                      <PencilIcon data-icon="inline-start" /> Edit it
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={profileHref(profiles.get(taken.id)!)}>Open the profile</a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Page>
    )
  }

  return (
    <Editor
      key={draft.created}
      storageKey="new"
      initial={() => draft}
      community={community}
      startups={startups}
      lang={lang}
      onRestart={() => {
        saveDraft("new", null)
        setDraft(null)
        setTaken(null)
        // don't start the same startup again from ?startup=
        if (startId) window.location.hash = "#/contribution/form"
      }}
    />
  )
}

function Header({ name, mode }: { name?: string; mode?: "new" | "edit" }) {
  return (
    <div className="flex flex-col gap-2">
      <a href="#/contribution" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Contribution
      </a>
      <h1 className="text-3xl font-semibold">
        {mode === "edit" ? "Edit profile" : "Startup profile"}
        {name && (
          <>
            : <bdi>{name}</bdi>
          </>
        )}
      </h1>
      <p className="max-w-3xl text-muted-foreground">
        Fill in what applies; everything except the basics is optional. Your answers are saved in this browser as you
        type. At the end you get your profile file and send it on GitHub, or to us without GitHub.{" "}
        <a href={CONTRIBUTING_URL} target="_blank" rel="noreferrer" className="underline underline-offset-3">
          Guide
        </a>
      </p>
    </div>
  )
}

function Editor({
  storageKey,
  initial,
  community,
  startups,
  lang,
  onRestart,
}: {
  storageKey: string
  initial: () => Draft
  community: CommunityData
  startups: Startup[]
  lang: Lang
  onRestart?: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => loadDraft(storageKey) ?? initial())
  const [step, setStep] = useState(0)
  const [visited, setVisited] = useState<Set<number>>(() => new Set())
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const [preview, setPreview] = useState(false)

  useEffect(() => saveDraft(storageKey, draft), [storageKey, draft])

  const hitexIds = useMemo(() => new Set(startups.map((s) => s.id)), [startups])
  const deferred = useDeferredValue(draft)
  const checked = useMemo(() => check(deferred, community, hitexIds), [deferred, community, hitexIds])

  const goTo = (next: number) => {
    setVisited((v) => new Set(v).add(step))
    if (next === REVIEW) setVisited(new Set(STEPS.map((_, i) => i)))
    setPreview(false)
    setStep(next)
    window.scrollTo({ top: 0 })
  }

  const api: FormApi = {
    get: (path) => getIn(draft.profile, path),
    set: (path, value) => setDraft((d) => ({ ...d, profile: setIn(d.profile, path, value) })),
    touch: (path) => setTouched((t) => (t.has(path) ? t : new Set(t).add(path))),
    errors: (path, nested) =>
      checked.issues
        .filter((i) => i.path === path || (nested && i.path.startsWith(`${path}.`)))
        .filter((i) => visited.has(i.step) || [...touched].some((t) => covers(t, i.path)))
        .map((i) => i.message),
    vocab: community.vocab,
  }

  const counts = STEPS.map((_, i) => checked.issues.filter((x) => x.step === i).length)
  const startup = startups.find((s) => s.id === draft.profile.hitex?.existing_profile)
  const name = (draft.profile.i18n?.en?.name as string | undefined) || (startup ? pick(startup.name, "en") : "")
  const hasMaintainers = ((draft.profile.maintainers as string[] | undefined) ?? []).some((m) => m?.trim())

  return (
    <Page>
      <Header name={name} mode={draft.mode} />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[13rem_1fr] lg:items-start lg:gap-8">
        <nav aria-label="Form steps" className="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:mx-0 lg:px-0">
          <ol className="flex gap-1 lg:flex-col">
            {STEPS.map((s, i) => {
              const done = visited.has(i) && counts[i] === 0
              const bad = visited.has(i) && counts[i] > 0
              return (
                <li key={s.title} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === step ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm whitespace-nowrap transition-colors",
                      i === step ? "bg-secondary font-medium text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums",
                        done && "border-emerald-500 bg-emerald-500 text-white",
                        bad && "border-destructive bg-destructive text-white",
                        i === step && !done && !bad && "border-primary bg-primary text-primary-foreground"
                      )}
                    >
                      {done ? <CheckIcon className="size-3.5" /> : bad ? counts[i] : i + 1}
                    </span>
                    {s.title}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Saved in this browser</p>
            <div className="flex flex-wrap gap-2">
              <Button variant={preview ? "secondary" : "outline"} size="sm" onClick={() => setPreview(!preview)}>
                {preview ? <PencilIcon data-icon="inline-start" /> : <EyeIcon data-icon="inline-start" />}
                {preview ? "Back to the form" : "Preview"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const what = draft.mode === "edit" ? "Discard your changes and start again from the published profile?" : "Delete this draft and start over?"
                  if (!window.confirm(what)) return
                  saveDraft(storageKey, null)
                  if (onRestart) onRestart()
                  else {
                    setDraft(initial())
                    setVisited(new Set())
                    setTouched(new Set())
                    setStep(0)
                  }
                }}
              >
                <RotateCcwIcon data-icon="inline-start" /> Start over
              </Button>
            </div>
          </div>

          {preview ? (
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <InfoIcon className="size-4" /> Preview in the language chosen at the top of the page.
              </p>
              <ProfileView p={previewOf(draft)} vocab={community.vocab} lang={lang} embedded preview />
            </div>
          ) : (
            <FormProvider value={api}>
              <Card>
                <CardHeader className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">
                    Step {step + 1} of {STEPS.length}
                  </p>
                  <CardTitle className="text-2xl">
                    <h2>{STEPS[step].title}</h2>
                  </CardTitle>
                  <p className="text-muted-foreground">{STEPS[step].blurb}</p>
                </CardHeader>
                <CardContent className="flex flex-col gap-8">
                  {step === 0 && <StartupStep draft={draft} startup={startup} lang={lang} onRestart={onRestart ? () => onRestart() : undefined} />}
                  {step === 1 && <CompanyStep />}
                  {step === 2 && <ProductStep />}
                  {step === 3 && <PeopleStep />}
                  {step === 4 && <HiringStep />}
                  {step === 5 && <WorkingStep />}
                  {step === 6 && <PositionsStep />}
                  {step === 7 && <MoreStep />}
                  {step === 8 && <TranslationsStep />}
                  {step === REVIEW && (
                    <ReviewStep checked={checked} mode={draft.mode} hasMaintainers={hasMaintainers} steps={STEPS.map((s) => s.title)} goTo={goTo} />
                  )}
                </CardContent>
              </Card>
            </FormProvider>
          )}

          <div className="flex justify-between gap-2">
            <Button variant="outline" disabled={step === 0} onClick={() => goTo(step - 1)}>
              <ArrowLeftIcon data-icon="inline-start" /> Back
            </Button>
            {step < REVIEW && (
              <Button onClick={() => goTo(step + 1)}>
                {STEPS[step + 1].title} <ArrowRightIcon data-icon="inline-end" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Page>
  )
}

function StartupStep({ draft, startup, lang, onRestart }: { draft: Draft; startup?: Startup; lang: Lang; onRestart?: () => void }) {
  const slug = (draft.profile.slug as string | undefined) || "…"
  const p: Profile = draft.profile
  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p lang={lang} dir={textDir(lang)} className="text-lg font-semibold">
            {startup ? pick(startup.name, lang) : p.hitex?.existing_profile}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">Listed by HITEX</Badge>
            {(startup?.years ?? []).join(", ")}
          </p>
        </div>
        {draft.mode === "new" && onRestart && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.confirm("Choose another startup? This draft will be deleted.") && onRestart()}
          >
            Choose another
          </Button>
        )}
      </div>
      {draft.mode === "new" && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          Filled in from HITEX: name and description in four languages, founders and years. Check them as you go, and add your logo in the Company step.
        </p>
      )}

      <Group title="Your page">
        <TextInput
          path="slug"
          label="Page address"
          required
          readOnly={draft.mode === "edit"}
          maxLength={60}
          hint={`${SITE_URL.replace("https://", "")}/#/startups/${slug} · lowercase letters, digits and _`}
        />
        <p className="text-sm text-muted-foreground">
          File: <span className="font-mono break-all">public/startups/{fileNameOf(draft)}</span>
        </p>
        <TextList
          path="maintainers"
          label="GitHub usernames of people who may edit this profile"
          max={5}
          placeholder="your-github-username"
          addLabel="Add a username"
          hint="To submit on GitHub, the pull request must come from one of them. No GitHub account? Leave it empty and choose “Send without GitHub” at the end."
        />
      </Group>

      <Group title="At HITEX 2026" hint="Help visitors find you at the event.">
        <YesNo path="hitex.at_event.attending" label="We're at HITEX this year" />
        {p.hitex?.at_event?.attending === true && (
          <>
            <TextInput path="hitex.at_event.booth" label="Booth" maxLength={20} placeholder="F12" />
            <Chips path="hitex.at_event.days" label="Days we're there" choices={HITEX_DAYS} />
            <YesNo path="hitex.at_event.interviewing_at_booth" label="We interview candidates at the booth" />
            <YesNo path="hitex.at_event.walk_in_cvs" label="People can bring a CV to the booth" />
            <TextInput path="hitex.at_event.book_meeting_url" label="Book a meeting" type="url" placeholder="https://calendly.com/…" />
          </>
        )}
      </Group>
    </>
  )
}
