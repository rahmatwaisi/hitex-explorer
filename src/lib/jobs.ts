// Open positions from the startup profiles, one card each, for the jobs page (#/jobs).
import { ALL_LANGS, LANG_NAMES, fields, monogram, profileHref, withHidden, type CardModel, type HiddenText } from "@/lib/cards"
import {
  activePositions,
  formatSalary,
  ltr,
  positionTexts,
  profileText,
  vocabLabel,
  vocabLabels,
  type CommunityData,
  type CommunityProfile,
  type Position,
  type Vocab,
} from "@/lib/community"
import type { Lang } from "@/lib/data"
import { convertedSalary, monthlyMax, type Currency } from "@/lib/salary"

export interface Job {
  profile: CommunityProfile
  position: Position
  /** from the example profile, shown while there are no real openings */
  example?: boolean
}

/** Positions shown on profiles: hiring info under 90 days old and the deadline not passed. */
export const openJobs = (data: CommunityData): Job[] =>
  data.profiles.flatMap((profile) => activePositions(profile).map((position) => ({ profile, position })))

/** The example profile's positions, whatever their dates. */
export const exampleJobs = (data: CommunityData): Job[] =>
  data.example ? (data.example.hiring?.positions ?? []).map((position) => ({ profile: data.example!, position, example: true })) : []

const workMode = (j: Job) => j.position.work_mode || j.profile.work_mode
const interviewsAtHitex = (j: Job) => !!(j.profile.hitex?.at_event?.attending && j.profile.hitex.at_event.interviewing_at_booth)

export const JOB_FILTERS: { key: string; label: string; test: (j: Job) => boolean }[] = [
  { key: "remote", label: "Remote or hybrid", test: (j) => ["remote", "hybrid"].includes(workMode(j)) },
  { key: "internship", label: "Internships", test: (j) => j.position.employment === "internship" || j.position.seniority === "intern" },
  {
    key: "graduates",
    label: "Fresh graduates",
    test: (j) => j.profile.hiring?.open_to?.fresh_graduates === true || j.position.experience_years === 0 || j.position.seniority === "intern",
  },
  { key: "salary", label: "Salary shown", test: (j) => j.position.salary?.type === "range" || j.position.salary?.type === "fixed" },
  { key: "hitex", label: "Interviews at HITEX", test: interviewsAtHitex },
]

/** Monthly pay in USD for sorting; jobs without a comparable amount sort last. */
const pay = (j: Job) => monthlyMax(j.position.salary, "USD", j.profile.hiring?.contract?.hours_per_week) ?? -1

export const JOB_SORTS: { key: string; label: string; compare: (a: Job, b: Job) => number }[] = [
  { key: "newest", label: "Newest", compare: (a, b) => (b.profile.hiring?.updated ?? "").localeCompare(a.profile.hiring?.updated ?? "") },
  { key: "salary", label: "Highest salary", compare: (a, b) => pay(b) - pay(a) },
  { key: "deadline", label: "Apply by soonest", compare: (a, b) => (a.position.deadline || "9999").localeCompare(b.position.deadline || "9999") },
]

/** The job pays at least `min` a month in `currency` (converted when the job pays in the other one). */
export const paysAtLeast = (j: Job, min: number, currency: Currency) =>
  (monthlyMax(j.position.salary, currency, j.profile.hiring?.contract?.hours_per_week) ?? -1) >= min

