// Rules for profile files: startups (public/startups/*.yml) and sponsors (public/sponsors/*.yml).
// Shared by the build and the pull-request check (scripts/, run directly with Node) and by the profile
// form in the browser, so it uses no Node or DOM APIs. The caller compiles the JSON schema with Ajv and
// passes it in.
import YAML from "yaml"

export { fileStamp, snakeCase } from "./profile-names.ts"

export const MAX_FILE_BYTES = 64 * 1024
/** used by the examples built from the templates */
export const RESERVED_SLUGS = new Set(["example_startup", "example_sponsor"])

/** Startups and sponsors listed by HITEX can each complete a profile; they differ in a few sections. */
export type ProfileKind = "startup" | "sponsor"

/** Where a kind's files live, and the HITEX list its `hitex.existing_profile` must be in. */
export const KINDS: Record<ProfileKind, { dir: string; list: string; noun: string }> = {
  startup: { dir: "public/startups", list: "data/startups_list.json", noun: "startup" },
  sponsor: { dir: "public/sponsors", list: "data/sponsors.json", noun: "sponsor" },
}

/** yyyymmdd_hhmmss_snake_case_name.yml */
export const FILE_RE = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_([a-z0-9]+(?:_[a-z0-9]+)*)\.yml$/
export const SLUG_RE = /^[a-z0-9]+(_[a-z0-9]+)*$/

type Labels = Partial<Record<"en" | "ar" | "ku" | "fa", string>>
export type Vocab = Record<string, Record<string, Labels | boolean>>
export type Profile = Record<string, any>

/** The parts of an Ajv error and validate function used here. */
export interface SchemaError {
  instancePath: string
  keyword: string
  params: Record<string, unknown>
  message?: string
}
export interface SchemaValidator {
  (data: unknown): boolean
  errors?: SchemaError[] | null
}

export interface Result {
  profile?: Profile
  errors: string[]
  warnings: string[]
}

export interface RuleOptions {
  /** default "startup" */
  kind?: ProfileKind
  fileName?: string
  vocab: Vocab
  validateSchema: SchemaValidator
  hitexIds?: Set<string>
  now?: Date
  /** validating a template (templates/*-profile.yml) itself: its HITEX id is a placeholder */
  template?: boolean
}

/** Checks the file name; returns the slug part, or an error message. */
export function checkFileName(fileName: string, now = new Date()): { slug?: string; error?: string } {
  const m = FILE_RE.exec(fileName)
  if (!m) {
    return { error: `File name "${fileName}" must look like yyyymmdd_hhmmss_snake_case_name.yml (e.g. 20261005_171047_lyia_ai_company.yml).` }
  }
  const [, y, mo, d, h, mi, s, slug] = m
  const t = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
  const valid = t.getUTCFullYear() === +y && t.getUTCMonth() === +mo - 1 && t.getUTCDate() === +d && +h < 24 && +mi < 60 && +s < 60
  if (!valid) return { error: `The timestamp in "${fileName}" is not a real date and time.` }
  if (t.getTime() > now.getTime() + 24 * 3600 * 1000) return { error: `The timestamp in "${fileName}" is in the future.` }
  if (+y < 2020) return { error: `The timestamp in "${fileName}" is too old; use the time you create the file (UTC).` }
  return { slug }
}

const empty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)
const byteLength = (text: string) => new TextEncoder().encode(text).length

/** Parses and validates one profile file's text. */
export function validateProfileText(text: string, opts: RuleOptions): Result {
  if (byteLength(text) > MAX_FILE_BYTES) {
    return { errors: [`The file is larger than ${MAX_FILE_BYTES / 1024} KB.`], warnings: [] }
  }

  // YAML 1.2, no aliases (no "billion laughs"), duplicate keys are errors
  const doc = YAML.parseDocument(text, { uniqueKeys: true, prettyErrors: true })
  if (doc.errors.length) {
    return { errors: doc.errors.map((e) => `YAML: ${e.message.split("\n")[0]}`), warnings: [] }
  }
  let profile: Profile
  try {
    profile = doc.toJS({ maxAliasCount: 0 })
  } catch (e) {
    return { errors: [`YAML: ${(e as Error).message}`], warnings: [] }
  }
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return { errors: ["The file must contain a YAML mapping (key: value pairs)."], warnings: [] }
  }
  return { profile, ...validateProfile(profile, opts) }
}

/** Validates a parsed profile: the JSON schema, then the rules the schema can't express. */
export function validateProfile(profile: Profile, opts: RuleOptions): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const schemaOk = opts.validateSchema(profile)
  if (!schemaOk) errors.push(...schemaErrors(opts.validateSchema.errors ?? []))
  try {
    semanticChecks(profile, opts, errors, warnings)
  } catch (e) {
    // malformed data can trip the checks below; the schema errors already explain it
    if (schemaOk) throw e
  }
  return { errors: unique(errors), warnings: unique(warnings) }
}

