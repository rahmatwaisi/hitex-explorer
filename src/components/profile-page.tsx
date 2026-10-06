import { useEffect, useState, type ComponentType, type CSSProperties, type ReactNode } from "react"
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  BriefcaseIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  FileSignatureIcon,
  FlagIcon,
  GiftIcon,
  GlobeIcon,
  GraduationCapIcon,
  HandCoinsIcon,
  HourglassIcon,
  InfoIcon,
  LanguagesIcon,
  LaptopIcon,
  Loader2Icon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PencilIcon,
  PlaneIcon,
  ShieldCheckIcon,
  SproutIcon,
  TimerIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from "lucide-react"

import { GitHubIcon, LinkedInIcon } from "@/components/brand-icons"
import { HitexText } from "@/components/highlight"
import { ProfileQr } from "@/components/profile-qr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  activePositions,
  formatSalary,
  hiringIsCurrent,
  loadCommunity,
  peekCommunity,
  positionTexts,
  productText,
  profileText,
  vocabLabel,
  vocabLabels,
  type CommunityData,
  type CommunityProfile,
  type Person,
  type Position,
  type Vocab,
} from "@/lib/community"
import { textDir, type Lang } from "@/lib/data"
import { CONTRIBUTING_URL, GITHUB_URL, TEMPLATE_URL, isOnThisSite } from "@/lib/links"
import { cn, setPageTitle } from "@/lib/utils"

