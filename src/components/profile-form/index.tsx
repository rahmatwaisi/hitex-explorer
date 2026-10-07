// Profile form for startups (/contribution/form, /contribution/form/<slug> to edit) and sponsors
// (/contribution/sponsor/form, /contribution/sponsor/form/<slug>). Builds the same YAML file a contributor
// would write by hand, checks it with the rules the pull-request bot uses, and helps send it.
// Loaded lazily: it brings Ajv, the schemas and the YAML writer.
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react"
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, EyeIcon, InfoIcon, PencilIcon, RotateCcwIcon } from "lucide-react"

import { Loading, Profile as ProfileView, useCommunity } from "@/components/profile-page"
import {
  draftFromHitex,
  draftFromProfile,
  draftFromSponsor,
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
import {
  CompanyStep,
  ForStartupsStep,
  HiringStep,
  LeadershipStep,
  MoreStep,
  PeopleStep,
  PositionsStep,
  ProductStep,
  WorkingStep,
} from "@/components/profile-form/steps"
import { TranslationsStep } from "@/components/profile-form/translations"
import { SponsorProfile as SponsorView } from "@/components/sponsor-profile"
import { SponsorSearch, StartupSearch, type HitexRecord } from "@/components/startup-search"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { pageHref, type AnyProfile, type CommunityData, type CommunityProfile, type SponsorProfile } from "@/lib/community"
import { pick, textDir, type Lang, type Organization, type Startup } from "@/lib/data"
import { loadDataset } from "@/lib/datasets"
import { CONTRIBUTING_URL, PROJECT_MAINTAINER, SITE_URL } from "@/lib/links"
import { KINDS, validateProfileText, type Profile, type ProfileKind } from "@/lib/profile-rules"
import { profileToYaml, schemaValidator } from "@/lib/profile-schema"
import { navigate } from "@/lib/router"
import { cn } from "@/lib/utils"

type StepId = "identity" | "company" | "product" | "for_startups" | "people" | "leadership" | "hiring" | "working" | "positions" | "more" | "translations" | "review"

interface Step {
  id: StepId
  title: string
  blurb: string
  /** form paths whose errors belong to this step (longest match wins) */
  owns: string[]
}

const COMPANY_OWNS = ["i18n.en.name", "i18n.en.tagline", "i18n.en.description", "i18n.en.area_of_work", "i18n.en.aim", "website", "logo_url", "founded", "location", "industry", "industry_other", "business_model", "engineering_team_size", "work_mode", "work_week"]
const SHARED_END: Step[] = [
  { id: "hiring", title: "Hiring", blurb: "How candidates reach you and who can apply.", owns: ["hiring", "i18n.en.looking_for"] },
  { id: "working", title: "Working here", blurb: "Culture, contract, growth and benefits.", owns: ["hiring.contract", "hiring.growth", "hiring.internship", "hiring.benefits", "i18n.en.culture", "i18n.en.why_join"] },
  { id: "positions", title: "Positions", blurb: "The roles you're hiring for.", owns: ["hiring.positions"] },
]
const TRANSLATIONS: Step = { id: "translations", title: "Translations", blurb: "Arabic, Kurdish and Persian versions of your texts.", owns: ["i18n.ar", "i18n.ku", "i18n.fa"] }
const REVIEW_STEP: Step = { id: "review", title: "Review & send", blurb: "Confirm, check and send your profile.", owns: ["consent"] }

const STEPS: Record<ProfileKind, Step[]> = {
  startup: [
    { id: "identity", title: "Startup", blurb: "Who can edit the profile, and where to find you at HITEX.", owns: ["slug", "maintainers", "hitex"] },
    { id: "company", title: "Company", blurb: "What you do, in English. Fields with * are required.", owns: [...COMPANY_OWNS, "stage", "team_size"] },
    { id: "product", title: "Product", blurb: "What you ship, how you build it and what it has achieved.", owns: ["products", "tech_stack", "tools", "traction", "recognition", "impact", "i18n.en.impact"] },
    { id: "people", title: "People", blurb: "Founders, key people and what else you're looking for.", owns: ["founders", "core_team", "seeking", "co_founder_role", "i18n.en.seeking_note"] },
    ...SHARED_END,
    { id: "more", title: "Links & more", blurb: "Social links, media, clients, partners and funding.", owns: ["links", "media", "clients", "partners", "funding"] },
    TRANSLATIONS,
    REVIEW_STEP,
  ],
  sponsor: [
    { id: "identity", title: "Sponsor", blurb: "Who can edit the profile, and what you do at HITEX.", owns: ["slug", "maintainers", "hitex"] },
    { id: "company", title: "Company", blurb: "What you do, in English. Fields with * are required.", owns: [...COMPANY_OWNS, "company_size"] },
    { id: "product", title: "Products", blurb: "Your products and services, how you build them and what you're known for.", owns: ["products", "tech_stack", "tools", "recognition", "impact", "i18n.en.impact"] },
    { id: "for_startups", title: "For startups", blurb: "What you offer startups, the partners you want, and who to talk to.", owns: ["for_startups", "i18n.en.offer_note", "i18n.en.partnership_note"] },
    { id: "leadership", title: "Leadership", blurb: "The people who lead the company.", owns: ["leadership"] },
    ...SHARED_END,
    { id: "more", title: "Links & more", blurb: "Social links, media, clients and partners.", owns: ["links", "media", "clients", "partners"] },
    TRANSLATIONS,
    REVIEW_STEP,
  ],
}

/** What differs between the startup and the sponsor form. */
const FORMS: Record<ProfileKind, { title: string; path: string; page: string; storage: (key: string) => string; listedBy: string }> = {
  startup: { title: "Startup profile", path: "/contribution/form", page: "/contribution/startup/", storage: (key) => key, listedBy: "startups" },
  sponsor: { title: "Sponsor profile", path: "/contribution/sponsor/form", page: "/contribution/sponsor/", storage: (key) => `sponsor:${key}`, listedBy: "sponsors" },
}

const covers = (prefix: string, path: string) => path === prefix || path.startsWith(`${prefix}.`)

function stepOf(steps: Step[], path: string): number {
  const review = steps.length - 1
  if (/\._texts\.(ar|ku|fa)(\.|$)/.test(path)) return steps.findIndex((s) => s.id === "translations")
  let best = review
  let length = -1
  steps.forEach((s, i) =>
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

const profilesOf = (community: CommunityData, kind: ProfileKind): AnyProfile[] => (kind === "sponsor" ? community.sponsors : community.profiles)

function check(kind: ProfileKind, draft: Draft, community: CommunityData, hitexIds: Set<string>): Checked {
  const steps = STEPS[kind]
  const { profile, formPath } = draftToProfile(draft, { today: today(), fallbackMaintainer: PROJECT_MAINTAINER })
  const name = (profile.i18n?.en?.name as string | undefined) ?? ""
  const yaml = profileToYaml(
    profile,
    ` HITEX Explorer ${kind} profile${name ? `: ${name}` : ""}\n Made with the form at ${SITE_URL}${FORMS[kind].path}`,
    kind
  )
  const fileName = fileNameOf(draft)
  const res = validateProfileText(yaml, { kind, fileName, vocab: community.vocab, validateSchema: schemaValidator(kind), hitexIds })
  const errors = [...res.errors]
  if (draft.mode === "new") {
    const others = profilesOf(community, kind)
    if (others.some((p) => p.slug === profile.slug)) {
      errors.push(`slug: "${profile.slug}" is already used by another profile; choose another.`)
    }
    const owner = others.find((p) => p.hitex?.existing_profile === profile.hitex?.existing_profile)
    if (owner) errors.push(`hitex.existing_profile: this ${KINDS[kind].noun} already has a profile (${owner.slug}); edit it instead.`)
  }
  const issue = (message: string): Issue => {
    const m = /^([\w.[\]-]+): /.exec(message)
    const path = m && m[1] !== "YAML" ? formPath(m[1]) : ""
    return { message, path, step: path ? stepOf(steps, path) : steps.length - 1 }
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

function sponsorPreviewOf(draft: Draft, tier?: string | null): SponsorProfile {
  const { profile } = draftToProfile(draft, { today: today() })
  return {
    file: draft.file ?? "",
    slug: "",
    maintainers: [],
    website: "",
    logo_url: "",
    industry: "",
    company_size: "",
    ...(profile as Partial<SponsorProfile>),
    kind: "sponsor",
    tier: tier ?? undefined,
    location: { city: "", country: "", ...profile.location },
    i18n: { ...profile.i18n, en: { ...profile.i18n?.en } },
  }
}

export default function ProfileFormPage({ kind, slug, startId, lang }: { kind: ProfileKind; slug?: string; startId?: string; lang: Lang }) {
  const community = useCommunity()
  const [records, setRecords] = useState<HitexRecord[] | null>(null)
  useEffect(() => {
    let cancelled = false
    loadDataset(kind === "sponsor" ? "sponsors" : "startups").then((d) => !cancelled && setRecords((d as { hitex: HitexRecord[] }).hitex))
    return () => {
      cancelled = true
    }
  }, [kind])

  if (!community || !records) return <Loading what="the form" />
  const storage = FORMS[kind].storage
  if (slug) {
    const profile = profilesOf(community, kind).find((p) => p.slug === slug)
    if (!profile) {
      return (
        <Page>
          <p className="text-lg">
            No {kind} profile called “{slug}”.
          </p>
        </Page>
      )
    }
    return <Editor kind={kind} storageKey={storage(`edit:${slug}`)} initial={() => draftFromProfile(profile)} community={community} records={records} lang={lang} />
  }
  return <NewProfile kind={kind} startId={startId} community={community} records={records} lang={lang} />
}

function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">{children}</div>
}

/** A new draft from HITEX's record: a startup's or a sponsor's. */
const draftFrom = (kind: ProfileKind, r: HitexRecord) => (kind === "sponsor" ? draftFromSponsor(r as Organization) : draftFromHitex(r as Startup))

/** New profile: pick the HITEX startup or sponsor first (strict rule), then edit a draft filled in from HITEX. */
function NewProfile({ kind, startId, community, records, lang }: { kind: ProfileKind; startId?: string; community: CommunityData; records: HitexRecord[]; lang: Lang }) {
  const form = FORMS[kind]
  const key = form.storage("new")
  const profiles = useMemo(() => new Map(profilesOf(community, kind).map((p) => [p.hitex?.existing_profile ?? "", p.slug])), [community, kind])
  // arrived from the Contribution page with a startup or sponsor chosen
  const requested = startId ? records.find((s) => s.id === startId) : undefined
  const [draft, setDraft] = useState<Draft | null>(
    () => loadDraft(key) ?? (requested && !profiles.has(requested.id) ? draftFrom(kind, requested) : null)
  )
  const [taken, setTaken] = useState<HitexRecord | null>(() => (requested && profiles.has(requested.id) ? requested : null))
  const draftId = draft?.profile.hitex?.existing_profile
  const [askSwitch, setAskSwitch] = useState(() => !!requested && !!draftId && draftId !== requested.id)

  const start = (s: HitexRecord) => {
    if (profiles.has(s.id)) {
      setTaken(s)
      return
    }
    const d = draftFrom(kind, s)
    saveDraft(key, d)
    setDraft(d)
  }

  if (askSwitch && requested && draft) {
    const current = records.find((s) => s.id === draftId)
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
    const search = { profiles, lang, onPick: start, onType: () => setTaken(null), showResults: !taken }
    return (
      <Page>
        <Header kind={kind} />
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{kind === "sponsor" ? "Find your organization" : "Find your startup"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {kind === "sponsor"
                ? "Only sponsors listed by HITEX can have a sponsor profile. We fill in what HITEX publishes about yours: name and description in four languages, website, logo, booth and years."
                : "Only startups listed by HITEX can have a profile. We fill in what HITEX publishes about yours: name and description in four languages, founders and years."}
            </p>
            {kind === "sponsor" ? (
              <SponsorSearch sponsors={records as Organization[]} {...search} />
            ) : (
              <StartupSearch startups={records as Startup[]} {...search} />
            )}
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
                    <a href={`${form.path}/${profiles.get(taken.id)}`}>
                      <PencilIcon data-icon="inline-start" /> Edit it
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={pageHref({ kind, slug: profiles.get(taken.id)! })}>Open the profile</a>
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
      kind={kind}
      storageKey={key}
      initial={() => draft}
      community={community}
      records={records}
      lang={lang}
      onRestart={() => {
        saveDraft(key, null)
        setDraft(null)
        setTaken(null)
        // don't start the same startup or sponsor again from ?startup= / ?sponsor=
        if (startId) navigate(form.path, { replace: true })
      }}
    />
  )
}

function Header({ kind, name, mode }: { kind: ProfileKind; name?: string; mode?: "new" | "edit" }) {
  return (
    <div className="flex flex-col gap-2">
      <a href={FORMS[kind].page} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> {kind === "sponsor" ? "Contribute as Sponsor" : "Contribute as Startup"}
      </a>
      <h1 className="border-s-4 ps-3 text-3xl font-semibold" style={{ borderColor: `var(--${kind})` }}>
        {mode === "edit" ? "Edit profile" : FORMS[kind].title}
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
  kind,
  storageKey,
  initial,
  community,
  records,
  lang,
  onRestart,
}: {
  kind: ProfileKind
  storageKey: string
  initial: () => Draft
  community: CommunityData
  records: HitexRecord[]
  lang: Lang
  onRestart?: () => void
}) {
  const steps = STEPS[kind]
  const review = steps.length - 1
  const [draft, setDraft] = useState<Draft>(() => {
    const d = loadDraft(storageKey) ?? initial()
    return { ...d, kind }
  })
  const [step, setStep] = useState(0)
  const [visited, setVisited] = useState<Set<number>>(() => new Set())
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const [preview, setPreview] = useState(false)

  useEffect(() => saveDraft(storageKey, draft), [storageKey, draft])

  const hitexIds = useMemo(() => new Set(records.map((s) => s.id)), [records])
  const deferred = useDeferredValue(draft)
  const checked = useMemo(() => check(kind, deferred, community, hitexIds), [kind, deferred, community, hitexIds])

  const goTo = (next: number) => {
    setVisited((v) => new Set(v).add(step))
    if (next === review) setVisited(new Set(steps.map((_, i) => i)))
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

  const counts = steps.map((_, i) => checked.issues.filter((x) => x.step === i).length)
  const record = records.find((s) => s.id === draft.profile.hitex?.existing_profile)
  const name = (draft.profile.i18n?.en?.name as string | undefined) || (record ? pick(record.name, "en") : "")
  const hasMaintainers = ((draft.profile.maintainers as string[] | undefined) ?? []).some((m) => m?.trim())
  const id = steps[step].id

  return (
    <Page>
      <Header kind={kind} name={name} mode={draft.mode} />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[13rem_1fr] lg:items-start lg:gap-8">
        <nav aria-label="Form steps" className="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:mx-0 lg:px-0">
          <ol className="flex gap-1 lg:flex-col">
            {steps.map((s, i) => {
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
              {kind === "sponsor" ? (
                <SponsorView p={sponsorPreviewOf(draft, (record as Organization | undefined)?.tier)} vocab={community.vocab} lang={lang} embedded preview />
              ) : (
                <ProfileView p={previewOf(draft)} vocab={community.vocab} lang={lang} embedded preview />
              )}
            </div>
          ) : (
            <FormProvider value={api}>
              <Card>
                <CardHeader className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">
                    Step {step + 1} of {steps.length}
                  </p>
                  <CardTitle className="text-2xl">
                    <h2>{steps[step].title}</h2>
                  </CardTitle>
                  <p className="text-muted-foreground">{steps[step].blurb}</p>
                </CardHeader>
                <CardContent className="flex flex-col gap-8">
                  {id === "identity" && <IdentityStep kind={kind} draft={draft} record={record} lang={lang} onRestart={onRestart ? () => onRestart() : undefined} />}
                  {id === "company" && <CompanyStep kind={kind} />}
                  {id === "product" && <ProductStep kind={kind} />}
                  {id === "for_startups" && <ForStartupsStep />}
                  {id === "people" && <PeopleStep />}
                  {id === "leadership" && <LeadershipStep />}
                  {id === "hiring" && <HiringStep />}
                  {id === "working" && <WorkingStep />}
                  {id === "positions" && <PositionsStep />}
                  {id === "more" && <MoreStep kind={kind} />}
                  {id === "translations" && <TranslationsStep kind={kind} />}
                  {id === "review" && (
                    <ReviewStep kind={kind} checked={checked} mode={draft.mode} hasMaintainers={hasMaintainers} steps={steps.map((s) => s.title)} goTo={goTo} />
                  )}
                </CardContent>
              </Card>
            </FormProvider>
          )}

          <div className="flex justify-between gap-2">
            <Button variant="outline" disabled={step === 0} onClick={() => goTo(step - 1)}>
              <ArrowLeftIcon data-icon="inline-start" /> Back
            </Button>
            {step < review && (
              <Button onClick={() => goTo(step + 1)}>
                {steps[step + 1].title} <ArrowRightIcon data-icon="inline-end" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Page>
  )
}

/** First step: the HITEX record this profile completes, its page address, maintainers and HITEX this year. */
function IdentityStep({ kind, draft, record, lang, onRestart }: { kind: ProfileKind; draft: Draft; record?: HitexRecord; lang: Lang; onRestart?: () => void }) {
  const slug = (draft.profile.slug as string | undefined) || "…"
  const p: Profile = draft.profile
  const sponsor = kind === "sponsor"
  const tier = sponsor ? (record as Organization | undefined)?.tier : undefined
  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p lang={lang} dir={textDir(lang)} className="text-lg font-semibold">
            {record ? pick(record.name, lang) : p.hitex?.existing_profile}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">Listed by HITEX</Badge>
            {tier && <Badge variant="secondary">{`${tier[0].toUpperCase()}${tier.slice(1)} sponsor`}</Badge>}
            {(record?.years ?? []).join(", ")}
          </p>
        </div>
        {draft.mode === "new" && onRestart && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.confirm(`Choose another ${KINDS[kind].noun}? This draft will be deleted.`) && onRestart()}
          >
            Choose another
          </Button>
        )}
      </div>
      {draft.mode === "new" && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          {sponsor
            ? "Filled in from HITEX: name and description in four languages, website, logo, booth and years. Check them as you go; your tier comes from HITEX's list."
            : "Filled in from HITEX: name and description in four languages, founders and years. Check them as you go, and add your logo in the Company step."}
        </p>
      )}

      <Group title="Your page">
        <TextInput
          path="slug"
          label="Page address"
          required
          readOnly={draft.mode === "edit"}
          maxLength={60}
          hint={`${SITE_URL.replace("https://", "")}/${sponsor ? "sponsors" : "startups"}/${slug} · lowercase letters, digits and _`}
        />
        <p className="text-sm text-muted-foreground">
          File: <span className="font-mono break-all">{KINDS[kind].dir}/{fileNameOf(draft)}</span>
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
            <TextInput path="hitex.at_event.booth" label="Booth" maxLength={20} placeholder={sponsor ? "P01" : "F12"} />
            <Chips path="hitex.at_event.days" label="Days we're there" choices={HITEX_DAYS} />
            {sponsor && <Chips path="hitex.at_event.activities" label="At our booth" list="event_activities" />}
            <YesNo path="hitex.at_event.interviewing_at_booth" label="We interview candidates at the booth" />
            <YesNo path="hitex.at_event.walk_in_cvs" label="People can bring a CV to the booth" />
            <TextInput path="hitex.at_event.book_meeting_url" label="Book a meeting" type="url" placeholder="https://calendly.com/…" />
          </>
        )}
      </Group>
    </>
  )
}
