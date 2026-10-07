// Validates every public/startups/*.yml and public/sponsors/*.yml and writes public/data/community.json
// for the site. Runs before `vite` and `vite build`. Fails (exit 1) if any profile is invalid.
//   node scripts/build-community.ts           validate + write
//   node scripts/build-community.ts --check   validate only
import fs from "node:fs"
import path from "node:path"

import {
  PROFILE_DIRS,
  ROOT,
  TEMPLATE_FILES,
  checkFileName,
  createSchemaValidator,
  loadHitexRecords,
  loadVocab,
  validateProfileText,
  type Profile,
  type ProfileKind,
} from "./lib/profiles.ts"

const OUT = path.join(ROOT, "public/data/community.json")
const checkOnly = process.argv.includes("--check")

const vocab = loadVocab()
let failed = false
let checked = 0

/** Every valid profile of a kind (newest first), and its template as the example profile. */
function build(kind: ProfileKind) {
  const dir = PROFILE_DIRS[kind]
  const rel = path.relative(ROOT, dir)
  const validateSchema = createSchemaValidator(kind)
  const records = loadHitexRecords(kind)
  const hitexIds = new Set(records.map((r) => r.id))

  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml")).sort() : []
  checked += files.length
  const profiles: (Profile & { file: string })[] = []
  const slugs = new Map<string, string>()
  const hitexOwners = new Map<string, string>() // HITEX id -> profile file

  for (const file of files) {
    const text = fs.readFileSync(path.join(dir, file), "utf8")
    const { error } = checkFileName(file)
    const res = error
      ? { errors: [error], warnings: [] as string[], profile: undefined }
      : validateProfileText(text, { kind, fileName: file, vocab, validateSchema, hitexIds })

    if (res.profile && !res.errors.length) {
      const other = slugs.get(res.profile.slug)
      if (other) res.errors.push(`slug "${res.profile.slug}" is already used by ${other}.`)
      slugs.set(res.profile.slug, file)
      const id = res.profile.hitex.existing_profile
      const owner = hitexOwners.get(id)
      if (owner) res.errors.push(`HITEX ${kind} ${id} already has a profile: ${owner}. Edit that file instead.`)
      hitexOwners.set(id, file)
    }
    for (const w of res.warnings) console.warn(`warning  ${rel}/${file}: ${w}`)
    if (res.errors.length) {
      failed = true
      for (const e of res.errors) console.error(`error    ${rel}/${file}: ${e}`)
    } else if (res.profile) {
      profiles.push({ file, kind, ...res.profile })
    }
  }

  // the template doubles as the example profile on the Contribution pages
  const templateFile = TEMPLATE_FILES[kind]
  const template = validateProfileText(fs.readFileSync(templateFile, "utf8"), { kind, vocab, validateSchema, template: true })
  for (const e of template.errors) console.error(`error    ${path.relative(ROOT, templateFile)}: ${e}`)
  if (template.errors.length || !template.profile) failed = true

  // shown with the site's own icon instead of the template's placeholder logo URL
  const example: Profile = { ...template.profile, file: "", kind, example: true, logo_url: "/brand/apple-touch-icon.png" }

  // sponsors carry their tier from HITEX's list; they don't write it themselves
  if (kind === "sponsor") {
    const tierOf = new Map(records.map((r) => [r.id, r.tier ?? undefined]))
    for (const p of profiles) p.tier = tierOf.get(p.hitex.existing_profile)
    example.tier = "platinum"
  }

  // newest first (file names start with the submission time)
  profiles.sort((a, b) => b.file.localeCompare(a.file))
  console.log(`✓ ${profiles.length} ${kind} profile(s) valid.`)
  return { example, profiles }
}

const startups = build("startup")
const sponsors = build("sponsor")

if (failed) {
  console.error(`\n✖ ${checked} profile file(s) and the templates checked; fix the errors above.`)
  process.exit(1)
}

if (!checkOnly) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(
    OUT,
    JSON.stringify({
      generated_at: new Date().toISOString(),
      vocab,
      example: startups.example,
      profiles: startups.profiles,
      sponsor_example: sponsors.example,
      sponsors: sponsors.profiles,
    })
  )
  console.log(`  wrote ${path.relative(ROOT, OUT)}`)
}