const HITEX_RED = "#EB2637"
const day = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`))

/** Loads data/community.json once per page. */
export function useCommunity() {
  const [data, setData] = useState<CommunityData | null>(() => peekCommunity() ?? null)
  useEffect(() => {
    let cancelled = false
    loadCommunity().then((d) => !cancelled && setData(d))
    return () => {
      cancelled = true
    }
  }, [])
  return data
}

export function Loading({ what }: { what: string }) {
  return (
    <p className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-12 text-muted-foreground sm:px-6">
      <Loader2Icon className="size-4 animate-spin" /> Loading {what}…
    </p>
  )
}

/** Startup page built from one public/startups/*.yml file (#/startups/<slug>). */
export function ProfilePage({ slug, lang }: { slug: string; lang: Lang }) {
  const data = useCommunity()
  const profile = data?.example?.slug === slug ? data.example : data?.profiles.find((p) => p.slug === slug)
  const title = profile ? profileText(profile, "name", lang) : ""
  useEffect(() => {
    if (title) setPageTitle(`${title} · HITEX Explorer`)
  }, [title])
  if (!data) return <Loading what="profile" />
  if (!profile) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-12 sm:px-6">
        <p className="text-lg">No startup profile called “{slug}”.</p>
        <Button variant="outline" asChild>
          <a href="#/startups">
            <ArrowLeftIcon data-icon="inline-start" /> All startups
          </a>
        </Button>
      </div>
    )
  }
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <a href="#/startups" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> All startups
      </a>
      {profile.example && <ExampleBanner />}
      <Profile p={profile} vocab={data.vocab} lang={lang} />
    </div>
  )
}

function ExampleBanner() {
  return (
    <Card className="ring-2 ring-sky-500/60">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-sky-500" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">This is an example profile</p>
            <p className="text-sm text-muted-foreground">
              Every section comes from the profile template. See the Contribution page to add your startup.
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <a href="#/contribution">Contribution</a>
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * All sections of a startup profile; `embedded` (inside another page) uses h3 for the name instead of h1,
 * `preview` (the profile form) leaves out the links to the published file.
 */
export function Profile({
  p,
  vocab,
  lang,
  embedded = false,
  preview = false,
}: {
  p: CommunityProfile
  vocab: Vocab
  lang: Lang
  embedded?: boolean
  preview?: boolean
}) {
  const NameTag = embedded ? "h3" : "h1"
  const L = (list: string, key: string | number | null | undefined) => vocabLabel(vocab, list, key, lang)
  const Ls = (list: string, keys: (string | number)[] | null | undefined) => vocabLabels(vocab, list, keys, lang)
  const t = (field: Parameters<typeof profileText>[1]) => profileText(p, field, lang)
  const dir = textDir(lang)
  const name = t("name")
  const open = activePositions(p)
  const h = p.hiring
  const event = p.hitex?.at_event
  const city = p.location.city === "other" ? (p.location.city_other ?? "") : L("cities", p.location.city)
  const industry = p.industry === "other" ? (p.industry_other ?? "") : L("industries", p.industry)
  const socials = Object.entries(p.links ?? {}).filter(([, url]) => !!url) as [string, string][]
  const langs = h?.open_to?.languages

  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <Card>
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Logo url={p.logo_url} name={name} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div lang={lang} dir={dir} className="flex flex-col gap-1">
              <NameTag className="text-2xl font-semibold sm:text-3xl">{name}</NameTag>
              {t("tagline") && <p className="text-lg text-muted-foreground">{t("tagline")}</p>}
            </div>
            <Chips
              lang={lang}
              items={[industry, L("stages", p.stage), L("business_models", p.business_model), L("funding_stages", p.funding?.stage)]}
            />
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="size-4" />
                <span>
                  <span lang={lang}>{city}</span>, {p.location.country}
                </span>
              </span>
              <span>Founded {p.founded.slice(0, 4)}</span>
              <span>Team {L("team_sizes", p.team_size)}</span>
              <span lang={lang}>{L("work_modes", p.work_mode)}</span>
              {p.work_week && <span lang={lang}>{L("work_weeks", p.work_week)}</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {/* a startup without its own website lists this page instead */}
              {!isOnThisSite(p.website) && (
                <Button size="sm" asChild>
                  <a href={p.website} target="_blank" rel="noreferrer">
                    <ExternalLinkIcon data-icon="inline-start" /> Website
                  </a>
                </Button>
              )}
              {p.location.office_maps_url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={p.location.office_maps_url} target="_blank" rel="noreferrer">
                    <MapPinIcon data-icon="inline-start" /> Office on map
                  </a>
                </Button>
              )}
              {socials.map(([key, url]) => (
                <Button key={key} size="sm" variant="outline" asChild>
                  <a href={url} target="_blank" rel="noreferrer">
                    {key === "linkedin" ? <LinkedInIcon className="size-3.5" /> : null}
                    {SOCIAL_LABELS[key] ?? key}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <ProfileQr slug={p.slug} name={name} lang={lang} />

      {/* at HITEX */}
      {event?.attending && (
        <Card className="ring-2" style={{ "--tw-ring-color": `${HITEX_RED}99` } as CSSProperties}>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 font-semibold">
                <CalendarCheckIcon className="size-5 shrink-0" style={{ color: HITEX_RED }} />
                <span>
                  <HitexText>
                    {`Meet them at HITEX${event.booth ? ` · booth ${event.booth}` : ""}${
                      event.days?.length ? ` · ${event.days.map(day).join(", ")}` : ""
                    }`}
                  </HitexText>
                </span>
              </p>
              <Chips
                items={[event.interviewing_at_booth ? "Interviewing at the booth" : "", event.walk_in_cvs ? "Bring your CV" : ""]}
              />
            </div>
            {event.book_meeting_url && (
              <Button asChild>
                <a href={event.book_meeting_url} target="_blank" rel="noreferrer">
                  Book a meeting
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* about: story on the left, facts on the right (one column on small screens) */}
      <Section title="About">
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-6">
            <Text lang={lang} text={t("description")} />
            <Facts
              lang={lang}
              rows={[
                ["Area of work", t("area_of_work")],
                ["Aim", t("aim")],
              ]}
            />
            {!!p.products?.length && (
              <Labeled label="Products">
                <div className="flex flex-col gap-3">
                  {p.products.map((prod) => (
                    <div key={prod.id} className="flex flex-col gap-1.5 rounded-lg border p-3">
                      <p lang={lang} dir={dir}>
                        {productText(p, prod.id, lang) || prod.id}
                      </p>
                      <Chips items={Ls("platforms", prod.platforms)} />
                      {prod.url && <ExtLink href={prod.url} />}
                    </div>
                  ))}
                </div>
              </Labeled>
            )}
            {!!p.traction?.length && (
              <Labeled label="Traction">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {p.traction.map((x, i) => (
                    <Tile key={i} icon={TrendingUpIcon} label={L("traction_metrics", x.metric)} value={String(x.value)} hint={`as of ${x.as_of}`} lang={lang} />
                  ))}
                </div>
              </Labeled>
            )}
            {(t("impact") || !!p.impact?.sdgs?.length) && (
              <Labeled label="Impact">
                <Text lang={lang} text={t("impact")} />
                <Chips lang={lang} items={(p.impact?.sdgs ?? []).map((n) => `SDG ${n} · ${L("sdgs", n)}`)} />
              </Labeled>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <Labeled label="At a glance">
              <div className="grid grid-cols-2 gap-2.5">
                <Tile icon={CalendarCheckIcon} label="Founded" value={p.founded} />
                <Tile icon={UsersIcon} label="Team" value={L("team_sizes", p.team_size)} />
                <Tile icon={LaptopIcon} label="Engineering team" value={L("engineering_team_sizes", p.engineering_team_size)} />
                <Tile icon={BriefcaseIcon} label="Business model" value={L("business_models", p.business_model)} lang={lang} />
                <Tile icon={GlobeIcon} label="Work mode" value={L("work_modes", p.work_mode)} lang={lang} />
                <Tile icon={CalendarClockIcon} label="Work week" value={L("work_weeks", p.work_week)} lang={lang} />
                <Tile
                  icon={MapPinIcon}
                  label="Other offices"
                  value={Ls("cities", p.location.other_offices).join(", ")}
                  lang={lang}
                />
                <BoolTile icon={UserCheckIcon} label="Accessible office" value={p.location.wheelchair_accessible} />
              </div>
            </Labeled>
            {!!p.tech_stack?.length && <Labeled label="Tech stack"><Chips items={Ls("technologies", p.tech_stack)} /></Labeled>}
            {!!p.tools?.length && <Labeled label="Tools"><Chips items={Ls("tools", p.tools)} /></Labeled>}
          </div>
        </div>
        {(!!p.recognition?.length || !!p.clients?.length || !!p.partners?.length || hasMedia(p.media)) && (
          <div className="grid gap-6 border-t pt-6 sm:grid-cols-2 lg:grid-cols-4">
            {!!p.recognition?.length && (
              <Labeled label="Recognition">
                <ul className="flex flex-col gap-1">
                  {p.recognition.map((r, i) => (
                    <li key={i}>
                      {r.url ? <ExtLink href={r.url} text={r.name} /> : <HitexText>{r.name}</HitexText>}
                      {r.year ? <span className="text-muted-foreground"> · {r.year}</span> : null}
                    </li>
                  ))}
                </ul>
              </Labeled>
            )}
            <NamedLinks label="Clients" items={p.clients} />
            <NamedLinks label="Partners" items={p.partners} />
            <Media media={p.media} />
          </div>
        )}
      </Section>

      {/* team */}
      <Section title="Team">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {p.founders.map((f) => (
            <PersonCard key={f.name} person={f} role={L("founder_roles", f.role)} lang={lang} />
          ))}
          {(p.core_team ?? []).map((m) => (
            <PersonCard key={m.name} person={m} role={m.role === "other" ? (m.role_other ?? "") : L("team_roles", m.role)} lang={lang} />
          ))}
        </div>
      </Section>

      {h && (
        <>
          {/* 1. open positions */}
          <Section
            title={open.length ? `Open positions (${open.length})` : "Open positions"}
            aside={
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="hidden sm:inline">Updated {h.updated}</span>
                <Badge variant={open.length ? "default" : "secondary"} lang={lang}>
                  {L("hiring_status", h.status)}
                </Badge>
              </div>
            }
          >
            {t("looking_for") && <Text lang={lang} text={t("looking_for")} />}
            {!hiringIsCurrent(p) ? (
              <p className="text-sm text-muted-foreground">
                Hiring details were last updated on {h.updated}, more than 90 days ago, so positions are hidden.
              </p>
            ) : open.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open positions listed right now.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {open.map((pos) => (
                  <PositionCard key={pos.id} p={p} pos={pos} vocab={vocab} lang={lang} />
                ))}
                <a href="#/jobs" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <BriefcaseIcon className="size-4" /> All jobs at HITEX startups
                </a>
              </div>
            )}
          </Section>

          {/* 2. how to apply */}
          {(h.contacts?.length || h.careers_page || h.process) && (
            <Section title="How to apply">
              {(!!h.contacts?.length || h.careers_page) && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(h.contacts ?? []).map((c) => (
                    <div key={c.name} className="flex flex-col gap-2 rounded-xl border p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                          <UserCheckIcon className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          <p lang={lang} className="text-sm text-muted-foreground">
                            {L("contact_roles", c.role)}
                          </p>
                        </div>
                      </div>
                      {c.preferred_contact && (
                        <p className="text-xs text-muted-foreground">
                          Prefers <span lang={lang}>{L("preferred_contact", c.preferred_contact)}</span>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {c.linkedin && (
                          <Button size="sm" variant={c.preferred_contact === "linkedin" ? "default" : "outline"} asChild>
                            <a href={c.linkedin} target="_blank" rel="noreferrer">
                              <LinkedInIcon className="size-3.5" /> LinkedIn
                            </a>
                          </Button>
                        )}
                        {c.email && (
                          <Button size="sm" variant={c.preferred_contact === "email" ? "default" : "outline"} asChild>
                            <a href={`mailto:${c.email}`}>
                              <MailIcon data-icon="inline-start" /> Email
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {h.careers_page && (
                    <a
                      href={h.careers_page}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-dashed p-4 transition-colors hover:bg-muted"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <BriefcaseIcon className="size-5" />
                      </span>
                      <span className="flex flex-col">
                        <span className="font-medium">Careers page</span>
                        <span className="text-sm text-muted-foreground">All openings and how to apply</span>
                      </span>
                      <ExternalLinkIcon className="ms-auto size-4 text-muted-foreground" />
                    </a>
                  )}
                </div>
              )}
              {h.process && (
                <Labeled label="Hiring process">
                  <Steps lang={lang} steps={Ls("process_steps", h.process.steps)} />
                  <TileGrid>
                    <Tile icon={HourglassIcon} label="Usually takes" value={h.process.typical_duration_days ? `${h.process.typical_duration_days} days` : ""} />
                    <Tile icon={MessageCircleIcon} label="Replies within" value={h.process.reply_within_days ? `${h.process.reply_within_days} days` : ""} />
                    <BoolTile icon={LaptopIcon} label="Remote interviews" value={h.process.remote_interviews} />
                    <BoolTile icon={HandCoinsIcon} label="Paid take-home task" value={h.process.paid_take_home} />
                  </TileGrid>
                </Labeled>
              )}
            </Section>
          )}

          {/* 3. who can apply */}
          {h.open_to && (
            <Section title="Who can apply">
              {langs && (
                <Labeled label="Languages">
                  <TileGrid>
                    <Tile icon={LanguagesIcon} label="Daily work in" value={Ls("languages", langs.work).join(", ")} lang={lang} />
                    <Tile icon={BadgeCheckIcon} label="Required" value={Ls("languages", langs.required).join(", ")} lang={lang} />
                    <Tile icon={GlobeIcon} label="Also welcome" value={Ls("languages", langs.welcome).join(", ")} lang={lang} />
                    <Tile icon={MessageCircleIcon} label="Interviews in" value={Ls("languages", langs.interview).join(", ")} lang={lang} />
                    <Tile icon={GraduationCapIcon} label="Minimum English" value={L("english_levels", langs.english_level)} lang={lang} />
                  </TileGrid>
                </Labeled>
              )}
              <Labeled label="Eligibility">
                <TileGrid>
                  <BoolTile icon={GraduationCapIcon} label="Fresh graduates" value={h.open_to.fresh_graduates} />
                  <BoolTile icon={SproutIcon} label="Internships" value={h.open_to.internships} />
                  <BoolTile icon={GlobeIcon} label="International candidates" value={h.open_to.international_candidates} />
                  <BoolTile icon={FileSignatureIcon} label="Visa support" value={h.open_to.visa_support} />
                  <BoolTile icon={PlaneIcon} label="Relocation support" value={h.open_to.relocation_support} />
                </TileGrid>
              </Labeled>
            </Section>
          )}

          {/* 4. working here */}
          {(h.contract || h.growth || h.internship || h.benefits?.length || t("culture") || t("why_join")) && (
            <Section title="Working here">
              {(t("culture") || t("why_join")) && (
                <div className="grid gap-4 md:grid-cols-2">
                  {t("culture") && <Labeled label="Culture"><Text lang={lang} text={t("culture")} /></Labeled>}
                  {t("why_join") && <Labeled label="Why join"><Text lang={lang} text={t("why_join")} /></Labeled>}
                </div>
              )}
              {h.contract && (
                <Labeled label="Contract">
                  <TileGrid>
                    <BoolTile icon={FileSignatureIcon} label="Written contract" value={h.contract.written_contract} />
                    <BoolTile icon={ShieldCheckIcon} label="Social security" value={h.contract.social_security} />
                    <Tile icon={CalendarClockIcon} label="Probation" value={h.contract.probation_months ? `${h.contract.probation_months} months` : ""} />
                    <Tile icon={ClockIcon} label="Hours per week" value={h.contract.hours_per_week ? String(h.contract.hours_per_week) : ""} />
                    <Tile icon={TimerIcon} label="Overtime" value={L("overtime", h.contract.overtime)} lang={lang} />
                    <Tile icon={WalletIcon} label="Paid by" value={L("payment_methods", h.contract.payment_method)} lang={lang} />
                  </TileGrid>
                </Labeled>
              )}
              {h.growth && (
                <Labeled label="Growth">
                  <TileGrid>
                    <BoolTile icon={UsersIcon} label="Mentorship" value={h.growth.mentorship} />
                    <Tile
                      icon={GraduationCapIcon}
                      label="Training budget"
                      value={
                        typeof h.growth.training_budget_usd_per_year === "number"
                          ? `$${h.growth.training_budget_usd_per_year.toLocaleString("en-US")} / year`
                          : ""
                      }
                    />
                    <BoolTile icon={CalendarCheckIcon} label="Conference support" value={h.growth.conference_support} />
                    <Tile icon={TrendingUpIcon} label="Promotion review" value={L("promotion_review", h.growth.promotion_review)} lang={lang} />
                  </TileGrid>
                </Labeled>
              )}
              {h.internship && h.open_to?.internships !== false && (
                <Labeled label="Internship program">
                  <TileGrid>
                    <BoolTile icon={WalletIcon} label="Paid" value={h.internship.paid} />
                    <Tile icon={CalendarClockIcon} label="Length" value={h.internship.duration_months ? `${h.internship.duration_months} months` : ""} />
                    <BoolTile icon={BadgeCheckIcon} label="Certificate" value={h.internship.certificate} />
                    <BoolTile icon={TrendingUpIcon} label="Path to full time" value={h.internship.path_to_full_time} />
                  </TileGrid>
                </Labeled>
              )}
              {!!h.benefits?.length && (
                <Labeled label="Benefits">
                  <div className="flex flex-wrap gap-2">
                    {Ls("benefits", h.benefits).map((b) => (
                      <span key={b} lang={lang} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm">
                        <GiftIcon className="size-3.5 text-muted-foreground" /> {b}
                      </span>
                    ))}
                  </div>
                </Labeled>
              )}
            </Section>
          )}
        </>
      )}

      {/* looking for */}
      {(!!p.seeking?.length || p.funding) && (
        <Section title="Looking for">
          <Chips
            lang={lang}
            items={(p.seeking ?? []).map((s) =>
              s === "co_founder" && p.co_founder_role ? `${L("seeking", s)} (${L("co_founder_roles", p.co_founder_role)})` : L("seeking", s)
            )}
          />
          <Text lang={lang} text={t("seeking_note")} />
          {p.funding && (
            <TileGrid>
              <Tile icon={HandCoinsIcon} label="Funding" value={L("funding_raising", p.funding.raising)} lang={lang} />
              <Tile icon={WalletIcon} label="Amount" value={L("funding_amounts", p.funding.amount)} lang={lang} />
              <Tile icon={SproutIcon} label="Funding stage" value={L("funding_stages", p.funding.stage)} lang={lang} />
            </TileGrid>
          )}
        </Section>
      )}

      {/* footer */}
      {preview ? null : p.example ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-sm text-muted-foreground">
          <a className="inline-flex items-center gap-1 hover:text-foreground" href="#/contribution/form">
            <PencilIcon className="size-3.5" /> Profile form
          </a>
          <a className="inline-flex items-center gap-1 hover:text-foreground" href={CONTRIBUTING_URL} target="_blank" rel="noreferrer">
            <InfoIcon className="size-3.5" /> Contribution guide
          </a>
          <a className="inline-flex items-center gap-1 hover:text-foreground" href={TEMPLATE_URL} target="_blank" rel="noreferrer">
            <FileCodeIcon className="size-3.5" /> Profile template (YAML)
          </a>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-sm text-muted-foreground">
          {h?.updated && <span>Hiring info updated {h.updated}</span>}
          <a className="inline-flex items-center gap-1 hover:text-foreground" href={`#/contribution/form/${p.slug}`}>
            <PencilIcon className="size-3.5" /> Edit this profile
          </a>
          <a className="inline-flex items-center gap-1 hover:text-foreground" href={`${GITHUB_URL}/edit/main/public/startups/${p.file}`} target="_blank" rel="noreferrer">
            <GitHubIcon className="size-3.5" /> Edit on GitHub
          </a>
          <a className="inline-flex items-center gap-1 hover:text-foreground" href={`${import.meta.env.BASE_URL}startups/${p.file}`} target="_blank" rel="noreferrer">
            <FileCodeIcon className="size-3.5" /> View source YAML
          </a>
          <a
            className="inline-flex items-center gap-1 hover:text-foreground"
            href={`${GITHUB_URL}/issues/new?title=${encodeURIComponent(`Problem with profile: ${p.slug}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            <FlagIcon className="size-3.5" /> Report a problem
          </a>
        </div>
      )}
    </div>
  )
}