export function jobCard(job: Job, vocab: Vocab, lang: Lang): CardModel {
  const { profile: p, position: pos } = job
  const L = (list: string, key: string | number | null | undefined) => vocabLabel(vocab, list, key, lang)
  const tx = positionTexts(p, pos.id, lang)
  const company = profileText(p, "name", lang)
  const event = p.hitex?.at_event
  const city = p.location.city === "other" ? (p.location.city_other ?? "") : L("cities", p.location.city)
  const apply = pos.apply_url || p.hiring?.careers_page
  const exp = pos.experience_years
  const href = profileHref(p.slug)

  const card: CardModel = {
    id: `job-${p.slug}-${pos.id}`,
    image: p.logo_url,
    monogram: monogram(company, p.slug),
    title: tx.title ?? pos.id,
    titleLink: { href, kind: "page" },
    badges: [
      ...(job.example ? ["Example"] : []),
      L("employment", pos.employment),
      L("seniority", pos.seniority),
      L("work_modes", workMode(job)),
      ...(pos.count && pos.count > 1 ? [`${pos.count} openings`] : []),
      ...(interviewsAtHitex(job) ? [event?.booth ? `Interviews at HITEX · booth ${event.booth}` : "Interviews at HITEX"] : []),
    ].filter(Boolean),
    fields: fields([
      ["Company", company],
      // the salary as given, then about the same in the other currency
      ["Salary", [formatSalary(pos.salary, vocab, lang), convertedSalary(pos.salary, vocab, lang)].filter(Boolean).join("\n")],
      ["Experience", typeof exp === "number" ? (exp === 0 ? "No experience needed" : ltr(`${exp}+ years`)) : ""],
      ["Education", L("education", pos.education)],
      ["Location", city],
      ["Skills", vocabLabels(vocab, "technologies", pos.skills, lang).join(", ")],
      ["Languages", vocabLabels(vocab, "languages", pos.languages, lang).join(", ")],
      ["Start", pos.start === "asap" ? "As soon as possible" : pos.start ? ltr(pos.start) : ""],
      ["Apply by", pos.deadline ? ltr(pos.deadline) : ""],
    ]),
    description: tx.summary ?? "",
    links: [
      ...(apply ? [{ label: "Apply", href: apply, text: "Apply" }] : []),
      { label: "Company profile", href, text: `${company} profile`, internal: true },
    ],
    foundIn: { label: "Found in the job details", href, linkText: "See the full job" },
  }
  return withHidden(card, jobHidden(job, vocab, lang))
}

/** The rest of the job and its company, in all four languages, for the search. */
function jobHidden({ profile: p, position: pos }: Job, vocab: Vocab, lang: Lang): HiddenText[] {
  const out: HiddenText[] = []
  const add = (section: string, text: string | null | undefined, l?: Lang) => {
    const t = (text ?? "").trim()
    if (t) out.push({ section: l && l !== lang ? `${section} · ${LANG_NAMES[l]}` : section, text: t, lang: l })
  }
  const fixed = (section: string, list: string, keys: string | (string | number)[] | null | undefined) => {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      if (key === null || key === undefined || key === "") continue
      for (const l of ALL_LANGS) add(section, vocabLabel(vocab, list, key, l), l)
    }
  }
  for (const l of ALL_LANGS) {
    const t = p.i18n[l]?.positions?.[pos.id]
    add("Title", t?.title, l)
    add("Summary", t?.summary, l)
    for (const x of t?.responsibilities ?? []) add("Responsibilities", x, l)
    for (const x of t?.requirements ?? []) add("Requirements", x, l)
    for (const x of t?.nice_to_have ?? []) add("Nice to have", x, l)
    add("Company", p.i18n[l]?.name, l)
    add("Company", p.i18n[l]?.tagline, l)
  }
  fixed("Employment", "employment", pos.employment)
  fixed("Seniority", "seniority", pos.seniority)
  fixed("Education", "education", pos.education)
  fixed("Work mode", "work_modes", pos.work_mode || p.work_mode)
  fixed("Skills", "technologies", pos.skills)
  fixed("Soft skills", "soft_skills", pos.soft_skills)
  fixed("Languages", "languages", pos.languages)
  fixed("Location", "cities", p.location.city)
  fixed("Industry", "industries", p.industry)
  fixed("Benefits", "benefits", p.hiring?.benefits)
  return out
}
