// Checks a pull request that adds or edits a startup or sponsor profile, and writes a Markdown report.
// Used by .github/workflows/profile-check.yml. It only reads the PR's file through git as data;
// it never runs code from the pull request.
//
//   node scripts/check-pr.ts --base <sha> --head <ref> --author <login> [--admins a,b] [--out report.md]
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import YAML from "yaml"

import {
  KINDS,
  MAX_FILE_BYTES,
  checkFileName,
  createSchemaValidator,
  loadHitexIds,
  loadVocab,
  validateProfileText,
  type Profile,
  type ProfileKind,
} from "./lib/profiles.ts"

export const MARKER = "<!-- hitex-profile-check -->"
/** "public/startups/", "public/sponsors/" */
const dirOf = (kind: ProfileKind) => `${KINDS[kind].dir}/`
const kindOf = (file: string) =>
  (Object.keys(KINDS) as ProfileKind[]).find((k) => file.startsWith(dirOf(k)) && !file.slice(dirOf(k).length).includes("/"))

function arg(name: string, fallback = "") {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? (process.argv[i + 1] ?? fallback) : fallback
}
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })
const fileAt = (ref: string, file: string) => {
  try {
    return git("show", `${ref}:${file}`)
  } catch {
    return null
  }
}

const base = arg("base")
const head = arg("head")
const author = arg("author").toLowerCase()
const admins = arg("admins").toLowerCase().split(",").filter(Boolean)
const out = arg("out", "profile-check.md")
if (!base || !head || !author) {
  console.error("usage: check-pr.ts --base <sha> --head <ref> --author <login> [--admins a,b] [--out file]")
  process.exit(2)
}

const errors: string[] = []
const warnings: string[] = []
const passed: string[] = []
let file = ""

// 1. exactly one file, inside public/startups/ or public/sponsors/, added or modified
const changes = git("diff", "--name-status", "-M", `${base}...${head}`)
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [status, ...paths] = line.split("\t")
    return { status: status[0], paths }
  })

if (changes.length !== 1) {
  errors.push(`A profile pull request must change exactly one file; this one changes ${changes.length}.`)
} else {
  const { status, paths } = changes[0]
  file = paths.at(-1)!
  const kind = kindOf(file)
  if (!kind) {
    errors.push(`The file must be directly inside \`${dirOf("startup")}\` or \`${dirOf("sponsor")}\` (found \`${file}\`).`)
  } else if (status === "R") {
    errors.push(`Renaming profile files is not allowed (\`${paths[0]}\` → \`${paths[1]}\`). Keep the original name.`)
  } else if (status !== "A" && status !== "M" && status !== "D") {
    errors.push(`Unsupported change type "${status}" for \`${file}\`.`)
  } else {
    passed.push(`One file changed: \`${file}\` (${status === "A" ? `new ${kind} profile` : status === "M" ? "update" : "removal"})`)
    checkFile(status, file, kind)
  }
}

function owners(profile: Profile | undefined) {
  return ((profile?.maintainers as string[] | undefined) ?? []).map((m) => m.toLowerCase())
}

function checkFile(status: string, file: string, kind: ProfileKind) {
  const name = path.basename(file)
  const { noun, list } = KINDS[kind]
  const vocab = loadVocab()
  const validateSchema = createSchemaValidator(kind)
  const hitexIds = loadHitexIds(kind)
  const parseAt = (ref: string) => {
    const text = fileAt(ref, file)
    return text === null ? undefined : validateProfileText(text, { kind, fileName: name, vocab, validateSchema, hitexIds })
  }
  const isAdmin = admins.includes(author)

  // removal: only someone already listed as maintainer (or an admin)
  if (status === "D") {
    const before = parseAt(base)?.profile
    if (isAdmin || owners(before).includes(author)) passed.push(`@${author} may remove this profile`)
    else errors.push(`Only the profile's maintainers (${owners(before).map((m) => "@" + m).join(", ") || "none"}) can remove it.`)
    return
  }

  // 2. file name
  const { slug, error } = checkFileName(name)
  if (error) errors.push(error)
  else passed.push("File name follows `yyyymmdd_hhmmss_snake_case_name.yml`")

  // 3–5. YAML, schema, lists and cross-field rules
  const text = fileAt(head, file) ?? ""
  if (Buffer.byteLength(text, "utf8") > MAX_FILE_BYTES) {
    errors.push(`The file is larger than ${MAX_FILE_BYTES / 1024} KB.`)
    return
  }
  const res = validateProfileText(text, { kind, fileName: name, vocab, validateSchema, hitexIds })
  errors.push(...res.errors)
  warnings.push(...res.warnings)
  if (!res.errors.length) passed.push("Valid YAML, fields and values follow the template")
  const profile = res.profile

  // the other profiles of this kind on the base branch: slug and HITEX record must be unique
  const otherFiles = git("ls-tree", "--name-only", base, dirOf(kind))
    .split("\n")
    .filter((f) => f.endsWith(".yml") && f !== file)
  if (slug && status === "A") {
    if (otherFiles.map((f) => checkFileName(path.basename(f)).slug).includes(slug)) {
      errors.push(`Another profile already uses the name "${slug}".`)
    } else passed.push(`Name "${slug}" is not used by another profile`)
  }
  const hitexId = profile?.hitex?.existing_profile
  if (hitexId && !res.errors.length) {
    const taken = otherFiles.find((f) => {
      try {
        return (YAML.parse(fileAt(base, f) ?? "") as Profile)?.hitex?.existing_profile === hitexId
      } catch {
        return false
      }
    })
    if (taken) errors.push(`This HITEX ${noun} already has a profile (\`${taken}\`). Edit that file instead of adding a new one.`)
    else passed.push(`Linked to a ${noun} listed by HITEX (\`${list}\`), and it has no other profile`)
  }

  // 6. ownership
  if (status === "A") {
    if (isAdmin || owners(profile).includes(author)) passed.push(`@${author} is listed in \`maintainers\``)
    else errors.push(`Add your GitHub username (@${author}) to \`maintainers\` so you can edit this profile later.`)
  } else {
    const before = parseAt(base)?.profile
    if (isAdmin || owners(before).includes(author)) passed.push(`@${author} is a maintainer of this profile`)
    else errors.push(`Only the profile's current maintainers (${owners(before).map((m) => "@" + m).join(", ") || "none"}) can edit it.`)
  }
}

// report
const unique = (list: string[]) => [...new Set(list)]
const ok = errors.length === 0
const lines = [
  MARKER,
  ok ? "### ✅ Profile check passed" : "### ❌ Profile check found problems",
  "",
  ...passed.map((p) => `- ✅ ${p}`),
  ...unique(errors).map((e) => `- ❌ ${e}`),
  ...unique(warnings).map((w) => `- ⚠️ ${w}`),
  "",
  ok
    ? "A maintainer will review and merge it. Thank you!"
    : "Please fix the ❌ items and push again; this comment updates automatically. See [CONTRIBUTING.md](../blob/main/CONTRIBUTING.md).",
]
fs.writeFileSync(out, lines.join("\n") + "\n")
console.log(lines.join("\n"))
process.exit(ok ? 0 : 1)