const SOCIAL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
  youtube: "YouTube",
  github: "GitHub",
  engineering_blog: "Engineering blog",
}

type Icon = ComponentType<{ className?: string }>

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-xl">{title}</CardTitle>
        {aside}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">{children}</CardContent>
    </Card>
  )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      {children}
    </div>
  )
}

function TileGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-2.5 empty:hidden sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

/** A small labelled fact with an icon; renders nothing without a value. */
function Tile({ icon: Icon, label, value, hint, lang }: { icon: Icon; label: string; value: string; hint?: string; lang?: Lang }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-foreground/10">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p lang={lang} dir={lang ? textDir(lang) : undefined} className="font-medium">
          {value}
          {/* own line: inline, an English hint runs into a number in right-to-left text ("40000as of") */}
          {hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}
        </p>
      </div>
    </div>
  )
}

/** Yes / no fact; renders nothing when unknown. */
function BoolTile({ icon: Icon, label, value }: { icon: Icon; label: string; value: boolean | null | undefined }) {
  if (value !== true && value !== false) return null
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5", value ? "bg-emerald-500/5" : "bg-muted/30")}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-foreground/10">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <p className={cn("flex-1 text-sm", !value && "text-muted-foreground")}>{label}</p>
      {value ? (
        <CheckIcon className="size-4 shrink-0 text-emerald-500" aria-label="yes" />
      ) : (
        <XIcon className="size-4 shrink-0 text-muted-foreground" aria-label="no" />
      )}
    </div>
  )
}

