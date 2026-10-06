import type { Lang } from "@/lib/data"

/** Startup profiles contributed through public/startups/*.yml, compiled to data/community.json. */

type Labels = Partial<Record<Lang, string>>
export type Vocab = Record<string, Record<string, Labels | boolean>>

export interface PositionTexts {
  title?: string
  summary?: string
  responsibilities?: string[]
  requirements?: string[]
  nice_to_have?: string[]
}

export interface ProfileTexts {
  name?: string
  tagline?: string
  description?: string
  area_of_work?: string
  aim?: string
  culture?: string
  why_join?: string
  looking_for?: string
  seeking_note?: string
  impact?: string
  products?: Record<string, string | null>
  positions?: Record<string, PositionTexts | null>
}

export interface Person {
  name: string
  role: string
  role_other?: string
  linkedin?: string
}

export interface Salary {
  type: string
  currency?: string
  period?: string
  min?: number | null
  max?: number | null
}

export interface Position {
  id: string
  employment: string
  seniority: string
  experience_years?: number | null
  education?: string
  work_mode?: string
  count?: number | null
  start?: string
  deadline?: string
  apply_url?: string
  skills?: string[]
  soft_skills?: string[]
  languages?: string[]
  salary?: Salary | null
}

export interface CommunityProfile {
  file: string
  slug: string
  /** the example built from templates/startup-profile.yml */
  example?: boolean
  maintainers: string[]
  website: string
  logo_url: string
  founded: string
  location: {
    city: string
    city_other?: string
    country: string
    other_offices?: string[]
    office_maps_url?: string
    wheelchair_accessible?: boolean | null
  }
  industry: string
  industry_other?: string
  business_model?: string
  stage: string
  team_size: string
  engineering_team_size?: string
  work_mode: string
  work_week?: string
  tech_stack?: string[]
  tools?: string[]
  products?: { id: string; url?: string; platforms?: string[] }[]
  traction?: { metric: string; value: string | number; as_of: string }[]
  recognition?: { name: string; year?: number | null; url?: string }[]
  hitex?: {
    years?: number[]
    existing_profile?: string
    at_event?: {
      attending?: boolean | null
      booth?: string
      days?: string[]
      interviewing_at_booth?: boolean | null
      walk_in_cvs?: boolean | null
      book_meeting_url?: string
    }
  }
  links?: Partial<Record<"linkedin" | "instagram" | "x" | "facebook" | "youtube" | "github" | "engineering_blog", string>>
  media?: { demo_video?: string; pitch_deck?: string; press_kit?: string; photos?: string[] }
  clients?: { name: string; url?: string }[]
  partners?: { name: string; url?: string }[]
  impact?: { sdgs?: number[] }
  founders: Person[]
  core_team?: Person[]
  seeking?: string[]
  co_founder_role?: string
  hiring?: {
    status: string
    updated: string
    careers_page?: string
    contacts?: { name: string; role: string; linkedin?: string; email?: string; preferred_contact?: string }[]
    process?: {
      steps?: string[]
      typical_duration_days?: number | null
      reply_within_days?: number | null
      paid_take_home?: boolean | null
      remote_interviews?: boolean | null
    }
    open_to?: {
      languages?: { work?: string[]; required?: string[]; welcome?: string[]; english_level?: string; interview?: string[] }
      fresh_graduates?: boolean | null
      internships?: boolean | null
      international_candidates?: boolean | null
      visa_support?: boolean | null
      relocation_support?: boolean | null
    }
    contract?: {
      written_contract?: boolean | null
      social_security?: boolean | null
      probation_months?: number | null
      hours_per_week?: number | null
      overtime?: string
      payment_method?: string
    }
    growth?: {
      mentorship?: boolean | null
      training_budget_usd_per_year?: number | null
      conference_support?: boolean | null
      promotion_review?: string
    }
    internship?: {
      paid?: boolean | null
      duration_months?: number | null
      certificate?: boolean | null
      path_to_full_time?: boolean | null
    }
    benefits?: string[]
    positions?: Position[]
  } | null
  funding?: { raising?: string; amount?: string; stage?: string } | null
  i18n: Partial<Record<Lang, ProfileTexts | null>> & { en: ProfileTexts }
}

export interface CommunityData {
  generated_at?: string
  vocab: Vocab
  /** the template rendered as a profile, shown under "Contribution guideline" */
  example?: CommunityProfile
  profiles: CommunityProfile[]
}

const EMPTY: CommunityData = { vocab: {}, profiles: [] }

