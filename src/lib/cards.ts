import {
  activePositions,
  formatSalary,
  positionTexts,
  profileText,
  vocabLabel,
  vocabLabels,
  type CommunityData,
  type CommunityProfile,
  type ProfileTexts,
  type Vocab,
} from "@/lib/community"
import {
  pick,
  type Agenda,
  type Lang,
  type Localized,
  type Organization,
  type Speaker,
  type Startup,
} from "@/lib/data"
import { isOnThisSite } from "@/lib/links"

/** Everything a card shows; all strings here are searchable and highlighted. */
export interface CardModel {
  id: string
  /** cards with the same group render under one heading (agenda days) */
  group?: string
  image: string | null
  /** letter tile shown when there is no image, or it fails to load */
  monogram?: { letter: string; hue: number }
  /** "circle" renders the image / monogram as a round avatar (speakers) */
  imageShape?: "circle"
  /** center the title and badges (speakers) */
  centered?: boolean
  title: string
  /** makes the title a link: a Google search (speakers, new tab) or a page on this site */
  titleLink?: { href: string; kind: "search" | "page" }
  /** the startup completed its profile (public/startups/*.yml): badge and button to its page */
  profile?: { href: string }
  badges: string[]
  fields: { label: string; value: string }[]
  description: string
  /** `internal` links stay on this site (same tab) */
  links: { label: string; href: string; text?: string; internal?: boolean }[]
  /**
   * Searchable but not shown: the rest of a full profile, and the record in the other languages.
   * Cards matching only here get a dashed outline and show where the keyword was found.
   */
  hidden?: HiddenText[]
  /** heading and link of the "found in" box for hidden matches; default "Found in another language" */
  foundIn?: { label: string; href?: string; linkText?: string }
}

export interface HiddenText {
  /** where the text comes from: "Position · Backend Developer", "Description · Kurdish" */
  section: string
  text: string
  lang?: Lang
}

export const ALL_LANGS: Lang[] = ["en", "ar", "ku", "fa"]
export const LANG_NAMES: Record<Lang, string> = { en: "English", ar: "Arabic", ku: "Kurdish", fa: "Persian" }

/** The texts of a record in the languages not shown, so any language finds it. */
function otherLanguages(entries: [string, Localized | undefined][], lang: Lang): HiddenText[] {
  return entries.flatMap(([section, value]) =>
    ALL_LANGS.filter((l) => l !== lang && value?.[l]?.trim()).map((l) => ({
      section: `${section} · ${LANG_NAMES[l]}`,
      text: value![l]!.trim(),
      lang: l,
    }))
  )
}

/** Adds hidden texts to a card, leaving out repeats and anything the card already shows. */
export function withHidden(card: CardModel, hidden: HiddenText[]): CardModel {
  const shown = searchableTexts(card)
  const seen = new Set<string>()
  const kept = hidden.filter((h) => {
    const key = h.text.toLowerCase()
    if (seen.has(key) || shown.some((v) => v.toLowerCase().includes(key))) return false
    seen.add(key)
    return true
  })
  return { ...card, hidden: kept }
}

export const linkText = (link: CardModel["links"][number]) =>
  link.text ?? link.href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")

function links(entries: [string, string | null][]): CardModel["links"] {
  return entries.flatMap(([label, href]) => (href ? [{ label, href }] : []))
}

export function fields(entries: [string, string | number | null | undefined][]): CardModel["fields"] {
  return entries.flatMap(([label, value]) =>
    value === null || value === undefined || value === "" ? [] : [{ label, value: String(value) }]
  )
}

// oklch hues spread around the wheel: red, orange, yellow, green, teal, cyan, blue, violet, purple, pink
const MONOGRAM_HUES = [25, 55, 95, 145, 185, 215, 260, 290, 320, 350]

/** First letter or digit of the name, with a hue picked stably from the record id. */
export function monogram(name: string, id: string): CardModel["monogram"] {
  const letter = name.match(/[\p{L}\p{N}]/u)?.[0]?.toLocaleUpperCase() ?? "?"
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return { letter, hue: MONOGRAM_HUES[hash % MONOGRAM_HUES.length] }
}

