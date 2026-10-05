// Shared validation for public/startups/*.yml, used by the build (build-community.ts)
// and by the pull-request check (check-pr.ts). Runs directly with Node (type stripping).
import fs from "node:fs"
import path from "node:path"

import Ajv2020Module from "ajv/dist/2020.js"
import addFormatsModule from "ajv-formats"
import YAML from "yaml"

// CommonJS packages: under Node ESM the class / plugin is on `.default`
const Ajv2020 = Ajv2020Module.default
const addFormats = addFormatsModule.default

export const ROOT = path.resolve(import.meta.dirname, "../..")
export const STARTUPS_DIR = path.join(ROOT, "public/startups")
export const MAX_FILE_BYTES = 64 * 1024
export const TEMPLATE_FILE = path.join(ROOT, "templates/startup-profile.yml")
/** used by the example built from the template */
export const RESERVED_SLUGS = new Set(["example_startup"])

/** yyyymmdd_hhmmss_snake_case_name.yml */
export const FILE_RE = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_([a-z0-9]+(?:_[a-z0-9]+)*)\.yml$/

type Labels = Partial<Record<"en" | "ar" | "ku" | "fa", string>>
export type Vocab = Record<string, Record<string, Labels | boolean>>
export type Profile = Record<string, any>

export interface Result {
  profile?: Profile
  errors: string[]
  warnings: string[]
}

export function loadVocab(): Vocab {
  return YAML.parse(fs.readFileSync(path.join(ROOT, "schema/vocab.yml"), "utf8"))
}

export function createSchemaValidator() {
  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, "schema/startup-profile.schema.json"), "utf8"))
  const ajv = new Ajv2020({ allErrors: true, strict: false })
  addFormats(ajv)
  return ajv.compile(schema)
}

/** Ids of the HITEX startups, so `hitex.existing_profile` can be checked. */
export function loadHitexStartupIds(): Set<string> {
  const file = path.join(ROOT, "public/data/startups_list.json")
  if (!fs.existsSync(file)) return new Set()
  return new Set((JSON.parse(fs.readFileSync(file, "utf8")) as { id: string }[]).map((s) => s.id))
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

/** Parses and validates one profile file's text. */
export function validateProfileText(
  text: string,
  opts: {
    fileName?: string
    vocab: Vocab
    validateSchema: ReturnType<typeof createSchemaValidator>
    hitexIds?: Set<string>
    now?: Date
    /** validating templates/startup-profile.yml itself: its HITEX id is a placeholder */
    template?: boolean
  }
): Result {
  const errors: string[] = []
  const warnings: string[] = []
  if (Buffer.byteLength(text, "utf8") > MAX_FILE_BYTES) {
    return { errors: [`The file is larger than ${MAX_FILE_BYTES / 1024} KB.`], warnings }
  }

  // YAML 1.2, no aliases (no "billion laughs"), duplicate keys are errors
  const doc = YAML.parseDocument(text, { uniqueKeys: true, prettyErrors: true })
  if (doc.errors.length) {
    return { errors: doc.errors.map((e) => `YAML: ${e.message.split("\n")[0]}`), warnings }
  }
  let profile: Profile
  try {
    profile = doc.toJS({ maxAliasCount: 0 })
  } catch (e) {
    return { errors: [`YAML: ${(e as Error).message}`], warnings }
  }
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return { errors: ["The file must contain a YAML mapping (key: value pairs)."], warnings }
  }

  if (!opts.validateSchema(profile)) {
    for (const e of opts.validateSchema.errors ?? []) {
      const at = e.instancePath || "(top level)"
      const extra =
        e.keyword === "additionalProperties"
          ? ` "${(e.params as { additionalProperty: string }).additionalProperty}"`
          : e.keyword === "const"
            ? ` (${JSON.stringify((e.params as { allowedValue: unknown }).allowedValue)})`
            : ""
      errors.push(`${at}: ${e.message}${extra}`)
    }
    return { profile, errors: dedupe(errors), warnings }
  }

  semanticChecks(profile, opts, errors, warnings)
  return { profile, errors, warnings }
}

function dedupe(list: string[]) {
  return [...new Set(list)]
}