/** community.json is generated at build time; a missing file just means no profiles yet. */
export async function loadCommunity(): Promise<CommunityData> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/community.json`)
    if (!res.ok) return EMPTY
    return (await res.json()) as CommunityData
  } catch {
    return EMPTY
  }
}

/** keeps numbers left-to-right inside Arabic, Kurdish or Persian text ("$800–1,200" not "1,200–$800") */
const ltr = (text: string) => `\u2066${text}\u2069`

/**
 * Label of a fixed value in the chosen language, falling back to English, then the key itself.
 * Labels that start with a number or $ ("2–10", "200+", "$50k–250k") are kept left-to-right, so
 * Arabic, Kurdish and Persian pages don't show "10–2" or "+200".
 */
export function vocabLabel(vocab: Vocab, list: string, key: string | number | null | undefined, lang: Lang): string {
  if (key === null || key === undefined || key === "") return ""
  const entry = vocab[list]?.[String(key)]
  const label = !entry || typeof entry !== "object" ? String(key) : entry[lang] || entry.en || String(key)
  return /^[\d$]/.test(label) ? ltr(label) : label
}

export const vocabLabels = (vocab: Vocab, list: string, keys: (string | number)[] | null | undefined, lang: Lang) =>
  (keys ?? []).map((k) => vocabLabel(vocab, list, k, lang))

type TextField = Exclude<keyof ProfileTexts, "products" | "positions">

/** Profile text in the chosen language, falling back to English. */
export function profileText(p: CommunityProfile, field: TextField, lang: Lang): string {
  return (p.i18n[lang]?.[field] || p.i18n.en[field] || "").trim()
}

export function productText(p: CommunityProfile, id: string, lang: Lang): string {
  return (p.i18n[lang]?.products?.[id] || p.i18n.en.products?.[id] || "").trim()
}

export function positionTexts(p: CommunityProfile, id: string, lang: Lang): PositionTexts {
  const local = p.i18n[lang]?.positions?.[id] ?? {}
  const en = p.i18n.en.positions?.[id] ?? {}
  const pick = <K extends keyof PositionTexts>(k: K) => {
    const v = local[k]
    return (Array.isArray(v) ? v.length > 0 : !!v) ? v : en[k]
  }
  return {
    title: pick("title"),
    summary: pick("summary"),
    responsibilities: pick("responsibilities"),
    requirements: pick("requirements"),
    nice_to_have: pick("nice_to_have"),
  }
}

export const HIRING_MAX_AGE_DAYS = 90

/** Hiring info older than 90 days is treated as stale. */
export function hiringIsCurrent(p: CommunityProfile, now = new Date()): boolean {
  if (!p.hiring?.updated) return false
  const updated = new Date(`${p.hiring.updated}T00:00:00Z`).getTime()
  return now.getTime() - updated <= HIRING_MAX_AGE_DAYS * 24 * 3600 * 1000
}

/** Open positions: hiring info is current and the deadline (if any) hasn't passed. */
export function activePositions(p: CommunityProfile, now = new Date()): Position[] {
  if (!p.hiring || p.hiring.status === "not_hiring" || !hiringIsCurrent(p, now)) return []
  const today = now.toISOString().slice(0, 10)
  return (p.hiring.positions ?? []).filter((pos) => !pos.deadline || pos.deadline >= today)
}

const money = (n: number, currency: string) =>
  currency === "USD" ? `$${n.toLocaleString("en-US")}` : `${n.toLocaleString("en-US")} ${currency}`


/** "$800–1,200 / month", "1,000,000 IQD / month", or the label for negotiable / undisclosed / unpaid. */
export function formatSalary(s: Salary | null | undefined, vocab: Vocab, lang: Lang): string {
  if (!s) return ""
  const period = vocabLabel(vocab, "salary_periods", s.period, lang)
  if (s.type === "range" && typeof s.min === "number" && typeof s.max === "number" && s.currency) {
    const range =
      s.currency === "USD"
        ? `$${s.min.toLocaleString("en-US")}–${s.max.toLocaleString("en-US")}`
        : `${s.min.toLocaleString("en-US")}–${s.max.toLocaleString("en-US")} ${s.currency}`
    return period ? `${ltr(range)} / ${period}` : ltr(range)
  }
  if (s.type === "fixed" && typeof s.min === "number" && s.currency) {
    const amount = ltr(money(s.min, s.currency))
    return period ? `${amount} / ${period}` : amount
  }
  return vocabLabel(vocab, "salary_types", s.type, lang)
}
