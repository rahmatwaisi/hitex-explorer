// A sponsor's page (/sponsors/<slug>), built from one public/sponsors/*.yml file. Shares its building
// blocks with the startup profile (profile-page.tsx); adds the sponsor's offers to startups, its
// leadership and its HITEX tier.
import { useEffect } from "react"
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  Building2Icon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CheckIcon,
  ExternalLinkIcon,
  GlobeIcon,
  HandshakeIcon,
  LaptopIcon,
  MailIcon,
  MapPinIcon,
  UserCheckIcon,
} from "lucide-react"

import { LinkedInIcon } from "@/components/brand-icons"
import { HitexText } from "@/components/highlight"
import {
  BoolTile,
  Chips,
  EventCard,
  ExampleBanner,
  ExtLink,
  Facts,
  HeaderLinks,
  HiringSections,
  Labeled,
  Loading,
  Logo,
  Media,
  NamedLinks,
  PersonCard,
  ProfileFooter,
  Section,
  Text,
  Tile,
  hasMedia,
  useCommunity,
} from "@/components/profile-page"
import { ProfileQr } from "@/components/profile-qr"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { productText, profileText, vocabLabel, vocabLabels, type SponsorProfile as Sponsor, type Vocab } from "@/lib/community"
import { textDir, type Lang } from "@/lib/data"
import { sponsorUrl } from "@/lib/links"
import { cn, setPageTitle } from "@/lib/utils"

/** "platinum" -> "Platinum sponsor"; HITEX lists a few sponsors without a tier */
const tierLabel = (tier: string | null | undefined) => (tier ? `${tier[0].toUpperCase()}${tier.slice(1)} sponsor` : "Sponsor")

const TIER_STYLES: Record<string, string> = {
  diamond: "bg-cyan-500/15 text-cyan-700 ring-cyan-500/40 dark:text-cyan-300",
  platinum: "bg-slate-400/20 text-slate-700 ring-slate-400/50 dark:text-slate-200",
  gold: "bg-amber-400/20 text-amber-800 ring-amber-500/50 dark:text-amber-300",
  silver: "bg-zinc-300/30 text-zinc-700 ring-zinc-400/50 dark:text-zinc-200",
  bronze: "bg-orange-700/15 text-orange-800 ring-orange-700/40 dark:text-orange-300",
}

export function TierBadge({ tier, className }: { tier?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 px-2 text-xs font-medium ring-1",
        (tier && TIER_STYLES[tier]) || "bg-sponsor/10 text-sponsor-ink ring-sponsor/40",
        className
      )}
    >
      <HandshakeIcon className="size-3" /> {tierLabel(tier)}
    </span>
  )
}

/** Sponsor page built from one public/sponsors/*.yml file (/sponsors/<slug>). */
export function SponsorProfilePage({ slug, lang }: { slug: string; lang: Lang }) {
  const data = useCommunity()
  const profile = data?.sponsor_example?.slug === slug ? data.sponsor_example : data?.sponsors.find((p) => p.slug === slug)
  const title = profile ? profileText(profile, "name", lang) : ""
  useEffect(() => {
    if (title) setPageTitle(`${title} · HITEX Explorer`)
  }, [title])
  if (!data) return <Loading what="profile" />
  if (!profile) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-12 sm:px-6">
        <p className="text-lg">No sponsor profile called “{slug}”.</p>
        <Button variant="outline" asChild>
          <a href="/sponsors/">
            <ArrowLeftIcon data-icon="inline-start" /> All sponsors
          </a>
        </Button>
      </div>
    )
  }
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <a href="/sponsors/" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> All sponsors
      </a>
      {profile.example && <ExampleBanner kind="sponsor" />}
      <SponsorProfile p={profile} vocab={data.vocab} lang={lang} />
    </div>
  )
}

/**
 * All sections of a sponsor profile; `embedded` (inside another page) uses h3 for the name instead of h1,
 * `preview` (the profile form) leaves out the links to the published file.
 */