const unique = (list: string[]) => [...new Set(list)]

/** "/hiring/positions/0/salary" -> "hiring.positions[0].salary" */
export const dottedPath = (instancePath: string) =>
  instancePath
    .split("/")
    .slice(1)
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((acc, p) => (/^\d+$/.test(p) ? `${acc}[${p}]` : acc ? `${acc}.${p}` : p), "")

const PATTERN_HINTS: Record<string, string> = {
  "^[a-z0-9]+(_[a-z0-9]+)*$": "must use lowercase letters and digits joined by _ (like my_startup)",
  "^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$": "must be a GitHub username (letters, digits and -)",
  "^(19|20)\\d{2}(-(0[1-9]|1[0-2]))?$": "must be a year or a year and month, like 2024 or 2024-03",
  "^[A-Z]{2}$": "must be a two-letter country code in capitals, like IQ",
  "^\\d{4}-(0[1-9]|1[0-2])$": "must be a year and month, like 2026-09",
  "^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$": "must be a date like 2026-10-05",
  "^[a-z0-9][a-z0-9_.+#-]*$": "must be a lowercase key (letters, digits and _ . + # -)",
  "^https://": "must be a full link starting with https://",
  "^(asap|\\d{4}-(0[1-9]|1[0-2]))?$": 'must be "asap" or a year and month, like 2026-11',
}

const TYPE_NAMES: Record<string, string> = {
  string: "text",
  integer: "a whole number",
  number: "a number",
  boolean: "true or false",
  array: "a list",
  object: "a group of fields",
}

/** Turns Ajv errors into short messages that start with the field path. */
export function schemaErrors(errors: SchemaError[]): string[] {
  const groups = new Map<string, SchemaError[]>()
  for (const e of errors) {
    if (e.keyword === "anyOf") continue
    const list = groups.get(e.instancePath) ?? []
    list.push(e)
    groups.set(e.instancePath, list)
  }
  const out: string[] = []
  for (const [instancePath, list] of groups) {
    // inside anyOf ("", null or a value) the failed "" / null branches are noise when there's a real reason
    const branch = (e: SchemaError) =>
      (e.keyword === "const" && e.params.allowedValue === "") || (e.keyword === "type" && String(e.params.type) === "null")
    const real = list.filter((e) => !branch(e))
    for (const e of real.length ? real : list) {
      const path = dottedPath(instancePath)
      const p = e.params
      if (e.keyword === "required") {
        const field = path ? `${path}.${p.missingProperty}` : String(p.missingProperty)
        out.push(`${field}: is required`)
        continue
      }
      const message = (() => {
        switch (e.keyword) {
          case "additionalProperties":
            return `unknown field "${p.additionalProperty}"`
          case "const":
            return p.allowedValue === true ? "must be confirmed (true)" : `must be ${JSON.stringify(p.allowedValue)}`
          case "type":
            return `must be ${String(p.type).split(",").map((t) => TYPE_NAMES[t] ?? t).join(" or ")}`
          case "format":
            return p.format === "uri"
              ? PATTERN_HINTS["^https://"]
              : p.format === "email"
                ? "must be an email address"
                : `must be a valid ${p.format}`
          case "pattern":
            return PATTERN_HINTS[String(p.pattern)] ?? `must match ${p.pattern}`
          case "maxLength":
            return `must be at most ${p.limit} characters`
          case "minLength":
            return p.limit === 1 ? "is required" : `must be at least ${p.limit} characters`
          case "minItems":
            return p.limit === 1 ? "needs at least one entry" : `needs at least ${p.limit} entries`
          case "maxItems":
            return `can have at most ${p.limit} entries`
          case "uniqueItems":
            return "has the same value twice"
          case "minimum":
            return `must be at least ${p.limit}`
          case "maximum":
            return `must be at most ${p.limit}`
          default:
            return e.message ?? e.keyword
        }
      })()
      out.push(`${path || "(top level)"}: ${message}`)
    }
  }
  return out
}

