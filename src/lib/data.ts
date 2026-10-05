export type Lang = "en" | "ar" | "ku" | "fa"

export const LANGS: { value: Lang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ar", label: "AR" },
  { value: "ku", label: "KU" },
  { value: "fa", label: "FA" },
]

/**
 * Text direction for card content. Set from the language, not detected from the text,
 * because Persian/Arabic text often starts with a Latin brand name.
 */
export const textDir = (lang: Lang) => (lang === "en" ? "ltr" : "rtl")

export type Localized = Partial<Record<Lang, string>> | null

export interface Startup {
  id: string
  name: Localized
  description: Localized
  photo_url: string | null
  /** holds the founder name(s), not a category */
  category: Localized
  website_url: string | null
  founded_year: number | null
  city: Localized
  prize_amount: number | string | null
  years: number[] | null
  facebook_url: string | null
  instagram_url: string | null
  twitter_url: string | null
  linkedin_url: string | null
  page: number
}

/** Sponsors, exhibitors and media share one organizations table. */
export interface Organization {
  id: string
  name: Localized
  description: Localized
  logo_url: string | null
  website_url: string | null
  tier: string | null
  booth_number: string | null
  years: number[] | null
  sector: Localized
  is_featured: boolean
  country: { name: Localized; code: string } | null
  industry: { name: Localized } | null
  featured_on: string[]
}

export interface Speaker {
  id: string
  name: Localized
  title: Localized
  company: Localized
  country: Localized
  bio: Localized
  photo_url: string | null
  year: number | null
  facebook_url: string | null
  instagram_url: string | null
  twitter_url: string | null
  linkedin_url: string | null
  is_featured: boolean
  featured_on?: string[]
  /** our own stable order: head of government, government officials, featured, others */
  display_order?: number
  display_group?: "head_of_government" | "government" | "featured" | "other"
}

export interface SessionSpeaker extends Speaker {
  SessionSpeaker: { sort_order: number; is_moderator: boolean }
}

export interface Session {
  id: string
  title: Localized
  description: Localized
  start_time: string
  end_time: string
  type: string
  topic_tag: Localized
  location: Localized
  speakers: SessionSpeaker[]
}

export interface AgendaDay {
  id: string
  title: Localized
  date: string
  day_number: number
  description: Localized
  sessions: Session[]
}

export interface Agenda {
  agendas: AgendaDay[]
  opening: { id: string; title: Localized; subtitle: Localized }
  opening_details: { time: string; entry: Localized; guest: Localized; venue: Localized; guest_note: Localized }
  documents: { title: Localized; files: Localized }[]
}

/** Text in the chosen language, falling back to English, then any language. */
export function pick(value: Localized, lang: Lang): string {
  if (!value) return ""
  return (value[lang] || value.en || Object.values(value).find(Boolean) || "").trim()
}
