// The form's working copy of a profile ("draft"), and conversion to and from the profile file.
//
// A draft is shaped like the profile file, except that products and positions carry their texts
// inline (`_texts` per language) and a stable `_uid`, so ids can follow the English names and
// translations stay attached while people add, remove and rename items.
import type { CommunityProfile } from "@/lib/community"
import type { Lang, Startup } from "@/lib/data"
import { fileStamp, snakeCase } from "@/lib/profile-names"
import { profileUrl } from "@/lib/links"
import type { Profile } from "@/lib/profile-rules"

export const LANG_ORDER: Lang[] = ["en", "ar", "ku", "fa"]
export const LANG_NAMES: Record<Lang, string> = { en: "English", ar: "Arabic", ku: "Kurdish", fa: "Persian" }

export interface Draft {
  version: 1
  mode: "new" | "edit"
  /** when the draft was started (ISO, UTC); a new profile's file name starts with it */
  created: string
  /** the existing file, when editing */
  file?: string
  profile: Profile
}

export const uid = () => Math.random().toString(36).slice(2, 10)

export const fileNameOf = (d: Draft) => d.file ?? `${fileStamp(new Date(d.created))}_${d.profile.slug || "startup"}.yml`

/** "Jane Doe – John Roe", "A, B & C" -> names */
export const splitNames = (text: string | null | undefined) =>
  (text ?? "")
    .split(/\s+[–—-]\s+|\s*[,،&]\s*|\s+and\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)

const https = (url: string | null | undefined) => (url && url.startsWith("https://") ? url : "")

/** A new draft filled in from what HITEX publishes about the startup (not its logo, see below). */
export function draftFromHitex(s: Startup, now = new Date()): Draft {
  const i18n: Profile = {}
  for (const l of LANG_ORDER) {
    const texts = { name: s.name?.[l]?.trim() ?? "", description: s.description?.[l]?.trim() ?? "" }
    if (texts.name || texts.description) i18n[l] = texts
  }
  return {
    version: 1,
    mode: "new",
    created: now.toISOString(),
    profile: {
      schema_version: 1,
      slug: snakeCase(s.name?.en ?? "").slice(0, 60).replace(/_+$/, ""),
      maintainers: [],
      hitex: { existing_profile: s.id, years: s.years ?? [] },
      website: https(s.website_url),
      // not HITEX's photo_url: for most startups it's the same placeholder picture
      logo_url: "",
      founded: s.founded_year ? String(s.founded_year) : "",
      location: { country: "IQ" },
      links: {
        linkedin: https(s.linkedin_url),
        instagram: https(s.instagram_url),
        x: https(s.twitter_url),
        facebook: https(s.facebook_url),
      },
      founders: splitNames(s.category?.en).map((name) => ({ name, role: "founder" })),
      i18n,
      consent: {},
    },
  }
}

/** A draft for editing a published profile. */
export function draftFromProfile(source: CommunityProfile, now = new Date()): Draft {
  const { file, example: _example, ...rest } = structuredClone(source)
  const p = rest as Profile
  // a startup without a website links to its page here; the form shows that as an empty field
  if (p.website === profileUrl(p.slug)) p.website = ""
  const i18n = (p.i18n ?? {}) as Record<string, Profile | null>
  p.products = (p.products ?? []).map((x: Profile) => ({
    ...x,
    _uid: uid(),
    _texts: Object.fromEntries(LANG_ORDER.map((l) => [l, i18n[l]?.products?.[x.id] ?? ""])),
  }))
  if (p.hiring) {
    p.hiring.positions = (p.hiring.positions ?? []).map((x: Profile) => ({
      ...x,
      _uid: uid(),
      _texts: Object.fromEntries(LANG_ORDER.map((l) => [l, i18n[l]?.positions?.[x.id] ?? {}])),
    }))
  }
  for (const t of Object.values(i18n)) {
    if (t) {
      delete t.products
      delete t.positions
    }
  }
  // the consent is given again for every change
  p.consent = {}
  return { version: 1, mode: "edit", created: now.toISOString(), file, profile: p }
}

/** Removes empty text, lists and groups; trims text. Objects inside lists stay, so indexes match the form. */
function prune(value: unknown): unknown {
  if (typeof value === "string") return value.trim() || undefined
  if (Array.isArray(value)) {
    return value
      .map((v) => (v && typeof v === "object" && !Array.isArray(v) ? (prune(v) ?? {}) : prune(v)))
      .filter((v) => v !== undefined)
  }
  if (value && typeof value === "object") {
    const out: Profile = {}
    for (const [k, v] of Object.entries(value)) {
      const p = prune(v)
      if (p !== undefined && !(Array.isArray(p) && p.length === 0)) out[k] = p
    }
    return Object.keys(out).length ? out : undefined
  }
  return value === null ? undefined : value
}

function uniqueId(wanted: string, fallback: string, taken: Set<string>) {
  let id = wanted.slice(0, 36).replace(/_+$/, "") || fallback
  for (let n = 2; taken.has(id); n++) id = `${wanted.slice(0, 36).replace(/_+$/, "") || fallback}_${n}`
  taken.add(id)
  return id
}