function semanticChecks(p: Profile, opts: RuleOptions, errors: string[], warnings: string[]) {
  const { vocab } = opts
  const now = opts.now ?? new Date()
  const kind = opts.kind ?? "startup"

  if (opts.fileName) {
    const { slug, error } = checkFileName(opts.fileName, now)
    if (error) errors.push(error)
    else if (slug !== p.slug) errors.push(`slug "${p.slug}" must equal the name part of the file name ("${slug}").`)
    if (RESERVED_SLUGS.has(p.slug)) errors.push(`slug "${p.slug}" is reserved for the example; choose your own name.`)
  }

  /** value must be a key of vocab[list]; `_open` lists only warn */
  const inList = (list: string, value: unknown, where: string) => {
    if (empty(value)) return
    const entries = vocab[list]
    if (!entries) throw new Error(`unknown vocab list ${list}`)
    const key = String(value)
    if (key === "_open" || !(key in entries)) {
      const msg = `${where}: "${key}" is not in the ${list} list.`
      if (entries._open === true) warnings.push(`${msg} It will be shown as written; we may add it to the list.`)
      else errors.push(`${msg} Allowed: ${Object.keys(entries).filter((k) => k !== "_open").join(", ")}.`)
    }
  }
  const allIn = (list: string, values: unknown, where: string) => {
    if (Array.isArray(values)) values.forEach((v, i) => inList(list, v, `${where}[${i}]`))
  }
  const needOther = (value: unknown, other: unknown, where: string) => {
    if (value === "other" && empty(other)) errors.push(`${where}_other: say what it is, because ${where} is "other".`)
  }

  // company
  const loc = p.location ?? {}
  inList("cities", loc.city, "location.city")
  needOther(loc.city, loc.city_other, "location.city")
  allIn("cities", loc.other_offices, "location.other_offices")
  inList("industries", p.industry, "industry")
  needOther(p.industry, p.industry_other, "industry")
  inList("business_models", p.business_model, "business_model")
  if (kind === "startup") {
    inList("stages", p.stage, "stage")
    inList("team_sizes", p.team_size, "team_size")
  } else {
    inList("company_sizes", p.company_size, "company_size")
  }
  inList("engineering_team_sizes", p.engineering_team_size, "engineering_team_size")
  inList("work_modes", p.work_mode, "work_mode")
  inList("work_weeks", p.work_week, "work_week")
  allIn("technologies", p.tech_stack, "tech_stack")
  allIn("tools", p.tools, "tools")
  if (typeof p.founded === "string" && /^\d{4}/.test(p.founded) && +p.founded.slice(0, 4) > now.getUTCFullYear()) {
    errors.push("founded: is in the future.")
  }

  const productIds = uniqueIds(p.products, "products", errors)
  ;(p.products ?? []).forEach((x: Profile, i: number) => allIn("platforms", x.platforms, `products[${i}].platforms`))
  ;(p.traction ?? []).forEach((x: Profile, i: number) => inList("traction_metrics", x.metric, `traction[${i}].metric`))
  allIn("sdgs", p.impact?.sdgs, "impact.sdgs")

  // strict rule: only startups and sponsors that HITEX lists can have a profile
  const existing = p.hitex?.existing_profile
  const { list, noun } = KINDS[kind]
  if (!opts.template && !empty(existing)) {
    if (!opts.hitexIds?.size) errors.push(`${list} could not be read, so the ${noun} can't be verified.`)
    else if (!opts.hitexIds.has(existing)) {
      errors.push(
        `hitex.existing_profile: "${existing}" is not a ${noun} listed by HITEX. Only ${noun}s in ${list} ` +
          "can have a profile; find your id on the Contribution page."
      )
    }
  }
  allIn("event_activities", p.hitex?.at_event?.activities, "hitex.at_event.activities")

  // people
  if (kind === "startup") {
    ;(p.founders ?? []).forEach((x: Profile, i: number) => inList("founder_roles", x.role, `founders[${i}].role`))
    ;(p.core_team ?? []).forEach((x: Profile, i: number) => {
      inList("team_roles", x.role, `core_team[${i}].role`)
      needOther(x.role, x.role_other, `core_team[${i}].role`)
    })
    allIn("seeking", p.seeking, "seeking")
    if (Array.isArray(p.seeking) && p.seeking.includes("co_founder")) {
      if (empty(p.co_founder_role)) errors.push('co_founder_role: is required, because seeking includes "co_founder".')
      else inList("co_founder_roles", p.co_founder_role, "co_founder_role")
    }
  } else {
    ;(p.leadership ?? []).forEach((x: Profile, i: number) => {
      inList("leadership_roles", x.role, `leadership[${i}].role`)
      needOther(x.role, x.role_other, `leadership[${i}].role`)
    })
    // what the sponsor offers startups, and the partners it wants
    const f = p.for_startups
    if (f) {
      allIn("sponsor_offers", f.offers, "for_startups.offers")
      allIn("partnership_seeking", f.seeking, "for_startups.seeking")
      if (f.contact) {
        inList("partnership_contact_roles", f.contact.role, "for_startups.contact.role")
        inList("preferred_contact", f.contact.preferred_contact, "for_startups.contact.preferred_contact")
      }
    }
  }

  // hiring
  const h = p.hiring
  let positionIds = new Set<string>()
  if (h) {
    inList("hiring_status", h.status, "hiring.status")
    const updated = new Date(`${h.updated}T00:00:00Z`)
    if (updated.getTime() > now.getTime() + 24 * 3600 * 1000) errors.push("hiring.updated: is in the future.")
    ;(h.contacts ?? []).forEach((c: Profile, i: number) => {
      inList("contact_roles", c.role, `hiring.contacts[${i}].role`)
      inList("preferred_contact", c.preferred_contact, `hiring.contacts[${i}].preferred_contact`)
    })
    allIn("process_steps", h.process?.steps, "hiring.process.steps")
    const langs = h.open_to?.languages
    if (langs) {
      for (const k of ["work", "required", "welcome", "interview"]) allIn("languages", langs[k], `hiring.open_to.languages.${k}`)
      inList("english_levels", langs.english_level, "hiring.open_to.languages.english_level")
    }
    if (h.internship && h.open_to?.internships === false) {
      warnings.push("hiring.internship: is filled in, but hiring.open_to.internships is false.")
    }
    inList("overtime", h.contract?.overtime, "hiring.contract.overtime")
    inList("payment_methods", h.contract?.payment_method, "hiring.contract.payment_method")
    inList("promotion_review", h.growth?.promotion_review, "hiring.growth.promotion_review")
    allIn("benefits", h.benefits, "hiring.benefits")

    positionIds = uniqueIds(h.positions, "hiring.positions", errors)
    ;(h.positions ?? []).forEach((x: Profile, i: number) => {
      const at = `hiring.positions[${i}]`
      inList("employment", x.employment, `${at}.employment`)
      inList("seniority", x.seniority, `${at}.seniority`)
      inList("education", x.education, `${at}.education`)
      inList("work_modes", x.work_mode, `${at}.work_mode`)
      allIn("technologies", x.skills, `${at}.skills`)
      allIn("soft_skills", x.soft_skills, `${at}.soft_skills`)
      allIn("languages", x.languages, `${at}.languages`)
      if (!empty(x.deadline) && !empty(h.updated) && x.deadline < h.updated) {
        errors.push(`${at}.deadline: is before hiring.updated.`)
      }
      const s = x.salary
      if (s) {
        inList("salary_types", s.type, `${at}.salary.type`)
        const hasMin = typeof s.min === "number"
        const hasMax = typeof s.max === "number"
        if (s.type === "range" || s.type === "fixed") {
          inList("currencies", s.currency, `${at}.salary.currency`)
          inList("salary_periods", s.period, `${at}.salary.period`)
          if (empty(s.currency)) errors.push(`${at}.salary.currency: is required for a "${s.type}" salary.`)
          if (empty(s.period)) errors.push(`${at}.salary.period: is required for a "${s.type}" salary.`)
        }
        if (s.type === "range") {
          if (!hasMin) errors.push(`${at}.salary.min: is required for a "range" salary.`)
          if (!hasMax) errors.push(`${at}.salary.max: is required for a "range" salary.`)
          if (hasMin && hasMax && s.min > s.max) errors.push(`${at}.salary.min: is larger than max.`)
        } else if (s.type === "fixed") {
          if (!hasMin) errors.push(`${at}.salary.min: is required for a "fixed" salary (the amount).`)
          if (hasMax) errors.push(`${at}.salary.max: leave it empty; a "fixed" salary takes only min.`)
        } else if (hasMin || hasMax) {
          errors.push(`${at}.salary: a "${s.type}" salary has no amount; leave min and max empty.`)
        }
      }
    })
  }

  // funding
  if (p.funding) {
    inList("funding_raising", p.funding.raising, "funding.raising")
    inList("funding_amounts", p.funding.amount, "funding.amount")
    inList("funding_stages", p.funding.stage, "funding.stage")
  }

  // texts: keys must refer to existing products / positions; English needs every position title
  for (const [lang, t] of Object.entries(p.i18n ?? {}) as [string, Profile | null][]) {
    if (!t) continue
    for (const id of Object.keys(t.products ?? {})) {
      if (!productIds.has(id)) errors.push(`i18n.${lang}.products.${id}: has no matching product id.`)
    }
    for (const id of Object.keys(t.positions ?? {})) {
      if (!positionIds.has(id)) errors.push(`i18n.${lang}.positions.${id}: has no matching position id.`)
    }
  }
  for (const id of positionIds) {
    if (empty(p.i18n?.en?.positions?.[id]?.title)) errors.push(`i18n.en.positions.${id}.title: is required.`)
  }
}

function uniqueIds(list: Profile[] | null | undefined, where: string, errors: string[]) {
  const ids = new Set<string>()
  if (!Array.isArray(list)) return ids
  list.forEach((x, i) => {
    if (ids.has(x?.id)) errors.push(`${where}[${i}].id: "${x.id}" is used twice.`)
    ids.add(x?.id)
  })
  return ids
}
