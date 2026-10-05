// Validates every public/startups/*.yml and writes public/data/community.json for the site.
// Runs before `vite` and `vite build`. Fails (exit 1) if any profile is invalid.
//   node scripts/build-community.ts           validate + write
//   node scripts/build-community.ts --check   validate only
import fs from "node:fs"
import path from "node:path"

import {
  ROOT,
  STARTUPS_DIR,
  TEMPLATE_FILE,
  checkFileName,
  createSchemaValidator,
  loadHitexStartupIds,
  loadVocab,
  validateProfileText,
  type Profile,
} from "./lib/profiles.ts"

const OUT = path.join(ROOT, "public/data/community.json")
const checkOnly = process.argv.includes("--check")

const vocab = loadVocab()
const validateSchema = createSchemaValidator()
const hitexIds = loadHitexStartupIds()

const files = fs.existsSync(STARTUPS_DIR)
  ? fs.readdirSync(STARTUPS_DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml")).sort()
  : []

const profiles: (Profile & { file: string })[] = []
const slugs = new Map<string, string>()
const hitexOwners = new Map<string, string>() // HITEX startup id -> profile file
let failed = false

for (const file of files) {
  const text = fs.readFileSync(path.join(STARTUPS_DIR, file), "utf8")
  const { error } = checkFileName(file)
  const res = error
    ? { errors: [error], warnings: [] as string[], profile: undefined }
    : validateProfileText(text, { fileName: file, vocab, validateSchema, hitexIds })

  if (res.profile && !res.errors.length) {
    const other = slugs.get(res.profile.slug)
    if (other) res.errors.push(`slug "${res.profile.slug}" is already used by ${other}.`)
    slugs.set(res.profile.slug, file)
    const id = res.profile.hitex.existing_profile
    const owner = hitexOwners.get(id)
    if (owner) res.errors.push(`HITEX startup ${id} already has a profile: ${owner}. Edit that file instead.`)
    hitexOwners.set(id, file)
  }
  for (const w of res.warnings) console.warn(`warning  ${file}: ${w}`)
  if (res.errors.length) {
    failed = true
    for (const e of res.errors) console.error(`error    ${file}: ${e}`)
  } else if (res.profile) {
    profiles.push({ file, ...res.profile })
  }
}

// the template doubles as the example profile shown under "Contribution guideline"
const template = validateProfileText(fs.readFileSync(TEMPLATE_FILE, "utf8"), { vocab, validateSchema, template: true })
for (const e of template.errors) console.error(`error    templates/startup-profile.yml: ${e}`)
if (template.errors.length || !template.profile) failed = true

if (failed) {
  console.error(`\n✖ ${files.length} profile file(s) and the template checked; fix the errors above.`)
  process.exit(1)
}

// shown with the site's own icon instead of the template's placeholder logo URL
const example = { ...template.profile, file: "", example: true, logo_url: "brand/apple-touch-icon.png" }

// newest first (file names start with the submission time)
profiles.sort((a, b) => b.file.localeCompare(a.file))
console.log(`✓ ${profiles.length} startup profile(s) valid.`)

if (!checkOnly) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify({ generated_at: new Date().toISOString(), vocab, example, profiles }))
  console.log(`  wrote ${path.relative(ROOT, OUT)}`)
}