function semanticChecks(
  p: Profile,
  opts: { fileName?: string; vocab: Vocab; hitexIds?: Set<string>; now?: Date; template?: boolean },
  errors: string[],
  warnings: string[]
) {
  const { vocab } = opts
  const now = opts.now ?? new Date()

  if (opts.fileName) {
    const { slug, error } = checkFileName(opts.fileName, now)
    if (error) errors.push(error)
    else if (slug !== p.slug) errors.push(`slug "${p.slug}" must equal the name part of the file name ("${slug}").`)
    if (RESERVED_SLUGS.has(p.slug)) errors.push(`"${p.slug}" is reserved for the example; choose your own name.`)
  }

  /** value must be a key of vocab[list]; `open` lists only warn */
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
    if (value === "other" && empty(other)) errors.push(`${where} is "other", so ${where}_other must say what it is.`)
  }

  // company
  inList("cities", p.location.city, "location.city")
  needOther(p.location.city, p.location.city_other, "location.city")
  allIn("cities", p.location.other_offices, "location.other_offices")
  inList("industries", p.industry, "industry")
  needOther(p.industry, p.industry_other, "industry")
  inList("business_models", p.business_model, "business_model")
  inList("stages", p.stage, "stage")
  inList("team_sizes", p.team_size, "team_size")
  inList("engineering_team_sizes", p.engineering_team_size, "engineering_team_size")
  inList("work_modes", p.work_mode, "work_mode")
  inList("work_weeks", p.work_week, "work_week")
  allIn("technologies", p.tech_stack, "tech_stack")
  allIn("tools", p.tools, "tools")
  if (/^\d{4}/.test(p.founded) && +p.founded.slice(0, 4) > now.getUTCFullYear()) errors.push("founded is in the future.")

  const productIds = uniqueIds(p.products, "products", errors)
  ;(p.products ?? []).forEach((x: Profile, i: number) => allIn("platforms", x.platforms, `products[${i}].platforms`))
  ;(p.traction ?? []).forEach((x: Profile, i: number) => inList("traction_metrics", x.metric, `traction[${i}].metric`))

  // strict rule: only startups that HITEX lists can have a profile
  const existing = p.hitex?.existing_profile
  if (!opts.template) {
    if (!opts.hitexIds?.size) errors.push("data/startups_list.json could not be read, so the startup can't be verified.")
    else if (!opts.hitexIds.has(existing)) {
      errors.push(
        `hitex.existing_profile "${existing}" is not a startup listed by HITEX. Only startups in data/startups_list.json ` +
          "can have a profile; find your id on the Contribution page."
      )
    }
  }

  // people
  ;(p.founders ?? []).forEach((x: Profile, i: number) => inList("founder_roles", x.role, `founders[${i}].role`))
  ;(p.core_team ?? []).forEach((x: Profile, i: number) => {
    inList("team_roles", x.role, `core_team[${i}].role`)
    needOther(x.role, x.role_other, `core_team[${i}].role`)
  })
  allIn("seeking", p.seeking, "seeking")
  if (Array.isArray(p.seeking) && p.seeking.includes("co_founder")) {
    if (empty(p.co_founder_role)) errors.push('seeking includes "co_founder", so co_founder_role is required.')
    else inList("co_founder_roles", p.co_founder_role, "co_founder_role")
  }

  // hiring
  const h = p.hiring
  let positionIds = new Set<string>()
  if (h) {
    inList("hiring_status", h.status, "hiring.status")
    const updated = new Date(`${h.updated}T00:00:00Z`)
    if (updated.getTime() > now.getTime() + 24 * 3600 * 1000) errors.push("hiring.updated is in the future.")
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
      warnings.push("hiring.internship is filled in, but hiring.open_to.internships is false.")
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
        errors.push(`${at}.deadline is before hiring.updated.`)
      }
      const s = x.salary
      if (s) {
        inList("salary_types", s.type, `${at}.salary.type`)
        const hasMin = typeof s.min === "number"
        const hasMax = typeof s.max === "number"
        if (s.type === "range" || s.type === "fixed") {
          inList("currencies", s.currency, `${at}.salary.currency`)
          inList("salary_periods", s.period, `${at}.salary.period`)
          if (empty(s.currency) || empty(s.period)) errors.push(`${at}.salary needs currency and period for type "${s.type}".`)
        }
        if (s.type === "range") {
          if (!hasMin || !hasMax) errors.push(`${at}.salary type "range" needs both min and max.`)
          else if (s.min > s.max) errors.push(`${at}.salary min is larger than max.`)
        } else if (s.type === "fixed") {
          if (!hasMin) errors.push(`${at}.salary type "fixed" needs min (the amount).`)
          if (hasMax) errors.push(`${at}.salary type "fixed" takes only min; leave max empty.`)
        } else if (hasMin || hasMax) {
          errors.push(`${at}.salary type "${s.type}" has no amount; leave min and max empty.`)
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
      if (!productIds.has(id)) errors.push(`i18n.${lang}.products.${id} has no matching product id.`)
    }
    for (const id of Object.keys(t.positions ?? {})) {
      if (!positionIds.has(id)) errors.push(`i18n.${lang}.positions.${id} has no matching position id.`)
    }
  }
  for (const id of positionIds) {
    if (empty(p.i18n.en.positions?.[id]?.title)) errors.push(`i18n.en.positions.${id}.title is required.`)
  }
}

function uniqueIds(list: Profile[] | null | undefined, where: string, errors: string[]) {
  const ids = new Set<string>()
  for (const x of list ?? []) {
    if (ids.has(x.id)) errors.push(`${where}: id "${x.id}" is used twice.`)
    ids.add(x.id)
  }
  return ids
}
