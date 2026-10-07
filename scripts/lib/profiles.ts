// Node side of the profile rules: file locations, loading the vocab, schema and HITEX ids.
// The rules themselves live in src/lib/profile-rules.ts, shared with the profile form in the browser.
// Used by the build (build-community.ts) and the pull-request check (check-pr.ts).
import fs from "node:fs"
import path from "node:path"

import Ajv2020Module from "ajv/dist/2020.js"
import addFormatsModule from "ajv-formats"
import YAML from "yaml"

import { KINDS, type ProfileKind, type SchemaValidator, type Vocab } from "../../src/lib/profile-rules.ts"

export {
  FILE_RE,
  KINDS,
  MAX_FILE_BYTES,
  RESERVED_SLUGS,
  checkFileName,
  validateProfileText,
  type Profile,
  type ProfileKind,
  type Result,
  type Vocab,
} from "../../src/lib/profile-rules.ts"

// CommonJS packages: under Node ESM the class / plugin is on `.default`
const Ajv2020 = Ajv2020Module.default
const addFormats = addFormatsModule.default

export const ROOT = path.resolve(import.meta.dirname, "../..")
export const STARTUPS_DIR = path.join(ROOT, "public/startups")
export const SPONSORS_DIR = path.join(ROOT, "public/sponsors")
/** a kind's profile files, and its template (also the example profile shown on the site) */
export const PROFILE_DIRS: Record<ProfileKind, string> = { startup: STARTUPS_DIR, sponsor: SPONSORS_DIR }
export const TEMPLATE_FILES: Record<ProfileKind, string> = {
  startup: path.join(ROOT, "templates/startup-profile.yml"),
  sponsor: path.join(ROOT, "templates/sponsor-profile.yml"),
}

export function loadVocab(): Vocab {
  return YAML.parse(fs.readFileSync(path.join(ROOT, "schema/vocab.yml"), "utf8"))
}

export function createSchemaValidator(kind: ProfileKind = "startup"): SchemaValidator {
  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, `schema/${kind}-profile.schema.json`), "utf8"))
  const ajv = new Ajv2020({ allErrors: true, strict: false })
  addFormats(ajv)
  return ajv.compile(schema)
}

/** HITEX's records of a kind (data/startups_list.json, data/sponsors.json); empty if the file is missing. */
export function loadHitexRecords(kind: ProfileKind): { id: string; tier?: string | null; years?: number[] | null }[] {
  const file = path.join(ROOT, "public", KINDS[kind].list)
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : []
}

/** Ids of HITEX's startups or sponsors, so `hitex.existing_profile` can be checked. */
export const loadHitexIds = (kind: ProfileKind = "startup") => new Set(loadHitexRecords(kind).map((s) => s.id))
