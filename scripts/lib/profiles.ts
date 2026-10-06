// Node side of the profile rules: file locations, loading the vocab, schema and HITEX ids.
// The rules themselves live in src/lib/profile-rules.ts, shared with the profile form in the browser.
// Used by the build (build-community.ts) and the pull-request check (check-pr.ts).
import fs from "node:fs"
import path from "node:path"

import Ajv2020Module from "ajv/dist/2020.js"
import addFormatsModule from "ajv-formats"
import YAML from "yaml"

import type { SchemaValidator, Vocab } from "../../src/lib/profile-rules.ts"

export {
  FILE_RE,
  MAX_FILE_BYTES,
  RESERVED_SLUGS,
  checkFileName,
  validateProfileText,
  type Profile,
  type Result,
  type Vocab,
} from "../../src/lib/profile-rules.ts"

// CommonJS packages: under Node ESM the class / plugin is on `.default`
const Ajv2020 = Ajv2020Module.default
const addFormats = addFormatsModule.default

export const ROOT = path.resolve(import.meta.dirname, "../..")
export const STARTUPS_DIR = path.join(ROOT, "public/startups")
export const TEMPLATE_FILE = path.join(ROOT, "templates/startup-profile.yml")

export function loadVocab(): Vocab {
  return YAML.parse(fs.readFileSync(path.join(ROOT, "schema/vocab.yml"), "utf8"))
}

export function createSchemaValidator(): SchemaValidator {
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
