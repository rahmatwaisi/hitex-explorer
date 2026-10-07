// Browser side of the profile rules: compiles the JSON schemas with Ajv and writes profiles as YAML
// the way the templates look. Loaded only by the profile form (a lazy chunk).
import Ajv2020Import from "ajv/dist/2020"
import addFormatsImport from "ajv-formats"
import YAML, { isScalar, isSeq } from "yaml"

import sponsorSchemaJson from "../../schema/sponsor-profile.schema.json"
import startupSchemaJson from "../../schema/startup-profile.schema.json"
import type { Profile, ProfileKind, SchemaValidator } from "@/lib/profile-rules"

// CommonJS packages: depending on the bundler the export is the module or its `.default`
const interop = <T,>(m: T): T => (m as unknown as { default?: T }).default ?? m
const Ajv2020 = interop(Ajv2020Import)
const addFormats = interop(addFormatsImport)

type SchemaNode = { [key: string]: unknown }
const SCHEMAS: Record<ProfileKind, SchemaNode> = { startup: startupSchemaJson as SchemaNode, sponsor: sponsorSchemaJson as SchemaNode }

const validators = new Map<ProfileKind, SchemaValidator>()
export function schemaValidator(kind: ProfileKind = "startup"): SchemaValidator {
  let validator = validators.get(kind)
  if (!validator) {
    const ajv = new Ajv2020({ allErrors: true, strict: false })
    addFormats(ajv)
    validator = ajv.compile(SCHEMAS[kind]) as SchemaValidator
    validators.set(kind, validator)
  }
  return validator
}

/** Follows "$ref": "#/$defs/x" and the first "allOf" part that has properties. */
function resolve(schema: SchemaNode, node: SchemaNode | undefined): SchemaNode | undefined {
  if (!node) return undefined
  if (typeof node.$ref === "string") return resolve(schema, (schema.$defs as Record<string, SchemaNode>)[node.$ref.split("/").pop()!])
  if (!node.properties && Array.isArray(node.allOf)) return resolve(schema, (node.allOf as SchemaNode[]).find((n) => resolve(schema, n)?.properties))
  return node
}

/** Puts object keys in the order the schema (and the template) lists them; unknown keys go last. */
function ordered(schema: SchemaNode, value: unknown, node: SchemaNode | undefined): unknown {
  const n = resolve(schema, node)
  if (Array.isArray(value)) return value.map((v) => ordered(schema, v, n?.items as SchemaNode | undefined))
  if (!value || typeof value !== "object") return value
  const props = (n?.properties ?? {}) as Record<string, SchemaNode>
  const extra = typeof n?.additionalProperties === "object" ? (n.additionalProperties as SchemaNode) : undefined
  const keys = [...Object.keys(props).filter((k) => k in value), ...Object.keys(value).filter((k) => !(k in props))]
  return Object.fromEntries(keys.map((k) => [k, ordered(schema, (value as Record<string, unknown>)[k], props[k] ?? extra)]))
}

/** top-level keys that start a section of a template get a blank line before them */
const SECTION_KEYS = new Set(["hitex", "website", "for_startups", "founders", "leadership", "hiring", "funding", "i18n", "consent"])

/** Writes a profile as YAML: template key order, "double quoted" text, `|` blocks for multi-line text, short lists inline. */
export function profileToYaml(profile: Profile, header?: string, kind: ProfileKind = "startup"): string {
  const schema = SCHEMAS[kind]
  const doc = new YAML.Document(ordered(schema, profile, schema))
  YAML.visit(doc, {
    Pair(_, pair) {
      if (isScalar(pair.key) && typeof pair.value === "object" && pair.value && isSeq(pair.value)) {
        // short lists of keys or numbers inline, like the template; sentences stay one per line
        const items = pair.value.items
        const text = items.map((item) => (isScalar(item) ? String(item.value) : "\n")).join(", ")
        if (items.every((item) => isScalar(item)) && !text.includes("\n") && text.length <= 100) pair.value.flow = true
      }
    },
    Scalar(key, node) {
      if (key === "key" || typeof node.value !== "string") return
      node.type = node.value.includes("\n") ? "BLOCK_LITERAL" : "QUOTE_DOUBLE"
    },
  })
  if (YAML.isMap(doc.contents)) {
    for (const pair of doc.contents.items) {
      if (isScalar(pair.key) && SECTION_KEYS.has(String(pair.key.value))) pair.key.spaceBefore = true
    }
  }
  if (header) doc.commentBefore = header
  return doc.toString({ lineWidth: 0, flowCollectionPadding: false })
}