/** Numbered hiring steps. */
function Steps({ steps, lang }: { steps: string[]; lang: Lang }) {
  if (!steps.length) return null
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-2">
          {i > 0 && <span className="h-px w-4 bg-border" aria-hidden />}
          <span className="flex items-center gap-2 rounded-full border py-1 ps-1 pe-3 text-sm">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <span lang={lang}>{s}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function Text({ text, lang }: { text: string; lang: Lang }) {
  if (!text) return null
  return (
    <p lang={lang} dir={textDir(lang)} className="leading-relaxed whitespace-pre-line">
      <HitexText>{text}</HitexText>
    </p>
  )
}

function Chips({ items, lang }: { items: string[]; lang?: Lang }) {
  const list = items.filter(Boolean)
  if (!list.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((x) => (
        <Badge key={x} variant="secondary" lang={lang}>
          {x}
        </Badge>
      ))}
    </div>
  )
}

function Facts({ rows, lang }: { rows: [string, string][]; lang?: Lang }) {
  const list = rows.filter(([, v]) => v)
  if (!list.length) return null
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
      {list.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd lang={lang} dir={lang ? textDir(lang) : undefined} className="text-start whitespace-pre-line">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ExtLink({ href, text }: { href: string; text?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-sky-600 hover:underline dark:text-sky-400">
      <ExternalLinkIcon className="size-3.5 shrink-0" />
      {text ?? href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
    </a>
  )
}

function NamedLinks({ label, items }: { label: string; items?: { name: string; url?: string }[] }) {
  if (!items?.length) return null
  return (
    <Labeled label={label}>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map((x) => (x.url ? <ExtLink key={x.name} href={x.url} text={x.name} /> : <span key={x.name}>{x.name}</span>))}
      </div>
    </Labeled>
  )
}

const hasMedia = (m: CommunityProfile["media"]) => !!(m?.demo_video || m?.pitch_deck || m?.press_kit || m?.photos?.length)

function Media({ media }: { media: CommunityProfile["media"] }) {
  if (!media) return null
  const links = [
    ["Demo video", media.demo_video],
    ["Pitch deck", media.pitch_deck],
    ["Press kit", media.press_kit],
  ].filter(([, url]) => !!url) as [string, string][]
  if (!links.length && !media.photos?.length) return null
  return (
    <Labeled label="Media">
      {!!links.length && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {links.map(([label, url]) => (
            <ExtLink key={label} href={url} text={label} />
          ))}
        </div>
      )}
      {!!media.photos?.length && (
        <div className="grid grid-cols-2 gap-2 empty:hidden">
          {media.photos.map((src) => (
            <Photo key={src} src={src} />
          ))}
        </div>
      )}
    </Labeled>
  )
}

/** Photo link that hides itself if the image can't be loaded. */
function Photo({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <a href={src} target="_blank" rel="noreferrer">
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="aspect-video w-full rounded-lg bg-muted object-cover" />
    </a>
  )
}

function Logo({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false)
  // no logo yet (profile form preview) or it can't be loaded: first letter instead
  if (failed || !url) {
    return (
      <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-muted text-3xl font-semibold">
        {name.match(/[\p{L}\p{N}]/u)?.[0]?.toLocaleUpperCase() ?? "?"}
      </div>
    )
  }
  return (
    <img src={url} alt="" onError={() => setFailed(true)} className="size-20 shrink-0 rounded-2xl bg-white object-contain p-2 ring-1 ring-foreground/10" />
  )
}

function PersonCard({ person, role, lang }: { person: Person; role: string; lang: Lang }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{person.name}</p>
        <p lang={lang} className="text-sm text-muted-foreground">
          {role}
        </p>
      </div>
      {person.linkedin && (
        <a
          href={person.linkedin}
          target="_blank"
          rel="noreferrer"
          aria-label={`${person.name} on LinkedIn`}
          className="text-[#0A66C2] hover:opacity-80 dark:text-[#4c9be8]"
        >
          <LinkedInIcon className="size-5" />
        </a>
      )}
    </div>
  )
}