export function SponsorProfile({
  p,
  vocab,
  lang,
  embedded = false,
  preview = false,
}: {
  p: Sponsor
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
  const city = p.location.city === "other" ? (p.location.city_other ?? "") : L("cities", p.location.city)
  const industry = p.industry === "other" ? (p.industry_other ?? "") : L("industries", p.industry)

  return (
    <div className="flex flex-col gap-6">
      {/* header, with the sponsor's navy accent */}
      <Card className="ring-2 ring-sponsor/45">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Logo url={p.logo_url} name={name} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div lang={lang} dir={dir} className="flex flex-col gap-1">
              <NameTag className="text-2xl font-semibold sm:text-3xl">{name}</NameTag>
              {t("tagline") && <p className="text-lg text-muted-foreground">{t("tagline")}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <TierBadge tier={p.tier} />
              <Chips lang={lang} items={[industry, L("business_models", p.business_model)]} />
            </div>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {city && (
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="size-4" />
                  <span>
                    <span lang={lang}>{city}</span>, {p.location.country}
                  </span>
                </span>
              )}
              {p.founded && <span>Founded {p.founded.slice(0, 4)}</span>}
              <span>{L("company_sizes", p.company_size)} people</span>
              {p.work_mode && <span lang={lang}>{L("work_modes", p.work_mode)}</span>}
            </p>
            <HeaderLinks p={p} />
          </div>
        </CardContent>
      </Card>

      <ProfileQr slug={p.slug} url={sponsorUrl(p.slug)} kind="sponsor" name={name} lang={lang} />

      <EventCard p={p} vocab={vocab} lang={lang} />

      <ForStartups p={p} vocab={vocab} lang={lang} />

      {/* about: story on the left, facts on the right (one column on small screens) */}
      <Section title="About">
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-6">
            <Text lang={lang} text={t("description")} />
            <Facts
              lang={lang}
              rows={[
                ["Area of work", t("area_of_work")],
                ["Mission", t("aim")],
              ]}
            />
            {!!p.products?.length && (
              <Labeled label="Products and services">
                <div className="flex flex-col gap-3">
                  {p.products.map((prod) => (
                    <div key={prod.id} className="flex flex-col gap-1.5 border p-3">
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
                <Tile icon={CalendarCheckIcon} label="Founded" value={p.founded ?? ""} />
                <Tile icon={Building2Icon} label="People" value={L("company_sizes", p.company_size)} />
                <Tile icon={LaptopIcon} label="Engineering team" value={L("engineering_team_sizes", p.engineering_team_size)} />
                <Tile icon={BriefcaseIcon} label="Business model" value={L("business_models", p.business_model)} lang={lang} />
                <Tile icon={GlobeIcon} label="Work mode" value={L("work_modes", p.work_mode)} lang={lang} />
                <Tile icon={CalendarClockIcon} label="Work week" value={L("work_weeks", p.work_week)} lang={lang} />
                <Tile icon={MapPinIcon} label="Other offices" value={Ls("cities", p.location.other_offices).join(", ")} lang={lang} />
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

      {!!p.leadership?.length && (
        <Section title="Leadership">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.leadership.map((m) => (
              <PersonCard key={m.name} person={m} role={m.role === "other" ? (m.role_other ?? "") : L("leadership_roles", m.role)} lang={lang} />
            ))}
          </div>
        </Section>
      )}

      <HiringSections p={p} vocab={vocab} lang={lang} />

      {!preview && <ProfileFooter p={p} />}
    </div>
  )
}

/** What the sponsor offers startups, the partners it wants, and who to talk to. */
function ForStartups({ p, vocab, lang }: { p: Sponsor; vocab: Vocab; lang: Lang }) {
  const f = p.for_startups
  const offerNote = profileText(p, "offer_note", lang)
  const partnershipNote = profileText(p, "partnership_note", lang)
  const offers = vocabLabels(vocab, "sponsor_offers", f?.offers, lang)
  const seeking = vocabLabels(vocab, "partnership_seeking", f?.seeking, lang)
  const c = f?.contact
  if (!offers.length && !seeking.length && !offerNote && !partnershipNote && !c && !f?.apply_url) return null
  return (
    <Card className="ring-2 ring-sponsor/45">
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <span className="flex size-8 items-center justify-center bg-sponsor text-white">
              <HandshakeIcon className="size-4" />
            </span>
            For startups
          </h2>
          {f?.apply_url && (
            <Button asChild className="bg-sponsor text-white hover:bg-sponsor/85">
              <a href={f.apply_url} target="_blank" rel="noreferrer">
                Startup program <ExternalLinkIcon data-icon="inline-end" />
              </a>
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {(!!offers.length || offerNote) && (
            <Labeled label="What they offer">
              {!!offers.length && (
                <ul lang={lang} className="grid gap-1.5 sm:grid-cols-2">
                  {offers.map((o) => (
                    <li key={o} className="flex items-start gap-2">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-sponsor-ink" />
                      {o}
                    </li>
                  ))}
                </ul>
              )}
              <Text lang={lang} text={offerNote} />
            </Labeled>
          )}
          {(!!seeking.length || partnershipNote) && (
            <Labeled label="Partners they're looking for">
              <Chips lang={lang} items={seeking} />
              <Text lang={lang} text={partnershipNote} />
            </Labeled>
          )}
        </div>

        {c && (
          <div className="flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <UserCheckIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
                <p lang={lang} className="text-sm text-muted-foreground">
                  {vocabLabel(vocab, "partnership_contact_roles", c.role, lang)} · talk to them about working together
                </p>
              </div>
            </div>
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
        )}
      </CardContent>
    </Card>
  )
}