const featuredOn = (pages: string[] | undefined) => (pages ?? []).map((p) => `On ${p}`)

export function startupCard(s: Startup, lang: Lang): CardModel {
  const title = pick(s.name, lang)
  const card: CardModel = {
    id: s.id,
    // every startup photo on the site is the same placeholder picture, so show a monogram instead
    image: null,
    monogram: monogram(title, s.id),
    title,
    badges: [...(s.years ?? []).map(String), `Page ${s.page}`],
    fields: fields([
      ["Founder", pick(s.category, lang)],
      ["City", pick(s.city, lang)],
      ["Founded", s.founded_year],
      ["Prize", s.prize_amount],
    ]),
    description: pick(s.description, lang),
    links: links([
      ["Website", s.website_url],
      ["Facebook", s.facebook_url],
      ["Instagram", s.instagram_url],
      ["X", s.twitter_url],
      ["LinkedIn", s.linkedin_url],
    ]),
  }
  return withHidden(
    card,
    otherLanguages(
      [
        ["Name", s.name],
        ["Description", s.description],
        ["Founder", s.category],
        ["City", s.city],
      ],
      lang
    )
  )
}

export const profileHref = (slug: string) => `/startups/${slug}`

/**
 * Card for a HITEX startup that completed its profile through public/startups/*.yml.
 * `years` are the HITEX years from the original record.
 */
export function communityCard(p: CommunityProfile, vocab: Vocab, lang: Lang, years: number[] = []): CardModel {
  const open = activePositions(p)
  const event = p.hitex?.at_event
  const hiring = open.length
    ? [`Hiring · ${open.length} ${open.length === 1 ? "role" : "roles"}`]
    : p.hiring?.status === "always_open"
      ? ["Open to applications"]
      : []
  const city = p.location.city === "other" ? (p.location.city_other ?? "") : vocabLabel(vocab, "cities", p.location.city, lang)
  const industry = p.industry === "other" ? (p.industry_other ?? "") : vocabLabel(vocab, "industries", p.industry, lang)
  const tagline = profileText(p, "tagline", lang)
  const description = profileText(p, "description", lang)
  const card: CardModel = {
    id: `community-${p.slug}`,
    image: p.logo_url,
    monogram: monogram(profileText(p, "name", lang), p.slug),
    title: profileText(p, "name", lang),
    titleLink: { href: profileHref(p.slug), kind: "page" },
    profile: { href: profileHref(p.slug) },
    foundIn: { label: "Found in the full profile", href: profileHref(p.slug), linkText: "See them in the profile" },
    badges: [
      industry,
      vocabLabel(vocab, "stages", p.stage, lang),
      ...hiring,
      ...(event?.attending ? [event.booth ? `At HITEX · booth ${event.booth}` : "At HITEX"] : []),
      ...years.map(String),
    ].filter(Boolean),
    fields: fields([
      ["Founded", p.founded.slice(0, 4)],
      ["City", city],
      ["Team", vocabLabel(vocab, "team_sizes", p.team_size, lang)],
      ["Work", vocabLabel(vocab, "work_modes", p.work_mode, lang)],
      ["Stack", vocabLabels(vocab, "technologies", p.tech_stack, lang).join(", ")],
      ["Hiring", open.map((pos) => positionTexts(p, pos.id, lang).title ?? pos.id).join("\n")],
    ]),
    description: [tagline, description].filter(Boolean).join("\n\n"),
    links: [
      { label: "Profile", href: profileHref(p.slug), text: "Full profile", internal: true },
      ...links([["Website", isOnThisSite(p.website) ? null : p.website]]),
    ],
  }
  return withHidden(card, profileHidden(p, vocab, lang))
}

const PROFILE_TEXTS: [keyof Omit<ProfileTexts, "products" | "positions">, string][] = [
  ["name", "Name"],
  ["tagline", "Tagline"],
  ["description", "Description"],
  ["area_of_work", "Area of work"],
  ["aim", "Aim"],
  ["impact", "Impact"],
  ["seeking_note", "Looking for"],
  ["looking_for", "Who they want on the team"],
  ["culture", "Culture"],
  ["why_join", "Why join"],
]