function PositionCard({ p, pos, vocab, lang }: { p: CommunityProfile; pos: Position; vocab: Vocab; lang: Lang }) {
  const L = (list: string, key: string | number | null | undefined) => vocabLabel(vocab, list, key, lang)
  const tx = positionTexts(p, pos.id, lang)
  const dir = textDir(lang)
  const apply = pos.apply_url || p.hiring?.careers_page
  const list = (label: string, items?: string[]) =>
    items?.length ? (
      <div className="flex flex-col gap-1.5">
        <h5 className="text-sm font-medium text-muted-foreground">{label}</h5>
        <ul lang={lang} dir={dir} className="list-disc space-y-0.5 ps-5">
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </div>
    ) : null
  return (
    <article className="flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div lang={lang} dir={dir} className="flex flex-col gap-1">
          <h4 className="text-lg font-semibold">{tx.title ?? pos.id}</h4>
          {tx.summary && <p className="text-muted-foreground">{tx.summary}</p>}
        </div>
        {apply && (
          <Button asChild>
            <a href={apply} target="_blank" rel="noreferrer">
              Apply <ExternalLinkIcon data-icon="inline-end" />
            </a>
          </Button>
        )}
      </div>
      <Chips
        lang={lang}
        items={[L("employment", pos.employment), L("seniority", pos.seniority), L("work_modes", pos.work_mode), pos.count && pos.count > 1 ? `${pos.count} openings` : ""]}
      />
      <TileGrid>
        <Tile icon={WalletIcon} label="Salary" value={formatSalary(pos.salary, vocab, lang)} lang={lang} />
        <Tile icon={BriefcaseIcon} label="Experience" value={typeof pos.experience_years === "number" ? `${pos.experience_years}+ years` : ""} />
        <Tile icon={GraduationCapIcon} label="Education" value={L("education", pos.education)} lang={lang} />
        <Tile icon={CalendarCheckIcon} label="Start" value={pos.start === "asap" ? "As soon as possible" : (pos.start ?? "")} />
        <Tile icon={CalendarClockIcon} label="Apply by" value={pos.deadline ? day(pos.deadline) : ""} />
        <Tile icon={LanguagesIcon} label="Languages" value={vocabLabels(vocab, "languages", pos.languages, lang).join(", ")} lang={lang} />
      </TileGrid>
      {(!!pos.skills?.length || !!pos.soft_skills?.length) && (
        <div className="grid gap-4 md:grid-cols-2">
          {!!pos.skills?.length && <Labeled label="Skills"><Chips items={vocabLabels(vocab, "technologies", pos.skills, lang)} /></Labeled>}
          {!!pos.soft_skills?.length && <Labeled label="Soft skills"><Chips lang={lang} items={vocabLabels(vocab, "soft_skills", pos.soft_skills, lang)} /></Labeled>}
        </div>
      )}
      {(tx.responsibilities?.length || tx.requirements?.length || tx.nice_to_have?.length) && (
        <div className="grid gap-4 border-t pt-4 md:grid-cols-3">
          {list("Responsibilities", tx.responsibilities)}
          {list("Requirements", tx.requirements)}
          {list("Nice to have", tx.nice_to_have)}
        </div>
      )}
    </article>
  )
}
