import {
  pick,
  type Agenda,
  type Lang,
  type Organization,
  type Speaker,
  type Startup,
} from "@/lib/data"

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
  /** makes the title a link (speakers: Google search for the person) */
  titleHref?: string
  badges: string[]
  fields: { label: string; value: string }[]
  description: string
  links: { label: string; href: string; text?: string }[]
}

export const linkText = (link: CardModel["links"][number]) =>
  link.text ?? link.href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")

function links(entries: [string, string | null][]): CardModel["links"] {
  return entries.flatMap(([label, href]) => (href ? [{ label, href }] : []))
}

function fields(entries: [string, string | number | null | undefined][]): CardModel["fields"] {
  return entries.flatMap(([label, value]) =>
    value === null || value === undefined || value === "" ? [] : [{ label, value: String(value) }]
  )
}

// oklch hues spread around the wheel: red, orange, yellow, green, teal, cyan, blue, violet, purple, pink
const MONOGRAM_HUES = [25, 55, 95, 145, 185, 215, 260, 290, 320, 350]

/** First letter or digit of the name, with a hue picked stably from the record id. */
function monogram(name: string, id: string): CardModel["monogram"] {
  const letter = name.match(/[\p{L}\p{N}]/u)?.[0]?.toLocaleUpperCase() ?? "?"
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return { letter, hue: MONOGRAM_HUES[hash % MONOGRAM_HUES.length] }
}

const featuredOn = (pages: string[] | undefined) => (pages ?? []).map((p) => `On ${p}`)

export function startupCard(s: Startup, lang: Lang): CardModel {
  const title = pick(s.name, lang)
  return {
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
}

export function organizationCard(o: Organization, lang: Lang): CardModel {
  const country = o.country ? `${pick(o.country.name, lang)} (${o.country.code})` : null
  return {
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
  return {
    id: s.id,
    image: s.photo_url,
    monogram: monogram(stripHonorific(title), s.id),
    imageShape: "circle",
    centered: true,
    title,
    titleHref: googleSearchUrl(s),
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
      cards.push({
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
      })
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