/** Drops values of fields the form hides because of another answer (e.g. industry_other unless industry is "other"). */
function tidy(p: Profile) {
  if (p.industry !== "other") delete p.industry_other
  if (p.location && p.location.city !== "other") delete p.location.city_other
  for (const m of p.core_team ?? []) if (m && m.role !== "other") delete m.role_other
  if (!(p.seeking ?? []).includes("co_founder")) delete p.co_founder_role
  if (p.hiring) {
    if (p.hiring.open_to?.internships !== true) delete p.hiring.internship
    for (const pos of p.hiring.positions ?? []) {
      const s = pos.salary
      if (!s?.type) delete pos.salary
      else if (s.type !== "range" && s.type !== "fixed") pos.salary = { type: s.type }
      else if (s.type === "fixed") delete s.max
    }
  }
}

export interface Converted {
  profile: Profile
  /** maps a path in the profile file to the form field that holds it */
  formPath: (path: string) => string
}

/** The profile file for a draft. `today` (YYYY-MM-DD) becomes hiring.updated. */
export function draftToProfile(d: Draft, opts: { today: string; fallbackMaintainer?: string }): Converted {
  const p = structuredClone(d.profile) as Profile
  const i18n: Record<string, Profile> = {}
  for (const l of LANG_ORDER) i18n[l] = { ...(p.i18n?.[l] ?? {}) }
  const moved: [string, string][] = []

  // ids already in the file stay; new items get one from their English name
  const productIds = new Set<string>((p.products ?? []).map((x: Profile) => x.id).filter(Boolean))
  p.products = (p.products ?? []).map((x: Profile, i: number) => {
    const { _uid, _texts, ...rest } = x
    const id = rest.id || uniqueId(snakeCase(_texts?.en ?? ""), `product_${i + 1}`, productIds)
    for (const l of LANG_ORDER) {
      if (`${_texts?.[l] ?? ""}`.trim()) i18n[l].products = { ...i18n[l].products, [id]: _texts[l] }
      moved.push([`i18n.${l}.products.${id}`, `products.${i}._texts.${l}`])
    }
    return { ...rest, id }
  })

  if (p.hiring) {
    const positionIds = new Set<string>((p.hiring.positions ?? []).map((x: Profile) => x.id).filter(Boolean))
    p.hiring.positions = (p.hiring.positions ?? []).map((x: Profile, i: number) => {
      const { _uid, _texts, ...rest } = x
      const id = rest.id || uniqueId(snakeCase(_texts?.en?.title ?? ""), `position_${i + 1}`, positionIds)
      for (const l of LANG_ORDER) {
        if (prune(_texts?.[l]) !== undefined) i18n[l].positions = { ...i18n[l].positions, [id]: _texts[l] }
        moved.push([`i18n.${l}.positions.${id}`, `hiring.positions.${i}._texts.${l}`])
      }
      return { ...rest, id }
    })
  }
  p.i18n = i18n
  tidy(p)
  if (!`${p.website ?? ""}`.trim() && p.slug) p.website = profileUrl(p.slug)

  if (!(p.maintainers ?? []).some((m: string) => m?.trim()) && opts.fallbackMaintainer) p.maintainers = [opts.fallbackMaintainer]
  p.schema_version = 1
  p.consent = { ...p.consent, license: "CC-BY-4.0" }

  const profile = (prune(p) ?? {}) as Profile
  if (profile.hiring) profile.hiring.updated = opts.today

  // longest prefix first, so ".positions.backend_developer" doesn't swallow ".positions.backend_developer_2"
  moved.sort((a, b) => b[0].length - a[0].length)
  const formPath = (path: string) => {
    const dotted = path.replace(/\[(\d+)\]/g, ".$1")
    for (const [from, to] of moved) {
      if (dotted === from || dotted.startsWith(`${from}.`)) return to + dotted.slice(from.length)
    }
    return dotted
  }
  return { profile, formPath }
}

// ── reading and writing nested values by "a.b.0.c" paths ──────────────────

export function getIn(obj: unknown, path: string): unknown {
  let cur = obj
  for (const key of path.split(".")) {
    if (cur === null || cur === undefined) return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

export function setIn<T>(obj: T, path: string, value: unknown): T {
  const [key, ...rest] = path.split(".")
  const index = /^\d+$/.test(key) ? +key : null
  const base: unknown = obj ?? (index !== null ? [] : {})
  const current = (base as Record<string, unknown>)[key]
  const next = rest.length ? setIn(current ?? (/^\d+$/.test(rest[0]) ? [] : {}), rest.join("."), value) : value
  if (Array.isArray(base)) {
    const copy = [...base]
    copy[index ?? +key] = next
    return copy as T
  }
  return { ...(base as object), [key]: next } as T
}

// ── saved drafts (this browser only) ──────────────────────────────────────

const storageKey = (key: string) => `hitex-profile-form:${key}`

export function loadDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(storageKey(key))
    const d = raw ? (JSON.parse(raw) as Draft) : null
    return d?.version === 1 && d.profile ? d : null
  } catch {
    return null
  }
}

export function saveDraft(key: string, d: Draft | null) {
  try {
    if (d) localStorage.setItem(storageKey(key), JSON.stringify(d))
    else localStorage.removeItem(storageKey(key))
  } catch {
    // storage full or blocked: the form still works, the draft just isn't kept
  }
}