/** Everything in a full profile, in all four languages, for the search. */
function profileHidden(p: CommunityProfile, vocab: Vocab, lang: Lang): HiddenText[] {
  const out: HiddenText[] = []
  const add = (section: string, text: string | number | null | undefined, l?: Lang) => {
    const t = `${text ?? ""}`.trim()
    if (t) out.push({ section, text: t, lang: l })
  }
  /** a section name, marked with the language when it isn't the one shown */
  const sec = (name: string, l: Lang) => (l === lang ? name : `${name} · ${LANG_NAMES[l]}`)
  /** labels of fixed values in every language ("fintech" -> Fintech, فین‌تک…) */
  const fixed = (section: string, list: string, keys: string | number | (string | number)[] | null | undefined) => {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      if (key === null || key === undefined || key === "") continue
      for (const l of ALL_LANGS) add(section, vocabLabel(vocab, list, key, l), l)
    }
  }
  const h = p.hiring

  for (const l of ALL_LANGS) for (const [field, name] of PROFILE_TEXTS) add(sec(name, l), p.i18n[l]?.[field], l)

  fixed("Industry", "industries", p.industry)
  add("Industry", p.industry_other)
  fixed("Stage", "stages", p.stage)
  fixed("Business model", "business_models", p.business_model)
  fixed("City", "cities", p.location.city)
  add("City", p.location.city_other)
  fixed("Other offices", "cities", p.location.other_offices)
  fixed("Work mode", "work_modes", p.work_mode)
  fixed("Work week", "work_weeks", p.work_week)
  fixed("Team", "team_sizes", p.team_size)
  fixed("Engineering team", "engineering_team_sizes", p.engineering_team_size)
  fixed("Tech stack", "technologies", p.tech_stack)
  fixed("Tools", "tools", p.tools)
  fixed("Funding", "funding_raising", p.funding?.raising)
  fixed("Funding", "funding_amounts", p.funding?.amount)
  fixed("Funding", "funding_stages", p.funding?.stage)
  fixed("Impact", "sdgs", p.impact?.sdgs)
  add("At HITEX", p.hitex?.at_event?.booth ? `booth ${p.hitex.at_event.booth}` : "")

  for (const prod of p.products ?? []) {
    for (const l of ALL_LANGS) add(sec("Product", l), p.i18n[l]?.products?.[prod.id], l)
    fixed("Product", "platforms", prod.platforms)
  }
  for (const x of p.traction ?? []) add("Traction", `${vocabLabel(vocab, "traction_metrics", x.metric, lang)}: ${x.value}`)
  for (const x of p.recognition ?? []) add("Recognition", x.name)
  for (const x of p.clients ?? []) add("Clients", x.name)
  for (const x of p.partners ?? []) add("Partners", x.name)

  for (const f of p.founders) add("Team", `${f.name} · ${vocabLabel(vocab, "founder_roles", f.role, lang)}`)
  for (const m of p.core_team ?? []) add("Team", `${m.name} · ${m.role_other || vocabLabel(vocab, "team_roles", m.role, lang)}`)
  fixed("Looking for", "seeking", p.seeking)
  fixed("Looking for", "co_founder_roles", p.co_founder_role)

  if (h) {
    fixed("Hiring", "hiring_status", h.status)
    for (const c of h.contacts ?? []) add("Hiring contact", `${c.name} · ${vocabLabel(vocab, "contact_roles", c.role, lang)}`)
    fixed("Hiring process", "process_steps", h.process?.steps)
    const langs = h.open_to?.languages
    fixed("Languages", "languages", [...(langs?.work ?? []), ...(langs?.required ?? []), ...(langs?.welcome ?? []), ...(langs?.interview ?? [])])
    fixed("English", "english_levels", langs?.english_level)
    fixed("Contract", "overtime", h.contract?.overtime)
    fixed("Contract", "payment_methods", h.contract?.payment_method)
    fixed("Growth", "promotion_review", h.growth?.promotion_review)
    fixed("Benefits", "benefits", h.benefits)
    for (const pos of activePositions(p)) {
      const section = `Position · ${positionTexts(p, pos.id, lang).title ?? pos.id}`
      for (const l of ALL_LANGS) {
        const t = p.i18n[l]?.positions?.[pos.id]
        add(sec(section, l), t?.title, l)
        add(sec(section, l), t?.summary, l)
        for (const item of [...(t?.responsibilities ?? []), ...(t?.requirements ?? []), ...(t?.nice_to_have ?? [])]) add(sec(section, l), item, l)
      }
      fixed(section, "employment", pos.employment)
      fixed(section, "seniority", pos.seniority)
      fixed(section, "education", pos.education)
      fixed(section, "work_modes", pos.work_mode)
      fixed(section, "technologies", pos.skills)
      fixed(section, "soft_skills", pos.soft_skills)
      fixed(section, "languages", pos.languages)
      add(section, formatSalary(pos.salary, vocab, lang))
    }
  }
  return out
}

/**
 * One collection: every HITEX startup in its usual order. Startups that completed their profile
 * (public/startups/*.yml, linked by hitex.existing_profile) show the richer profile card instead.
 */
export function startupCards(data: { hitex: Startup[]; community: CommunityData }, lang: Lang): CardModel[] {
  const { hitex, community } = data
  const byHitexId = new Map(community.profiles.map((p) => [p.hitex?.existing_profile, p]))
  return hitex.map((s) => {
    const p = byHitexId.get(s.id)
    return p ? { ...communityCard(p, community.vocab, lang, s.years ?? []), id: s.id } : startupCard(s, lang)
  })
}

export function organizationCard(o: Organization, lang: Lang): CardModel {
  const country = o.country ? `${pick(o.country.name, lang)} (${o.country.code})` : null
  const card: CardModel = {
    id: o.id,
    image: o.logo_url,
    title: pick(o.name, lang),
    badges: [
      ...(o.tier ? [o.tier[0].toUpperCase() + o.tier.slice(1)] : []),
      ...(o.years ?? []).map(String),
      ...(o.is_featured ? ["Featured"] : []),
      ...featuredOn(o.featured_on),
    ],
    fields: fields([
      ["Booth", o.booth_number],
      ["Country", country],
      ["Sector", pick(o.sector, lang)],
      ["Industry", o.industry ? pick(o.industry.name, lang) : null],
    ]),
    description: pick(o.description, lang),
    links: links([["Website", o.website_url]]),
  }
  return withHidden(
    card,
    otherLanguages(
      [
        ["Name", o.name],
        ["Description", o.description],
        ["Sector", o.sector],
        ["Industry", o.industry?.name],
        ["Country", o.country?.name],
      ],
      lang
    )
  )
}

/** By the display_order stored in speakers.json; records without one go last, in file order. */
export function orderSpeakers(speakers: Speaker[]): Speaker[] {
  const rank = (s: Speaker) => s.display_order ?? Number.MAX_SAFE_INTEGER
  return [...speakers].sort((a, b) => rank(a) - rank(b))
}

const stripHonorific = (name: string) =>
  name.replace(/^(H\.E\.P\.M|D\.P\.M|H\.E\.|Dr\.|Eng\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s*/i, "").trim()

/**
 * Google search for the person: the English name as an exact phrase (no honorific or bracketed
 * alias) plus their English job title as context, so namesakes rank lower.
 */
function googleSearchUrl(s: Speaker): string {
  const name = stripHonorific(pick(s.name, "en").replace(/\(.*?\)/g, ""))
  const role = pick(s.title, "en").replace(/[|–—&,:;()/]+/g, " ").replace(/\s+/g, " ").trim()
  const query = role ? `"${name}" ${role}` : `"${name}"`
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

export function speakerCard(s: Speaker, lang: Lang): CardModel {
  const title = pick(s.name, lang)
  const card: CardModel = {
    id: s.id,
    image: s.photo_url,
    monogram: monogram(stripHonorific(title), s.id),
    imageShape: "circle",
    centered: true,
    title,
    titleLink: { href: googleSearchUrl(s), kind: "search" },
    badges: [...(s.is_featured ? ["Featured"] : []), ...featuredOn(s.featured_on)],
    fields: fields([
      ["Role", pick(s.title, lang)],
      ["Company", pick(s.company, lang)],
      ["Country", pick(s.country, lang)],
    ]),
    description: pick(s.bio, lang),
    links: links([
      ["Facebook", s.facebook_url],
      ["Instagram", s.instagram_url],
      ["X", s.twitter_url],
      ["LinkedIn", s.linkedin_url],
    ]),
  }
  return withHidden(
    card,
    otherLanguages(
      [
        ["Name", s.name],
        ["Role", s.title],
        ["Company", s.company],
        ["Country", s.country],
        ["Bio", s.bio],
      ],
      lang
    )
  )
}

const hhmm = (t: string) => t.slice(0, 5)
const humanize = (type: string) => type.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())

/** One card per session, grouped by day; the opening ceremony and documents get their own cards. */
export function agendaCards(a: Agenda, lang: Lang): CardModel[] {
  const cards: CardModel[] = []
  for (const day of a.agendas) {
    const group = `Day ${day.day_number} · ${pick(day.title, lang)} · ${day.date}`
    if (day.sessions.length === 0 && day.day_number === 1) {
      const d = a.opening_details
      const guest = [pick(d.guest, lang), pick(d.guest_note, lang)].filter(Boolean).join(", ")
      cards.push({
        id: a.opening.id,
        group,
        image: null,
        title: pick(a.opening.title, lang),
        badges: [],
        fields: fields([
          ["Time", d.time],
          ["Guest", guest],
          ["Venue", pick(d.venue, lang)],
          ["Entry", pick(d.entry, lang)],
        ]),
        description: pick(a.opening.subtitle, lang),
        links: [],
      })
    }
    for (const s of day.sessions) {
      const speakers = [...s.speakers]
        .sort((x, y) => x.SessionSpeaker.sort_order - y.SessionSpeaker.sort_order)
        .map((sp) => {
          const role = pick(sp.title, lang)
          const name = pick(sp.name, lang) + (sp.SessionSpeaker.is_moderator ? " (moderator)" : "")
          return role ? `${name} — ${role}` : name
        })
      const card: CardModel = {
        id: s.id,
        group,
        image: null,
        title: pick(s.title, lang),
        badges: [`${hhmm(s.start_time)}–${hhmm(s.end_time)}`, pick(s.topic_tag, lang) || humanize(s.type)],
        fields: fields([
          ["Location", pick(s.location, lang)],
          ["Speakers", speakers.join("\n")],
        ]),
        description: pick(s.description, lang),
        links: [],
      }
      const people = s.speakers.flatMap((sp): [string, Localized][] => [
        ["Speaker", sp.name],
        ["Speaker role", sp.title],
      ])
      cards.push(
        withHidden(
          card,
          otherLanguages(
            [["Title", s.title], ["Description", s.description], ["Topic", s.topic_tag], ["Location", s.location], ...people],
            lang
          )
        )
      )
    }
  }
  a.documents.forEach((doc, i) => {
    const title = pick(doc.title, lang)
    const files = Object.entries(doc.files ?? {}) as [string, string][]
    cards.push({
      id: `document-${i}`,
      group: "Documents",
      image: null,
      title,
      badges: files.map(([l]) => l.toUpperCase()),
      fields: [],
      description: "",
      links: files.map(([l, href]) => ({ label: l, href, text: `PDF (${l.toUpperCase()})` })),
    })
  })
  return cards
}

export const hiddenTexts = (card: CardModel) => (card.hidden ?? []).map((h) => h.text)

/** The texts a keyword can match on a card (same strings the card renders). */
export function searchableTexts(card: CardModel): string[] {
  return [
    card.title,
    ...card.badges,
    ...card.fields.map((f) => f.value),
    card.description,
    ...card.links.map(linkText),
  ]
}
